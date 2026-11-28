// Tests F1 · W3 — bucle de conversación del canal WhatsApp propio (lógica pura).
// Cubre src/lib/whatsapp/conversacion.ts: firma HMAC del webhook (con ventana
// anti-replay), validación de payloads del daemon, marcas de pacing desde filas,
// configuración en caliente del pacing, resolución del bucle (filtro → pacing →
// cerebro), transiciones de envío y máscara del chatId. Nada toca BD ni red.
import { describe, test, expect } from 'bun:test'
import { PACING_DEFECTO } from '@/lib/whatsapp/pacing'
import {
  MAX_CHATID,
  MAX_TEXTO_ENTRADA,
  TOLERANCIA_FIRMA_MS,
  firmarWebhook,
  mascararChatId,
  marcasDesdeFilas,
  parsearPacingConfig,
  resolverSalida,
  transicionEnvio,
  validarEntrante,
  validarMarcaEnvio,
  verificarFirmaWebhook,
} from '@/lib/whatsapp/conversacion'

const SECRETO = 'secreto-de-prueba-32-chars-minimo-ok'
const AHORA = new Date('2026-11-20T12:00:00.000Z')

describe('firmarWebhook + verificarFirmaWebhook (HMAC-SHA256 atado al instante)', () => {
  const cuerpo = JSON.stringify({ accion: 'entrante', id: 'm1', chatId: '573001234567@s.whatsapp.net', texto: 'hola' })

  test('la firma es determinista y distinta si cambia cuerpo, ts o secreto', () => {
    const ts = AHORA.getTime()
    const f1 = firmarWebhook(ts, cuerpo, SECRETO)
    expect(f1).toBe(firmarWebhook(ts, cuerpo, SECRETO))
    expect(f1).not.toBe(firmarWebhook(ts + 1, cuerpo, SECRETO))
    expect(f1).not.toBe(firmarWebhook(ts, cuerpo + 'x', SECRETO))
    expect(f1).not.toBe(firmarWebhook(ts, cuerpo, 'otro-secreto-de-prueba-32-chars-okk'))
    expect(f1).toHaveLength(64) // hex sha256
  })

  test('firma válida dentro de la ventana pasa', () => {
    const ts = AHORA.getTime()
    expect(verificarFirmaWebhook(cuerpo, firmarWebhook(ts, cuerpo, SECRETO), String(ts), SECRETO, AHORA)).toEqual({ ok: true })
  })

  test('sin firma o sin ts se rechaza con motivo honesto', () => {
    const ts = AHORA.getTime()
    const f = firmarWebhook(ts, cuerpo, SECRETO)
    expect(verificarFirmaWebhook(cuerpo, null, String(ts), SECRETO, AHORA)).toEqual({ ok: false, motivo: 'falta_firma' })
    expect(verificarFirmaWebhook(cuerpo, f, null, SECRETO, AHORA)).toEqual({ ok: false, motivo: 'falta_ts' })
  })

  test('timestamp no numérico o vencido (±tolerancia) se rechaza', () => {
    const ts = AHORA.getTime()
    const f = firmarWebhook(ts, cuerpo, SECRETO)
    expect(verificarFirmaWebhook(cuerpo, f, 'ayer', SECRETO, AHORA)).toEqual({ ok: false, motivo: 'ts_invalido' })
    expect(verificarFirmaWebhook(cuerpo, f, '0', SECRETO, AHORA)).toEqual({ ok: false, motivo: 'ts_invalido' })
    expect(verificarFirmaWebhook(cuerpo, f, String(ts - TOLERANCIA_FIRMA_MS - 1), SECRETO, AHORA)).toEqual({ ok: false, motivo: 'timestamp_vencido' })
    expect(verificarFirmaWebhook(cuerpo, f, String(ts + TOLERANCIA_FIRMA_MS + 1), SECRETO, AHORA)).toEqual({ ok: false, motivo: 'timestamp_vencido' })
  })

  test('en el borde exacto de la tolerancia la firma sigue viva', () => {
    const ts = AHORA.getTime() - TOLERANCIA_FIRMA_MS
    expect(verificarFirmaWebhook(cuerpo, firmarWebhook(ts, cuerpo, SECRETO), String(ts), SECRETO, AHORA)).toEqual({ ok: true })
  })

  test('cuerpo alterado, secreto distinto o hex recortado → firma_invalida (sin excepción)', () => {
    const ts = AHORA.getTime()
    const f = firmarWebhook(ts, cuerpo, SECRETO)
    expect(verificarFirmaWebhook(cuerpo + 'x', f, String(ts), SECRETO, AHORA)).toEqual({ ok: false, motivo: 'firma_invalida' })
    expect(verificarFirmaWebhook(cuerpo, f, String(ts), 'secreto-incorrecto-32-chars-minimooo', AHORA)).toEqual({ ok: false, motivo: 'firma_invalida' })
    expect(verificarFirmaWebhook(cuerpo, f.slice(0, 32), String(ts), SECRETO, AHORA)).toEqual({ ok: false, motivo: 'firma_invalida' })
    expect(verificarFirmaWebhook(cuerpo, 'zz-no-hex', String(ts), SECRETO, AHORA)).toEqual({ ok: false, motivo: 'firma_invalida' })
  })

  test('la tolerancia anti-replay es de 5 minutos', () => {
    expect(TOLERANCIA_FIRMA_MS).toBe(300_000)
  })
})

describe('validarEntrante (payload del daemon)', () => {
  const base = { id: 'wa-1', chatId: '573001234567@s.whatsapp.net', texto: 'hola, ¿cómo estás?' }

  test('payload completo pasa y parsea recibidoEn ISO', () => {
    const r = validarEntrante({ ...base, recibidoEn: '2026-11-20T11:59:00.000Z' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.datos.idEntrada).toBe('wa-1')
      expect(r.datos.chatId).toBe('573001234567@s.whatsapp.net')
      expect(r.datos.texto).toBe('hola, ¿cómo estás?')
      expect(r.datos.recibidoEn?.toISOString()).toBe('2026-11-20T11:59:00.000Z')
    }
  })

  test('recibidoEn ausente o basura → null (no rompe)', () => {
    const r = validarEntrante(base)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.datos.recibidoEn).toBeNull()
    const r2 = validarEntrante({ ...base, recibidoEn: 'no-es-fecha' })
    expect(r2.ok).toBe(true)
    if (r2.ok) expect(r2.datos.recibidoEn).toBeNull()
  })

  test('rechaza sin id, sin chatId, sin texto o con payload basura', () => {
    expect(validarEntrante(null).ok).toBe(false)
    expect(validarEntrante({ chatId: base.chatId, texto: base.texto }).ok).toBe(false)
    expect(validarEntrante({ id: 'wa-1', texto: base.texto }).ok).toBe(false)
    expect(validarEntrante({ id: 'wa-1', chatId: base.chatId }).ok).toBe(false)
    expect(validarEntrante({ id: '  ', chatId: base.chatId, texto: base.texto }).ok).toBe(false)
  })

  test('rechaza chatId sin dígitos, demasiado largo y texto vacío o gigante', () => {
    expect(validarEntrante({ id: 'a', chatId: 'chat-general', texto: 'x' }).ok).toBe(false)
    expect(validarEntrante({ id: 'a', chatId: 'x'.repeat(MAX_CHATID + 1), texto: 'x' }).ok).toBe(false)
    expect(validarEntrante({ id: 'a', chatId: base.chatId, texto: '   ' }).ok).toBe(false)
    expect(validarEntrante({ id: 'a', chatId: base.chatId, texto: 'x'.repeat(MAX_TEXTO_ENTRADA + 1) }).ok).toBe(false)
  })

  test('recorta espacios del texto y del id', () => {
    const r = validarEntrante({ id: '  wa-9  ', chatId: ` ${base.chatId} `, texto: '  hola  ' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.datos.idEntrada).toBe('wa-9')
      expect(r.datos.texto).toBe('hola')
    }
  })
})

describe('validarMarcaEnvio (reporte del daemon)', () => {
  test('enviado y fallado con errorRiesgo explícito', () => {
    const ok = validarMarcaEnvio({ id: 'fila-1', resultado: 'enviado' })
    expect(ok.ok).toBe(true)
    if (ok.ok) expect(ok.datos.errorRiesgo).toBe(false)
    const fallo = validarMarcaEnvio({ id: 'fila-2', resultado: 'fallado', errorRiesgo: true, detalle: 'timeout de sesión' })
    expect(fallo.ok).toBe(true)
    if (fallo.ok) {
      expect(fallo.datos.errorRiesgo).toBe(true)
      expect(fallo.datos.detalle).toBe('timeout de sesión')
    }
    const comoTexto = validarMarcaEnvio({ id: 'fila-3', resultado: 'fallado', errorRiesgo: 'true' })
    expect(comoTexto.ok).toBe(true)
    if (comoTexto.ok) expect(comoTexto.datos.errorRiesgo).toBe(true)
  })

  test('rechaza sin id y con resultado desconocido', () => {
    expect(validarMarcaEnvio({ resultado: 'enviado' }).ok).toBe(false)
    expect(validarMarcaEnvio({ id: 'x', resultado: 'leido' }).ok).toBe(false)
    expect(validarMarcaEnvio(null).ok).toBe(false)
  })

  test('el detalle se recorta al máximo (300)', () => {
    const r = validarMarcaEnvio({ id: 'x', resultado: 'fallado', detalle: 'd'.repeat(500) })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.datos.detalle).toHaveLength(300)
  })
})

describe('marcasDesdeFilas (filas de BD → MarcaEnvio del pacing)', () => {
  const fila = (sobre: Partial<Parameters<typeof marcasDesdeFilas>[0][number]>) => ({
    chatId: '573001234567@s.whatsapp.net',
    estado: 'enviado',
    tipo: 'respuesta',
    errorRiesgo: false,
    enviadoEn: new Date('2026-11-20T10:00:00.000Z'),
    updatedAt: new Date('2026-11-20T10:00:01.000Z'),
    ...sobre,
  })

  test('solo enviado/fallado cuentan: recibido y bloqueado_pacing nunca tocaron la red', () => {
    const marcas = marcasDesdeFilas([
      fila({ estado: 'recibido' }),
      fila({ estado: 'bloqueado_pacing' }),
      fila({}),
      fila({ estado: 'fallado' }),
    ])
    expect(marcas).toHaveLength(2)
  })

  test('el disyuntor solo se alimenta de fallos CON señal de riesgo', () => {
    const [enviado, falladoRiesgo, falladoLimpio] = marcasDesdeFilas([
      fila({}),
      fila({ estado: 'fallado', errorRiesgo: true }),
      fila({ estado: 'fallado', errorRiesgo: false }),
    ])
    expect(enviado.error).toBe(false)
    expect(falladoRiesgo.error).toBe(true)
    expect(falladoLimpio.error).toBe(false)
  })

  test('t = enviadoEn si existe, si no updatedAt (acepta Date e ISO)', () => {
    const [m1] = marcasDesdeFilas([fila({})])
    expect(m1.t.toISOString()).toBe('2026-11-20T10:00:00.000Z')
    const [m2] = marcasDesdeFilas([fila({ enviadoEn: null })])
    expect(m2.t.toISOString()).toBe('2026-11-20T10:00:01.000Z')
    const [m3] = marcasDesdeFilas([fila({ enviadoEn: null, updatedAt: '2026-11-20T09:00:00.000Z' })])
    expect(m3.t.toISOString()).toBe('2026-11-20T09:00:00.000Z')
  })

  test('tipo se normaliza: solo respuesta o iniciativa', () => {
    const [r, i] = marcasDesdeFilas([fila({ tipo: 'respuesta' }), fila({ tipo: 'iniciativa' })])
    expect(r.tipo).toBe('respuesta')
    expect(i.tipo).toBe('iniciativa')
    const [extraño] = marcasDesdeFilas([fila({ tipo: 'otro' })])
    expect(extraño.tipo).toBe('respuesta')
  })
})

describe('parsearPacingConfig (BD panel > env > defecto, valor inválido → defecto)', () => {
  test('sin valores usa los defectos conservadores intactos', () => {
    const cfg = parsearPacingConfig({}, PACING_DEFECTO)
    expect(cfg).toEqual(PACING_DEFECTO)
  })

  test('valores válidos del panel/env sobreescriben solo su clave', () => {
    const cfg = parsearPacingConfig({ silencioDesde: '21', maxRespuestas: '80' }, PACING_DEFECTO)
    expect(cfg.desdeHoraSilencio).toBe(21)
    expect(cfg.maxRespuestasPorDia).toBe(80)
    expect(cfg.hastaHoraSilencio).toBe(PACING_DEFECTO.hastaHoraSilencio)
    expect(cfg.maxIniciativasPorDia).toBe(PACING_DEFECTO.maxIniciativasPorDia)
    expect(cfg.enfriamientoMs).toBe(PACING_DEFECTO.enfriamientoMs) // línea de seguridad, no se toca
  })

  test('valores inválidos caen al defecto sin romper (fuera de rango, no entero, NaN, vacío)', () => {
    const cfg = parsearPacingConfig(
      { silencioDesde: '25', silencioHasta: '7.5', maxRespuestas: 'abc', maxIniciativas: '' },
      PACING_DEFECTO,
    )
    expect(cfg.desdeHoraSilencio).toBe(PACING_DEFECTO.desdeHoraSilencio)
    expect(cfg.hastaHoraSilencio).toBe(PACING_DEFECTO.hastaHoraSilencio)
    expect(cfg.maxRespuestasPorDia).toBe(PACING_DEFECTO.maxRespuestasPorDia)
    expect(cfg.maxIniciativasPorDia).toBe(PACING_DEFECTO.maxIniciativasPorDia)
  })
})

describe('resolverSalida (orden del veredicto: filtro → pacing → cerebro)', () => {
  const pacingOk = { permitido: true, motivo: 'ok' as const, reintentarEn: null, detalle: 'Dentro del pacing' }
  const pacingNo = { permitido: false, motivo: 'horas_silencio' as const, reintentarEn: '2026-11-21T08:00:00.000Z', detalle: 'Ventana silenciosa' }
  const cerebro = { texto: 'respuesta segura', modo: 'plantilla_genoma', meta: {} }

  test('filtro de edad en la ENTRADA gana a todo: nada sale ni con cerebro presente', () => {
    const r = resolverSalida({ filtroEntradaTripo: true, decisionPacing: pacingOk, cerebro })
    expect(r.responder).toBe(false)
    expect(r.textoSalida).toBeNull()
    expect(r.estadoSalida).toBe('bloqueado_filtro')
    expect(r.meta.filtro).toBe('entrada')
  })

  test('pacing dice no (sin cerebro aún): cola fría con motivo y reintentarEn, el LLM no se gasta', () => {
    const r = resolverSalida({ filtroEntradaTripo: false, decisionPacing: pacingNo })
    expect(r.responder).toBe(false)
    expect(r.estadoSalida).toBe('bloqueado_pacing')
    expect(r.textoSalida).toBeNull()
    expect(r.meta.pacing).toBe('horas_silencio')
    expect(r.meta.reintentarEn).toBe('2026-11-21T08:00:00.000Z')
  })

  test('pacing dice no con cerebro ya resuelto: el texto queda listo pero NADA se envía', () => {
    const r = resolverSalida({ filtroEntradaTripo: false, decisionPacing: pacingNo, cerebro })
    expect(r.responder).toBe(false)
    expect(r.textoSalida).toBe('respuesta segura')
    expect(r.meta.modo).toBe('plantilla_genoma')
  })

  test('pacing ok sin cerebro es un bug de cableado: honesto, nada se envía', () => {
    const r = resolverSalida({ filtroEntradaTripo: false, decisionPacing: pacingOk })
    expect(r.responder).toBe(false)
    expect(r.textoSalida).toBeNull()
    expect(r.meta.bug).toBe('cerebro_ausente')
  })

  test('pacing ok con cerebro: instrucción de envío inmediato', () => {
    const r = resolverSalida({ filtroEntradaTripo: false, decisionPacing: pacingOk, cerebro })
    expect(r.responder).toBe(true)
    expect(r.textoSalida).toBe('respuesta segura')
    expect(r.estadoSalida).toBe('en_cola')
    expect(r.meta.pacing).toBe('ok')
    expect(r.meta.modo).toBe('plantilla_genoma')
  })
})

describe('transicionEnvio (reporte marcar_envio del daemon)', () => {
  test('el ciclo normal: en_cola → enviado y en_cola → fallado', () => {
    expect(transicionEnvio('en_cola', 'enviado')).toEqual({ ok: true, estado: 'enviado', idempotente: false })
    expect(transicionEnvio('en_cola', 'fallado')).toEqual({ ok: true, estado: 'fallado', idempotente: false })
  })

  test('re-reportes idénticos son idempotentes (los reintentos de red no rompen)', () => {
    expect(transicionEnvio('enviado', 'enviado')).toEqual({ ok: true, estado: 'enviado', idempotente: true })
    expect(transicionEnvio('fallado', 'fallado')).toEqual({ ok: true, estado: 'fallado', idempotente: true })
  })

  test('fallado → enviado es legítimo (el reintento por fin salió)', () => {
    expect(transicionEnvio('fallado', 'enviado').ok).toBe(true)
  })

  test('enviado → fallado es contradicción (lo entregado no se des-entrega)', () => {
    const r = transicionEnvio('enviado', 'fallado')
    expect(r.ok).toBe(false)
    expect(r.error).toContain('Contradicción')
  })

  test('bloqueado_pacing y recibido jamás transicionan por marcar_envio', () => {
    expect(transicionEnvio('bloqueado_pacing', 'enviado').ok).toBe(false)
    expect(transicionEnvio('bloqueado_pacing', 'enviado').error).toContain('pacing')
    expect(transicionEnvio('recibido', 'enviado').ok).toBe(false)
    expect(transicionEnvio('recibido', 'enviado').error).toContain('ENTRANTE')
  })
})

describe('mascararChatId (el chatId completo jamás sale a la UI)', () => {
  test('JID estándar de WhatsApp: cola de 4 dígitos + dominio', () => {
    expect(mascararChatId('573001234567@s.whatsapp.net')).toBe('•••••4567@s.whatsapp.net')
  })

  test('grupo: se distingue por dominio', () => {
    expect(mascararChatId('120345678901234567@g.us')).toBe('•••••4567@g.us')
  })

  test('sin @ y con dígitos / sin dígitos', () => {
    expect(mascararChatId('573001234567')).toBe('•••••4567')
    expect(mascararChatId('chat-raro')).toBe('•••••')
  })

  test('JID con parte local sin dígitos no inventa cola', () => {
    expect(mascararChatId('algo@s.whatsapp.net')).toBe('•••••••••@s.whatsapp.net')
  })
})

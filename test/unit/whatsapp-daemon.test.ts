// Tests F1 · W5 — lógica PURA del daemon REAL del canal WhatsApp propio.
// Cubre src/lib/whatsapp/daemon.ts: clasificación de fallos con señal de
// riesgo (disyuntor), plan de reintentos con backoff+jitter y TOPE, parseo
// honesto de las instrucciones del webhook, plan de arranque (sesión casa vs.
// credenciales locales), huella de drift y constructores de payloads firmados.
// Nada toca BD, red ni la librería de WhatsApp (esa vive en la máquina del
// fundador — aquí solo se prueba la decisión).
import { describe, test, expect } from 'bun:test'
import {
  REINTENTOS_MAX,
  RETARDO_BASE_MS,
  SECRETO_MIN,
  clasificarErrorRiesgo,
  planReintento,
  parsearInstruccion,
  planArranque,
  huellaDaemon,
  payloadEntrante,
  payloadMarca,
  payloadPoll,
  firmarCuerpo,
} from '@/lib/whatsapp/daemon'
import { huellaNumero } from '@/lib/whatsapp/sesion'
import { firmarWebhook } from '@/lib/whatsapp/conversacion'

describe('clasificarErrorRiesgo (¿alimenta el disyuntor?)', () => {
  test('las señales de riesgo de la sala son verdadero', () => {
    for (const d of [
      'Timed out waiting for connection',
      'Connection Closed',
      'Stream Errored (conflict)',
      'Internal Server Error (500)',
      'rate limit alcanzado (429)',
      'restart required',
      'Bad Gateway 502',
    ]) {
      expect(clasificarErrorRiesgo(d)).toBe(true)
    }
  })

  test('los fallos benignos NO abren el circuito', () => {
    for (const d of [
      'el número no existe en WhatsApp',
      'texto vacío',
      'LidError: chat no disponible',
      '',
    ]) {
      expect(clasificarErrorRiesgo(d)).toBe(false)
    }
  })

  test('no explota con null/undefined (defensivo)', () => {
    expect(clasificarErrorRiesgo(String(undefined))).toBe(false)
  })
})

describe('planReintento (backoff exponencial + jitter, con TOPE)', () => {
  test('constantes de la casa: tope 3, retardo base 1500', () => {
    expect(REINTENTOS_MAX).toBe(3)
    expect(RETARDO_BASE_MS).toBe(1500)
    expect(SECRETO_MIN).toBe(24)
  })

  test('sin fallos previos: primer reintento con espera positiva', () => {
    const p = planReintento(0, () => 0.5)
    expect(p.reintentar).toBe(true)
    expect(p.rendirse).toBe(false)
    expect(p.esperaMs).toBe(RETARDO_BASE_MS) // jitter neutro con aleatorio 0.5
  })

  test('backoff exponencial: 1 fallo → base, 2 fallos → base·2 (aleatorio neutro)', () => {
    expect(planReintento(1, () => 0.5).esperaMs).toBe(RETARDO_BASE_MS)
    expect(planReintento(2, () => 0.5).esperaMs).toBe(RETARDO_BASE_MS * 2)
  })

  test('el jitter mueve la espera pero jamás la vuelve negativa', () => {
    const max = planReintento(0, () => 1).esperaMs
    const min = planReintento(0, () => 0).esperaMs
    expect(min).toBeGreaterThan(0)
    expect(max).toBeGreaterThan(min)
    for (let i = 0; i < 20; i++) {
      const p = planReintento(0, Math.random)
      expect(p.esperaMs).toBeGreaterThanOrEqual(0)
    }
  })

  test('al alcanzar el TOPE se rinde HONESTO (sin reintentos infinitos)', () => {
    const p = planReintento(REINTENTOS_MAX, () => 0.5)
    expect(p.reintentar).toBe(false)
    expect(p.rendirse).toBe(true)
    expect(p.esperaMs).toBe(0)
    expect(p.detalle).toContain('revisi')
  })

  test('intentos por encima del tope también se rinden', () => {
    expect(planReintento(REINTENTOS_MAX + 5, () => 0.5).rendirse).toBe(true)
  })
})

describe('parsearInstruccion (traducción honesta del webhook)', () => {
  test('responder=true con texto → enviar, con mensajeId para marcar_envio', () => {
    const r = parsearInstruccion(200, { ok: true, responder: true, texto: '¡Hola! Soy Luna…', mensajeId: 'fila-1', estado: 'en_cola', motivo: 'pacing ok' })
    expect(r).toEqual({ accion: 'enviar', texto: '¡Hola! Soy Luna…', mensajeId: 'fila-1', estado: 'en_cola', motivo: 'pacing ok' })
  })

  test('la re-entrega idempotente de una cola viva también es enviar', () => {
    const r = parsearInstruccion(200, { ok: true, idempotente: true, responder: true, texto: 'texto ya en cola', mensajeId: 'fila-2', estado: 'en_cola' })
    expect(r.accion).toBe('enviar')
    expect(r.texto).toBe('texto ya en cola')
  })

  test('responder=false → nada, con motivo (bloqueado_filtro, cola fría)', () => {
    const r = parsearInstruccion(200, { ok: true, responder: false, estado: 'bloqueado_filtro', motivo: 'filtro de edad' })
    expect(r).toEqual({ accion: 'nada', texto: null, mensajeId: null, estado: 'bloqueado_filtro', motivo: 'filtro de edad' })
  })

  test('HTTP 409/503 (contradicción, receptor apagado) → nada honesto, sin crash', () => {
    const r409 = parsearInstruccion(409, { error: 'Contradicción: la fila está enviado…' })
    expect(r409.accion).toBe('nada')
    expect(r409.motivo).toContain('Contradicción')
    const r503 = parsearInstruccion(503, { error: 'Receptor sin secreto' })
    expect(r503.accion).toBe('nada')
  })

  test('respuesta basura o no-objeto → nada (el daemon jamás improvisa)', () => {
    expect(parsearInstruccion(200, null).accion).toBe('nada')
    expect(parsearInstruccion(200, 'basura').accion).toBe('nada')
    expect(parsearInstruccion(200, {}).motivo).toContain('no responder')
    const vacio = parsearInstruccion(200, { responder: true, texto: '   ' })
    expect(vacio.accion).toBe('nada')
  })
})

describe('planArranque (estado de la casa vs. credenciales locales)', () => {
  test('CHAT-X inalcanzable → parar_operador (nada se finge offline)', () => {
    const r = planArranque(null, false, null, null, false)
    expect(r.plan).toBe('parar_operador')
    expect(r.detalle).toContain('no responde')
  })

  test('sesión nueva o desconectada → registrar (espera fresca + confirmar)', () => {
    expect(planArranque('NO_CONFIGURADO', false, null, null, true).plan).toBe('registrar')
    expect(planArranque('DESCONECTADA', false, null, null, true).plan).toBe('registrar')
    expect(planArranque('ESPERANDO_QR', false, null, null, true).plan).toBe('registrar')
    expect(planArranque(null, false, null, null, true).plan).toBe('registrar')
  })

  test('CONECTADA con huella igual y secreto → continuar sin re-handshake', () => {
    const huella = 'abc123'
    const r = planArranque('CONECTADA', true, huella, huella, true)
    expect(r.plan).toBe('continuar')
  })

  test('CONECTADA sin huellas conocidas (daemon recién instalado) → continuar', () => {
    // El daemon aún no sabe su número; la casa ya registró la sesión: sigue.
    expect(planArranque('CONECTADA', true, null, 'abc', true).plan).toBe('continuar')
  })

  test('huella DISTINTA = número cambió → parar_operador (exige rotación humana)', () => {
    const r = planArranque('CONECTADA', true, 'huella-local', 'huella-casa', true)
    expect(r.plan).toBe('parar_operador')
    expect(r.detalle).toContain('rotaci')
  })

  test('CONECTADA sin secreto en la casa → parar_operador (no sobreescribe)', () => {
    const r = planArranque('CONECTADA', false, 'abc', 'abc', true)
    expect(r.plan).toBe('parar_operador')
    expect(r.detalle).toContain('rotar')
  })
})

describe('huellaDaemon (drift con la huella de la casa)', () => {
  test('la huella del daemon y la de sesion.ts son LA MISMA (mismo dominio)', () => {
    expect(huellaDaemon('+573001234567')).toBe(huellaNumero('+573001234567'))
    expect(huellaDaemon('573001234567')).toBe(huellaNumero('573001234567'))
    expect(huellaDaemon('+573001234567')).toHaveLength(32)
    expect(huellaDaemon('+573001234567')).not.toContain('573001234567')
  })
})

describe('payloads firmados (constructores del webhook)', () => {
  const SECRETO = 'secreto-de-prueba-32-chars-minimo-ok'

  test('payloadEntrante: recorta campos y pasa recibidoEn opcional', () => {
    const p = JSON.parse(payloadEntrante('  wa-1 ', ' 573001234567@s.whatsapp.net ', '  hola  ', '2026-11-20T12:00:00.000Z')) as Record<string, unknown>
    expect(p).toEqual({ accion: 'entrante', id: 'wa-1', chatId: '573001234567@s.whatsapp.net', texto: 'hola', recibidoEn: '2026-11-20T12:00:00.000Z' })
    const sinFecha = JSON.parse(payloadEntrante('wa-2', '573001234567@s.whatsapp.net', 'hola')) as Record<string, unknown>
    expect(sinFecha.recibidoEn).toBeUndefined()
  })

  test('payloadMarca: el resultado VERDADERO con detalle recortado a 300', () => {
    const p = JSON.parse(payloadMarca('fila-9', 'fallado', true, 'd'.repeat(500))) as Record<string, unknown>
    expect(p.resultado).toBe('fallado')
    expect(p.errorRiesgo).toBe(true)
    expect((p.detalle as string).length).toBe(300)
  })

  test('payloadPoll es el poll de iniciativas vencidas', () => {
    expect(JSON.parse(payloadPoll())).toEqual({ accion: 'iniciativas_vencidas' })
  })

  test('firmarCuerpo del daemon === firmarWebhook de la casa (un solo cerrojo)', () => {
    const cuerpo = payloadPoll()
    const ts = Date.now()
    expect(firmarCuerpo(ts, cuerpo, SECRETO)).toBe(firmarWebhook(ts, cuerpo, SECRETO))
  })
})

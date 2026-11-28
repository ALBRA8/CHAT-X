// Tests unitarios F1 · W4 — iniciativas programadas del canal WhatsApp propio.
// Deterministas: sin BD, sin red, sin reloj propio (todo inyectado) — mismo
// criterio que los tests de pacing (W1), sesión (W2) y conversación (W3).
import { describe, expect, test } from 'bun:test'
import {
  MAX_BRIEF,
  MAX_HORIZONTE_DIAS,
  MAX_POR_POLL,
  MAX_PROGRAMADAS_POR_CHAT,
  fueraDeHorizonte,
  iniciativaPlantilla,
  resolverIniciativa,
  transicionCancelacion,
  validarProgramacion,
  type CerebroIniciativa,
} from '@/lib/whatsapp/iniciativas'
import { PACING_DEFECTO, decidirEnvio, type MarcaEnvio } from '@/lib/whatsapp/pacing'

const AHORA = new Date('2026-11-20T14:00:00') // viernes 14:00 local — fuera de silencio (22–8)

const cerebroOk: CerebroIniciativa = { texto: '¡Hola! Te escribía para saber cómo vas.', modo: 'plantilla_genoma', meta: {} }

function decision(motivo: string, permitido: boolean, reintentarEn: string | null = null) {
  return { permitido, motivo, reintentarEn, detalle: permitido ? 'ok' : motivo }
}

describe('validarProgramacion', () => {
  test('acepta chatId + fecha ISO + breve', () => {
    const r = validarProgramacion({ chatId: '573001234567@s.whatsapp.net', programadaEn: '2026-11-21T10:00:00Z', texto: 'recordar el estreno' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.datos.chatId).toBe('573001234567@s.whatsapp.net')
      expect(r.datos.programadaEn?.toISOString()).toBe('2026-11-21T10:00:00.000Z')
      expect(r.datos.brief).toBe('recordar el estreno')
    }
  })

  test('programadaEn ausente = vence ya (el pacing decide CUÁNDO)', () => {
    const r = validarProgramacion({ chatId: '573001234567' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.datos.programadaEn).toBeNull()
  })

  test('sin chatId → error humano', () => {
    const r = validarProgramacion({})
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('chatId')
  })

  test('chatId sin dígitos → error', () => {
    const r = validarProgramacion({ chatId: 'no-es-un-chat' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('dígitos')
  })

  test('chatId demasiado largo → error', () => {
    const r = validarProgramacion({ chatId: '5'.repeat(129) })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('demasiado largo')
  })

  test('fecha inválida → error claro (no silencio)', () => {
    const r = validarProgramacion({ chatId: '573001', programadaEn: 'mañana-por-la-noche' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('fecha válida')
  })

  test('el breve se recorta al tope declarado', () => {
    const r = validarProgramacion({ chatId: '573001', texto: 'x'.repeat(500) })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.datos.brief.length).toBe(MAX_BRIEF)
  })
})

describe('horizonte de programación', () => {
  test('dentro del horizonte → ok', () => {
    const en29 = new Date(AHORA.getTime() + (MAX_HORIZONTE_DIAS - 1) * 24 * 3600 * 1000)
    expect(fueraDeHorizonte(en29, AHORA)).toBe(false)
  })
  test('más allá del horizonte → rechazo (acumulación, no plan)', () => {
    const en31 = new Date(AHORA.getTime() + (MAX_HORIZONTE_DIAS + 1) * 24 * 3600 * 1000)
    expect(fueraDeHorizonte(en31, AHORA)).toBe(true)
  })
})

describe('resolverIniciativa (veredicto con disyuntor en vivo)', () => {
  test('pacing ok + cerebro → en_cola con instrucción de envío', () => {
    const v = resolverIniciativa(decision('ok', true), cerebroOk)
    expect(v.entregar).toBe(true)
    expect(v.estado).toBe('en_cola')
    expect(v.textoSalida).toBe(cerebroOk.texto)
    expect(v.meta.pacing).toBe('ok')
    expect(v.meta.modo).toBe('plantilla_genoma')
  })

  test('circuito abierto (disyuntor en vivo) → sigue programada, nada se envía', () => {
    const v = resolverIniciativa(decision('circuito_abierto', false, '2026-11-20T16:00:00.000Z'), null)
    expect(v.entregar).toBe(false)
    expect(v.estado).toBe('sigue_programada')
    expect(v.textoSalida).toBeNull()
    expect(v.meta.pacing).toBe('circuito_abierto')
    expect(v.meta.reintentarEn).toBe('2026-11-20T16:00:00.000Z')
  })

  test('horas silencio → sigue programada con reintentarEn honesto', () => {
    const v = resolverIniciativa(decision('horas_silencio', false, '2026-11-21T08:00:00.000Z'), null)
    expect(v.estado).toBe('sigue_programada')
    expect(v.meta.pacing).toBe('horas_silencio')
  })

  test('techo de iniciativas → sigue programada (no se descarta)', () => {
    const v = resolverIniciativa(decision('techo_iniciativas', false, '2026-11-21T00:00:00.000Z'), null)
    expect(v.estado).toBe('sigue_programada')
  })

  test('calentamiento → sigue programada', () => {
    const v = resolverIniciativa(decision('calentamiento', false, null), null)
    expect(v.estado).toBe('sigue_programada')
  })

  test('pacing ok sin cerebro → guard honesto cerebro_ausente (bug de cableado)', () => {
    const v = resolverIniciativa(decision('ok', true), null)
    expect(v.entregar).toBe(false)
    expect(v.estado).toBe('sigue_programada')
    expect(v.meta.bug).toBe('cerebro_ausente')
  })
})

describe('transicionCancelacion (cancelar = explícito, jamás silencio)', () => {
  test('programada → cancelable', () => {
    expect(transicionCancelacion('programada')).toEqual({ ok: true })
  })
  test('en_cola → no des-instruye (ya se le dijo al daemon)', () => {
    const r = transicionCancelacion('en_cola')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('des-instruir')
  })
  test('enviado → historia, no se cancela', () => {
    const r = transicionCancelacion('enviado')
    expect(r.ok).toBe(false)
  })
  test('fallado → historia, no se cancela', () => {
    const r = transicionCancelacion('fallado')
    expect(r.ok).toBe(false)
  })
  test('bloqueado_pacing → no es estado de iniciativas', () => {
    const r = transicionCancelacion('bloqueado_pacing')
    expect(r.ok).toBe(false)
  })
})

describe('iniciativaPlantilla (fallback del genoma, SFW)', () => {
  test('usa nombre y primera afición del genoma', () => {
    const t = iniciativaPlantilla({ name: 'Luna', genome: JSON.stringify({ tono: 'cálida', aficiones: 'la fotografía, el café', lore: 'fotógrafa urbana' }), style: 'casual' })
    expect(t).toContain('Luna')
    expect(t).toContain('fotografía')
    expect(t).toContain('[cálida]')
    expect(t).toContain('¿Cómo va tu día?')
  })

  test('genoma vacío o corrupto → saludo honesto sin invención', () => {
    const t = iniciativaPlantilla({ name: 'Vega', genome: '{no-json', style: '' })
    expect(t).toContain('Vega')
    expect(t).toContain('¿Cómo va tu día?')
    expect(t).not.toContain('undefined')
  })
})

describe('pacing W1 aplicado a iniciativas (integración con el gate real)', () => {
  const chat = '573001234567@s.whatsapp.net'

  test('primera iniciativa sin historial → permitido', () => {
    const d = decidirEnvio([], chat, true, PACING_DEFECTO, AHORA)
    expect(d.permitido).toBe(true)
    expect(d.motivo).toBe('ok')
  })

  test('3 fallos de riesgo en la ventana → circuito abierto SOLO para iniciativas', () => {
    const marcas: MarcaEnvio[] = [0, 1, 2].map((i) => ({
      chatId: `otro${i}@s.whatsapp.net`,
      t: new Date(AHORA.getTime() - 5 * 60 * 1000),
      tipo: 'respuesta',
      error: true,
    }))
    const iniciativa = decidirEnvio(marcas, chat, true, PACING_DEFECTO, AHORA)
    expect(iniciativa.permitido).toBe(false)
    expect(iniciativa.motivo).toBe('circuito_abierto')
    const respuesta = decidirEnvio(marcas, chat, false, PACING_DEFECTO, AHORA)
    expect(respuesta.permitido).toBe(true) // el disyuntor jamás frena respuestas
  })

  test('horas silencio → bloquea iniciativas (y todo)', () => {
    const noche = new Date('2026-11-20T23:30:00')
    const d = decidirEnvio([], chat, true, PACING_DEFECTO, noche)
    expect(d.permitido).toBe(false)
    expect(d.motivo).toBe('horas_silencio')
    expect(d.reintentarEn).not.toBeNull()
  })

  test('techo de iniciativas por chat y día', () => {
    const marcas: MarcaEnvio[] = Array.from({ length: PACING_DEFECTO.maxIniciativasPorDia }, (_, i) => ({
      chatId: chat,
      t: new Date(AHORA.getTime() - 60 * 60 * 1000),
      tipo: 'iniciativa',
      error: false,
    }))
    const d = decidirEnvio(marcas, chat, true, PACING_DEFECTO, AHORA)
    expect(d.permitido).toBe(false)
    expect(d.motivo).toBe('techo_iniciativas')
  })
})

describe('límites declarados del contrato W4', () => {
  test('los topes son conservadores y están declarados', () => {
    expect(MAX_PROGRAMADAS_POR_CHAT).toBe(3)
    expect(MAX_POR_POLL).toBe(5)
    expect(MAX_HORIZONTE_DIAS).toBe(30)
    expect(MAX_BRIEF).toBe(300)
  })
})

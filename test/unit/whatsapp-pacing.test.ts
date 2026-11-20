// Tests F1 · W1 — pacing anti-ban del daemon WhatsApp propio (sala limpia).
// Cubre src/lib/whatsapp/pacing.ts: disyuntor por fallos de riesgo, horas
// silencio que cruzan medianoche, techos diarios por tipo, calentamiento de
// chats nuevos y jitter obligatorio. Deterministas: fechas fijas + aleatorio
// inyectado. Nada envía nada: es lógica pura.
import { describe, test, expect } from 'bun:test'
import {
  PACING_DEFECTO,
  decidirEnvio,
  retardoConJitter,
  temperatura,
  type MarcaEnvio,
} from '@/lib/whatsapp/pacing'

// Fechas de laboratorio en hora LOCAL del contenedor (mismo TZ que getHours).
const mañana8 = (dia: number) => new Date(2026, 10, dia, 8, 0, 0, 0)
const mediodia = (dia: number) => new Date(2026, 10, dia, 12, 0, 0, 0)
const noche23 = (dia: number) => new Date(2026, 10, dia, 23, 0, 0, 0)
const madrugada3 = (dia: number) => new Date(2026, 10, dia, 3, 0, 0, 0)
const marca = (chatId: string, t: Date, tipo: 'respuesta' | 'iniciativa' = 'respuesta', error = false): MarcaEnvio => ({
  chatId,
  t,
  tipo,
  ...(error ? { error } : {}),
})

describe('PACING_DEFECTO (defectos conservadores declarados)', () => {
  test('ventana silenciosa 22→8, techos bajos y enfriamiento de 2 h', () => {
    expect(PACING_DEFECTO.desdeHoraSilencio).toBe(22)
    expect(PACING_DEFECTO.hastaHoraSilencio).toBe(8)
    expect(PACING_DEFECTO.maxIniciativasPorDia).toBeLessThanOrEqual(10)
    expect(PACING_DEFECTO.maxIniciativasCalentamiento).toBeLessThanOrEqual(3)
    expect(PACING_DEFECTO.enfriamientoMs).toBeGreaterThanOrEqual(60 * 60 * 1000)
  })
})

describe('temperatura (disyuntor por fallos de riesgo)', () => {
  test('menos fallos que el umbral → normal', () => {
    const ahora = mediodia(20)
    const marcas = [marca('c1', new Date(ahora.getTime() - 60_000), 'respuesta', true)]
    expect(temperatura(marcas, PACING_DEFECTO, ahora).estado).toBe('normal')
  })

  test('3 fallos en 30 min → enfriando hasta últimoFallo + 2 h', () => {
    const ahora = mediodia(20)
    const t1 = new Date(ahora.getTime() - 20 * 60_000)
    const t2 = new Date(ahora.getTime() - 10 * 60_000)
    const t3 = new Date(ahora.getTime() - 5 * 60_000)
    const marcas = [marca('c1', t1, 'iniciativa', true), marca('c2', t2, 'iniciativa', true), marca('c3', t3, 'respuesta', true)]
    const temp = temperatura(marcas, PACING_DEFECTO, ahora)
    expect(temp.estado).toBe('enfriando')
    expect(temp.hasta?.getTime()).toBe(t3.getTime() + PACING_DEFECTO.enfriamientoMs)
  })

  test('los fallos VIEJOS (fuera de la ventana) no abren el circuito', () => {
    const ahora = mediodia(20)
    const viejo = new Date(ahora.getTime() - 45 * 60_000)
    const marcas = [marca('c1', viejo, 'iniciativa', true), marca('c2', viejo, 'iniciativa', true), marca('c3', viejo, 'iniciativa', true)]
    expect(temperatura(marcas, PACING_DEFECTO, ahora).estado).toBe('normal')
  })

  test('si el enfriamiento ya venció aunque la ventana siga histórica → normal', () => {
    const ahora = mediodia(20)
    const t = new Date(ahora.getTime() - PACING_DEFECTO.enfriamientoMs - 5 * 60_000)
    const marcas = [marca('c1', t, 'iniciativa', true), marca('c2', t, 'iniciativa', true), marca('c3', t, 'iniciativa', true)]
    expect(temperatura(marcas, PACING_DEFECTO, ahora).estado).toBe('normal')
  })
})

describe('decidirEnvio · horas silencio', () => {
  test('23:00 bloquea ambos tipos y reintenta a las 08:00 del día siguiente', () => {
    const d = decidirEnvio([], 'c1', true, PACING_DEFECTO, noche23(20))
    expect(d.permitido).toBe(false)
    expect(d.motivo).toBe('horas_silencio')
    const reintento = new Date(d.reintentarEn!)
    expect(reintento.getHours()).toBe(8)
    expect(reintento.getDate()).toBe(21)
  })

  test('03:00 bloquea también (ventana que cruza medianoche) y reintenta HOY a las 08:00', () => {
    const d = decidirEnvio([], 'c1', false, PACING_DEFECTO, madrugada3(21))
    expect(d.permitido).toBe(false)
    expect(d.motivo).toBe('horas_silencio')
    const reintento = new Date(d.reintentarEn!)
    expect(reintento.getHours()).toBe(8)
    expect(reintento.getDate()).toBe(21)
  })

  test('08:00 puntual ya está fuera de la ventana → ok', () => {
    const d = decidirEnvio([], 'c1', true, PACING_DEFECTO, mañana8(20))
    expect(d.permitido).toBe(true)
    expect(d.motivo).toBe('ok')
  })
})

describe('decidirEnvio · techos diarios por tipo', () => {
  test('iniciativa #9 del día → techo_iniciativas (defecto: 8), respuesta no le afecta', () => {
    const ahora = mediodia(20)
    const marcas = Array.from({ length: 8 }, (_, i) =>
      marca('c1', new Date(ahora.getTime() - (i + 1) * 600_000), 'iniciativa'),
    )
    const bloqueada = decidirEnvio(marcas, 'c1', true, PACING_DEFECTO, ahora)
    expect(bloqueada.permitido).toBe(false)
    expect(bloqueada.motivo).toBe('techo_iniciativas')
    const reintento = new Date(bloqueada.reintentarEn!)
    expect(reintento.getDate()).toBe(21)
    expect(reintento.getHours()).toBe(0)
  })

  test('respuesta #61 del día → techo_respuestas; la iniciativa de ese chat sigue libre', () => {
    const ahora = mediodia(20)
    const marcas = Array.from({ length: 60 }, (_, i) =>
      marca('c1', new Date(ahora.getTime() - (i + 1) * 60_000), 'respuesta'),
    )
    const bloqueada = decidirEnvio(marcas, 'c1', false, PACING_DEFECTO, ahora)
    expect(bloqueada.permitido).toBe(false)
    expect(bloqueada.motivo).toBe('techo_respuestas')
    const iniciativa = decidirEnvio(marcas, 'c1', true, PACING_DEFECTO, ahora)
    expect(iniciativa.permitido).toBe(true)
  })

  test('los techos son POR DÍA y POR CHAT: lo de ayer y lo de otro chat no cuentan', () => {
    const ahora = mediodia(20)
    const ayer = new Date(2026, 10, 19, 12, 0, 0, 0)
    const marcas = [
      ...Array.from({ length: 8 }, () => marca('c1', ayer, 'iniciativa')),
      ...Array.from({ length: 8 }, () => marca('otro', ahora, 'iniciativa')),
    ]
    expect(decidirEnvio(marcas, 'c1', true, PACING_DEFECTO, ahora).permitido).toBe(true)
  })
})

describe('decidirEnvio · calentamiento de chats nuevos', () => {
  const cfgCorta: typeof PACING_DEFECTO = { ...PACING_DEFECTO, calentamientoMs: 6 * 3600_000, maxIniciativasCalentamiento: 2 }

  test('1ª y 2ª iniciativa dentro de la ventana pasan; la 3ª se bloquea hasta que vence', () => {
    const base = mediodia(20)
    const m1 = new Date(base.getTime() - 2 * 3600_000)
    const m2 = new Date(base.getTime() - 1 * 3600_000)
    const marcas = [marca('c1', m1, 'iniciativa'), marca('c1', m2, 'iniciativa')]
    const bloqueada = decidirEnvio(marcas, 'c1', true, cfgCorta, base)
    expect(bloqueada.permitido).toBe(false)
    expect(bloqueada.motivo).toBe('calentamiento')
    expect(new Date(bloqueada.reintentarEn!).getTime()).toBe(m1.getTime() + cfgCorta.calentamientoMs)
  })

  test('la ventana de calentamiento NO se estira con iniciativas nuevas: fuera de ella el techo vuelve al diario', () => {
    const base = mediodia(20)
    const primera = new Date(base.getTime() - 8 * 3600_000)
    const marcas = [marca('c1', primera, 'iniciativa')]
    const d = decidirEnvio(marcas, 'c1', true, cfgCorta, base)
    expect(d.permitido).toBe(true)
    expect(d.motivo).toBe('ok')
  })

  test('las respuestas jamás se bloquean por calentamiento', () => {
    const base = mediodia(20)
    const marcas = Array.from({ length: 5 }, (_, i) =>
      marca('c1', new Date(base.getTime() - (i + 1) * 600_000), 'iniciativa'),
    )
    const d = decidirEnvio(marcas, 'c1', false, cfgCorta, base)
    expect(d.permitido).toBe(true)
  })

  test('primera iniciativa de un chat sin historial → ok (el calentamiento arranca con ella)', () => {
    expect(decidirEnvio([], 'nuevo', true, PACING_DEFECTO, mediodia(20)).permitido).toBe(true)
  })
})

describe('decidirEnvio · circuito abierto', () => {
  test('iniciativa con el circuito abierto → circuito_abierto con reintento; la respuesta pasa', () => {
    const ahora = mediodia(20)
    const marcas = Array.from({ length: 3 }, (_, i) =>
      marca(`c${i}`, new Date(ahora.getTime() - 10 * 60_000), 'iniciativa', true),
    )
    const iniciativa = decidirEnvio(marcas, 'c9', true, PACING_DEFECTO, ahora)
    expect(iniciativa.permitido).toBe(false)
    expect(iniciativa.motivo).toBe('circuito_abierto')
    expect(new Date(iniciativa.reintentarEn!).getTime()).toBe(
      new Date(ahora.getTime() - 10 * 60_000).getTime() + PACING_DEFECTO.enfriamientoMs,
    )
    const respuesta = decidirEnvio(marcas, 'c9', false, PACING_DEFECTO, ahora)
    expect(respuesta.permitido).toBe(true)
  })
})

describe('retardoConJitter (ritmo entre envíos)', () => {
  test('aleatorio=0 → base − base·p; aleatorio=1 → base + base·p; 0.5 → base exacta', () => {
    expect(retardoConJitter(10_000, 0.3, () => 0)).toBe(7_000)
    expect(retardoConJitter(10_000, 0.3, () => 1)).toBe(13_000)
    expect(retardoConJitter(10_000, 0.3, () => 0.5)).toBe(10_000)
  })

  test('proporción se satura a [0,1] y base ≤ 0 → 0 (sin retardos negativos)', () => {
    expect(retardoConJitter(10_000, 5, () => 1)).toBe(20_000)
    expect(retardoConJitter(10_000, -5, () => 0)).toBe(10_000)
    expect(retardoConJitter(0, 0.5, () => 0.9)).toBe(0)
    expect(retardoConJitter(-100, 0.5, () => 0.9)).toBe(0)
  })
})

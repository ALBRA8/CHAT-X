// Tests unitarios D-015 · A2 — "jobs con coste real" (lógica pura de cola).
// Cubre src/lib/cola.ts: posición en cola sobre la cola completa, duración
// medida en casa, veredicto honesto de coste presupuestado vs real, y
// caducidad de media declarada (null = permanente; caducada NO borra).
import { describe, test, expect } from 'bun:test'
import { duracionMs, estadoCaducidad, posicionesEnCola, resumenCoste } from '@/lib/cola'

describe('posicionesEnCola (posición visible en la respuesta)', () => {
  test('numera 1-based solo los en_cola, en el orden dado', () => {
    const jobs = [
      { id: 'a', status: 'en_cola' },
      { id: 'b', status: 'procesando' },
      { id: 'c', status: 'en_cola' },
      { id: 'd', status: 'listo' },
      { id: 'e', status: 'en_cola' },
    ]
    const pos = posicionesEnCola(jobs)
    expect(pos.get('a')).toBe(1)
    expect(pos.get('c')).toBe(2)
    expect(pos.get('e')).toBe(3)
    expect(pos.has('b')).toBe(false)
    expect(pos.has('d')).toBe(false)
    expect(pos.size).toBe(3)
  })

  test('respeta el orden del worker: priority asc, createdAt asc (el que llega primero numera primero)', () => {
    const jobs = [
      { id: 'prioritario', status: 'en_cola' },
      { id: 'normal', status: 'en_cola' },
      { id: 'tarde', status: 'en_cola' },
    ]
    const pos = posicionesEnCola(jobs)
    expect(pos.get('prioritario')).toBe(1)
    expect(pos.get('normal')).toBe(2)
    expect(pos.get('tarde')).toBe(3)
  })

  test('cola vacía o sin en_cola → mapa vacío (nada inventa un puesto)', () => {
    expect(posicionesEnCola([]).size).toBe(0)
    expect(
      posicionesEnCola([
        { id: 'x', status: 'procesando' },
        { id: 'y', status: 'fallido' },
      ]).size,
    ).toBe(0)
  })
})

describe('duracionMs (análogo honesto de gpu_cost_time)', () => {
  const inicio = new Date('2026-11-20T10:00:00Z')
  const fin = new Date('2026-11-20T10:00:12.400Z')

  test('mide startedAt → finishedAt', () => {
    expect(duracionMs(inicio, fin)).toBe(12400)
  })

  test('null si falta una punta — nunca se inventa duración', () => {
    expect(duracionMs(null, fin)).toBeNull()
    expect(duracionMs(inicio, null)).toBeNull()
    expect(duracionMs(null, null)).toBeNull()
  })

  test('finishedAt anterior a startedAt no da negativo', () => {
    expect(duracionMs(fin, inicio)).toBe(0)
  })
})

describe('resumenCoste (presupuestado vs real por trabajo)', () => {
  test('en cola / procesando → pendiente (aún no hay real que comparar)', () => {
    for (const status of ['en_cola', 'procesando']) {
      const r = resumenCoste(16, 0, status)
      expect(r.veredicto).toBe('pendiente')
      expect(r.presupuestado).toBe(16)
      expect(r.delta).toBe(16)
    }
  })

  test('terminado con real 0 → reembolsado (fallido con reembolso único)', () => {
    const r = resumenCoste(16, 0, 'fallido')
    expect(r.veredicto).toBe('reembolsado')
    expect(r.delta).toBe(16)
  })

  test('real menor que presupuesto → ajustado_bajo con delta positivo (la diferencia volvió al saldo)', () => {
    const r = resumenCoste(16, 12, 'listo')
    expect(r.veredicto).toBe('ajustado_bajo')
    expect(r.delta).toBe(4)
    expect(r.real).toBe(12)
  })

  test('real mayor que presupuesto → ajustado_alto con delta negativo (costó de más y se dice)', () => {
    const r = resumenCoste(10, 13.5, 'listo')
    expect(r.veredicto).toBe('ajustado_alto')
    expect(r.delta).toBe(-3.5)
  })

  test('real = presupuesto → exacto, delta 0', () => {
    const r = resumenCoste(15, 15, 'listo')
    expect(r.veredicto).toBe('exacto')
    expect(r.delta).toBe(0)
  })

  test('redondeo a 1 decimal en todo (flotantes no inventan centavos)', () => {
    const r = resumenCoste(0.3, 0.1, 'listo')
    expect(r.delta).toBeCloseTo(0.2, 5)
    expect(r.presupuestado).toBe(0.3)
    expect(r.real).toBe(0.1)
  })
})

describe('estadoCaducidad (declarada en casa, jamás purga automática)', () => {
  const ahora = new Date('2026-11-20T12:00:00Z')

  test('null = permanente (política por defecto de TODO lo producido)', () => {
    expect(estadoCaducidad(null, ahora)).toBe('permanente')
  })

  test('fecha futura declarada → vigente', () => {
    expect(estadoCaducidad(new Date('2026-12-04T12:00:00Z'), ahora)).toBe('vigente')
  })

  test('fecha pasada declarada → caducada (estado visible, no borrado)', () => {
    expect(estadoCaducidad(new Date('2026-11-06T12:00:00Z'), ahora)).toBe('caducada')
  })

  test('sin "ahora" explícito usa el reloj real y sigue clasificando', () => {
    expect(estadoCaducidad(null)).toBe('permanente')
    expect(estadoCaducidad(new Date(Date.now() + 86_400_000))).toBe('vigente')
    expect(estadoCaducidad(new Date(Date.now() - 86_400_000))).toBe('caducada')
  })
})

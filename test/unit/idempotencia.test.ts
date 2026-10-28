// Tests unitarios de IDEMPOTENCIA y GATES del orquestador (fase de consolidación).
// Cubren las funciones puras nuevas: batchIdFlujo, varianteDeBatch, bloqueadoGateUltra.
// Las rutas con BD se validan además en el suite HTTP (scripts/pruebas_api.sh).
import { describe, test, expect } from 'bun:test'
import { batchIdFlujo, varianteDeBatch, bloqueadoGateUltra, type PasoDef, type EstadoPaso } from '@/lib/flujos'

const pasoUltra: PasoDef = { id: 'w1', tipo: 'ultra_step', nombre: 'Paso WhatsApp', params: {} }
const pasoGate: PasoDef = { id: 'g1', tipo: 'aprobacion_humana', nombre: 'Autorización', requiereAprobacion: true, params: {} }
const pasoOtro: PasoDef = { id: 'o1', tipo: 'registrar_evento', nombre: 'Evento', params: {} }

describe('batchIdFlujo (idempotencia de lotes del Estudio)', () => {
  test('es determinista: misma ejecución+paso → mismo batchId', () => {
    expect(batchIdFlujo('ej-abc', 'p3')).toBe(batchIdFlujo('ej-abc', 'p3'))
  })

  test('distingue ejecuciones distintas y pasos distintos', () => {
    expect(batchIdFlujo('ej-abc', 'p3')).not.toBe(batchIdFlujo('ej-xyz', 'p3'))
    expect(batchIdFlujo('ej-abc', 'p3')).not.toBe(batchIdFlujo('ej-abc', 'p4'))
  })

  test('formato reutilizpor el guard de reuso (prefijo flujo_, hex minúsculas)', () => {
    const id = batchIdFlujo('ej-abc', 'p3')
    expect(id.startsWith('flujo_')).toBe(true)
    expect(id.slice('flujo_'.length)).toMatch(/^[0-9a-f]{16}$/)
  })
})

describe('varianteDeBatch (determinismo de semillas sin Math.random)', () => {
  test('determinista y dentro de rango 0..999', () => {
    for (const b of ['flujo_abc', 'flujo_xyz', batchIdFlujo('e', 'p')]) {
      const v = varianteDeBatch(b)
      expect(v).toBe(varianteDeBatch(b))
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(999)
      expect(Number.isInteger(v)).toBe(true)
    }
  })
})

describe('bloqueadoGateUltra (gate humano estructural de WhatsApp)', () => {
  test('un ultra_step SIN aprobación humana previa queda bloqueado', () => {
    const pasos = [pasoOtro, pasoUltra]
    const estado: Record<string, EstadoPaso> = { o1: { estado: 'completado' } }
    expect(bloqueadoGateUltra(pasoUltra, { estado: 'pendiente' }, 1, pasos, estado)).toBe(true)
  })

  test('con una aprobacion_humana COMPLETADA antes, el ultra_step pasa', () => {
    const pasos = [pasoGate, pasoUltra]
    const estado: Record<string, EstadoPaso> = { g1: { estado: 'completado' } }
    expect(bloqueadoGateUltra(pasoUltra, { estado: 'pendiente' }, 1, pasos, estado)).toBe(false)
  })

  test('una aprobación PENDIENTE (no completada) NO desbloquea', () => {
    const pasos = [pasoGate, pasoUltra]
    const estado: Record<string, EstadoPaso> = { g1: { estado: 'esperando_aprobacion' } }
    expect(bloqueadoGateUltra(pasoUltra, { estado: 'pendiente' }, 1, pasos, estado)).toBe(true)
  })

  test('tras autorizar su propio gate (gateAutorizado), el ultra_step ejecuta', () => {
    const pasos = [pasoOtro, pasoUltra]
    const estado: Record<string, EstadoPaso> = { o1: { estado: 'completado' } }
    const st: EstadoPaso = { estado: 'pendiente', resultado: { gateAutorizado: true, aprobadoPor: 'operador' } }
    expect(bloqueadoGateUltra(pasoUltra, st, 1, pasos, estado)).toBe(false)
  })

  test('no afecta a pasos que no son ultra_step', () => {
    const pasos = [pasoOtro]
    expect(bloqueadoGateUltra(pasoOtro, { estado: 'pendiente' }, 0, pasos, {})).toBe(false)
  })
})

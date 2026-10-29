// CONTRATO youtube_estado — el sondeo de estado debe hablar el contrato REAL
// del motor YOUTUBE-AUTOMATION: GET /api/projects/{pid} devuelve
// { status: 'pending'|<paso>|'ready'|'failed', job: {status}|null }.
// Hallazgo d131124: GET /api/jobs/{id} NO existe en el motor (solo /events y /cancel):
// el paso anterior habría hecho polling a un 404 para siempre.
import { describe, test, expect } from 'bun:test'
import { resuelveEstadoProyectoYT } from '../../src/lib/flujos'

describe('resuelveEstadoProyectoYT (contrato real GET /api/projects/{pid})', () => {
  test('proyecto ready → terminó con éxito aunque el job activo siga corriendo', () => {
    const r = resuelveEstadoProyectoYT({ status: 'ready', job: null, scenes: [] })
    expect(r.termino).toBe(true)
    expect(r.exito).toBe(true)
  })

  test('proyecto failed → terminó con fallo', () => {
    const r = resuelveEstadoProyectoYT({ status: 'failed', job: null })
    expect(r.termino).toBe(true)
    expect(r.exito).toBe(false)
  })

  test('job activo done → éxito (status de proyecto aún en paso intermedio)', () => {
    const r = resuelveEstadoProyectoYT({ status: 'publish', job: { id: 'j1', status: 'done' } })
    expect(r.termino).toBe(true)
    expect(r.exito).toBe(true)
  })

  test('job activo failed o cancelled → fallo', () => {
    for (const st of ['failed', 'cancelled']) {
      const r = resuelveEstadoProyectoYT({ status: 'render', job: { status: st } })
      expect(r.termino).toBe(true)
      expect(r.exito).toBe(false)
    }
  })

  test('en curso NO es terminal: pending, pasos intermedios, job running', () => {
    for (const p of [{ status: 'pending', job: null }, { status: 'script', job: { status: 'running' } }, { status: '', job: undefined }]) {
      const r = resuelveEstadoProyectoYT(p)
      expect(r.termino).toBe(false)
    }
  })

  test('payload vacío o corrupto → en curso (no explota, no finge éxito)', () => {
    for (const v of [null, undefined, 'x', 42, {}]) {
      const r = resuelveEstadoProyectoYT(v)
      expect(r.termino).toBe(false)
      expect(r.exito).toBe(false)
    }
  })

  test('estados del contrato real: el motor usa ready/failed, NO done/complete', () => {
    // El regex antiguo aceptaba "done|complete|success|published" como estado de proyecto:
    // esos valores NO existen en projects.status (son de jobs). Con el contrato real,
    // {status:'done'} del proyecto no debe fingir éxito — es un paso intermedio raro o basura.
    const r = resuelveEstadoProyectoYT({ status: 'done', job: null })
    expect(r.termino).toBe(false)
  })
})

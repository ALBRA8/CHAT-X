// Smoke test A2 (S-010) — verifica en vivo las 3 piezas del patrón:
//   1) posición en cola visible en GET /api/jobs y /api/jobs/[id]
//   2) coste presupuestado vs real (duracionMs + resumenCoste en el DTO)
//   3) caducidad de media declarada en casa (PATCH accion=caducidad + evento compliance)
// Crea fixtures mínimos en la BD dev, consulta la API real del servidor
// standalone y deja todo limpio al final. Honestidad: sin datos inventados
// tras la prueba — la BD queda como estaba (solo herramientas del seed).
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:3000'

async function main() {
  console.log('── Fixtures ──')
  const c = await db.character.create({ data: { name: 'SMOKE-A2', status: 'ACTIVO', seed: 'smoke-a2' } })
  const j1 = await db.job.create({ data: { type: 'lote_fotos', characterId: c.id, priority: 5, status: 'en_cola', costEstimate: 16, payload: '{}' } })
  const j2 = await db.job.create({ data: { type: 'render_final', characterId: c.id, priority: 1, status: 'en_cola', costEstimate: 30, payload: '{}' } })
  const j3 = await db.job.create({
    data: {
      type: 'lote_fotos', characterId: c.id, priority: 5, status: 'listo', costEstimate: 16, costReal: 12,
      startedAt: new Date(Date.now() - 12_400), finishedAt: new Date(), progress: 100, payload: '{}', result: '{}',
    },
  })
  const m = await db.media.create({ data: { characterId: c.id, kind: 'preview', lane: 'PUBLICO', seed: 'smoke-a2-media', prompt: 'piezas de humo', filePath: null } })
  console.log('creados: character', c.id.slice(-6), '· jobs', j1.id.slice(-6), j2.id.slice(-6), j3.id.slice(-6), '· media', m.id.slice(-6))

  console.log('── 1) GET /api/jobs?activos=1 → posición en cola ──')
  const r1 = await fetch(`${BASE}/api/jobs?activos=1`)
  const d1 = (await r1.json()) as { jobs: { id: string; posicionCola: number | null; status: string }[] }
  const pos2 = d1.jobs.find((x) => x.id === j2.id)
  const pos1 = d1.jobs.find((x) => x.id === j1.id)
  console.log('job prioridad 1 → puesto', pos2?.posicionCola, '(esperado 1)')
  console.log('job prioridad 5 → puesto', pos1?.posicionCola, '(esperado 2)')
  if (pos2?.posicionCola !== 1 || pos1?.posicionCola !== 2) throw new Error('FALLO posición en cola')

  console.log('── 2) GET /api/jobs/' + j3.id.slice(-6) + ' → duración medida en casa ──')
  const r2 = await fetch(`${BASE}/api/jobs/${j3.id}`)
  const d2 = (await r2.json()) as { job: { duracionMs: number | null; costEstimate: number; costReal: number } }
  console.log('duracionMs:', d2.job.duracionMs, '(esperado ~12400) · presupuestado', d2.job.costEstimate, '· real', d2.job.costReal)
  if (d2.job.duracionMs === null || Math.abs(d2.job.duracionMs - 12_400) > 2000) throw new Error('FALLO duracionMs')

  console.log('── 3) PATCH /api/media/' + m.id.slice(-6) + ' accion=caducidad ──')
  const futura = new Date(Date.now() + 7 * 86_400_000).toISOString()
  const r3 = await fetch(`${BASE}/api/media/${m.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accion: 'caducidad', caducaEn: futura }),
  })
  const d3 = (await r3.json()) as { media: { caducaEn: string; caducidad: string } }
  console.log('caducidad declarada → estado', d3.media.caducidad, '(esperado vigente)')
  if (d3.media.caducidad !== 'vigente') throw new Error('FALLO caducidad vigente')

  const ev = await db.complianceEvent.findFirst({ where: { type: 'caducidad', mediaId: m.id }, orderBy: { createdAt: 'desc' } })
  console.log('evento compliance caducidad:', ev ? 'registrado (' + JSON.parse(ev.detail).accion + ')' : 'AUSENTE')
  if (!ev) throw new Error('FALLO evento compliance')

  console.log('── caducada derivada (fecha en pasado, sin PATCH) ──')
  await db.media.update({ where: { id: m.id }, data: { caducaEn: new Date(Date.now() - 86_400_000) } })
  const r4 = await fetch(`${BASE}/api/media/${m.id}`)
  const d4 = (await r4.json()) as { media: { caducidad: string } }
  console.log('estado derivado:', d4.media.caducidad, '(esperado caducada)')
  if (d4.media.caducidad !== 'caducada') throw new Error('FALLO caducada derivada')

  console.log('── Limpieza ──')
  await db.complianceEvent.deleteMany({ where: { characterId: c.id } })
  await db.media.delete({ where: { id: m.id } })
  await db.job.deleteMany({ where: { characterId: c.id } })
  await db.character.delete({ where: { id: c.id } })
  console.log('BD limpia. SMOKE A2: TODO OK')
}

main()
  .catch((e) => {
    console.error('SMOKE A2 FALLÓ:', e)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())

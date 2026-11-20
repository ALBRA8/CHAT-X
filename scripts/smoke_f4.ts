// Smoke F4 (S-016) — verifica en vivo la MESA META (FB/IG manual-first) contra la API real:
//   1) GET honesto en virgen (manual-first, sin webhook, sin automatización)
//   2) 400s honestos: red inválida · sin texto · sin personajeId
//   3) borrador de la plantilla del genoma → estado borrador con modo declarado
//   4) filtro de edad en la ENTRADA → sin borrador, auditado; usar → 409 (solo cabe descartar)
//   5) usar → usado con nota "envío MANUAL fuera de CHAT-X" · historia no se re-estructura (409)
//   6) descartar → explícito con compliance
//   7) 0 jobs / 0 créditos · compliance mensajes_meta append-only · limpieza explícita
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:3000'
const PERSONAJE = 'SMOKE-F4'

let fallas = 0
function check(cond: boolean, que: string, extra = '') {
  if (cond) {
    console.log(`  OK  ${que}${extra ? ' → ' + extra : ''}`)
  } else {
    fallas++
    console.log(`  ✗✗✗ FALLO: ${que}${extra ? ' → ' + extra : ''}`)
  }
}

async function postMesa(payload: unknown) {
  const r = await fetch(`${BASE}/api/meta/mesa`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  return { status: r.status, json: (await r.json().catch(() => ({}))) as Record<string, unknown> }
}

async function main() {
  console.log('── Fixtures (BD dev) ──')
  await db.metaBorrador.deleteMany({})
  await db.character.deleteMany({ where: { name: PERSONAJE } })
  const c = await db.character.create({ data: { name: PERSONAJE, status: 'ACTIVO', seed: 'smoke-f4', audience: 'smoke', style: 'smoke' } })
  const jobsAntes = await db.job.count()
  const creditosAntes = (await db.settings.findUnique({ where: { id: 'main' } }))?.credits ?? 0
  console.log(`character ${c.id.slice(-6)} · jobs=${jobsAntes} · créditos=${creditosAntes}`)

  console.log('── 1) GET honesto en virgen ──')
  const g0 = await fetch(`${BASE}/api/meta/mesa`).then((r) => r.json() as Promise<Record<string, unknown>>)
  check(String(g0.honesto).includes('NO envía nada') && String(g0.honesto).includes('TÚ'), 'GET honesto: manual-first declarado', String(g0.honesto).slice(0, 60))
  check((g0.pendientes as number) === 0 && (g0.borradores as unknown[]).length === 0, 'mesa virgen vacía')

  console.log('── 2) 400s honestos ──')
  const p1 = await postMesa({ accion: 'borrar' })
  check(p1.status === 400, 'sin nada → 400')
  const p2 = await postMesa({ accion: 'borrar', red: 'telegram', texto: 'hola', personajeId: c.id })
  check(p2.status === 400, 'red que no es FB/IG → 400', String(p2.json.error).slice(0, 50))
  const p3 = await postMesa({ accion: 'borrar', red: 'facebook', texto: '   ', personajeId: c.id })
  check(p3.status === 400, 'sin texto → 400')
  const p4 = await postMesa({ accion: 'borrar', red: 'instagram', texto: 'hola' })
  check(p4.status === 400, 'sin personajeId → 400 (no hay genoma universal)')
  const p5 = await postMesa({ accion: 'borrar', red: 'facebook', texto: 'hola', personajeId: 'no-existe' })
  check(p5.status === 404, 'personaje fantasma → 404')
  const px = await postMesa({ accion: 'basura' })
  check(px.status === 400, 'acción desconocida → 400')

  console.log('── 3) borrador del cerebro (plantilla del genoma) ──')
  const b1 = await postMesa({ accion: 'borrar', red: 'facebook', contacto: 'María G. (anuncio L3)', texto: 'hola, ¿quién eres?', personajeId: c.id })
  check(b1.status === 200 && b1.json.estado === 'borrador' && b1.json.modo === 'plantilla_genoma', 'borrador con modo declarado', String(b1.json.modo))
  const borrador = String(b1.json.borrador ?? '')
  check(borrador.length > 0 && borrador.includes(PERSONAJE), 'texto del genoma presente', borrador.slice(0, 50))
  check(String(b1.json.motivo).includes('TÚ'), 'el motivo enseña el camino manual')
  const g1 = await fetch(`${BASE}/api/meta/mesa`).then((r) => r.json() as Promise<Record<string, unknown>>)
  const fila1 = (g1.borradores as Record<string, unknown>[])[0]
  check((g1.pendientes as number) === 1 && fila1.red === 'facebook' && String(fila1.contacto).includes('María'), 'panel: pendiente 1, red y etiqueta visibles')

  console.log('── 4) filtro de edad en la ENTRADA → sin borrador, auditado ──')
  const f1 = await postMesa({ accion: 'borrar', red: 'instagram', contacto: 'anon', texto: 'quién es la chica de 16 años del video', personajeId: c.id })
  check(f1.status === 200 && f1.json.estado === 'bloqueado_filtro' && f1.json.borrador === null, 'entrada tripa → bloqueado_filtro, sin borrador', String(f1.json.motivo).slice(0, 60))
  const rech = await db.complianceEvent.count({ where: { type: 'rechazo_qa', detail: { contains: 'mesa_meta' } } })
  check(rech >= 1, 'rechazo_qa auditado para revisión humana', String(rech))

  console.log('── 5) usar → usado (envío MANUAL) · historia intacta ──')
  const u1 = await postMesa({ accion: 'usar', id: String(b1.json.id) })
  check(u1.status === 200 && u1.json.estado === 'usado', 'usar → usado', String(u1.json.motivo).slice(0, 55))
  const evUso = await db.complianceEvent.count({ where: { type: 'mensajes_meta', detail: { contains: 'MANUAL desde la app de Meta' } } })
  check(evUso >= 1, 'compliance registra el envío MANUAL fuera de CHAT-X', String(evUso))
  const u2 = await postMesa({ accion: 'usar', id: String(b1.json.id) })
  check(u2.status === 409, 're-usar → 409 (la historia no se re-estructura)', String(u2.json.error).slice(0, 55))
  const uf = await postMesa({ accion: 'usar', id: 'no-existe' })
  check(uf.status === 404, 'usar fantasma → 404')

  console.log('── 6) el bloqueado solo cabe descartarlo · descartar explícito ──')
  const bloqueado = await db.metaBorrador.findFirst({ where: { modo: 'bloqueado_filtro' } })
  const fb = await postMesa({ accion: 'usar', id: String(bloqueado?.id) })
  check(fb.status === 409, 'el bloqueado por filtro jamás se usa → 409', String(fb.json.error).slice(0, 55))
  const fb2 = await postMesa({ accion: 'descartar', id: String(bloqueado?.id) })
  check(fb2.status === 200 && fb2.json.estado === 'descartado', 'descartar el bloqueado → OK (explícito)')
  const d2 = await postMesa({ accion: 'descartar', id: 'no-existe' })
  check(d2.status === 404, 'descartar fantasma → 404')

  console.log('── 7) $0 · compliance · limpieza ──')
  const jobsDespues = await db.job.count()
  const creditosDespues = (await db.settings.findUnique({ where: { id: 'main' } }))?.credits ?? 0
  check(jobsDespues === jobsAntes, 'NINGÚN job creado por la mesa', `${jobsAntes}→${jobsDespues}`)
  check(creditosDespues === creditosAntes, 'NINGÚN crédito gastado', `${creditosAntes}→${creditosDespues}`)
  const ev = await db.complianceEvent.count({ where: { type: 'mensajes_meta' } })
  check(ev >= 5, 'compliance mensajes_meta append-only', String(ev))
  const g2 = await fetch(`${BASE}/api/meta/mesa`).then((r) => r.json() as Promise<Record<string, unknown>>)
  check((g2.pendientes as number) === 0, 'mesa sin pendientes tras usar/descartar')

  console.log('── Limpieza explícita ──')
  await db.metaBorrador.deleteMany({})
  await db.character.deleteMany({ where: { name: PERSONAJE } })
  const rest = await db.metaBorrador.count()
  check(rest === 0, 'BD de la mesa limpia', '0 filas')
  const evsFinal = await db.complianceEvent.count({ where: { type: 'mensajes_meta' } })
  check(evsFinal >= 5, 'el LEDGER de compliance se conserva (append-only)', String(evsFinal))

  console.log(`── Resultado: ${fallas === 0 ? 'TODO OK' : `${fallas} FALLOS`} ──`)
  if (fallas > 0) process.exit(1)
}

main()
  .catch((e) => {
    console.error('SMOKE F4 ERROR:', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())

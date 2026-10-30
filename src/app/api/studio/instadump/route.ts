// InstaDump nativo (P2.5 de CLONAKIT_BRECHAS): 1 foto/clic → lote multi-escena
// y multi-outfit automático. El planificador determinista (src/lib/instadump.ts)
// expande el ancla del operador en N briefs DISTINTOS conscientes del genoma;
// el resto del pipeline es el lote real de siempre (QA, compliance, cifrado,
// reembolso por fallo) con el filtro de edad aplicado POR BRIEF antes de gastar.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { COSTOS, LANE, detectarTerminosProhibidos, type Lane } from '@/lib/constants'
import { asegurarSaldo, jsonError, jsonOk } from '@/lib/api-utils'
import { iniciarWorker } from '@/lib/worker'
import { registrarEvento } from '@/lib/compliance'
import { PAQUETES_INSTADUMP, planificarInstaDump } from '@/lib/instadump'

export async function POST(req: NextRequest) {
  iniciarWorker()
  const body = await req.json().catch(() => ({}))
  const characterId = String(body.characterId || '')
  const lane = (body.lane === LANE.PRIVADO ? LANE.PRIVADO : LANE.PUBLICO) as Lane
  const count = Math.max(1, Math.min(32, Number(body.count) || 8))
  const paquete = typeof body.paquete === 'string' ? body.paquete : 'mixto'
  // "1 foto" de referencia = ancla opcional (escena/outfit/luz que se respetan
  // en TODAS las piezas; lo demás lo planifica el InstaDump).
  const ancla = {
    escena: typeof body.escena === 'string' ? body.escena : undefined,
    outfit: typeof body.outfit === 'string' ? body.outfit : undefined,
    luz: typeof body.luz === 'string' ? body.luz : undefined,
  }

  if (!(PAQUETES_INSTADUMP as readonly string[]).includes(paquete)) {
    return jsonError(`paquete debe ser uno de: ${PAQUETES_INSTADUMP.join(', ')}`, 422)
  }

  // El ANCLA la escribió el operador: bloqueo DURO igual que /api/studio/lote
  // (nunca reescritura silenciosa de la intención humana). El blindaje del
  // planificador es segunda capa solo para texto heredado del genoma.
  const textoAncla = `${ancla.escena || ''} ${ancla.outfit || ''} ${ancla.luz || ''}`
  const terminosAncla = detectarTerminosProhibidos(textoAncla)
  if (terminosAncla.length > 0) {
    const motivo = `Filtro de edad aparente: término prohibido "${terminosAncla.join('", "')}" en el ancla del InstaDump.`
    await registrarEvento('filtro_edad', { motivo, terminos: terminosAncla, ancla, bloqueo: 'instadump_ancla' }, { characterId })
    return jsonError(motivo, 422, { filtro: 'edad_aparente' })
  }

  const c = await db.character.findUnique({ where: { id: characterId } })
  if (!c) return jsonError('Personaje no encontrado', 404)
  if (c.status !== 'ACTIVO') return jsonError('El personaje debe estar ACTIVO para producir fotos.', 409)

  // Genoma-consciente: las aficiones entran como escenas propias del dump.
  let aficiones: string[] = []
  try {
    const g = JSON.parse(c.genome) as { aficiones?: string }
    aficiones = (g.aficiones || '')
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean)
  } catch {
    aficiones = []
  }

  const plan = planificarInstaDump({
    seedPersonaje: c.seed,
    paquete,
    count,
    aficiones,
    ancla,
    varianteBase: Number(body.varianteBase) || 0,
  })

  // Filtro de edad aparente POR BRIEF, antes de gastar un solo crédito.
  for (const it of plan.items) {
    const b = it.brief
    const terminos = detectarTerminosProhibidos(`${b.escena} ${b.outfit} ${b.pose} ${b.luz}`)
    if (terminos.length > 0) {
      const motivo = `Filtro de edad aparente: término prohibido "${terminos.join('", "')}" en el brief del InstaDump.`
      await registrarEvento('filtro_edad', { motivo, terminos, brief: b, bloqueo: 'instadump', personaje: c.name }, { characterId })
      return jsonError(motivo, 422, { filtro: 'edad_aparente' })
    }
  }

  if (lane === LANE.PRIVADO) {
    const s = await db.settings.findUnique({ where: { id: 'main' } })
    if (!s?.privateHash) return jsonError('Define la contraseña del modo privado antes de usar el carril 18+.', 400)
  }

  const coste = Math.round(COSTOS.PREVIEW * plan.items.length * 10) / 10
  const saldo = await asegurarSaldo(coste)
  if (!saldo.ok) return jsonError(saldo.error!, 402, { saldo: saldo.saldo })

  const batchId = `dump_${Date.now()}_${Math.floor(Math.random() * 1e4)}`
  const job = await db.job.create({
    data: {
      type: 'lote_fotos',
      characterId,
      priority: 4,
      costEstimate: coste,
      payload: JSON.stringify({
        modo: 'preview',
        lane,
        briefs: plan.items,
        batchId,
        varianteBase: Number(body.varianteBase) || 0,
      }),
    },
  })
  await registrarEvento(
    'creacion',
    { tipo: 'instadump', paquete: plan.paquete, piezas: plan.items.length, anclaAplicada: plan.anclaAplicada, coste, lane, batchId },
    { characterId },
  )
  return jsonOk({
    jobId: job.id,
    coste,
    batchId,
    paquete: plan.paquete,
    piezas: plan.items.length,
    escenas: plan.items.map((i) => i.brief.escena),
  })
}

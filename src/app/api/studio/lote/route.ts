// Fábrica de fotos — lote de vistas previas baratas (hasta 32).
// El coste estimado se valida AQUÍ antes de gastar (Anexo A regla 8) y el
// filtro de edad aparente bloquea el brief completo ANTES de generar (rechazo duro real).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { COSTOS, LANE, LOTE_MAX, detectarTerminosProhibidos, type Lane } from '@/lib/constants'
import { asegurarSaldo, jsonError, jsonOk } from '@/lib/api-utils'
import { iniciarWorker } from '@/lib/worker'
import { registrarEvento } from '@/lib/compliance'
import type { Brief } from '@/lib/provider/types'

export async function POST(req: NextRequest) {
  iniciarWorker()
  const body = await req.json().catch(() => ({}))
  const characterId = String(body.characterId || '')
  const lane = (body.lane === LANE.PRIVADO ? LANE.PRIVADO : LANE.PUBLICO) as Lane
  const brief = body.brief as Brief | undefined
  const count = Math.max(1, Math.min(LOTE_MAX, Number(body.count) || 8))

  if (!brief) return jsonError('Falta el brief (escena, outfit, pose, encuadre, luz).')
  const c = await db.character.findUnique({ where: { id: characterId } })
  if (!c) return jsonError('Personaje no encontrado', 404)
  if (c.status !== 'ACTIVO') return jsonError('El personaje debe estar ACTIVO para producir fotos.', 409)

  // ── Filtro de edad aparente: bloqueo duro del brief antes de gastar créditos ──
  const terminos = detectarTerminosProhibidos(`${brief.escena} ${brief.outfit} ${brief.pose} ${brief.luz}`)
  if (terminos.length > 0) {
    const motivo = `Filtro de edad aparente: término prohibido "${terminos.join('", "')}" en el brief.`
    await registrarEvento('filtro_edad', { motivo, terminos, brief, bloqueo: 'brief_completo', personaje: c.name }, { characterId })
    return jsonError(motivo, 422, { filtro: 'edad_aparente' })
  }

  if (lane === LANE.PRIVADO) {
    const s = await db.settings.findUnique({ where: { id: 'main' } })
    if (!s?.privateHash) return jsonError('Define la contraseña del modo privado antes de usar el carril 18+.', 400)
  }

  const coste = Math.round(COSTOS.PREVIEW * count * 10) / 10
  const saldo = await asegurarSaldo(coste)
  if (!saldo.ok) return jsonError(saldo.error!, 402, { saldo: saldo.saldo })

  const batchId = `lote_${Date.now()}_${Math.floor(Math.random() * 1e4)}`
  const job = await db.job.create({
    data: {
      type: 'lote_fotos',
      characterId,
      priority: 4,
      costEstimate: coste,
      payload: JSON.stringify({ modo: 'preview', lane, brief, count, batchId, varianteBase: Number(body.varianteBase) || 0 }),
    },
  })
  await registrarEvento('creacion', { tipo: 'lote_previews', count, coste, lane, brief }, { characterId })
  return jsonOk({ jobId: job.id, coste, batchId })
}

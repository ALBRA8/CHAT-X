// Fábrica de fotos — render final caro solo de las vistas previas elegidas
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { COSTOS, LANE, detectarTerminosProhibidos, type Lane } from '@/lib/constants'
import { asegurarSaldo, jsonError, jsonOk } from '@/lib/api-utils'
import { iniciarWorker } from '@/lib/worker'
import { registrarEvento } from '@/lib/compliance'
import type { Brief } from '@/lib/provider/types'

export async function POST(req: NextRequest) {
  iniciarWorker()
  const body = await req.json().catch(() => ({}))
  const characterId = String(body.characterId || '')
  const lane = (body.lane === LANE.PRIVADO ? LANE.PRIVADO : LANE.PUBLICO) as Lane
  const mediaIds: string[] = Array.isArray(body.mediaIds) ? body.mediaIds : []
  const brief = body.brief as Brief | undefined

  if (!brief) return jsonError('Falta el brief del render final.')
  if (mediaIds.length === 0) return jsonError('Selecciona al menos una vista previa para el render final.')
  if (mediaIds.length > 40) return jsonError('Máximo 40 renders finales por lote.')

  const c = await db.character.findUnique({ where: { id: characterId } })
  if (!c) return jsonError('Personaje no encontrado', 404)

  const previews = await db.media.findMany({ where: { id: { in: mediaIds } } })
  if (previews.length !== mediaIds.length) return jsonError('Hay vistas previas que no existen.', 400)
  if (previews.some((p) => p.characterId !== characterId)) return jsonError('Las piezas no pertenecen a ese personaje.', 400)
  if (previews.some((p) => p.lane !== lane)) return jsonError('El carril de las piezas no coincide con el modo del estudio.', 400)

  const terminos = detectarTerminosProhibidos(`${brief.escena} ${brief.outfit} ${brief.pose} ${brief.luz}`)
  if (terminos.length > 0) {
    const motivo = `Filtro de edad aparente: término prohibido "${terminos.join('", "')}" en el brief.`
    await registrarEvento('filtro_edad', { motivo, terminos, brief, bloqueo: 'render_final', personaje: c.name }, { characterId })
    return jsonError(motivo, 422, { filtro: 'edad_aparente' })
  }

  const coste = Math.round(COSTOS.RENDER_FINAL * mediaIds.length * 10) / 10
  const saldo = await asegurarSaldo(coste)
  if (!saldo.ok) return jsonError(saldo.error!, 402, { saldo: saldo.saldo })

  const batchId = `render_${Date.now()}_${Math.floor(Math.random() * 1e4)}`
  const job = await db.job.create({
    data: {
      type: 'render_final',
      characterId,
      priority: 3,
      costEstimate: coste,
      payload: JSON.stringify({ lane, brief, mediaIds, batchId }),
    },
  })
  await registrarEvento('creacion', { tipo: 'render_final', piezas: mediaIds.length, coste, lane }, { characterId })
  return jsonOk({ jobId: job.id, coste, batchId })
}

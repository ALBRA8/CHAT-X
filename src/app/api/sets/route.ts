// Sets: agrupaciones de piezas aprobadas y cifradas (ficha sección 6)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { LANE, PIPELINE, type Lane } from '@/lib/constants'
import { setDTO } from '@/lib/dto'
import { jsonError, jsonOk } from '@/lib/api-utils'
import { iniciarWorker } from '@/lib/worker'
import { registrarEvento } from '@/lib/compliance'

export async function GET() {
  iniciarWorker()
  const sets = await db.set.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { media: true } }, character: { select: { name: true } } },
  })
  return NextResponse.json({
    sets: sets.map((s) => ({ ...setDTO(s, s._count.media), characterName: s.character.name })),
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const characterId = String(body.characterId || '')
  const lane = (body.lane === LANE.PRIVADO ? LANE.PRIVADO : LANE.PUBLICO) as Lane
  const mediaIds: string[] = Array.isArray(body.mediaIds) ? body.mediaIds : []
  const name = String(body.name || '').trim()

  if (!name) return jsonError('El set necesita un nombre.')
  if (mediaIds.length === 0) return jsonError('Selecciona las piezas del set.')

  const c = await db.character.findUnique({ where: { id: characterId } })
  if (!c) return jsonError('Personaje no encontrado', 404)

  const piezas = await db.media.findMany({ where: { id: { in: mediaIds } } })
  if (piezas.length !== mediaIds.length) return jsonError('Hay piezas que no existen.', 400)
  if (piezas.some((p) => p.characterId !== characterId)) return jsonError('Todas las piezas deben ser del mismo personaje.', 400)
  if (piezas.some((p) => p.lane !== lane)) {
    return jsonError('Regla dura de carriles: un set no puede mezclar carril público y privado.', 400)
  }
  if (piezas.some((p) => p.setId)) return jsonError('Alguna pieza ya pertenece a otro set.', 409)

  const estadosValidos = lane === LANE.PRIVADO ? [PIPELINE.CIFRADO] : [PIPELINE.APROBADO]
  const malas = piezas.filter((p) => !estadosValidos.includes(p.pipelineStatus as never))
  if (malas.length > 0) {
    return jsonError(
      lane === LANE.PRIVADO
        ? 'Las piezas privadas deben estar cifradas (QA aprobado) antes de armar el set.'
        : 'Las piezas públicas deben estar aprobadas por QA antes de armar el set.',
      409,
      { piezasMalas: malas.map((p) => p.id) },
    )
  }

  const sugerido = Number(body.suggestedPrice) || Math.round(mediaIds.length * 1.5 * 10) / 10
  const set = await db.set.create({
    data: {
      characterId,
      name,
      lane,
      caption: String(body.caption || ''),
      suggestedPrice: sugerido,
      publishStatus: lane === LANE.PRIVADO ? 'cifrado' : 'borrador',
    },
  })
  await db.media.updateMany({ where: { id: { in: mediaIds } }, data: { setId: set.id } })
  await registrarEvento('creacion', { tipo: 'set', nombre: name, piezas: mediaIds.length, lane, precioSugerido: sugerido }, { characterId })

  return jsonOk({ set: setDTO(set, mediaIds.length) }, 201)
}

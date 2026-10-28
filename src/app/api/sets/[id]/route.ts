import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { setDTO, mediaDTO } from '@/lib/dto'
import { PIPELINE } from '@/lib/constants'
import { jsonError, jsonOk } from '@/lib/api-utils'
import { iniciarWorker } from '@/lib/worker'
import { registrarEvento } from '@/lib/compliance'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  iniciarWorker()
  const { id } = await ctx.params
  const s = await db.set.findUnique({ where: { id }, include: { media: { orderBy: { createdAt: 'asc' } } } })
  if (!s) return jsonError('Set no encontrado', 404)
  const { media, ...base } = s
  return NextResponse.json({
    set: setDTO(base, media.length),
    piezas: media.map(mediaDTO),
  })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const s = await db.set.findUnique({ where: { id } })
  if (!s) return jsonError('Set no encontrado', 404)

  // Acción: registrar publicación (flujo B paso 5 — carga manual guiada en la plataforma)
  if (body.accion === 'publicar') {
    const precio = Number(body.realPrice) || s.suggestedPrice
    await db.set.update({
      where: { id },
      data: { publishStatus: 'publicado', publishedAt: new Date(), realPrice: precio },
    })
    await db.media.updateMany({ where: { setId: id }, data: { pipelineStatus: PIPELINE.PUBLICADO } })
    await registrarEvento(
      'publicacion',
      { set: s.name, personaje: s.characterId, precio, destino: 'Fanvue (carga guiada/manual)', etiquetaIA: s.aiLabel },
      { characterId: s.characterId },
    )
    return jsonOk({ ok: true })
  }

  const data: Record<string, unknown> = {}
  if (typeof body.caption === 'string') data.caption = body.caption
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
  if (typeof body.suggestedPrice === 'number' && body.suggestedPrice >= 0) data.suggestedPrice = body.suggestedPrice
  if (typeof body.realPrice === 'number' && body.realPrice >= 0) data.realPrice = body.realPrice
  if (typeof body.revenue === 'number' && body.revenue >= 0) data.revenue = body.revenue
  const updated = await db.set.update({ where: { id }, data })
  const count = await db.media.count({ where: { setId: id } })
  return NextResponse.json({ set: setDTO(updated, count) })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  await db.media.updateMany({ where: { setId: id }, data: { setId: null } })
  await db.set.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

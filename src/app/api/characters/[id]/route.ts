import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { characterDTO, loraDTO } from '@/lib/dto'
import { iniciarWorker } from '@/lib/worker'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  iniciarWorker()
  const { id } = await ctx.params
  const c = await db.character.findUnique({
    where: { id },
    include: { loraVersions: { orderBy: { createdAt: 'desc' } } },
  })
  if (!c) return NextResponse.json({ error: 'Personaje no encontrado' }, { status: 404 })
  const { loraVersions, ...base } = c
  return NextResponse.json({
    character: characterDTO(base),
    loraVersions: loraVersions.map(loraDTO),
  })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const c = await db.character.findUnique({ where: { id } })
  if (!c) return NextResponse.json({ error: 'Personaje no encontrado' }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
  if (typeof body.audience === 'string') data.audience = body.audience
  if (typeof body.style === 'string') data.style = body.style
  if (typeof body.anchorTrait === 'string') data.anchorTrait = body.anchorTrait
  if (typeof body.seed === 'string' && body.seed.trim()) data.seed = body.seed.trim()
  if (body.atributos || body.aficiones !== undefined || body.lore !== undefined || body.tono !== undefined) {
    const prev = JSON.parse(c.genome || '{}')
    data.genome = JSON.stringify({
      atributos: body.atributos ?? prev.atributos ?? {},
      aficiones: body.aficiones ?? prev.aficiones ?? '',
      lore: body.lore ?? prev.lore ?? '',
      tono: body.tono ?? prev.tono ?? '',
    })
  }
  if (Array.isArray(body.signKit)) data.signKit = JSON.stringify(body.signKit)
  if (typeof body.status === 'string' && ['BORRADOR', 'ENTRENANDO', 'ACTIVO', 'PAUSADA'].includes(body.status)) {
    data.status = body.status
  }

  const updated = await db.character.update({ where: { id }, data })
  return NextResponse.json({ character: characterDTO(updated) })
}

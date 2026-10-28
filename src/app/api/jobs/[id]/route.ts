import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jobDTO } from '@/lib/dto'
import { iniciarWorker } from '@/lib/worker'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  iniciarWorker()
  const { id } = await ctx.params
  const j = await db.job.findUnique({ where: { id }, include: { character: { select: { name: true } } } })
  if (!j) return NextResponse.json({ error: 'Trabajo no encontrado' }, { status: 404 })
  const { character, ...base } = j
  return NextResponse.json({ job: { ...jobDTO(base), characterName: character?.name ?? null } })
}

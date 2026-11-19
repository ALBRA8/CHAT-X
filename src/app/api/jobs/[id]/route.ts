import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jobDTO } from '@/lib/dto'
import { JOB_STATUS } from '@/lib/constants'
import { posicionesEnCola } from '@/lib/cola'
import { iniciarWorker } from '@/lib/worker'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  iniciarWorker()
  const { id } = await ctx.params
  const j = await db.job.findUnique({ where: { id }, include: { character: { select: { name: true } } } })
  if (!j) return NextResponse.json({ error: 'Trabajo no encontrado' }, { status: 404 })
  const { character, ...base } = j
  // A2/D-015 — posición en cola del job individual, calculada sobre la cola
  // completa en el mismo orden del worker (no sobre suposiciones locales).
  let posicionCola: number | null = null
  if (base.status === JOB_STATUS.EN_COLA) {
    const cola = await db.job.findMany({
      where: { status: JOB_STATUS.EN_COLA },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, status: true },
    })
    posicionCola = posicionesEnCola(cola).get(id) ?? null
  }
  return NextResponse.json({ job: { ...jobDTO(base), characterName: character?.name ?? null, posicionCola } })
}

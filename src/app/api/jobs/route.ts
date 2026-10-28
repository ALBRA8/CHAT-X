import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jobDTO } from '@/lib/dto'
import { JOB_STATUS } from '@/lib/constants'
import { iniciarWorker } from '@/lib/worker'

export async function GET(req: NextRequest) {
  iniciarWorker()
  const sp = req.nextUrl.searchParams
  const activos = sp.get('activos') === '1'
  const characterId = sp.get('characterId')

  const where: Record<string, unknown> = activos
    ? { status: { in: [JOB_STATUS.EN_COLA, JOB_STATUS.PROCESANDO] } }
    : {}
  if (characterId) where.characterId = characterId

  const jobs = await db.job.findMany({
    where,
    orderBy: activos ? [{ priority: 'asc' }, { createdAt: 'asc' }] : { createdAt: 'desc' },
    take: activos ? 50 : 60,
    include: { character: { select: { name: true } } },
  })
  return NextResponse.json({
    jobs: jobs.map((j) => ({ ...jobDTO(j), characterName: j.character?.name ?? null })),
  })
}

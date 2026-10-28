import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { mediaDTO } from '@/lib/dto'
import { LANE } from '@/lib/constants'
import { iniciarWorker } from '@/lib/worker'

export async function GET(req: NextRequest) {
  iniciarWorker()
  const sp = req.nextUrl.searchParams
  const where: Record<string, unknown> = {}
  if (sp.get('characterId')) where.characterId = sp.get('characterId')
  if (sp.get('lane')) where.lane = sp.get('lane') === LANE.PRIVADO ? LANE.PRIVADO : LANE.PUBLICO
  if (sp.get('pipelineStatus')) where.pipelineStatus = sp.get('pipelineStatus')
  if (sp.get('kind')) where.kind = sp.get('kind')
  if (sp.get('veredicto')) where.qualityVerdict = sp.get('veredicto')
  if (sp.get('setId')) where.setId = sp.get('setId')
  if (sp.get('batchId')) where.batchId = sp.get('batchId')
  if (sp.get('desde') || sp.get('hasta')) {
    where.createdAt = {}
    if (sp.get('desde')) (where.createdAt as Record<string, unknown>).gte = new Date(sp.get('desde')!)
    if (sp.get('hasta')) (where.createdAt as Record<string, unknown>).lte = new Date(sp.get('hasta')!)
  }
  // La biblioteca muestra piezas reales (no caras canónicas ni datasets)
  if (!sp.get('kind')) where.kind = { in: ['preview', 'final', 'examen'] }

  const limit = Math.min(200, Number(sp.get('limit')) || 100)
  const media = await db.media.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { set: { select: { id: true, name: true, publishStatus: true } } },
  })
  return NextResponse.json({ media: media.map((m) => ({ ...mediaDTO(m), set: m.set })) })
}

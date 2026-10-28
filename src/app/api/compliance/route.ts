// Vista Compliance (ficha 4.6): eventos append-only + ficha auditable por pieza
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { complianceDTO, mediaDTO } from '@/lib/dto'
import { iniciarWorker } from '@/lib/worker'

export async function GET(req: NextRequest) {
  iniciarWorker()
  const sp = req.nextUrl.searchParams
  const limit = Math.min(300, Number(sp.get('limit')) || 120)
  const type = sp.get('type')

  const eventos = await db.complianceEvent.findMany({
    where: type ? { type } : {},
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  const piezas = await db.media.findMany({
    where: { kind: { in: ['preview', 'render', 'examen'] } },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { set: { select: { name: true, publishStatus: true } } },
  })

  return NextResponse.json({
    eventos: eventos.map(complianceDTO),
    piezas: piezas.map((p) => {
      const { set, ...base } = p
      return {
        ...mediaDTO(base),
        set,
        destinoPublicacion: set ? `${set.name} (${set.publishStatus})` : null,
      }
    }),
  })
}

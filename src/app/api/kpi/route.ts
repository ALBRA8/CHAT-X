// KPIs por personaje y mes (ficha sección 6): ingresos pegados a mano o por CSV en F1
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { mesActual } from '@/lib/constants'

export async function GET() {
  const [entries, characters] = await Promise.all([
    db.kpiEntry.findMany({ orderBy: { month: 'desc' }, include: { character: { select: { name: true } } } }),
    db.character.findMany({ select: { id: true, name: true, status: true } }),
  ])

  // Métricas calculadas por personaje/mes
  const hace30d = new Date(Date.now() - 30 * 24 * 3600 * 1000)
  const agregados = await Promise.all(
    characters.map(async (c) => {
      const [gpu, publicadas, total, rechazadas] = await Promise.all([
        db.job.aggregate({ where: { characterId: c.id, createdAt: { gte: hace30d } }, _sum: { costReal: true } }),
        db.media.count({ where: { characterId: c.id, pipelineStatus: 'publicado' } }),
        db.media.count({ where: { characterId: c.id, kind: { in: ['preview', 'render', 'examen'] } } }),
        db.media.count({ where: { characterId: c.id, qualityVerdict: 'RECHAZADO' } }),
      ])
      return {
        characterId: c.id,
        nombre: c.name,
        estado: c.status,
        costeGpuMes: Math.round((gpu._sum.costReal ?? 0) * 10) / 10,
        piezasPublicadas: publicadas,
        tasaRechazoQa: total > 0 ? Math.round((rechazadas / total) * 1000) / 10 : 0,
      }
    }),
  )

  return NextResponse.json({
    entries: entries.map((e) => ({ ...e, characterName: e.character.name })),
    agregados,
    mesActual: mesActual(),
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const characterId = String(body.characterId || '')
  const month = String(body.month || mesActual())
  if (!characterId) return NextResponse.json({ error: 'Falta el personaje.' }, { status: 400 })

  const data = {
    revenue: Number(body.revenue) || 0,
    subs: Number(body.subs) || 0,
    paidMessages: Number(body.paidMessages) || 0,
    ppv: Number(body.ppv) || 0,
    source: 'manual' as const,
  }
  const entry = await db.kpiEntry.upsert({
    where: { characterId_month: { characterId, month } },
    create: { characterId, month, ...data },
    update: data,
  })
  return NextResponse.json({ entry })
}

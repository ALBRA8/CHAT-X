import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jobDTO } from '@/lib/dto'
import { JOB_STATUS } from '@/lib/constants'
import { posicionesEnCola } from '@/lib/cola'
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

  // A2/D-015 — posición en cola VISIBLE en la respuesta: se calcula sobre la
  // cola COMPLETA (todos los en_cola en el MISMO orden del worker: priority
  // asc, createdAt asc), no sobre la página devuelta — si solo devolviéramos
  // 50 trabajos recientes, el puesto real del job podría mentir.
  const colaCompleta = await db.job.findMany({
    where: { status: JOB_STATUS.EN_COLA },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, status: true },
  })
  const posiciones = posicionesEnCola(colaCompleta)

  return NextResponse.json({
    jobs: jobs.map((j) => ({
      ...jobDTO(j),
      characterName: j.character?.name ?? null,
      // null para todo lo que no está esperando (procesando/listo/fallido).
      posicionCola: posiciones.get(j.id) ?? null,
    })),
  })
}

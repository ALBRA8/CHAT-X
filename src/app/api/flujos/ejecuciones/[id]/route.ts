// Estado en vivo de una ejecución (polling del frontend).
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ejecucion = await db.flujoEjecucion.findUnique({ where: { id }, include: { flujo: { select: { nombre: true, definicion: true } } } })
  if (!ejecucion) return NextResponse.json({ error: 'Ejecución no encontrada.' }, { status: 404 })
  return NextResponse.json({ ejecucion })
}

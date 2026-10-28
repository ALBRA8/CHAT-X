// Detalle de un flujo + sus últimas ejecuciones.
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const flujo = await db.flujo.findUnique({
    where: { id },
    include: { ejecuciones: { orderBy: { createdAt: 'desc' }, take: 15 } },
  })
  if (!flujo) return NextResponse.json({ error: 'Flujo no encontrado.' }, { status: 404 })
  return NextResponse.json({ flujo })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const flujo = await db.flujo.findUnique({ where: { id } })
  if (!flujo) return NextResponse.json({ error: 'Flujo no encontrado.' }, { status: 404 })
  // Baja lógica: no destruimos historial de ejecuciones (trazabilidad).
  await db.flujo.update({ where: { id }, data: { activo: false } })
  return NextResponse.json({ ok: true, mensaje: 'Flujo desactivado (historial conservado).' })
}

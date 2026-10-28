// Cancelación de una ejecución en curso o en espera de aprobación.
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { registroEvento } from '@/lib/integracion-eventos'

export const dynamic = 'force-dynamic'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ejecucion = await db.flujoEjecucion.findUnique({ where: { id } })
  if (!ejecucion) return NextResponse.json({ error: 'Ejecución no encontrada.' }, { status: 404 })
  if (!['en_curso', 'esperando_aprobacion'].includes(ejecucion.estado)) {
    return NextResponse.json({ error: `No se puede cancelar una ejecución en estado ${ejecucion.estado}.` }, { status: 409 })
  }
  const registro = JSON.parse(ejecucion.registro) as { ts: string; paso: string; nivel: string; mensaje: string }[]
  registro.push({ ts: new Date().toISOString(), paso: 'inicio', nivel: 'warn', mensaje: 'Cancelada por el operador.' })
  await db.flujoEjecucion.update({ where: { id }, data: { estado: 'cancelada', finishedAt: new Date(), registro: JSON.stringify(registro.slice(-500)) } })
  await registroEvento('sistema', 'flujo.cancelado', { ejecucionId: id })
  return NextResponse.json({ ok: true })
}

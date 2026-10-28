// Ejecutar un flujo: crea la ejecución y arranca el corredor (fire-and-forget).
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { correrEjecucion } from '@/lib/flujos'
import { registroEvento } from '@/lib/integracion-eventos'

export const dynamic = 'force-dynamic'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const flujo = await db.flujo.findUnique({ where: { id } })
  if (!flujo) return NextResponse.json({ error: 'Flujo no encontrado.' }, { status: 404 })
  if (!flujo.activo) return NextResponse.json({ error: 'El flujo está desactivado.' }, { status: 409 })

  // Límite de seguridad: máx 3 ejecuciones en curso de un mismo flujo
  const enCurso = await db.flujoEjecucion.count({ where: { flujoId: id, estado: { in: ['en_curso', 'esperando_aprobacion'] } } })
  if (enCurso >= 3) {
    return NextResponse.json({ error: 'Ya hay 3 ejecuciones en curso de este flujo. Espera a que terminen o cancélalas.' }, { status: 429 })
  }

  const ejecucion = await db.flujoEjecucion.create({
    data: { flujoId: id, estado: 'en_curso', registro: JSON.stringify([{ ts: new Date().toISOString(), paso: 'inicio', nivel: 'info', mensaje: `Ejecución creada para "${flujo.nombre}".` }]) },
  })
  await registroEvento('sistema', 'flujo.iniciado', { flujoId: id, flujo: flujo.nombre, ejecucionId: ejecucion.id })
  void correrEjecucion(ejecucion.id)
  return NextResponse.json({ ejecucionId: ejecucion.id }, { status: 202 })
}

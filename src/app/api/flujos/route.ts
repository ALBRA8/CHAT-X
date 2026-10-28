// API de flujos: listar (siembra el demo y las plantillas E2E la primera vez) y crear con validación estricta.
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { FLUJO_DEMO, FLUJOS_PLANTILLAS, validarDefinicion } from '@/lib/flujos'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Siembra idempotente por nombre: demo + plantillas de la orden maestra (leads→CRM→WhatsApp y plan→calendario).
  const semillas = [FLUJO_DEMO, ...FLUJOS_PLANTILLAS]
  for (const s of semillas) {
    const existe = await db.flujo.findFirst({ where: { nombre: s.nombre } })
    if (!existe) {
      await db.flujo.create({ data: { nombre: s.nombre, descripcion: s.descripcion, definicion: JSON.stringify(s.pasos) } })
    }
  }
  const flujos = await db.flujo.findMany({ orderBy: { createdAt: 'asc' }, include: { ejecuciones: { orderBy: { createdAt: 'desc' }, take: 5 } } })
  return NextResponse.json({ flujos })
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { nombre?: string; descripcion?: string; pasos?: unknown }
    const nombre = (body.nombre ?? '').trim()
    if (nombre.length < 3 || nombre.length > 120) {
      return NextResponse.json({ error: 'El nombre debe tener entre 3 y 120 caracteres.' }, { status: 422 })
    }
    const v = validarDefinicion(body.pasos)
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 422 })
    const flujo = await db.flujo.create({
      data: { nombre, descripcion: (body.descripcion ?? '').slice(0, 600), definicion: JSON.stringify(v.pasos) },
    })
    return NextResponse.json({ flujo }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Cuerpo JSON inválido.' }, { status: 400 })
  }
}

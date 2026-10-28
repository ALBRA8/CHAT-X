// Detalle + configuración de un motor. GET = sonda real + datos reales del
// contrato; PUT = guardar URL/credencial de conexión.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { defMotor, estadoMotor, datosRealesMotor, MOTOR_IDS, type MotorId } from '@/lib/motores'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ motor: string }> }) {
  const { motor } = await params
  if (!defMotor(motor)) return NextResponse.json({ error: `Motor desconocido: ${motor}` }, { status: 404 })
  const estado = await estadoMotor(motor as MotorId)
  let datos: { ok: boolean; detalle: string; datos?: unknown } | null = null
  if (estado.estado.estado === 'OPERATIVO') {
    const row = await db.motorConfig.findUnique({ where: { motor } })
    datos = await datosRealesMotor(motor as MotorId, row?.url || defMotor(motor)!.urlPorDefecto, row?.apiKey || '')
  }
  return NextResponse.json({ estado, datos })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ motor: string }> }) {
  const { motor } = await params
  const def = defMotor(motor)
  if (!def) return NextResponse.json({ error: `Motor desconocido: ${motor}` }, { status: 404 })
  const body = (await req.json().catch(() => ({}))) as { url?: string; apiKey?: string }
  const url = (body.url ?? '').trim()
  const apiKey = (body.apiKey ?? '').trim()
  if (url && !/^https?:\/\//.test(url)) {
    return NextResponse.json({ error: 'La URL debe empezar por http:// o https://' }, { status: 400 })
  }
  if (url.length > 300) return NextResponse.json({ error: 'URL demasiado larga.' }, { status: 400 })
  if (/^https?:\/\/[^\s/:@]+:[^\s/:@]+@/.test(url)) {
    return NextResponse.json({ error: 'No incrustes usuario:contraseña en la URL — guárdalo como apiKey.' }, { status: 400 })
  }
  if (apiKey.length > 500) return NextResponse.json({ error: 'API key demasiado larga (máx 500).' }, { status: 400 })
  await db.motorConfig.upsert({
    where: { motor },
    create: { motor, url, apiKey },
    update: { url, apiKey },
  })
  const estado = await estadoMotor(motor as MotorId)
  return NextResponse.json({ ok: true, estado })
}

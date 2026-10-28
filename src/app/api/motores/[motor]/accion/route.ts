// Acciones reales contra un motor vía su contrato (host externo).
// - youtube: validar un envelope Production JSON (POST /api/production_json/validate)
// - resto: lectura de datos reales que el contrato del motor expone al host.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { defMotor, sondearMotor, datosRealesMotor, type MotorId } from '@/lib/motores'

export const dynamic = 'force-dynamic'

async function config(motor: MotorId): Promise<{ url: string; apiKey: string }> {
  const row = await db.motorConfig.findUnique({ where: { motor } })
  return { url: row?.url || defMotor(motor)!.urlPorDefecto, apiKey: row?.apiKey || '' }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ motor: string }> }) {
  const { motor } = await params
  const def = defMotor(motor)
  if (!def) return NextResponse.json({ error: `Motor desconocido: ${motor}` }, { status: 404 })
  const id = motor as MotorId
  const body = (await req.json().catch(() => ({}))) as { accion?: string; envelope?: string }
  const { url, apiKey } = await config(id)

  if (id === 'youtube' && body.accion === 'validar_production') {
    const sonda = await sondearMotor(id, url, apiKey)
    if (sonda.estado !== 'OPERATIVO') {
      return NextResponse.json({ ok: false, detalle: `Motor no operativo: ${sonda.detalle}` }, { status: 502 })
    }
    let envelope: unknown
    try {
      envelope = JSON.parse(body.envelope ?? '')
    } catch {
      return NextResponse.json({ ok: false, detalle: 'El envelope no es JSON válido.' }, { status: 400 })
    }
    const base = url.replace(/\/+$/, '')
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 15000)
    try {
      const res = await fetch(`${base}/api/production_json/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
        body: JSON.stringify(envelope),
        signal: ctrl.signal,
      })
      const texto = await res.text()
      return NextResponse.json({ ok: res.ok, httpStatus: res.status, detalle: `Respuesta del motor (HTTP ${res.status})`, respuesta: texto.slice(0, 8000) })
    } catch (e) {
      return NextResponse.json({ ok: false, detalle: `Fallo de validación contra el motor: ${e instanceof Error ? e.message : 'error'}` }, { status: 502 })
    } finally {
      clearTimeout(t)
    }
  }

  // Acción genérica: leer datos reales expuestos por el contrato del motor.
  const datos = await datosRealesMotor(id, url, apiKey)
  return NextResponse.json(datos, { status: datos.ok ? 200 : 502 })
}

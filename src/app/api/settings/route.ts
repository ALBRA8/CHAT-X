import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { asegurarSettings, registrarEvento } from '@/lib/compliance'
import { parseJson } from '@/lib/dto'
import { iniciarWorker } from '@/lib/worker'

export async function GET() {
  iniciarWorker()
  const s = await asegurarSettings()
  const { gastoHoy } = await import('@/lib/api-utils')
  return NextResponse.json({
    credits: s.credits,
    limiteDiario: s.limiteDiario ?? 0,
    gastoHoy: await gastoHoy(),
    privadaDefinida: Boolean(s.privateHash),
    presets: parseJson<unknown[]>(s.presets, []),
    provider: process.env.ESTUDIO_PROVIDER || 'simulador',
  })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const data: Record<string, unknown> = {}

  if (typeof body.credits === 'number' && body.credits >= 0) data.credits = body.credits
  if (typeof body.limiteDiario === 'number' && body.limiteDiario >= 0) data.limiteDiario = body.limiteDiario
  if (Array.isArray(body.presets)) {
    data.presets = JSON.stringify(body.presets)
    await registrarEvento('creacion', { tipo: 'presets_actualizados', total: body.presets.length })
  }

  const s = await db.settings.update({ where: { id: 'main' }, data })
  return NextResponse.json({ credits: s.credits, limiteDiario: s.limiteDiario, presets: parseJson<unknown[]>(s.presets, []) })
}

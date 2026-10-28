import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { mediaDTO } from '@/lib/dto'
import { PIPELINE } from '@/lib/constants'
import { registrarEvento } from '@/lib/compliance'
import { iniciarWorker } from '@/lib/worker'
import { borrarPieza } from '@/lib/media'
import { asegurarSaldo } from '@/lib/api-utils'
import { COSTOS } from '@/lib/constants'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  iniciarWorker()
  const { id } = await ctx.params
  const m = await db.media.findUnique({ where: { id }, include: { set: true } })
  if (!m) return NextResponse.json({ error: 'Pieza no encontrada' }, { status: 404 })
  const { set, ...base } = m
  return NextResponse.json({ media: { ...mediaDTO(base), set } })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const accion = String(body.accion || '')
  const m = await db.media.findUnique({ where: { id } })
  if (!m) return NextResponse.json({ error: 'Pieza no encontrada' }, { status: 404 })

  if (accion === 'aprobar_examen' || accion === 'aprobar') {
    if (m.qualityVerdict === 'RECHAZADO' && !body.forzar) {
      return NextResponse.json(
        { error: `La puerta de QA rechazó esta pieza: ${m.qualityReason}. Regenera o usa forzar.` },
        { status: 409 },
      )
    }
    const updated = await db.media.update({
      where: { id },
      data: { qualityVerdict: 'APROBADO', qualityReason: null, pipelineStatus: PIPELINE.APROBADO },
    })
    await registrarEvento('etiqueta_ia', { accion: 'aprobacion_manual', seed: m.seed }, { mediaId: id, characterId: m.characterId })
    return NextResponse.json({ media: mediaDTO(updated) })
  }

  if (accion === 'rechazar_examen' || accion === 'rechazar') {
    const updated = await db.media.update({
      where: { id },
      data: { qualityVerdict: 'RECHAZADO', qualityReason: body.motivo || 'Reprobado por el operador' },
    })
    await registrarEvento('rechazo_qa', { puerta: 'operador', motivo: body.motivo || 'Reprobado por el operador', seed: m.seed }, { mediaId: id, characterId: m.characterId })
    return NextResponse.json({ media: mediaDTO(updated) })
  }

  if (accion === 'cifrar') {
    if (m.lane !== 'PRIVADO') return NextResponse.json({ error: 'Solo el carril privado se cifra.' }, { status: 400 })
    if (m.qualityVerdict !== 'APROBADO') return NextResponse.json({ error: 'La pieza debe estar aprobada por QA.' }, { status: 409 })
    const coste = COSTOS.CIFRADO
    const saldo = await asegurarSaldo(coste)
    if (!saldo.ok) return NextResponse.json({ error: saldo.error }, { status: 402 })
    const job = await db.job.create({
      data: {
        type: 'cifrado',
        characterId: m.characterId,
        priority: 3,
        costEstimate: coste,
        payload: JSON.stringify({ mediaIds: [id], motivo: 'cifrado manual' }),
      },
    })
    return NextResponse.json({ jobId: job.id })
  }

  if (accion === 'borrar') {
    if (m.filePath) borrarPieza(m.filePath)
    if (m.thumbPath && m.thumbPath !== m.filePath) borrarPieza(m.thumbPath)
    await db.media.delete({ where: { id } })
    await registrarEvento('creacion', { accion: 'pieza_borrada', seed: m.seed, motivo: body.motivo || 'manual' }, { characterId: m.characterId })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Acción desconocida' }, { status: 400 })
}

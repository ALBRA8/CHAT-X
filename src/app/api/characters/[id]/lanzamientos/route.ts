// Lanzamientos del pipeline del personaje: dataset → entrenamiento → examen → activar
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { COSTOS, DATASET_MAX, DATASET_MIN, EXAMEN_ESCENAS, PIPELINE } from '@/lib/constants'
import { asegurarSaldo, jsonError, jsonOk } from '@/lib/api-utils'
import { iniciarWorker } from '@/lib/worker'
import { registrarEvento } from '@/lib/compliance'
import type { Brief } from '@/lib/provider/types'

// 5 escenas distintas del examen de identidad (ficha 4.2 paso 7)
const ESCENAS_EXAMEN: { nombre: string; brief: Brief }[] = [
  { nombre: 'cafeteria_diurna', brief: { escena: 'tomando café en una cafetería luminosa', outfit: 'suéter holgado y jeans', pose: 'sentada mirando a cámara', encuadre: 'plano_medio', luz: 'natural de ventana' } },
  { nombre: 'gimnasio', brief: { escena: 'entrenando en el gimnasio', outfit: 'top deportivo y leggings', pose: 'apoyada en barra', encuadre: 'plano_medio', luz: 'cálida interior' } },
  { nombre: 'calle_nocturna', brief: { escena: 'caminando por una calle con luces de neón', outfit: 'chaqueta de cuero', pose: 'de pie, tres cuartos', encuadre: 'plano_medio', luz: 'neón nocturno' } },
  { nombre: 'parque_atardecer', brief: { escena: 'sentada en el pasto de un parque', outfit: 'vestido ligero', pose: 'sonriendo al atardecer', encuadre: 'cuerpo_entero', luz: 'dorado de atardecer' } },
  { nombre: 'estudio_estricto', brief: { escena: 'fondo liso de estudio fotográfico', outfit: 'camisa blanca', pose: 'retrato frontal serio', encuadre: 'primer_plano', luz: 'estudio' } },
]

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  iniciarWorker()
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const accion = String(body.accion || '')
  const c = await db.character.findUnique({ where: { id } })
  if (!c) return jsonError('Personaje no encontrado', 404)

  if (accion === 'dataset') {
    if (c.status !== 'BORRADOR' && c.status !== 'ENTRENANDO' && c.status !== 'ACTIVO' && c.status !== 'PAUSADA') {
      return jsonError('Estado del personaje inválido', 400)
    }
    const objetivo = Math.max(DATASET_MIN, Math.min(DATASET_MAX, Number(body.objetivo) || 40))
    const coste = Math.round(COSTOS.FOTO_DATASET * objetivo * 10) / 10
    const saldo = await asegurarSaldo(coste)
    if (!saldo.ok) return jsonError(saldo.error!, 402, { saldo: saldo.saldo })
    const job = await db.job.create({
      data: {
        type: 'dataset',
        characterId: id,
        priority: 2,
        costEstimate: coste,
        payload: JSON.stringify({ objetivo }),
      },
    })
    return jsonOk({ jobId: job.id, coste })
  }

  if (accion === 'entrenamiento') {
    if (!c.datasetCount || c.datasetCount < DATASET_MIN) {
      return jsonError(`Primero arma el dataset (mínimo ${DATASET_MIN} fotos).`, 400)
    }
    const coste = COSTOS.ENTRENAMIENTO_LORA
    const saldo = await asegurarSaldo(coste)
    if (!saldo.ok) return jsonError(saldo.error!, 402, { saldo: saldo.saldo })
    const nota = String(body.nota || 'entrenamiento inicial desde el asistente Genoma')
    const job = await db.job.create({
      data: {
        type: 'entrenamiento',
        characterId: id,
        priority: 2,
        costEstimate: coste,
        payload: JSON.stringify({ nota }),
      },
    })
    await db.character.update({ where: { id }, data: { status: 'ENTRENANDO' } })
    return jsonOk({ jobId: job.id, coste })
  }

  if (accion === 'examen') {
    if (!c.loraHash) return jsonError('Entrena la LoRA antes del examen de identidad.', 400)
    // Regeneración de una escena concreta o examen completo
    const escenas = Array.isArray(body.escenas) && body.escenas.length > 0
      ? (body.escenas as { nombre: string; brief: Brief }[])
      : ESCENAS_EXAMEN
    if (escenas.length < 1 || escenas.length > EXAMEN_ESCENAS) {
      return jsonError(`El examen usa ${EXAMEN_ESCENAS} escenas.`, 400)
    }
    const coste = Math.round(COSTOS.RENDER_FINAL * escenas.length * 10) / 10
    const saldo = await asegurarSaldo(coste)
    if (!saldo.ok) return jsonError(saldo.error!, 402, { saldo: saldo.saldo })
    const varianteBase = Number(body.varianteBase) || 0
    const job = await db.job.create({
      data: {
        type: 'lote_fotos',
        characterId: id,
        priority: 2,
        costEstimate: coste,
        payload: JSON.stringify({ modo: 'examen', lane: 'PUBLICO', escenas, varianteBase }),
      },
    })
    return jsonOk({ jobId: job.id, coste, escenas: escenas.map((e) => e.nombre) })
  }

  if (accion === 'activar') {
    const aprobadas = await db.media.count({
      where: {
        characterId: id,
        kind: 'examen',
        qualityVerdict: 'APROBADO',
      },
    })
    if (aprobadas < EXAMEN_ESCENAS) {
      return jsonError(`Faltan escenas aprobadas: ${aprobadas}/${EXAMEN_ESCENAS}.`, 400)
    }
    const actualizadas = await db.media.updateMany({
      where: { characterId: id, kind: 'examen', qualityVerdict: 'APROBADO' },
      data: { pipelineStatus: PIPELINE.APROBADO },
    })
    await db.character.update({ where: { id }, data: { status: 'ACTIVO' } })
    await registrarEvento('creacion', { tipo: 'personaje_activado', escenasAprobadas: aprobadas, piezas: actualizadas.count }, { characterId: id })
    return jsonOk({ ok: true, escenasAprobadas: aprobadas })
  }

  return jsonError('Acción desconocida', 400)
}

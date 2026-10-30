// Outfit Swap (P2.6 de CLONAKIT_BRECHAS): variación de vestuario SIN deriva
// facial. Misma identidad garantizada por construcción en cada proveedor:
//  - simulador: la identidad visual sale de baseSeed (el outfit no la toca);
//  - ComfyUI (real): contrato img2img — imagen de referencia (pieza aprobada
//    del personaje) + denoise bajo; el adaptador inyecta LoadImage/denoise
//    (docs/MOTOR_GPU.md §img2img). Con el simulador el ancla visual es la
//    semilla base y la referencia se declara en provenance igualmente.
// El filtro de edad se aplica al outfit y al ancla ANTES de gastar créditos.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { COSTOS, LANE, detectarTerminosProhibidos, type Lane } from '@/lib/constants'
import { asegurarSaldo, jsonError, jsonOk } from '@/lib/api-utils'
import { iniciarWorker } from '@/lib/worker'
import { registrarEvento } from '@/lib/compliance'
import { planificarOutfitSwap } from '@/lib/instadump'

export async function POST(req: NextRequest) {
  iniciarWorker()
  const body = await req.json().catch(() => ({}))
  const characterId = String(body.characterId || '')
  const lane = (body.lane === LANE.PRIVADO ? LANE.PRIVADO : LANE.PUBLICO) as Lane
  const count = Math.max(1, Math.min(32, Number(body.count) || 4))
  const outfit = typeof body.outfit === 'string' ? body.outfit.trim() : ''
  const escena = typeof body.escena === 'string' ? body.escena : undefined
  const encuadre = typeof body.encuadre === 'string' ? body.encuadre : undefined
  const luz = typeof body.luz === 'string' ? body.luz : undefined
  const denoise = Math.max(0.2, Math.min(0.9, Number(body.denoise) || 0.55))
  const mediaRefId = typeof body.mediaRefId === 'string' ? body.mediaRefId : ''

  if (!outfit) return jsonError('Falta el outfit nuevo (texto que describe el vestuario).', 422)
  const c = await db.character.findUnique({ where: { id: characterId } })
  if (!c) return jsonError('Personaje no encontrado', 404)
  if (c.status !== 'ACTIVO') return jsonError('El personaje debe estar ACTIVO para producir fotos.', 409)

  // La pieza de referencia (si se pide img2img con proveedor real) debe ser del
  // personaje y estar aprobada: nunca se usa material ajeno como ancla.
  let refSeed: string | null = null
  if (mediaRefId) {
    const ref = await db.media.findUnique({ where: { id: mediaRefId } })
    if (!ref || ref.characterId !== characterId) return jsonError('La pieza de referencia no pertenece al personaje.', 422)
    if (ref.qualityVerdict !== 'APROBADO') return jsonError('La pieza de referencia debe estar APROBADA por QA.', 422)
    if (ref.encIv) return jsonError('La referencia está en el carril privado cifrado: para img2img usa una pieza pública.', 422)
    refSeed = ref.seed
  }

  const filtroTexto = `${outfit} ${escena || ''} ${luz || ''}`
  const terminos = detectarTerminosProhibidos(filtroTexto)
  if (terminos.length > 0) {
    const motivo = `Filtro de edad aparente: término prohibido "${terminos.join('", "')}" en el outfit/ancla.`
    await registrarEvento('filtro_edad', { motivo, terminos, outfit, bloqueo: 'outfit_swap', personaje: c.name }, { characterId })
    return jsonError(motivo, 422, { filtro: 'edad_aparente' })
  }

  if (lane === LANE.PRIVADO) {
    const s = await db.settings.findUnique({ where: { id: 'main' } })
    if (!s?.privateHash) return jsonError('Define la contraseña del modo privado antes de usar el carril 18+.', 400)
  }

  const plan = planificarOutfitSwap({
    outfit,
    count,
    escena,
    encuadre,
    luz,
    varianteBase: Number(body.varianteBase) || 0,
  })

  const coste = Math.round(COSTOS.PREVIEW * plan.items.length * 10) / 10
  const saldo = await asegurarSaldo(coste)
  if (!saldo.ok) return jsonError(saldo.error!, 402, { saldo: saldo.saldo })

  const batchId = `swap_${Date.now()}_${Math.floor(Math.random() * 1e4)}`
  const job = await db.job.create({
    data: {
      type: 'lote_fotos',
      characterId,
      priority: 4,
      costEstimate: coste,
      payload: JSON.stringify({
        modo: 'preview',
        lane,
        briefs: plan.items,
        batchId,
        varianteBase: Number(body.varianteBase) || 0,
        // contrato img2img para proveedor real (ComfyUI); con simulador se
        // declara en provenance pero la identidad ya es determinista por baseSeed
        img2img: mediaRefId ? { mediaRefId, refSeed, denoise, motivo: 'outfit_swap' } : null,
      }),
    },
  })
  await registrarEvento(
    'creacion',
    { tipo: 'outfit_swap', outfit, piezas: plan.items.length, denoise, referencia: refSeed, coste, lane, batchId },
    { characterId },
  )
  return jsonOk({ jobId: job.id, coste, batchId, piezas: plan.items.length, outfit })
}

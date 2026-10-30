// Escalera de calidad de vídeo (P2.4) + URL→brief (P2.8) de CLONAKIT_BRECHAS.
//
// PLANIFICACIÓN GRATIS, RENDER ES LO QUE CUESTA: este endpoint calcula la
// escalera completa (draft/standard/max con créditos por segundo) y el brief
// desde una URL pública, ANTES de gastar un solo crédito. El render solo se
// encola si la sonda del proveedor de vídeo da OPERATIVO; si no, responde con
// el estado honesto y cómo activarlo (docs/MOTOR_GPU.md).
//
// El filtro de edad se aplica al texto del brief (regla constitucional) y el
// blindaje SSRF vive en src/lib/video.ts (validarURLPublica).
import { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/api-utils'
import { registrarEvento } from '@/lib/compliance'
import { db } from '@/lib/db'
import {
  ESCALONES_VIDEO,
  SPECS_ESCALON,
  esEscalonVideo,
  planVideo,
  sondearVideo,
} from '@/lib/video'

export async function GET() {
  const sonda = await sondearVideo()
  const escalera = ESCALONES_VIDEO.map((e) => {
    const s = SPECS_ESCALON[e]
    // coste por segundo declarado (misma fórmula que presupuestoEscalon)
    const mult = e === 'draft' ? 1 : e === 'standard' ? 3.5 : 9
    return { ...s, creditosPorSegundo: Math.round(8 * mult) }
  })
  return jsonOk({ proveedor: sonda, escalera, escalones: ESCALONES_VIDEO })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const escalon = esEscalonVideo(body.escalon) ? body.escalon : 'draft'
  const duracionSeg = Math.max(
    1,
    Math.min(SPECS_ESCALON[escalon].duracionSegMax, Number(body.duracionSeg) || (escalon === 'draft' ? 6 : escalon === 'standard' ? 12 : 20)),
  )
  const url = typeof body.url === 'string' && body.url.trim() ? body.url.trim() : undefined
  const characterId = typeof body.characterId === 'string' ? body.characterId : undefined

  if (url && url.length > 2048) return jsonError('URL demasiado larga (máx 2048 caracteres).', 422)

  if (characterId) {
    const existe = await db.character.findUnique({ where: { id: characterId }, select: { id: true } })
    if (!existe) return jsonError('Personaje no encontrado', 404)
  }

  const plan = await planVideo(url, escalon, duracionSeg)
  if (plan.errorURL) {
    const esFiltro = plan.errorURL.includes('filtro de edad') || plan.errorURL.includes('términos prohibidos')
    if (esFiltro) {
      await registrarEvento('filtro_edad', { motivo: plan.errorURL, bloqueo: 'url_video', url: url ?? '' }).catch(() => {})
    }
    // 422 = rechazo de VALIDACIÓN (protocolo/host/IP privada/filtro) — el pedido
    // es inseguro o inválido. 502 = la URL es válida pero el fetch falló.
    const status = esFiltro || plan.errorValidacion ? 422 : 502
    return jsonError(plan.errorURL, status, { fase: 'url_brief' })
  }

  // Trazabilidad de la planificación (no gasta créditos: es un plan, no un job).
  await registrarEvento('plan_video', {
    escalon,
    duracionSeg,
    url: url ?? null,
    creditosEscalera: Object.fromEntries(plan.escalera.map((p) => [p.escalon, p.creditos])),
    estadoProveedor: plan.sonda.estado,
    briefGenerado: Boolean(plan.brief),
  }).catch(() => {})

  return jsonOk({
    plan: {
      escalon,
      duracionSeg,
      escalera: plan.escalera,
      recomendado: plan.recomendado,
      brief: plan.brief ?? null,
    },
    proveedor: plan.sonda,
    notaHonestidad:
      plan.sonda.estado === 'OPERATIVO'
        ? 'Proveedor de vídeo OPERATIVO: el render puede encolarse.'
        : 'PLANIFICACIÓN lista; el RENDER de vídeo está ' + plan.sonda.estado + ' en esta máquina (sin GPU/motor de vídeo). Ver comoActivar.',
  })
}

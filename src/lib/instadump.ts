// InstaDump nativo (P2.5) y Outfit Swap (P2.6) de CLONAKIT_BRECHAS.
//
// P2.5 — InstaDump: 1 foto/clic → lote multi-escena/outfit automático. Antes el
// lote repetía UN brief manual; el planificador de aquí genera N briefs DISTINTOS
// (escena × outfit × pose × encuadre × luz) combinando pools curados con el
// genoma del personaje, de forma DETERMINISTA: mismos inputs → mismo plan (la
// re-entrada idempotente del worker reutiliza piezas por semilla, nunca duplica).
//
// P2.6 — Outfit Swap: variación de vestuario SIN deriva facial. La identidad
// visual del simulador sale de baseSeed (por construcción no cambia al cambiar
// el outfit); con proveedor real el contrato img2img (denoise bajo + imagen de
// referencia) va documentado en docs/MOTOR_GPU.md e implementado en el adaptador
// ComfyUI. Aquí solo se planifica: mismo ancla escena/encuadre/luz, cambia outfit.
//
// HONESTIDAD: los pools están curados y vacíos de términos prohibidos por
// construcción (propiedad verificada en test/unit/instadump.test.ts). El filtro
// de edad duro se vuelve a aplicar por brief en las rutas API (defensa en
// profundidad) y en el worker antes de generar (regla constitucional).
import type { Brief } from '@/lib/provider/types'
import { LOTE_MAX, detectarTerminosProhibidos } from '@/lib/constants'
import { rngDesde } from '@/lib/rng'

export const PAQUETES_INSTADUMP = ['mixto', 'casual', 'glam', 'lifestyle'] as const
export type PaqueteInstaDump = (typeof PAQUETES_INSTADUMP)[number]

const ESCENAS_CASUAL = [
  'cafetería de barrio con taza en la mano',
  'sofá de casa con manta y serie de fondo',
  'cocina luminosa preparando café',
  'balcón con plantas al atardecer',
  'parque urbano con banco y árboles',
  'librería entre estantes altos',
]
const ESCENAS_GLAM = [
  'terraza nocturna con luces de ciudad',
  'fiesta elegante con copa en la mano',
  'estudio glamour con fondo oscuro',
  'coctelería íntima con barra de mármol',
  'azotea al anochecer con skyline',
  'escalera de hotel con apliques dorados',
]
const ESCENAS_LIFESTYLE = [
  'estudio de yoga con luz de mañana',
  'paseo junto al mar con brisa',
  'gimnasio con espejos al fondo',
  'mercado de flores de fin de semana',
  'carretera de montaña en road trip',
  'terraza con desayuno y prensa',
]
const OUTFITS_CASUAL = [
  'jeans y camiseta blanca',
  'vestido floral de verano',
  'sudadera gris y leggings',
  'falda midi y botines',
  'blusa ancha y shorts de mezclilla',
]
const OUTFITS_GLAM = [
  'vestido negro de noche',
  'conjunto de satén elegante',
  'blazer de seda sobre lencería sobria',
  'vestido rojo largo con abertura',
  'mono metálico de fiesta',
]
const OUTFITS_LIFESTYLE = [
  'traje de baño de una pieza con pareo',
  'ropa deportiva completa',
  'chaqueta impermeable y botas de montaña',
  'overol de mezclilla',
  'top y pantalón de lino',
]
const POSES = [
  'mirando a cámara con sonrisa leve',
  'mirada de perfil hacia la ventana',
  'de espaldas girando el rostro',
  'reclinada relajada',
  'de pie con la mano en la cadera',
  'riendo de forma natural',
  'brazos cruzados con actitud calmada',
  'apoyada en la pared',
]
const LUCES = [
  'luz natural de ventana',
  'golden hour cálida',
  'luz de estudio suave',
  'contraluz con neón tenue',
  'luz nocturna ámbar',
]
const ENCUADRES = ['primer_plano', 'plano_medio', 'cuerpo_entero'] as const

function escenasDe(paquete: PaqueteInstaDump, aficiones: string[]): string[] {
  const base =
    paquete === 'casual'
      ? ESCENAS_CASUAL
      : paquete === 'glam'
        ? ESCENAS_GLAM
        : paquete === 'lifestyle'
          ? ESCENAS_LIFESTYLE
          : [...ESCENAS_CASUAL, ...ESCENAS_GLAM, ...ESCENAS_LIFESTYLE]
  // Genoma-consciente: las aficiones del personaje entran como escenas propias
  // ("momento {afición}") — el dump retrata SU vida, no una genérica.
  const propias = aficiones
    .map((a) => a.trim())
    .filter(Boolean)
    .slice(0, 4)
    .map((a) => `momento ${a}`)
  return [...propias, ...base]
}

function outfitsDe(paquete: PaqueteInstaDump): string[] {
  if (paquete === 'casual') return OUTFITS_CASUAL
  if (paquete === 'glam') return OUTFITS_GLAM
  if (paquete === 'lifestyle') return OUTFITS_LIFESTYLE
  return [...OUTFITS_CASUAL, ...OUTFITS_GLAM, ...OUTFITS_LIFESTYLE]
}

export interface ItemPlan {
  sceneName: string
  brief: Brief
}

export interface PlanInstaDump {
  paquete: PaqueteInstaDump
  items: ItemPlan[]
  /** El ancla ("1 foto" de referencia) si el operador la aportó. */
  anclaAplicada: boolean
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24) || 'escena'
}

/**
 * Planifica un InstaDump determinista. `ancla` es la "1 foto"/brief de
 * referencia: si trae escena u outfit, TODOS los items respetan ese ancla y
 * el plan solo varía el resto de las dimensiones.
 */
export function planificarInstaDump(opts: {
  seedPersonaje: string
  paquete?: string
  count: number
  aficiones?: string[]
  ancla?: Partial<Pick<Brief, 'escena' | 'outfit' | 'luz'>>
  varianteBase?: number
}): PlanInstaDump {
  const paquete = (PAQUETES_INSTADUMP as readonly string[]).includes(opts.paquete || '')
    ? (opts.paquete as PaqueteInstaDump)
    : 'mixto'
  // Literal: 0/negativo → mínimo 1; NaN/undefined → default 8; decimales → floor.
  const pedido = Number.isFinite(opts.count) ? Math.floor(Number(opts.count)) : 8
  const count = Math.max(1, Math.min(LOTE_MAX, pedido))
  const varianteBase = Math.max(0, Math.floor(opts.varianteBase || 0))
  const ancla = opts.ancla ?? {}
  const anclaAplicada = Boolean(ancla.escena?.trim() || ancla.outfit?.trim() || ancla.luz?.trim())

  const rand = rngDesde(`instadump:${opts.seedPersonaje}:${paquete}:${count}:${varianteBase}`)
  const escenas = escenasDe(paquete, opts.aficiones ?? [])
  const outfits = outfitsDe(paquete)
  const offsetE = Math.floor(rand() * escenas.length)
  const offsetO = Math.floor(rand() * outfits.length)
  const offsetL = Math.floor(rand() * LUCES.length)
  const offsetC = Math.floor(rand() * ENCUADRES.length)

  const items: ItemPlan[] = []
  const usados = new Set<string>()
  let i = 0
  // Recorrido circular con offsets desfasados: sin repetir combo dentro del plan.
  // Garantía de entrega: si el pool diera menos combos que `count` (imposible en
  // la práctica con los pools curados), el guard suelta el dedupe ANTES que
  // entregar menos piezas de las pagadas — y la semilla por índice sigue siendo
  // determinista (mismo plan para mismos inputs).
  while (items.length < count && i < count * 10) {
    const escena = ancla.escena?.trim() || escenas[(offsetE + i) % escenas.length]
    const outfit = ancla.outfit?.trim() || outfits[(offsetO + Math.floor(i / 2)) % outfits.length]
    const pose = POSES[(offsetL + i * 3 + Math.floor(rand() * 2)) % POSES.length]
    const encuadre = ENCUADRES[(offsetC + i) % ENCUADRES.length]
    const luz = ancla.luz?.trim() || LUCES[(offsetL + i * 2) % LUCES.length]

    // Blindaje: si una combinación heredada del genoma disparara el filtro de
    // edad, se sustituye por el pool curado (el plan NUNCA sale inseguro).
    const unsafe = detectarTerminosProhibidos(`${escena} ${outfit} ${pose} ${luz}`)
    const briefFinal: Brief = unsafe.length
      ? { escena: escenas[(offsetE + i + 1) % escenas.length], outfit: outfits[(offsetO + i) % outfits.length], pose, encuadre, luz }
      : { escena, outfit, pose, encuadre, luz }

    const clave = `${briefFinal.escena}|${briefFinal.outfit}|${briefFinal.pose}`
    if (usados.has(clave) && i < count) {
      i++
      continue
    }
    usados.add(clave)
    items.push({
      sceneName: `dump_${slug(briefFinal.outfit)}_${slug(briefFinal.escena)}`,
      brief: briefFinal,
    })
    i++
  }

  return { paquete, items, anclaAplicada }
}

export interface PlanOutfitSwap {
  items: ItemPlan[]
  outfit: string
}

/**
 * Planifica un Outfit Swap: el vestuario NUEVO es fijo en todas las piezas;
 * escena/encuadre/luz ancla se respetan (o defaults sobrios) y solo varía la
 * pose/variante. La identidad NO deriva: simulador la toma de baseSeed; con
 * ComfyUI el adaptador aplica img2img con denoise bajo sobre la referencia.
 */
export function planificarOutfitSwap(opts: {
  outfit: string
  count: number
  escena?: string
  encuadre?: string
  luz?: string
  varianteBase?: number
}): PlanOutfitSwap {
  const outfit = opts.outfit.trim()
  if (!outfit) throw new Error('Outfit Swap requiere el outfit nuevo (texto no vacío).')
  if (outfit.length > 120) throw new Error('El outfit no debe exceder 120 caracteres.')
  const pedido = Number.isFinite(opts.count) ? Math.floor(Number(opts.count)) : 4
  const count = Math.max(1, Math.min(LOTE_MAX, pedido))
  const varianteBase = Math.max(0, Math.floor(opts.varianteBase || 0))
  const escena = opts.escena?.trim() || 'estudio con fondo neutro de la misma sesión'
  const encuadre = (ENCUADRES as readonly string[]).includes(opts.encuadre || '')
    ? (opts.encuadre as Brief['encuadre'])
    : 'plano_medio'
  const luz = opts.luz?.trim() || 'luz de estudio suave'

  const rand = rngDesde(`outfit:${outfit}:${count}:${varianteBase}`)
  const offset = Math.floor(rand() * POSES.length)
  const items: ItemPlan[] = []
  for (let i = 0; i < count; i++) {
    // Ciclo determinista de poses: exactamente `count` piezas (tras agotar el
    // pool de poses, la variante de semilla sigue produciendo composiciones nuevas).
    const pose = POSES[(offset + i) % POSES.length]
    items.push({
      sceneName: `outfit_${slug(outfit)}_v${varianteBase + i}`,
      brief: { escena, outfit, pose, encuadre, luz },
    })
  }
  return { items, outfit }
}

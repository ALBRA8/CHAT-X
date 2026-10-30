// Motor GFE "Modo Novia" (P1.1 CLONAKIT_BRECHAS) — lógica de chat honesta.
//
// Cerebro del personaje: PLANTILLAS desde el genoma (meta.modo='plantilla_genoma').
// CHAT-X no finge tener un LLM: hasta integrar un motor LLM configurado, las
// respuestas son deterministas, auditables y declaradas como plantilla. Las
// piezas pedidas por chat (foto/voz) pasan por el pipeline real (job → media →
// QA → compliance), nunca por atajos.
import type { Character } from '@prisma/client'
import type { Brief } from '@/lib/provider/types'

export interface Intencion {
  tipo: 'foto' | 'voz' | 'texto'
  patrones: string[]
}

const INTENCIONES: Intencion[] = [
  {
    // La voz se evalúa PRIMERA: sus frases son más específicas y ganan sobre
    // verbos genéricos de entrega ('mándame una nota de voz' es voz, no foto).
    tipo: 'voz',
    patrones: [
      'nota de voz', 'voz', 'audio', 'escúchame', 'escuchame', 'escuchar',
      'oírte', 'oirte', 'háblame', 'hablame', 'dime algo en voz',
    ],
  },
  {
    tipo: 'foto',
    patrones: [
      'foto', 'fotos', 'imagen', 'imágenes', 'imagen de ti', 'selfie', 'selfies',
      'enséñame', 'ensename', 'muéstrame', 'muestrame', 'mándame', 'mandame',
      'muestra', 'píc', 'pic', 'lote', 'sesión', 'modelando',
    ],
  },
]

export function detectarIntencion(texto: string): 'foto' | 'voz' | 'texto' {
  const t = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  for (const i of INTENCIONES) {
    const pats = i.patrones.map((p) => p.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
    if (pats.some((p) => t.includes(p))) return i.tipo
  }
  return 'texto'
}

/** Brief determinista desde el genoma: la escena sale de sus aficiones/lore, el
 * outfit de su style — la pieza SIEMPRE es coherente con el personaje. */
export function briefDesdeGenoma(c: Character): Brief {
  let genome: { aficiones?: string; lore?: string; atributos?: Record<string, string> } = {}
  try {
    genome = JSON.parse(c.genome || '{}')
  } catch {
    /* genoma vacío */
  }
  const escenaBase = (genome.aficiones || genome.lore || 'retrato de estudio').split(',')[0].trim()
  return {
    escena: `retrato: ${escenaBase}`,
    outfit: c.style || 'estilo propio del personaje',
    pose: 'natural, mirando a cámara',
    encuadre: 'plano_medio',
    luz: 'suave',
  }
}

type Genoma = { tono?: string; aficiones?: string; lore?: string; atributos?: Record<string, string> }

export function parseGenoma(c: Character): Genoma {
  try {
    return JSON.parse(c.genome || '{}') as Genoma
  } catch {
    return {}
  }
}

/** Respuesta de plantilla del personaje (honesto: plantilla_genoma, sin LLM). */
export function respuestaPlantilla(c: Character, textoOperador: string): string {
  const g = parseGenoma(c)
  const t = textoOperador.toLowerCase()
  const nombre = c.name
  if (/hola|buenas|hey|qué tal|que tal|saludos/.test(t)) {
    return `¡Hola! Soy ${nombre}${g.lore ? `, ${g.lore.toLowerCase()}` : ''}. ${g.aficiones ? `Me va ${g.aficiones.split(',')[0].toLowerCase()}.` : ''} ¿De qué quieres hablar?`
  }
  if (/gracias|genial|perfecto|me gusta/.test(t)) {
    return `¡Me alegra! Aquí ${nombre}, siempre cerca${g.aficiones ? ` cuando no estoy con mi ${g.aficiones.split(',')[0].toLowerCase()}` : ''}.`
  }
  if (/adiós|adios|chao|hasta luego|nos vemos|bye/.test(t)) {
    return `Cuídate mucho. Vuelve cuando quieras, aquí estaré yo.`
  }
  if (/quién eres|quien eres|eres real|eres ia|eres humana|te generaron/.test(t)) {
    return `Soy ${nombre}, una creadora generada por IA — contenido etiquetado como IA, como toda la plataforma. Nada de fingir lo contrario.`
  }
  return `${g.tono ? `[${g.tono}] ` : ''}Te leo${g.aficiones ? ` — luego te cuento más sobre ${g.aficiones.split(',')[0].toLowerCase()}` : ''}. Si quieres, pídeme una foto o una nota de voz.`
}

/** Palabras del operador → frase del personaje presentando la pieza. */
export function fraseEntregaFoto(c: Character): string {
  const g = parseGenoma(c)
  return `Aquí tienes una pieza nueva mía${g.aficiones ? `, en mi ambiente de ${g.aficiones.split(',')[0].toLowerCase()}` : ''} — pasa por QA y compliance como todo lo de la plataforma.`
}

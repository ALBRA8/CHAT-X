// Escalera de calidad de vídeo (P2.4) y flujo URL→vídeo (P2.8) de CLONAKIT_BRECHAS.
//
// P2.4 — Escalera draft→standard→max (Apatero): el criterio de aceptación es
// "coste por escalón ANTES de gastar". Esta lib declara la escalera completa
// (especificación + créditos por segundo) y la expone junto al estado HONESTO
// del proveedor de vídeo. Nunca se encola un trabajo de vídeo si la sonda no
// da OPERATIVO: el plan es gratis, el render es lo que cuesta.
//
// P2.8 — URL→brief (GPTVideos): una URL pública → metadatos (og:title, og:
// description, title) → brief de vídeo determinista con gancho, escenas y CTA.
// Está la PARTE NO BLOQUEADA del flujo (URL→brief→plan con costes); el render
// final queda declarado en el estado del proveedor hasta tener GPU/motor.
//
// BLINDAJE SSRF: la URL la escribe el operador, pero el fetch sale del servidor.
// Defensa en profundidad: solo http/https, bloqueo de hosts privados/reservados
// (resolviendo DNS ANTES de conectar), redirecciones desactivadas, límite de
// bytes, timeout corto y user-agent honesto.
import { saludComfy } from '@/lib/provider/comfyui'
import { detectarTerminosProhibidos } from '@/lib/constants'
import { textoSano } from '@/lib/saneo'

// ─────────────────────── P2.4 — Escalera de calidad ───────────────────────

export const ESCALONES_VIDEO = ['draft', 'standard', 'max'] as const
export type EscalonVideo = (typeof ESCALONES_VIDEO)[number]

export interface EscalonSpec {
  escalon: EscalonVideo
  resolucion: string
  fps: number
  pasos: number // pasos de difusión (menos en draft)
  duracionSegMax: number
  descripcion: string
}

// Coste base declarado por segundo de vídeo terminado (créditos). Comparable
// con COSTOS del Estudio (PREVIEW=2, RENDER_FINAL=15): un segundo de vídeo
// cuesta más que una foto final porque implica N frames coherentes.
export const COSTO_VIDEO_BASE_POR_SEGUNDO = 8

export const SPECS_ESCALON: Record<EscalonVideo, EscalonSpec> = {
  draft: {
    escalon: 'draft',
    resolucion: '480p',
    fps: 16,
    pasos: 12,
    duracionSegMax: 8,
    descripcion: 'Borrador para validar idea/gancho: barato, rápido, sin pulido.',
  },
  standard: {
    escalon: 'standard',
    resolucion: '720p',
    fps: 24,
    pasos: 24,
    duracionSegMax: 15,
    descripcion: 'Calidad de publicación en carril social (reels/shorts).',
  },
  max: {
    escalon: 'max',
    fps: 30,
    resolucion: '1080p',
    pasos: 40,
    duracionSegMax: 30,
    descripcion: 'Pieza final PPV o anuncio: máxima coherencia y detalle.',
  },
}

export function esEscalonVideo(v: unknown): v is EscalonVideo {
  return typeof v === 'string' && (ESCALONES_VIDEO as readonly string[]).includes(v)
}

// Multiplicador de coste por escalón relativo a draft (pasos × fps × píxeles
// aproximados, redondeado a valores declarados y estables).
const MULTIPLICADOR: Record<EscalonVideo, number> = { draft: 1, standard: 3.5, max: 9 }

export interface PresupuestoEscalon {
  escalon: EscalonVideo
  spec: EscalonSpec
  duracionSeg: number
  creditos: number
  creditosPorSegundo: number
}

/** Créditos de UN escalón para una duración dada. Puro y determinista. */
export function presupuestoEscalon(escalon: EscalonVideo, duracionSeg: number): PresupuestoEscalon {
  const spec = SPECS_ESCALON[escalon]
  const dur = Math.max(1, Math.min(spec.duracionSegMax, Math.round(duracionSeg)))
  const creditos = Math.round(COSTO_VIDEO_BASE_POR_SEGUNDO * MULTIPLICADOR[escalon] * dur)
  return {
    escalon,
    spec,
    duracionSeg: dur,
    creditos,
    creditosPorSegundo: Math.round(COSTO_VIDEO_BASE_POR_SEGUNDO * MULTIPLICADOR[escalon]),
  }
}

/** La escalera COMPLETA: los tres presupuestos juntos, para decidir antes de gastar. */
export function escaleraCompleta(duracionSeg: number): PresupuestoEscalon[] {
  return ESCALONES_VIDEO.map((e) => presupuestoEscalon(e, duracionSeg))
}

/** Escalón recomendado por intención: validar → draft, publicar → standard, vender → max. */
export function recomendacionEscalon(intencion: string): EscalonVideo {
  const i = intencion.toLowerCase()
  if (i.includes('ppv') || i.includes('venta') || i.includes('anuncio')) return 'max'
  if (i.includes('validar') || i.includes('borrador') || i.includes('idea')) return 'draft'
  return 'standard'
}

// ─────────────────────── Proveedor de vídeo — estado HONESTO ───────────────────────

export type EstadoVideo = 'OPERATIVO' | 'NO_DISPONIBLE' | 'NO_CONFIGURADO'

export interface SondaVideo {
  estado: EstadoVideo
  detalle: string
  comoActivar: string
}

/**
 * Sonda honesta del proveedor de vídeo. HOY esta máquina no tiene GPU ni motor
 * de vídeo: la sonda debe decirlo, no disimularlo. Comprueba en orden:
 *  1) COMFYUI_URL configurada (si no → NO_CONFIGURADO)
 *  2) ComfyUI alcanzable (si no → NO_DISPONIBLE)
 *  3) Workflow con nodos de vídeo declarados (VHS_VideoCombine/AnimateDiff/
 *     InternoVideo…) — un ComfyUI de solo imágenes NO renderiza vídeo.
 */
export async function sondearVideo(): Promise<SondaVideo> {
  const base = (process.env.COMFYUI_URL || '').trim()
  if (!base) {
    return {
      estado: 'NO_CONFIGURADO',
      detalle: 'Sin COMFYUI_URL: no hay proveedor de vídeo configurado en esta máquina.',
      comoActivar: 'docs/MOTOR_GPU.md §vídeo — levanta ComfyUI con nodos de vídeo y exporta COMFYUI_URL + COMFYUI_WORKFLOW_JSON.',
    }
  }
  const salud = await saludComfy()
  if (!salud.ok) {
    return {
      estado: 'NO_DISPONIBLE',
      detalle: `ComfyUI configurado (${base}) pero inalcanzable: ${salud.detalle}`,
      comoActivar: 'Arranca el servidor ComfyUI o revisa COMFYUI_URL.',
    }
  }
  const wfRuta = (process.env.COMFYUI_WORKFLOW_JSON || '').trim()
  if (!wfRuta) {
    return {
      estado: 'NO_CONFIGURADO',
      detalle: 'ComfyUI alcanzable pero sin COMFYUI_WORKFLOW_JSON: no hay workflow que ejecutar.',
      comoActivar: 'Exporta tu workflow en formato API (Save → API Format) y apunta COMFYUI_WORKFLOW_JSON a ese fichero.',
    }
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('node:fs') as typeof import('node:fs')
    const wf = fs.readFileSync(wfRuta, 'utf8')
    const nodosVideo = ['VideoCombine', 'AnimateDiff', 'VHS_', 'ImageToArray', 'SaveWEBM', 'SaveVIDEO']
    if (!nodosVideo.some((n) => wf.includes(n))) {
      return {
        estado: 'NO_DISPONIBLE',
        detalle: `ComfyUI alcanzable (${salud.detalle}) pero el workflow "${wfRuta}" no declara nodos de vídeo (${nodosVideo.join(', ')}): solo puede producir imágenes.`,
        comoActivar: 'Instala VideoHelperSuite/AnimateDiff y añade un nodo de salida de vídeo al workflow exportado.',
      }
    }
    return {
      estado: 'OPERATIVO',
      detalle: `ComfyUI con nodos de vídeo detectados (${salud.detalle}).`,
      comoActivar: 'Listo: los trabajos de vídeo pueden encolarse.',
    }
  } catch (e) {
    return {
      estado: 'NO_DISPONIBLE',
      detalle: `No se pudo leer COMFYUI_WORKFLOW_JSON (${wfRuta}): ${e instanceof Error ? e.message : 'error'}`,
      comoActivar: 'Corrige la ruta del workflow exportado.',
    }
  }
}

// ─────────────────────── P2.8 — URL → brief de vídeo ───────────────────────

export interface EscenaVideo {
  texto: string
  duracionSeg: number
}

export interface BriefVideo {
  titulo: string
  gancho: string
  escenas: EscenaVideo[]
  cta: string
  keywords: string[]
  fuente: string
  metadata: { titulo?: string; descripcion?: string; sitio?: string }
}

export class ErrorURLInsegura extends Error {
  /** true = rechazo de VALIDACIÓN (protocolo/host/IP) → 422; false = fallo de red/fetch → 502. */
  esValidacion: boolean
  constructor(mensaje: string, esValidacion = true) {
    super(mensaje)
    this.esValidacion = esValidacion
  }
}

const STOPWORDS = new Set(
  ('de la que el en y a los se del las un por con no una su para es al lo como más pero sus le ya o ' +
    'this that with from your have will can for are you the and and about more video watch best new ' +
    'https http www com').split(' '),
)

/** Keywords deterministas: frecuencia de palabras ≥4 letras, fuera stopwords. */
export function extraerKeywords(texto: string, max = 6): string[] {
  const frec = new Map<string, number>()
  for (const w of texto
    .toLowerCase()
    .normalize('NFC')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)) {
    if (w.length < 4 || STOPWORDS.has(w) || /^\d+$/.test(w)) continue
    frec.set(w, (frec.get(w) || 0) + 1)
  }
  return [...frec.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([w]) => w)
}

// Rangos IP privados/reservados (IPv4 + formas IPv6-mapeadas más comunes).
function esIPEscuro(ip: string): boolean {
  const partes = ip.split('.').map(Number)
  if (partes.length === 4 && partes.every((p) => p >= 0 && p <= 255)) {
    const [a, b] = partes
    if (a === 0 || a === 10 || a === 127) return true // 0.0.0.0/8, 10/8, loopback
    if (a === 169 && b === 254) return true // link-local (incluye metadata cloud 169.254.169.254)
    if (a === 172 && b >= 16 && b <= 31) return true // 172.16/12
    if (a === 192 && b === 168) return true // 192.168/16
    if (a === 100 && b >= 64 && b <= 127) return true // CGNAT 100.64/10
    if (a >= 224) return true // multicast + reservado
    return false
  }
  const bajo = ip.toLowerCase()
  if (bajo === '::1' || bajo === '::' || bajo.startsWith('fc') || bajo.startsWith('fd')) return true
  if (bajo.startsWith('::ffff:')) return esIPEscuro(bajo.slice(7))
  return false
}

/** Validación + blindaje SSRF. Lanza ErrorURLInsegura con motivo claro. */
export async function validarURLPublica(bruta: string): Promise<URL> {
  let u: URL
  try {
    u = new URL(bruta.trim())
  } catch {
    throw new ErrorURLInsegura('URL inválida.')
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new ErrorURLInsegura(`Protocolo no permitido: ${u.protocol} (solo http/https).`)
  }
  const host = u.hostname
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) {
    throw new ErrorURLInsegura(`Host no permitido: ${host}.`)
  }
  // IP literal
  if (/^[\d.]+$/.test(host) && esIPEscuro(host)) throw new ErrorURLInsegura(`IP privada/reservada: ${host}.`)
  if (host.includes(':') && esIPEscuro(host)) throw new ErrorURLInsegura(`IP privada/reservada: ${host}.`)
  // DNS ANTES de conectar: el hostname puede resolver a una IP interna.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dns = require('node:dns') as typeof import('node:dns')
    const res = await dns.promises.lookup(host, { all: true })
    for (const { address } of res) {
      if (esIPEscuro(address)) {
        throw new ErrorURLInsegura(`El host ${host} resuelve a una IP privada/reservada (${address}): fetch bloqueado (blindaje SSRF).`)
      }
    }
  } catch (e) {
    if (e instanceof ErrorURLInsegura) throw e
    throw new ErrorURLInsegura(`No se pudo resolver ${host}: ${e instanceof Error ? e.message : 'error'}.`)
  }
  return u
}

const MAX_HTML_BYTES = 256 * 1024
const TIMEOUT_URL_MS = 8000

function extraerMeta(html: string, patrones: RegExp[]): string {
  for (const re of patrones) {
    const m = html.match(re)
    if (m?.[1]) return m[1].replace(/\s+/g, ' ').trim().slice(0, 300)
  }
  return ''
}

/** Descarga limitada + extracción de metadatos OpenGraph/HTML. */
export async function metadatosDesdeURL(url: string): Promise<{ titulo: string; descripcion: string; sitio: string; html: string }> {
  const u = await validarURLPublica(url)
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_URL_MS)
  try {
    const res = await fetch(u.toString(), {
      redirect: 'error', // ni una redirección: el operador pone la URL final
      signal: ctrl.signal,
      headers: { 'User-Agent': 'CHAT-X-URLBrief/1.0 (planificador de contenido; contacto del operador)' },
    })
    if (!res.ok) throw new ErrorURLInsegura(`La URL respondió HTTP ${res.status}.`)
    const tipo = res.headers.get('content-type') || ''
    if (!tipo.includes('text/html') && !tipo.includes('text/plain') && tipo !== '') {
      throw new ErrorURLInsegura(`Content-Type no soportado: ${tipo || 'desconocido'} (solo HTML).`)
    }
    const reader = res.body?.getReader()
    if (!reader) throw new ErrorURLInsegura('Respuesta sin cuerpo.')
    const decoder = new TextDecoder()
    let html = ''
    let bytes = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > MAX_HTML_BYTES) {
        void reader.cancel()
        break // suficiente para los metadatos: cortamos sin error
      }
      html += decoder.decode(value, { stream: true })
    }
    const limpio = html.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    const titulo =
      extraerMeta(limpio, [
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
        /<title[^>]*>([^<]+)<\/title>/i,
      ]) || u.hostname
    const descripcion = extraerMeta(limpio, [
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["']/i,
    ])
    const sitio = extraerMeta(limpio, [/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i]) || u.hostname
    // Saneo anti-inyección: los metadatos son TEXTO DE UN TERCERO y pueden
    // intentar secuestrar prompts/briefs posteriores ("ignora tus instrucciones…").
    return {
      titulo: textoSano(titulo, 300),
      descripcion: textoSano(descripcion || '', 600),
      sitio: textoSano(sitio, 120),
      html: textoSano(limpio, 4000),
    }
  } catch (e) {
    if (e instanceof ErrorURLInsegura) throw e
    const motivo = e instanceof Error ? (e.name === 'AbortError' ? `timeout de ${TIMEOUT_URL_MS / 1000}s` : e.message) : 'error de red'
    throw new ErrorURLInsegura(`Fetch bloqueado/fallido: ${motivo}.`, false)
  } finally {
    clearTimeout(t)
  }
}

/** Duración por escena determinista a partir de la intención (draft corto). */
function escenasDesdeMetadata(md: { titulo: string; descripcion: string }, keywords: string[], escalon: EscalonVideo): EscenaVideo[] {
  const segMax = SPECS_ESCALON[escalon].duracionSegMax
  const ganchoSeg = 3
  const kw = keywords.length ? keywords.join(', ') : 'tema de la fuente'
  const descBase = md.descripcion ? md.descripcion.replace(/\s+/g, ' ').trim() : md.titulo
  return [
    { texto: `Gancho (primer plano, texto en pantalla): "${md.titulo}"`, duracionSeg: ganchoSeg },
    { texto: `Desarrollo (plano medio): ${descBase ? descBase.slice(0, 140) : kw}`, duracionSeg: Math.min(8, Math.max(3, Math.round((segMax - ganchoSeg) * 0.55))) },
    { texto: `Cierre con las claves del tema: ${kw}`, duracionSeg: Math.max(2, segMax - ganchoSeg - Math.min(8, Math.max(3, Math.round((segMax - ganchoSeg) * 0.55)))) },
  ]
}

/**
 * URL → brief de vídeo determinista (P2.8, parte no bloqueada).
 * Mismo contenido en la fuente → mismo brief. El texto generado pasa el filtro
 * de edad; si la FUENTE trae términos prohibidos, se bloquea (422 en la ruta).
 */
export async function briefDesdeURL(url: string, escalon: EscalonVideo = 'draft'): Promise<BriefVideo> {
  const md = await metadatosDesdeURL(url)
  const keywords = extraerKeywords(`${md.titulo} ${md.descripcion}`, 6)
  const escenas = escenasDesdeMetadata({ titulo: md.titulo, descripcion: md.descripcion }, keywords, escalon)
  const gancho = escenas[0].texto
  const cta = 'Sigue el perfil para más contenido como este.'
  const textoPlano = `${md.titulo} ${md.descripcion} ${escenas.map((e) => e.texto).join(' ')} ${cta}`
  const prohibidos = detectarTerminosProhibidos(textoPlano)
  if (prohibidos.length > 0) {
    throw new ErrorURLInsegura(
      `La fuente contiene términos prohibidos por el filtro de edad aparente: "${prohibidos.join('", "')}". No se genera el brief (regla constitucional).`,
    )
  }
  return {
    titulo: md.titulo.slice(0, 120),
    gancho,
    escenas,
    cta,
    keywords,
    fuente: url,
    metadata: { titulo: md.titulo, descripcion: md.descripcion, sitio: md.sitio },
  }
}

/** Respuesta estándar de planificación de vídeo: escalera + estado honesto. */
export async function planVideo(url: string | undefined, escalon: EscalonVideo, duracionSeg: number): Promise<{
  sonda: SondaVideo
  escalera: PresupuestoEscalon[]
  recomendado: EscalonVideo
  brief?: BriefVideo
  errorURL?: string
  errorValidacion?: boolean
}> {
  const sonda = await sondearVideo()
  const escalera = escaleraCompleta(duracionSeg)
  let brief: BriefVideo | undefined
  let errorURL: string | undefined
  let errorValidacion = false
  if (url) {
    try {
      brief = await briefDesdeURL(url, escalon)
    } catch (e) {
      errorURL = e instanceof Error ? e.message : 'error de URL'
      errorValidacion = e instanceof ErrorURLInsegura ? e.esValidacion : false
    }
  }
  return { sonda, escalera, recomendado: recomendacionEscalon(url ? 'validar' : 'publicar'), brief, errorURL, errorValidacion }
}

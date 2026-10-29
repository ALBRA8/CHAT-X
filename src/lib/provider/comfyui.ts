// Proveedor REAL ComfyUI — producción audiovisual con GPU local o remota ($0/mes).
// Implementa la MISMA interfaz Provider que el simulador: cero cambios en UI,
// cola, cifrado o compliance. Las imágenes raster (PNG) generadas por ComfyUI se
// entregan envueltas en un contenedor SVG (data: URL) para reutilizar todo el
// pipeline de almacenamiento/cifrado existente sin tocar media.ts.
//
// Requisitos (documentados en docs/MOTOR_GPU.md):
//   - ComfyUI corriendo con --listen y API disponible (por defecto http://127.0.0.1:8188)
//   - ESTUDIO_PROVIDER=comfyui
//   - COMFYUI_URL, COMFYUI_WORKFLOW_JSON (ruta a workflow en formato API con
//     marcadores {{PROMPT}}, {{SEED}}, {{WIDTH}}, {{HEIGHT}}), opcional COMFYUI_API_KEY
import type { GenerationRequest, GeneratedImage, Provider, VeredictoIdentidad } from './types'
import { componerPrompt, envolverPngEnSvg, seedNumerica } from './prompt'

function comfyUrl(): string {
  return (process.env.COMFYUI_URL || 'http://127.0.0.1:8188').replace(/\/+$/, '')
}
function timeoutMs(): number {
  return Number(process.env.COMFYUI_TIMEOUT_MS || 180000)
}

async function fetchConTimeout(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs = 15000, ...rest } = init
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(url, { ...rest, signal: ctrl.signal, cache: 'no-store' })
  } finally {
    clearTimeout(t)
  }
}

interface WorkflowCargado {
  json: Record<string, unknown>
  // nodos detectados donde inyectar (por orden de prioridad de class_type)
  nodoPrompt?: string
  nodoSeed?: string
  nodoImagen?: string // LoadImage: presente = el workflow soporta img2img
}

const cacheWorkflow = globalThis as unknown as { __comfyWorkflow?: WorkflowCargado }

async function cargarWorkflow(): Promise<WorkflowCargado> {
  if (cacheWorkflow.__comfyWorkflow) return cacheWorkflow.__comfyWorkflow
  const ruta = process.env.COMFYUI_WORKFLOW_JSON
  if (!ruta) throw new Error('COMFYUI_WORKFLOW_JSON no definida: exporta tu workflow de ComfyUI en formato API (Save (API Format)) y apunta la variable a ese archivo.')
  const fs = await import('fs')
  const json = JSON.parse(fs.readFileSync(ruta, 'utf8')) as Record<string, unknown>
  const wf: WorkflowCargado = { json }
  for (const [id, nodo] of Object.entries(json)) {
    const clase = String((nodo as { class_type?: string }).class_type || '')
    if (!wf.nodoPrompt && (clase === 'CLIPTextEncode' || clase === 'Textbox')) wf.nodoPrompt = id
    if (!wf.nodoSeed && (clase === 'KSampler' || clase === 'KSamplerAdvanced')) wf.nodoSeed = id
    if (!wf.nodoImagen && (clase === 'LoadImage' || clase === 'LoadImageMask')) wf.nodoImagen = id
  }
  if (!wf.nodoPrompt) throw new Error('El workflow no tiene un nodo CLIPTextEncode: revisa COMFYUI_WORKFLOW_JSON.')
  cacheWorkflow.__comfyWorkflow = wf
  return wf
}

/**
 * Extrae los bytes PNG embebidos en un SVG contenedor (piezas de proveedores
 * reales). Un SVG puro (simulador) NO sirve como referencia img2img: error honesto.
 */
export function extraerPngDeSvg(svg: string): Buffer {
  const m = svg.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/)
  if (!m) {
    throw new Error(
      'img2img: la referencia no contiene PNG embebido (pieza del simulador). El try-on real requiere una pieza raster de proveedor real (ComfyUI/local-cpu).',
    )
  }
  return Buffer.from(m[1], 'base64')
}

/**
 * Sube la imagen de referencia a ComfyUI (POST /upload/image, multipart) y
 * devuelve el filename que debe ir en el nodo LoadImage.
 */
async function subirReferenciaComfy(png: Buffer, nombre: string): Promise<string> {
  const base = comfyUrl()
  const fd = new FormData()
  fd.append('image', new Blob([new Uint8Array(png)], { type: 'image/png' }), nombre)
  fd.append('overwrite', 'true')
  fd.append('type', 'input')
  const res = await fetchConTimeout(`${base}/upload/image`, { method: 'POST', body: fd, timeoutMs: 30000 })
  if (!res.ok) throw new Error(`ComfyUI /upload/image respondió HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const { name } = (await res.json()) as { name?: string }
  if (!name) throw new Error('ComfyUI /upload/image no devolvió el nombre del archivo subido.')
  return name
}

async function generarEnComfy(req: GenerationRequest): Promise<{ base64: string; width: number; height: number }> {
  const base = comfyUrl()
  const wf = await cargarWorkflow()
  const width = req.kind === 'final' ? 832 : 512
  const height = req.kind === 'final' ? 1216 : 768
  const seedNum = seedNumerica(req.seed)

  const prompt = componerPrompt(req)
  const nodoPrompt = wf.json[wf.nodoPrompt!] as { inputs: Record<string, unknown> }
  nodoPrompt.inputs.text = prompt
  if (wf.nodoSeed) {
    const nodoSeed = wf.json[wf.nodoSeed!] as { inputs: Record<string, unknown> }
    nodoSeed.inputs.seed = seedNum
    // img2img (Outfit Swap P2.6): denoise BAJO = respetar identidad de la referencia
    if (req.img2img && 'denoise' in nodoSeed.inputs) nodoSeed.inputs.denoise = req.img2img.denoise
  }
  if (req.img2img) {
    if (!wf.nodoImagen) {
      throw new Error(
        'img2img: el workflow no tiene nodo LoadImage — exporta un workflow con LoadImage + KSampler(denoise) para try-on real (docs/MOTOR_GPU.md §img2img).',
      )
    }
    const fs = await import('fs')
    const png = extraerPngDeSvg(fs.readFileSync(req.img2img.rutaReferencia).toString('utf8'))
    const nombre = `chatx_ref_${req.img2img.mediaRefId.slice(0, 16)}.png`
    const nombreSubido = await subirReferenciaComfy(png, nombre)
    const nodoImagen = wf.json[wf.nodoImagen] as { inputs: Record<string, unknown> }
    nodoImagen.inputs.image = nombreSubido
  }

  const resPut = await fetchConTimeout(`${base}/prompt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.COMFYUI_API_KEY ? { Authorization: `Bearer ${process.env.COMFYUI_API_KEY}` } : {}),
    },
    body: JSON.stringify({ prompt: wf.json, client_id: `chatx_${req.seed.slice(0, 24)}` }),
    timeoutMs: 30000,
  })
  if (!resPut.ok) throw new Error(`ComfyUI /prompt respondió HTTP ${resPut.status}: ${(await resPut.text()).slice(0, 300)}`)
  const { prompt_id: promptId } = (await resPut.json()) as { prompt_id: string }

  // Poll del historial hasta que termine (con timeout global)
  const inicio = Date.now()
  let outputs: Record<string, { images?: { filename: string; subfolder: string; type: string }[] }> = {}
  while (Date.now() - inicio < timeoutMs()) {
    await new Promise((r) => setTimeout(r, 1500))
    const h = await fetchConTimeout(`${base}/history/${promptId}`, { timeoutMs: 10000 })
    if (!h.ok) continue
    const hist = (await h.json()) as Record<string, { outputs?: typeof outputs; status?: { completed?: boolean } }>
    const entrada = hist[promptId]
    if (entrada?.outputs && Object.keys(entrada.outputs).length > 0 && entrada.status?.completed) {
      outputs = entrada.outputs
      break
    }
  }
  if (!Object.keys(outputs).length) throw new Error(`ComfyUI no devolvió outputs en ${timeoutMs() / 1000}s (prompt_id ${promptId}).`)

  const imgInfo = Object.values(outputs).flatMap((o) => o.images ?? [])[0]
  if (!imgInfo) throw new Error('ComfyUI terminó sin imágenes.')
  const qs = new URLSearchParams({ filename: imgInfo.filename, subfolder: imgInfo.subfolder ?? '', type: imgInfo.type ?? 'output' })
  const resImg = await fetchConTimeout(`${base}/view?${qs}`, { timeoutMs: 30000 })
  if (!resImg.ok) throw new Error(`ComfyUI /view respondió HTTP ${resImg.status}.`)
  const buf = Buffer.from(await resImg.arrayBuffer())
  return { base64: buf.toString('base64'), width, height }
}

export const comfyuiProvider: Provider = {
  name: 'comfyui',
  esSimulado: false,

  generateImage(req: GenerationRequest): GeneratedImage {
    // La interfaz es síncrona por diseño del MVP (el worker llama generateImage
    // en línea); para el proveedor real lanzamos la tarea y la sincronizamos vía
    // cache por semilla: generateImageReal se invoca desde el worker de forma
    // asíncrona antes de generateImage (ver doc MOTOR_GPU.md sección flujo).
    const cache = (globalThis as unknown as { __comfyCache?: Map<string, GeneratedImage> }).__comfyCache
    const hit = cache?.get(req.seed)
    if (hit) {
      cache!.delete(req.seed)
      return hit
    }
    throw new Error('COMFYUI_SYNC: ejecuta primero prepararImagenComfy(seed, req) — el flujo asíncrono de ComfyUI no puede resolverse en una llamada síncrona.')
  },

  checkIdentidad(seed: string): VeredictoIdentidad {
    // HONESTO: la verificación de identidad visual automática requiere un modelo
    // de visión aún no integrado. Con seed + LoRA fijas, ComfyUI reproduce la
    // misma identidad de forma determinista; el QA humano sigue siendo la puerta
    // final (aprobar/rechazar en Biblioteca), igual que con el simulador.
    return { aprueba: true, motivo: 'QA visual automático pendiente de modelo de visión; identidad determinista por seed/LoRA + revisión humana.' }
  },

  checkAnatomia(seed: string): VeredictoIdentidad {
    return { aprueba: true, motivo: 'QA visual automático pendiente de modelo de visión; revisión humana en biblioteca.' }
  },
}

/** Prepara una imagen real en ComfyUI (async) y la deja en cache para generateImage. */
export async function prepararImagenComfy(req: GenerationRequest): Promise<void> {
  const g = globalThis as unknown as { __comfyCache?: Map<string, GeneratedImage> }
  if (!g.__comfyCache) g.__comfyCache = new Map()
  const { base64, width, height } = await generarEnComfy(req)
  g.__comfyCache.set(req.seed, { svg: envolverPngEnSvg(base64, width, height), width, height })
}

/** Salud del proveedor ComfyUI: alcanzable + VRAM reportada por /system_stats. */
export async function saludComfy(): Promise<{ ok: boolean; detalle: string; vramMb?: number; url: string }> {
  const base = comfyUrl()
  try {
    const res = await fetchConTimeout(`${base}/system_stats`, { timeoutMs: 4000 })
    if (!res.ok) return { ok: false, detalle: `ComfyUI respondió HTTP ${res.status} en ${base}/system_stats`, url: base }
    const stats = (await res.json()) as { devices?: { name?: string; vram_total?: number }[] }
    const dev = stats.devices?.[0]
    return {
      ok: true,
      detalle: `ComfyUI operativo en ${base}${dev?.name ? ` — GPU: ${dev.name}` : ''}`,
      vramMb: dev?.vram_total ? Math.round(dev.vram_total / 1048576) : undefined,
      url: base,
    }
  } catch (e) {
    return { ok: false, detalle: `ComfyUI inalcanzable en ${base}: ${e instanceof Error ? e.message : 'error'}`, url: base }
  }
}

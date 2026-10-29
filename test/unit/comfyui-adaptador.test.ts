// Prueba E2E del adaptador ComfyUI contra un servidor de prueba que respeta el
// CONTRATO API de ComfyUI (/system_stats, POST /prompt, GET /history/{id}, GET /view).
//
// Qué demuestra (REAL): inyección de prompt/seed en el workflow, polling de historial,
// descarga de bytes, envoltura SVG con dimensiones, determinismo de seed, manejo de
// errores HTTP y de timeout sin outputs.
// Qué NO demuestra: generación real de píxeles — eso requiere ComfyUI con modelo
// instalado (GPU o CPU), ver docs/MOTOR_GPU.md y scripts/benchmark_gpu.sh.
import { describe, test, expect } from 'bun:test'
import fs from 'fs'
import os from 'os'
import path from 'path'

const PUERTO = 18923
const PNG_1PX =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

// Estado del stub
let modoFallo: '' | 'prompt500' | 'sinOutput' = ''
const promptsRecibidos: Array<Record<string, { class_type: string; inputs: Record<string, unknown> }>> = []
const uploadsRecibidos: Array<{ nombre: string; bytes: number }> = []

const servidor = Bun.serve({
  port: PUERTO,
  idleTimeout: 30,
  async fetch(req) {
    const url = new URL(req.url)
    const p = url.pathname
    if (req.method === 'GET' && p === '/system_stats') {
      return Response.json({
        system: { comfyui_version: 'stub-0.3', python_version: '3.12.0' },
        devices: [{ name: 'StubGPU-Prueba', type: 'cuda', vram_total: 24 * 1024 * 1024 * 1024, vram_free: 20 * 1024 * 1024 * 1024 }],
      })
    }
    if (req.method === 'POST' && p === '/prompt') {
      if (modoFallo === 'prompt500') return new Response('error interno deliberado del stub', { status: 500 })
      const body = (await req.json()) as { prompt: typeof promptsRecibidos[number] }
      promptsRecibidos.push(body.prompt)
      // Nuevo prompt_id con historial limpio; completa tras 200ms (o nunca, en modo sinOutput)
      const pid = `stub-pid-${promptsRecibidos.length}`
      delete historial[pid]
      if (modoFallo !== 'sinOutput') {
        setTimeout(() => {
          historial[pid] = {
            outputs: { '9': { images: [{ filename: 'stub_salida.png', subfolder: '', type: 'output' }] } },
            status: { completed: true },
          }
        }, 200)
      }
      return Response.json({ prompt_id: pid, number: promptsRecibidos.length, node_errors: {} })
    }
    if (req.method === 'GET' && p.startsWith('/history/')) {
      return Response.json(historial)
    }
    if (req.method === 'POST' && p === '/upload/image') {
      // Contrato real de ComfyUI: multipart con campo 'image', devuelve {name}
      const fd = await req.formData()
      const archivo = fd.get('image') as File | null
      if (!archivo) return new Response('sin campo image', { status: 400 })
      uploadsRecibidos.push({ nombre: archivo.name, bytes: archivo.size })
      return Response.json({ name: archivo.name, subfolder: '', type: 'input' })
    }
    if (req.method === 'GET' && p === '/view') {
      return new Response(Buffer.from(PNG_1PX, 'base64'), { headers: { 'Content-Type': 'image/png' } })
    }
    return new Response('not found', { status: 404 })
  },
})

const historial: Record<string, unknown> = {}

// El adaptador lee URL/timeout/workflow al importar: configurar ANTES del import dinámico
process.env.COMFYUI_URL = `http://127.0.0.1:${PUERTO}`
process.env.COMFYUI_TIMEOUT_MS = '3000'
const WF_RUTA = path.join(os.tmpdir(), `comfy_wf_e2e_${process.pid}.json`)
fs.writeFileSync(
  WF_RUTA,
  JSON.stringify({
    '3': { class_type: 'KSampler', inputs: { seed: 0, steps: 20, cfg: 7, sampler_name: 'dpmpp_2m', scheduler: 'karras', denoise: 1, model: ['4', 0], positive: ['6', 0], negative: ['7', 0], latent_image: ['5', 0] } },
    '4': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: 'sd_xl_base_1.0.safetensors' } },
    '5': { class_type: 'EmptyLatentImage', inputs: { width: 512, height: 768, batch_size: 1 } },
    '6': { class_type: 'CLIPTextEncode', inputs: { text: '', clip: ['10', 1] } },
    '7': { class_type: 'CLIPTextEncode', inputs: { text: 'low quality', clip: ['10', 1] } },
    '8': { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['4', 2] } },
    '9': { class_type: 'SaveImage', inputs: { images: ['8', 0], filename_prefix: 'e2e' } },
    '10': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: 'sd_xl_base_1.0.safetensors' } },
  }),
)
process.env.COMFYUI_WORKFLOW_JSON = WF_RUTA

const { comfyuiProvider, prepararImagenComfy, saludComfy } = await import('@/lib/provider/comfyui')

function reqDePrueba(seed: string) {
  return {
    kind: 'preview' as const,
    seed,
    baseSeed: 'base-1111',
    variant: 0,
    brief: { escena: 'café al atardecer', outfit: 'vestido rojo', pose: 'sentada', encuadre: 'plano_medio', luz: 'golden hour' },
    lane: 'PUBLICO' as const,
    characterName: 'Valentina QA',
    index: 0,
    total: 1,
  }
}

describe('adaptador ComfyUI — E2E contra contrato API (stub local)', () => {
  test('salud: /system_stats reporta GPU y VRAM', async () => {
    const s = await saludComfy()
    expect(s.ok).toBe(true)
    expect(s.detalle).toContain('StubGPU-Prueba')
    expect(s.vramMb).toBe(24576)
  })

  test('generación: inyecta prompt+seed, hace polling, descarga PNG y envuelve en SVG', async () => {
    const req = reqDePrueba('semilla-e2e-001')
    await prepararImagenComfy(req)
    const img = comfyuiProvider.generateImage(req)

    // Workflow recibido por el stub: inyección REAL de prompt y seed
    expect(promptsRecibidos.length).toBeGreaterThan(0)
    const wf = promptsRecibidos[0]
    expect(wf['6'].inputs.text).toContain('Valentina QA')
    expect(wf['6'].inputs.text).toContain('café al atardecer')
    expect(wf['6'].inputs.text).toContain('vestido rojo')
    expect(typeof wf['3'].inputs.seed).toBe('number')
    expect(wf['3'].inputs.seed as number).toBeGreaterThanOrEqual(1)

    // Resultado: SVG contenedor con PNG embebido y dimensiones del kind=preview
    expect(comfyuiProvider.esSimulado).toBe(false)
    expect(img.svg).toContain(`data:image/png;base64,${PNG_1PX}`)
    expect(img.width).toBe(512)
    expect(img.height).toBe(768)

    // Archivo resultante: los bytes embebidos son un PNG con firma válida
    const base64 = img.svg.split('base64,')[1].split('"')[0]
    const rutaSalida = path.join(os.tmpdir(), `chatx_e2e_salida_${process.pid}.png`)
    fs.writeFileSync(rutaSalida, Buffer.from(base64, 'base64'))
    const bytes = fs.readFileSync(rutaSalida)
    expect(bytes[0]).toBe(0x89)
    expect(bytes.subarray(1, 4).toString()).toBe('PNG')
    expect(bytes.length).toBeGreaterThan(50)
  })

  test('determinismo: misma semilla produce el mismo seed numérico en ComfyUI', async () => {
    const antes = promptsRecibidos.length
    await prepararImagenComfy(reqDePrueba('semilla-e2e-001'))
    comfyuiProvider.generateImage(reqDePrueba('semilla-e2e-001'))
    const wf2 = promptsRecibidos[antes]
    expect(wf2['3'].inputs.seed).toBe(promptsRecibidos[0]['3'].inputs.seed)
  })

  test('error: /prompt con HTTP 500 se propaga con detalle (registro de errores)', async () => {
    modoFallo = 'prompt500'
    await expect(prepararImagenComfy(reqDePrueba('fallo-500'))).rejects.toThrow(/HTTP 500/)
    modoFallo = ''
  })

  test('error: sin outputs dentro del timeout se propaga mensaje claro', async () => {
    modoFallo = 'sinOutput'
    await expect(prepararImagenComfy(reqDePrueba('fallo-silent'))).rejects.toThrow(/no devolvió outputs/)
    modoFallo = ''
  })
})

// ───────────────────────── img2img (Outfit Swap P2.6) ─────────────────────────

// Workflow CON LoadImage + denoise (try-on real) en archivo aparte
const WF_IMG2IMG = path.join(os.tmpdir(), `comfy_wf_img2img_${process.pid}.json`)
fs.writeFileSync(
  WF_IMG2IMG,
  JSON.stringify({
    '3': { class_type: 'KSampler', inputs: { seed: 0, steps: 20, cfg: 7, sampler_name: 'dpmpp_2m', scheduler: 'karras', denoise: 1, model: ['4', 0], positive: ['6', 0], negative: ['7', 0], latent_image: ['5', 0] } },
    '4': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: 'sd_xl_base_1.0.safetensors' } },
    '5': { class_type: 'EmptyLatentImage', inputs: { width: 512, height: 768, batch_size: 1 } },
    '6': { class_type: 'CLIPTextEncode', inputs: { text: '', clip: ['10', 1] } },
    '7': { class_type: 'CLIPTextEncode', inputs: { text: 'low quality', clip: ['10', 1] } },
    '8': { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['4', 2] } },
    '9': { class_type: 'SaveImage', inputs: { images: ['8', 0], filename_prefix: 'e2e' } },
    '10': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: 'sd_xl_base_1.0.safetensors' } },
    '11': { class_type: 'LoadImage', inputs: { image: 'original.png' } },
  }),
)

// SVG contenedor con PNG embebido (pieza de proveedor real válida como referencia)
const REF_SVG = path.join(os.tmpdir(), `chatx_ref_svg_${process.pid}.svg`)
fs.writeFileSync(REF_SVG, `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><image href="data:image/png;base64,${PNG_1PX}"/></svg>`)

function reqImg2Img(seed: string) {
  return {
    ...reqDePrueba(seed),
    img2img: { mediaRefId: 'ref_abc123', denoise: 0.45, rutaReferencia: REF_SVG },
  }
}

function limpiarCacheWorkflow() {
  ;(globalThis as unknown as { __comfyWorkflow?: unknown }).__comfyWorkflow = undefined
}

describe('adaptador ComfyUI — contrato img2img (Outfit Swap P2.6, hermético)', () => {
  test('sube la referencia a /upload/image, fija el nodo LoadImage y ajusta denoise bajo', async () => {
    process.env.COMFYUI_WORKFLOW_JSON = WF_IMG2IMG
    limpiarCacheWorkflow()
    try {
      const req = reqImg2Img('swap-e2e-001')
      await prepararImagenComfy(req)
      const img = comfyuiProvider.generateImage(req)
      expect(img.svg).toContain('data:image/png;base64,')

      // La referencia llegó REALMENTE al stub con su nombre determinista
      expect(uploadsRecibidos.length).toBe(1)
      expect(uploadsRecibidos[0].nombre).toBe('chatx_ref_ref_abc123.png')
      expect(uploadsRecibidos[0].bytes).toBeGreaterThan(50)

      // El workflow enviado lleva LoadImage apuntando a la subida y denoise 0.45
      const wf = promptsRecibidos[promptsRecibidos.length - 1]
      expect(wf['11'].inputs.image).toBe('chatx_ref_ref_abc123.png')
      expect(wf['3'].inputs.denoise).toBe(0.45)
      expect(wf['6'].inputs.text).toContain('Valentina QA')
    } finally {
      process.env.COMFYUI_WORKFLOW_JSON = WF_RUTA
      limpiarCacheWorkflow()
    }
  })

  test('sin LoadImage en el workflow → error honesto que dice qué falta', async () => {
    process.env.COMFYUI_WORKFLOW_JSON = WF_RUTA
    limpiarCacheWorkflow()
    try {
      await expect(prepararImagenComfy(reqImg2Img('swap-sin-loadimage'))).rejects.toThrow(/no tiene nodo LoadImage/)
    } finally {
      process.env.COMFYUI_WORKFLOW_JSON = WF_RUTA
      limpiarCacheWorkflow()
    }
  })

  test('referencia SVG pura (pieza del simulador) → error honesto: img2img exige raster real', async () => {
    const { extraerPngDeSvg } = await import('@/lib/provider/comfyui')
    expect(() => extraerPngDeSvg('<svg xmlns="x"><rect width="1" height="1"/></svg>')).toThrow(/no contiene PNG embebido/)
    const png = extraerPngDeSvg(fs.readFileSync(REF_SVG, 'utf8'))
    expect(png[0]).toBe(0x89)
    expect(png.subarray(1, 4).toString()).toBe('PNG')
  })

  test('sin img2img el KSampler mantiene su denoise original (txt2img intacto)', async () => {
    const antes = promptsRecibidos.length
    await prepararImagenComfy(reqDePrueba('txt2img-tras-swap'))
    const wf = promptsRecibidos[antes]
    expect(wf['3'].inputs.denoise).toBe(1)
  })
})

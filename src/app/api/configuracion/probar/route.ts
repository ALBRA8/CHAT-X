// Panel de Configuración — sondas REALES «con un click». Nada de promesas de landing:
//  llm    → GET {base}/models con la key resuelta (panel > env).
//  voz    → binarios reales de esta máquina (espeak-ng --version; paquete piper + modelo onnx).
//  imagen → proveedor activo del Estudio (simulador declarado / script+python3 CPU /
//           ComfyUI /system_stats por HTTP).
//  video  → escalera honesta del proveedor de vídeo (CONTEXTO X/02_PROCESSES/MOTOR_GPU.md).
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { spawnSync } from 'child_process'
import { recargarConfig, valorConfig } from '@/lib/configuracion'
import { sondearLLM, type SondaLLM } from '@/lib/provider/llm'
import { sondearProveedoresVoz, type SondaVoz } from '@/lib/provider/voz'
import { sondearVideo, type SondaVideo } from '@/lib/video'

export const dynamic = 'force-dynamic'

export interface SondaImagen {
  provedor: string
  estado: 'OPERATIVO' | 'NO_CONFIGURADO' | 'NO_DISPONIBLE' | 'ERROR'
  detalle: string
}

async function sondearImagen(): Promise<SondaImagen> {
  const provedor = valorConfig('media.proveedor').valor.toLowerCase() || 'simulador'
  if (provedor === 'simulador') {
    return {
      provedor,
      estado: 'OPERATIVO',
      detalle: 'simulador activo: piezas SVG deterministas de desarrollo ($0). Para media raster real cambia a local-cpu o comfyui en el panel.',
    }
  }
  if (provedor === 'local-cpu') {
    const script = valorConfig('media.cpu_script').valor || path.join(process.cwd(), 'scripts', 'provider_cpu_generar.py')
    if (!fs.existsSync(script)) {
      return { provedor, estado: 'NO_DISPONIBLE', detalle: `no existe el script ${script} — revisa «Script de generación CPU» en el panel` }
    }
    const py = spawnSync('python3', ['--version'], { encoding: 'utf8', timeout: 5000 })
    if (py.error || py.status !== 0) {
      const detalle = py.error ? py.error.message : `código ${py.status}`
      return { provedor, estado: 'NO_DISPONIBLE', detalle: `python3 no responde (${detalle.slice(0, 140)}) — el proveedor CPU lo necesita` }
    }
    return { provedor, estado: 'OPERATIVO', detalle: `script CPU presente (${script}) y python3 listo — la primera generación descarga ~2.2 GB de modelo` }
  }
  // comfyui
  const base = (valorConfig('media.comfyui_url').valor || 'http://127.0.0.1:8188').replace(/\/+$/, '')
  try {
    const ctl = new AbortController()
    const t = setTimeout(() => ctl.abort(), 6000)
    let r: Response
    try {
      r = await fetch(`${base}/system_stats`, { cache: 'no-store', signal: ctl.signal })
    } finally {
      clearTimeout(t)
    }
    if (r.ok) return { provedor, estado: 'OPERATIVO', detalle: `ComfyUI respondió ${r.status} en ${base}/system_stats` }
    return { provedor, estado: 'ERROR', detalle: `HTTP ${r.status} de ${base}/system_stats — ComfyUI vivo pero respondió mal` }
  } catch (e) {
    return { provedor, estado: 'NO_DISPONIBLE', detalle: `sin respuesta de ${base}: ${(e as Error).message.slice(0, 140)} — ¿está arrancado con --listen?` }
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { objetivo?: string }
  const objetivo = body.objetivo ?? 'todo'
  await recargarConfig(true)

  if (objetivo === 'llm') return NextResponse.json({ llm: await sondearLLM() })
  if (objetivo === 'voz') return NextResponse.json({ voz: sondearProveedoresVoz() })
  if (objetivo === 'imagen') return NextResponse.json({ imagen: await sondearImagen() })
  if (objetivo === 'video') return NextResponse.json({ video: await sondearVideo() })

  const [llm, imagen, video] = await Promise.all([sondearLLM(), sondearImagen(), sondearVideo()])
  const sonda: { llm: SondaLLM; voz: SondaVoz[]; imagen: SondaImagen; video: SondaVideo } = {
    llm,
    voz: sondearProveedoresVoz(),
    imagen,
    video,
  }
  return NextResponse.json(sonda)
}

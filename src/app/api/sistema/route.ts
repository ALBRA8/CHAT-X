// Sistema: GPU + proveedor generativo + cola de trabajos (sección 5 y 12 del prompt maestro).
// Todo lo reportado aquí es medición real: nvidia-smi con argumentos fijos,
// fs para disco, salud del proveedor y conteos de la BD. Nada inventado.
import { NextResponse } from 'next/server'
import { execFile } from 'child_process'
import fs from 'fs'
import os from 'os'
import { db } from '@/lib/db'
import { getProvider } from '@/lib/provider'
import { saludComfy } from '@/lib/provider/comfyui'
import { JOB_STATUS } from '@/lib/constants'

export const dynamic = 'force-dynamic'

interface GpuInfo {
  nombre: string
  vramMb: number
  driver: string
  cuda: string
  fuente: string
}

function detectarNvidia(): Promise<GpuInfo | null> {
  return new Promise((resolve) => {
    execFile(
      'nvidia-smi',
      ['--query-gpu=name,memory.total,driver_version', '--format=csv,noheader,nounits'],
      { timeout: 4000 },
      (err, stdout) => {
        if (err || !stdout.trim()) return resolve(null)
        const [nombre, vram, driver] = stdout.trim().split('\n')[0].split(',').map((s) => s.trim())
        resolve({ nombre: nombre || 'unknown', vramMb: Number(vram) || 0, driver: driver || '?', cuda: '?', fuente: 'nvidia-smi' })
      },
    )
  })
}

export async function GET() {
  // GPU real si existe
  const nvidia = await detectarNvidia()

  // Disco y memoria del host
  let discoLibreGb = 0
  try {
    const st = fs.statfsSync(process.cwd())
    discoLibreGb = Math.round((st.bsize * Number(st.bavail)) / 1073741824)
  } catch {
    /* fs.statfsSync no disponible en este runtime */
  }

  // Proveedor generativo actual + salud específica
  const provider = getProvider()
  let proveedor: Record<string, unknown> = {
    actual: provider.name,
    esSimulado: provider.esSimulado,
  }
  if (provider.name === 'comfyui') {
    const salud = await saludComfy()
    proveedor = { ...proveedor, comfy: salud }
  }

  // Cola de trabajos real
  const [enCola, procesando, listos, fallidos] = await Promise.all([
    db.job.count({ where: { status: JOB_STATUS.EN_COLA } }),
    db.job.count({ where: { status: JOB_STATUS.PROCESANDO } }),
    db.job.count({ where: { status: JOB_STATUS.LISTO } }),
    db.job.count({ where: { status: JOB_STATUS.FALLIDO } }),
  ])

  return NextResponse.json({
    host: {
      plataforma: `${os.type()} ${os.release()}`,
      cpus: os.cpus().length,
      ramGb: Math.round(os.totalmem() / 1073741824),
      discoLibreGb,
      nota: 'Host del servidor CHAT-X. La GPU de producción vive en TU máquina: ejecuta bash scripts/detectar_gpu.sh allí y compara.',
    },
    gpu: nvidia ?? { nombre: 'none', vramMb: 0, driver: 'none', cuda: 'none', fuente: 'sin nvidia-smi accesible desde este host' },
    proveedor,
    cola: { enCola, procesando, listos, fallidos },
    generadoEn: new Date().toISOString(),
  })
}

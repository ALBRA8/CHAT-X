// Provider de voz (TTS) — P1.3 de CLONAKIT_BRECHAS: "integrar TTS cuando exista
// proveedor; contrato de voz guardada por personaje".
//
// Estados honestos (taxonomía de la constitución): un proveedor local solo es
// OPERATIVO si su binario/runtime existe EN ESTA MÁQUINA, verificado por sonda
// real (no por promesa de landing):
//  - espeak-local: binario `espeak-ng` (instalado, $0, calidad robótica funcional).
//  - piper-local: NO_DISPONIBLE hasta instalar piper + modelo es_ES
//    (procedimiento documentado en docs/MOTOR_GPU.md; 0.21 s CPU por 5.3 s de
//    audio en la prueba de 2026-10-28, 20× tiempo real).
//
// El texto a sintetizar pasa SIEMPRE por el filtro de edad duro de la
// plataforma (detectarTerminosProhibidos) en la ruta API: una nota de voz con
// términos prohibidos es tan prohibida como una imagen.
import { spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

export type EstadoVoz = 'OPERATIVO' | 'NO_DISPONIBLE' | 'ERROR'

export const PROVEEDORES_VOZ = ['espeak-local', 'piper-local'] as const
export type ProveedorVoz = (typeof PROVEEDORES_VOZ)[number]

export interface ContratoVoz {
  provedor: ProveedorVoz
  voz: string // identificador de voz del proveedor (espeak: 'es', 'es-419', 'en'…)
  velocidad: number // palabras por minuto (80–400)
  tono: number // ajuste de tono espeak 0–99 (50 = neutro)
  actualizado: string // ISO timestamp del último cambio del contrato
}

export interface SondaVoz {
  provedor: ProveedorVoz
  estado: EstadoVoz
  detalle: string
}

/** Binario espeak inyectable para pruebas (ESPEAK_BIN) — lectura en cada llamada. */
export function binarioEspeak(): string {
  return process.env.ESPEAK_BIN || 'espeak-ng'
}

/** Sonda real de un binario: OPERATIVO solo si existe y responde --version. */
function sondaBinario(bin: string, args: string[]): { estado: EstadoVoz; detalle: string } {
  try {
    const r = spawnSync(bin, args, { encoding: 'utf8', timeout: 5000 })
    if (r.error) return { estado: 'NO_DISPONIBLE', detalle: `${bin}: ${r.error.message.slice(0, 120)}` }
    if (r.status !== 0) return { estado: 'NO_DISPONIBLE', detalle: `${bin} salió con código ${r.status}` }
    return { estado: 'OPERATIVO', detalle: `${bin} presente y ejecutable` }
  } catch (e) {
    return { estado: 'NO_DISPONIBLE', detalle: `${bin}: ${(e as Error).message.slice(0, 120)}` }
  }
}

/** Sondeo honesto de todos los proveedores de voz de esta máquina. */
export function sondearProveedoresVoz(): SondaVoz[] {
  const espeak = sondaBinario(binarioEspeak(), ['--version'])
  // piper vive como paquete Python (scripts/voz_cpu_real.py): sondea import real.
  const piper = sondaBinario('python3', ['-c', 'import piper'])
  return [
    {
      provedor: 'espeak-local',
      estado: espeak.estado,
      detalle: espeak.estado === 'OPERATIVO' ? espeak.detalle : `${espeak.detalle} — espeak-ng es apt/dnf install espeak-ng`,
    },
    {
      provedor: 'piper-local',
      estado: piper.estado,
      detalle:
        piper.estado === 'OPERATIVO'
          ? 'paquete python piper importable'
          : 'sin paquete piper — instalar modelo es_ES según docs/MOTOR_GPU.md (voz real, 20× tiempo real)',
    },
  ]
}

/** Estado de un proveedor concreto (para la ruta: decidir antes de generar). */
export function estadoProveedor(p: ProveedorVoz): SondaVoz {
  return sondearProveedoresVoz().find((s) => s.provedor === p)!
}

/** Valida y normaliza un contrato de voz entrante (PUT de la API). */
export function validarContratoVoz(input: unknown): { ok: true; contrato: ContratoVoz } | { ok: false; errores: string[] } {
  const errores: string[] = []
  const b = (input ?? {}) as Record<string, unknown>
  const provedor = b.provedor
  if (typeof provedor !== 'string' || !(PROVEEDORES_VOZ as readonly string[]).includes(provedor)) {
    errores.push(`provedor debe ser uno de: ${PROVEEDORES_VOZ.join(', ')}`)
  }
  const voz = typeof b.voz === 'string' && b.voz.trim() ? b.voz.trim() : 'es'
  if (!/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/i.test(voz)) errores.push('voz debe ser un código BCP-47 corto (p.ej. es, es-419, en)')
  const velocidad = typeof b.velocidad === 'number' ? b.velocidad : 170
  if (!Number.isFinite(velocidad) || velocidad < 80 || velocidad > 400) errores.push('velocidad fuera de rango (80–400 palabras/min)')
  const tono = typeof b.tono === 'number' ? b.tono : 50
  if (!Number.isFinite(tono) || tono < 0 || tono > 99) errores.push('tono fuera de rango (0–99)')
  if (errores.length) return { ok: false, errores }
  return {
    ok: true,
    contrato: { provedor: provedor as ProveedorVoz, voz, velocidad: Math.round(velocidad), tono: Math.round(tono), actualizado: new Date().toISOString() },
  }
}

/** Parsea el JSON del contrato guardado en BD; devuelve null si vacío/inválido. */
export function parsearContratoGuardado(json: string | null | undefined): ContratoVoz | null {
  if (!json) return null
  try {
    const o = JSON.parse(json) as ContratoVoz
    if (!o || typeof o !== 'object' || !o.provedor) return null
    return validarContratoVoz(o).ok ? o : null
  } catch {
    return null
  }
}

/** Duración de un WAV PCM estándar a partir del header (byteRate @28, data @44). */
export function duracionWav(buf: Buffer): number {
  if (buf.length < 44 || buf.toString('ascii', 0, 4) !== 'RIFF') return 0
  const byteRate = buf.readUInt32LE(28)
  if (!byteRate) return 0
  return Math.max(0, (buf.length - 44) / byteRate)
}

export type ResultadoVoz =
  | { ok: true; wav: Buffer; duracionS: number; bytes: number; provedor: ProveedorVoz }
  | { ok: false; estado: EstadoVoz; detalle: string; provedor: ProveedorVoz }

/**
 * Genera una nota de voz real con el proveedor del contrato.
 * Sin fallbacks silenciosos: si el proveedor no está operativo, se devuelve
 * estado honesto (la ruta responde 503 con el detalle).
 */
export async function generarVoz(texto: string, contrato: ContratoVoz): Promise<ResultadoVoz> {
  if (contrato.provedor === 'piper-local') {
    // Piper requiere modelo onnx descargado + API python (docs/MOTOR_GPU.md).
    const s = estadoProveedor('piper-local')
    if (s.estado !== 'OPERATIVO') {
      return { ok: false, estado: s.estado, detalle: s.detalle, provedor: 'piper-local' }
    }
    return { ok: false, estado: 'ERROR', detalle: 'piper detectado pero su síntesis aún no está cableada (pendiente P1.3 fase 2)', provedor: 'piper-local' }
  }

  const s = estadoProveedor('espeak-local')
  if (s.estado !== 'OPERATIVO') {
    return { ok: false, estado: s.estado, detalle: s.detalle, provedor: 'espeak-local' }
  }

  const salida = path.join(os.tmpdir(), `chatx-voz-${process.pid}-${Date.now()}.wav`)
  const args = ['-v', contrato.voz, '-s', String(contrato.velocidad), '-p', String(contrato.tono), '-w', salida, texto]
  try {
    const r = spawnSync(binarioEspeak(), args, { encoding: 'utf8', timeout: 30000 })
    if (r.error || r.status !== 0) {
      const detalle = r.error ? r.error.message : r.stderr || `código ${r.status}`
      return { ok: false, estado: 'ERROR', detalle: `espeak-ng falló: ${detalle.slice(0, 200)}`, provedor: 'espeak-local' }
    }
    const wav = fs.readFileSync(salida)
    if (wav.length < 45) {
      return { ok: false, estado: 'ERROR', detalle: 'espeak-ng produjo un WAV vacío', provedor: 'espeak-local' }
    }
    return { ok: true, wav, duracionS: duracionWav(wav), bytes: wav.length, provedor: 'espeak-local' }
  } catch (e) {
    return { ok: false, estado: 'ERROR', detalle: `espeak-ng: ${(e as Error).message.slice(0, 200)}`, provedor: 'espeak-local' }
  } finally {
    try {
      fs.unlinkSync(salida)
    } catch {
      /* ya no existía */
    }
  }
}

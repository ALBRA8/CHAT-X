// Capa de voz de CHAT-X — tres capas, de robótica a identidad real:
//   1) espeak (robótico, solo emergencia) → 2) piper (natural, rápida, voz genérica)
//   → 3) clon-local (identidad real: speaker embedding de muestras del personaje).
// Todo local y $0. Esta capa gestiona la 3: sonda honesta, extracción de
// identidad y síntesis con identidad. Sin paquetes/modelos instalados el
// estado es NO_CONFIGURADO con detalle exacto de qué falta — nunca simulado.
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

/** Carpeta de modelos de clonación (fuera del repo, compartida por todas las voces). */
export const DIR_MODELOS_CLON = path.join(process.cwd(), 'models', 'clon')

/** Tamaño máximo de muestra aceptada (15 MB ≈ 5–10 min de wav comprimido). */
export const MUESTRA_MAX_BYTES = 15 * 1024 * 1024

/** Extensiones/mimes de audio aceptados para una muestra. */
const AUDIO_OK = [
  'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/mpeg', 'audio/mp3',
  'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/ogg', 'audio/webm',
  'audio/flac', 'audio/x-flac',
]
const EXT_OK = ['.wav', '.mp3', '.m4a', '.ogg', '.webm', '.flac', '.opus']

/** Valida nombre/tipo/tamaño de una muestra ANTES de tocar disco. */
export function validarMuestra(nombre: string, tipo: string, bytes: number): { ok: boolean; motivo?: string } {
  if (!nombre || bytes <= 0) return { ok: false, motivo: 'archivo vacío' }
  if (bytes > MUESTRA_MAX_BYTES) return { ok: false, motivo: `muestra demasiado grande (${Math.round(bytes / 1048576)} MB; máximo 15 MB)` }
  const ext = path.extname(nombre).toLowerCase()
  const tipoOk = AUDIO_OK.includes(tipo) || EXT_OK.includes(ext)
  if (!tipoOk) return { ok: false, motivo: `formato no soportado (${tipo || ext || 'desconocido'}); usa wav, mp3, m4a, ogg, webm, flac u opus` }
  return { ok: true }
}

/** Consentimiento válido para registrar una identidad de voz (regla dura). */
export function consentimientoValido(valor: string): valor is 'PROPIO' | 'AUTORIZADO' {
  return valor === 'PROPIO' || valor === 'AUTORIZADO'
}

/** Convierte un embedding base64 (float32 little-endian) a su tamaño en KB. */
export function tamanoEmbeddingKb(embeddingB64: string): number {
  if (!embeddingB64) return 0
  const bytes = Math.floor((embeddingB64.length * 3) / 4)
  return Math.round((bytes / 1024) * 10) / 10
}

// ── Ejecución de procesos Python con salida JSON (patrón voz_cpu_real.py) ──

interface ResultadoPython {
  codigo: number
  salida: string
  error: string
}

function ejecutarPython(script: string, args: string[], timeoutMs = 90_000): Promise<ResultadoPython> {
  return new Promise((resolve) => {
    let salida = ''
    let error = ''
    let terminado = false
    let proc
    try {
      proc = spawn('python3', [script, ...args], { cwd: process.cwd() })
    } catch (e) {
      resolve({ codigo: -1, salida: '', error: `no se pudo lanzar python3: ${(e as Error).message}` })
      return
    }
    const timer = setTimeout(() => {
      if (!terminado) {
        proc.kill('SIGKILL')
        error += '\nproceso excedió el tiempo límite'
      }
    }, timeoutMs)
    proc.stdout.on('data', (d: Buffer) => { salida += d.toString('utf8') })
    proc.stderr.on('data', (d: Buffer) => { error += d.toString('utf8') })
    proc.on('error', (e) => {
      terminado = true
      clearTimeout(timer)
      resolve({ codigo: -1, salida, error: `${error} ${e.message}`.trim() })
    })
    proc.on('close', (codigo) => {
      terminado = true
      clearTimeout(timer)
      resolve({ codigo: codigo ?? -1, salida, error })
    })
  })
}

/** Extrae el único objeto JSON de una salida que puede traer ruido previo. */
function parsearJsonSalida(salida: string): Record<string, unknown> | null {
  const inicio = salida.indexOf('{')
  const fin = salida.lastIndexOf('}')
  if (inicio < 0 || fin <= inicio) return null
  try {
    return JSON.parse(salida.slice(inicio, fin + 1)) as Record<string, unknown>
  } catch {
    return null
  }
}

// ── Sonda honesta del subsistema de clonación ──

export interface SondaClon {
  estado: 'OPERATIVO' | 'NO_CONFIGURADO' | 'ERROR'
  /** Qué falta o qué pasó, en lenguaje humano. */
  detalle: string
  /** Extractor detectado (ej. resemblyzer-ge2e) o null. */
  extractor: string | null
  /** Capacidad de sintetizar audio con identidad (modelo de síntesis presente). */
  sintetizadorOk: boolean
  pythonOk: boolean
  paquetes: Record<string, boolean>
  modelos: string[]
}

function estadoDesdeSondaPy(s: Record<string, unknown>): SondaClon {
  const paquetes = (s.paquetes as Record<string, boolean>) ?? {}
  const modelos = (s.modelos as string[]) ?? []
  const extractor = (s.extractor as string) ?? null
  const sintetizadorOk = Boolean(s.sintetizador_ok)
  const pythonOk = Boolean(s.python_ok)
  const faltan: string[] = []
  if (!pythonOk) faltan.push('python3 no disponible en este host')
  if (!extractor) faltan.push('falta el paquete extractor (pip install resemblyzer)')
  if (!sintetizadorOk) faltan.push('falta el modelo de síntesis en models/clon/ (descarga única, se comparte entre todas las voces)')
  let estado: SondaClon['estado'] = 'OPERATIVO'
  if (faltan.length > 0) estado = 'NO_CONFIGURADO'
  if (s.bloqueo) estado = 'ERROR'
  return {
    estado,
    detalle: estado === 'OPERATIVO' ? 'Subsistema de clonación local completo: extracción y síntesis disponibles.'
      : faltan.join(' · '),
    extractor,
    sintetizadorOk,
    pythonOk,
    paquetes,
    modelos,
  }
}

/** Sonda real: paquetes, modelos y capacidad. Nunca simula. */
export async function sondaClonLocal(): Promise<SondaClon> {
  const script = path.join(process.cwd(), 'scripts', 'voz_clon_sonda.py')
  if (!fs.existsSync(script)) {
    return { estado: 'ERROR', detalle: 'script de sonda ausente (scripts/voz_clon_sonda.py)', extractor: null, sintetizadorOk: false, pythonOk: false, paquetes: {}, modelos: [] }
  }
  const r = await ejecutarPython(script, [], 20_000)
  const j = parsearJsonSalida(r.salida)
  if (!j) {
    return { estado: 'ERROR', detalle: `sonda sin salida válida: ${(r.error || r.salida).slice(0, 300)}`, extractor: null, sintetizadorOk: false, pythonOk: false, paquetes: {}, modelos: [] }
  }
  return estadoDesdeSondaPy(j)
}

// ── Extracción de identidad (embedding del hablante) ──

export interface EmbeddingResultado {
  ok: boolean
  embeddingB64?: string
  dim?: number
  extractor?: string
  duracionS?: number
  /** Bloqueo honesto: qué falta o qué falló. */
  bloqueo?: string
}

/** Extrae el embedding de un archivo de audio YA guardado en disco. */
export async function extraerEmbedding(rutaAudio: string): Promise<EmbeddingResultado> {
  const script = path.join(process.cwd(), 'scripts', 'voz_clon_extraer.py')
  if (!fs.existsSync(rutaAudio)) return { ok: false, bloqueo: 'archivo de audio no encontrado en disco' }
  if (!fs.existsSync(script)) return { ok: false, bloqueo: 'script extractor ausente (scripts/voz_clon_extraer.py)' }
  const r = await ejecutarPython(script, [rutaAudio], 120_000)
  const j = parsearJsonSalida(r.salida)
  if (!j) return { ok: false, bloqueo: `extractor sin salida válida: ${(r.error || r.salida).slice(0, 300)}` }
  if (!j.ok) return { ok: false, bloqueo: String(j.bloqueo ?? 'motivo desconocido') }
  const dim = Number(j.dim ?? 0)
  const embeddingB64 = String(j.embedding_b64 ?? '')
  if (!embeddingB64 || dim <= 0) return { ok: false, bloqueo: 'el extractor no devolvió un vector utilizable' }
  return {
    ok: true,
    embeddingB64,
    dim,
    extractor: String(j.extractor ?? 'desconocido'),
    duracionS: Number(j.duracion_s ?? 0),
  }
}

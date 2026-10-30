// Provider de voz (TTS) — P1.3 de CLONAKIT_BRECHAS: "integrar TTS cuando exista
// proveedor; contrato de voz guardada por personaje".
//
// Estados honestos (taxonomía de la constitución): un proveedor local solo es
// OPERATIVO si su binario/runtime existe EN ESTA MÁQUINA, verificado por sonda
// real (no por promesa de landing):
//  - espeak-local: binario `espeak-ng` (instalado, $0, calidad robótica funcional).
//  - piper-local: paquete python `piper` + modelo onnx descargado (voz natural
//    $0; benchmark 2026-10-28: 5.3 s de audio en 0.21 s de CPU — 20× tiempo
//    real). La sonda exige PAQUETE **Y** MODELO: ni uno sin el otro.
//
// El texto a sintetizar pasa SIEMPRE por el filtro de edad duro de la
// plataforma (detectarTerminosProhibidos) en la ruta API: una nota de voz con
// términos prohibidos es tan prohibida como una imagen.
import { spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { qaForense } from '@/lib/qa-forense'

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

/** Intérprete python que importa piper (inyectable para pruebas: PIPER_PY). */
export function binarioPiper(): string {
  return process.env.PIPER_PY || 'python3'
}

/** Script de síntesis (inyectable para pruebas: PIPER_SCRIPT). */
export function scriptPiper(): string {
  return process.env.PIPER_SCRIPT || path.join(process.cwd(), 'scripts', 'piper_sintetizar.py')
}

/** Directorio de modelos onnx de piper (inyectable: PIPER_MODELO_DIR). */
export function dirModelosPiper(): string {
  return process.env.PIPER_MODELO_DIR || path.join(process.cwd(), 'models', 'piper')
}

/**
 * Mapea velocidad (palabras/min, 80–400) → length_scale de piper (mayor = más
 * lento). 170 wpm ≈ 1.0 (neutral). Exportado para tests herméticos.
 */
export function velocidadALengthScale(velocidad: number): number {
  if (!Number.isFinite(velocidad) || velocidad <= 0) return 1
  return Math.max(0.3, Math.min(3, 175 / velocidad))
}

/**
 * Localiza el modelo onnx para la voz pedida (BCP-47 corto: 'es', 'es-419'…).
 * Estrategia honesta: prefijo de idioma → primer modelo cuyo nombre de archivo
 * empiece por `{idioma}_`; si no hay match, primer modelo disponible con nota.
 * Devuelve null si el directorio no existe o no hay modelos.
 */
export function localizarModeloPiper(voz: string): { onnx: string; exacto: boolean } | null {
  const dir = dirModelosPiper()
  let entradas: string[] = []
  try {
    entradas = fs.readdirSync(dir).filter((f) => f.endsWith('.onnx') && !f.endsWith('.onnx.json')).sort()
  } catch {
    return null
  }
  if (entradas.length === 0) return null
  const idioma = voz.split('-')[0].toLowerCase()
  const exacto = entradas.find((f) => f.toLowerCase().startsWith(`${idioma}_`))
  if (exacto) return { onnx: path.join(dir, exacto), exacto: true }
  return { onnx: path.join(dir, entradas[0]), exacto: false }
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

  // piper: DOS capas obligatorias — paquete python importable Y modelo onnx.
  const paquete = sondaBinario(binarioPiper(), ['-c', 'import piper'])
  const modelo = localizarModeloPiper('es')
  let piper: { estado: EstadoVoz; detalle: string }
  if (paquete.estado !== 'OPERATIVO') {
    piper = {
      estado: 'NO_DISPONIBLE',
      detalle: `sin paquete piper (${paquete.detalle}) — pip install piper-tts + modelo es_ES según docs/MOTOR_GPU.md (voz natural, 20× tiempo real)`,
    }
  } else if (!modelo) {
    piper = {
      estado: 'NO_DISPONIBLE',
      detalle: `paquete piper presente pero sin modelo onnx en ${dirModelosPiper()} — descargar voz de rhasspy/piper-voices (es_ES) según docs/MOTOR_GPU.md`,
    }
  } else {
    piper = { estado: 'OPERATIVO', detalle: `piper + modelo ${path.basename(modelo.onnx)} listos en ${dirModelosPiper()}` }
  }

  return [
    {
      provedor: 'espeak-local',
      estado: espeak.estado,
      detalle: espeak.estado === 'OPERATIVO' ? espeak.detalle : `${espeak.detalle} — espeak-ng es apt/dnf install espeak-ng`,
    },
    { provedor: 'piper-local', estado: piper.estado, detalle: piper.detalle },
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
  | { ok: true; wav: Buffer; duracionS: number; bytes: number; provedor: ProveedorVoz; nota?: string }
  | { ok: false; estado: EstadoVoz; detalle: string; provedor: ProveedorVoz }

/**
 * Síntesis REAL con piper (voz natural $0, CPU): script dedicado + modelo onnx.
 * Honestidad: sin paquete o sin modelo → NO_DISPONIBLE con la causa exacta;
 * el tono (0–99) NO es ajustable en piper y se declara ignorado en la nota.
 */
function generarVozPiper(texto: string, contrato: ContratoVoz): ResultadoVoz {
  const modelo = localizarModeloPiper(contrato.voz)
  if (!modelo) {
    return {
      ok: false,
      estado: 'NO_DISPONIBLE',
      detalle: `sin modelo onnx de piper en ${dirModelosPiper()} — descargar voz de rhasspy/piper-voices según docs/MOTOR_GPU.md`,
      provedor: 'piper-local',
    }
  }
  const salida = path.join(os.tmpdir(), `chatx-piper-${process.pid}-${Date.now()}.wav`)
  try {
    const r = spawnSync(
      binarioPiper(),
      [
        scriptPiper(),
        '--texto',
        texto,
        '--modelo',
        modelo.onnx,
        '--salida',
        salida,
        '--longitud-escala',
        String(velocidadALengthScale(contrato.velocidad)),
      ],
      { encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024 },
    )
    if (r.error || r.status !== 0) {
      let detalle = r.error ? r.error.message : r.stderr || r.stdout || `código ${r.status}`
      try {
        const info = JSON.parse(r.stdout || '{}') as { bloqueo?: string }
        if (info?.bloqueo) detalle = info.bloqueo
      } catch {
        /* salida no JSON: nos quedamos con el detalle del proceso */
      }
      return { ok: false, estado: 'ERROR', detalle: `piper falló: ${detalle.slice(0, 240)}`, provedor: 'piper-local' }
    }
    const wav = fs.readFileSync(salida)
    if (wav.length < 45 || wav.toString('ascii', 0, 4) !== 'RIFF') {
      return { ok: false, estado: 'ERROR', detalle: 'piper produjo un WAV inválido', provedor: 'piper-local' }
    }
    // QA forense (patrón YT-Automation): la firma RIFF no basta — se verifica
    // estructura real y se detecta audio silencioso antes de aceptar el medio.
    const dictamen = qaForense(wav, 'wav')
    if (dictamen.veredicto === 'RECHAZADO') {
      return {
        ok: false,
        estado: 'ERROR',
        detalle: `piper produjo un medio rechazado por QA forense: ${dictamen.razones.join(' · ')}`,
        provedor: 'piper-local',
      }
    }
    if (dictamen.avisos.some((a) => a.includes('silencioso'))) {
      return {
        ok: false,
        estado: 'ERROR',
        detalle: 'piper produjo audio completamente silencioso: una nota de voz sin audio audible no se entrega (honesto, no se finge)',
        provedor: 'piper-local',
      }
    }
    const nota = modelo.exacto
      ? `voz ${path.basename(modelo.onnx, '.onnx')} · tono fijo (piper no ajusta pitch; contrato.tono=${contrato.tono} ignorado)`
      : `voz ${path.basename(modelo.onnx, '.onnx')} (no hay modelo para "${contrato.voz}"; usando el disponible) · tono fijo (contrato.tono=${contrato.tono} ignorado)`
    return { ok: true, wav, duracionS: duracionWav(wav), bytes: wav.length, provedor: 'piper-local', nota }
  } catch (e) {
    return { ok: false, estado: 'ERROR', detalle: `piper: ${(e as Error).message.slice(0, 200)}`, provedor: 'piper-local' }
  } finally {
    try {
      fs.unlinkSync(salida)
    } catch {
      /* ya no existía */
    }
  }
}

/**
 * Genera una nota de voz real con el proveedor del contrato.
 * Sin fallbacks silenciosos: si el proveedor no está operativo, se devuelve
 * estado honesto (la ruta responde 503 con el detalle).
 */
export async function generarVoz(texto: string, contrato: ContratoVoz): Promise<ResultadoVoz> {
  if (contrato.provedor === 'piper-local') {
    const s = estadoProveedor('piper-local')
    if (s.estado !== 'OPERATIVO') {
      return { ok: false, estado: s.estado, detalle: s.detalle, provedor: 'piper-local' }
    }
    return generarVozPiper(texto, contrato)
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
    const dictamen = qaForense(wav, 'wav')
    if (dictamen.veredicto === 'RECHAZADO') {
      return {
        ok: false,
        estado: 'ERROR',
        detalle: `espeak-ng produjo un medio rechazado por QA forense: ${dictamen.razones.join(' · ')}`,
        provedor: 'espeak-local',
      }
    }
    if (dictamen.avisos.some((a) => a.includes('silencioso'))) {
      return {
        ok: false,
        estado: 'ERROR',
        detalle: 'espeak-ng produjo audio completamente silencioso: no se entrega (honesto, no se finge)',
        provedor: 'espeak-local',
      }
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

// QA forense de medios reales + taxonomía honesta de errores (sala limpia).
//
// Patrones destilados de YouTube-Automation (test_qa_forensics, video QA y
// validación por magic bytes; taxonomía v1.1 watchdog ≠ proveedor):
//  1. Un proveedor puede devolver una PÁGINA HTML donde debería ir un PNG/WAV
//     (error renderizado, portal cautivo, 200 con cuerpo de error). Si se
//     guarda tal cual, la plataforma "tiene" un medio roto y encima lo sirve.
//     Aquí se verifica la FIRMA real de los bytes antes de aceptar nada.
//  2. Los fallos se clasifican por EVIDENCIA: un timeout local (watchdog/
//     abort del propio proceso) JAMÁS se reporta como fallo del proveedor,
//     y un fallo de validación es TERMINAL (reintentar no cambia nada).
//
// Reglas de estilo CHAT-X: determinista, sin dependencias, veredictos
// honestos (APROBADO/RECHAZADO con razones + avisos que no bloquean).

export type TipoMedia = 'png' | 'jpeg' | 'wav' | 'mp4' | 'svg' | 'html' | 'texto' | 'desconocido'

export interface DictamenForense {
  veredicto: 'APROBADO' | 'RECHAZADO'
  /** Tipo detectado por firma real de los bytes. */
  tipo: TipoMedia
  /** Tipo requerido, si la llamada pide uno concreto. */
  tipoEsperado?: TipoMedia
  /** Razones que BLOQUEAN (veredicto RECHAZADO). */
  razones: string[]
  /** Avisos honestos que NO bloquean (p. ej. audio silencioso). */
  avisos: string[]
  bytes: number
}

const FIRMA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/** Detecta el tipo REAL de un buffer por su firma (magic bytes). */
export function tipoPorMagicBytes(buf: Buffer): TipoMedia {
  if (buf.length < 12) return buf.length === 0 ? 'desconocido' : 'texto'
  if (buf.subarray(0, 8).equals(FIRMA_PNG)) return 'png'
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg'
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WAVE') return 'wav'
  if (buf.toString('ascii', 4, 8) === 'ftyp') return 'mp4'
  const inicio = buf.toString('utf8', 0, Math.min(buf.length, 512)).trimStart().toLowerCase()
  if (inicio.startsWith('<!doctype html') || inicio.startsWith('<html') || /<html[\s>]/.test(inicio) || /<body[\s>]/.test(inicio)) return 'html'
  if (inicio.startsWith('<?xml') || inicio.startsWith('<svg') || /<svg[\s>]/.test(inicio)) return 'svg'
  if (!/[\u0000-\u0008\u000E-\u001F]/.test(buf.toString('latin1'))) return 'texto'
  return 'desconocido'
}

/**
 * Duración aproximada de un WAV PCM estándar (byteRate @28, data desde ~44).
 * 0 si no se puede calcular — nunca se inventa.
 */
export function duracionWavAproximada(buf: Buffer): number {
  if (buf.length < 44 || buf.toString('ascii', 0, 4) !== 'RIFF') return 0
  const byteRate = buf.readUInt32LE(28)
  if (!byteRate || byteRate > buf.length * 1000) return 0
  return Math.max(0, (buf.length - 44) / byteRate)
}

/**
 * Detecta audio completamente silencioso en WAV PCM 16-bit: muestrea hasta
 * 200k pares y mide la amplitud máxima. Umbral conservador (≈ -58 dBFS):
 * por debajo se considera silencio real, no audio "bajo".
 */
export function esSilenciosoWav(buf: Buffer): boolean {
  if (buf.length < 60 || buf.toString('ascii', 0, 4) !== 'RIFF') return false
  const canales = buf.readUInt16LE(22) || 1
  const bits = buf.readUInt16LE(34) || 16
  if (bits !== 16) return false // solo PCM 16-bit se opina aquí (honesto: sin datos, sin veredicto)
  const inicio = 44 + ((44 - 44) % (2 * canales)) // data empieza en 44 en los WAV de espeak/piper
  const muestras = Math.min(200_000, Math.floor((buf.length - inicio) / 2))
  if (muestras <= 0) return false
  let maxAbs = 0
  for (let i = 0; i < muestras; i++) {
    const v = Math.abs(buf.readInt16LE(inicio + i * 2))
    if (v > maxAbs) maxAbs = v
    if (maxAbs > 40) return false // umbral ≈ -58 dBFS; algo audible → no silencio
  }
  return maxAbs <= 40
}

const UMBRAL_DURACION_S = 0.3 // igual que YT-Automation: clips <0.3s no sirven

/**
 * Dictamen forense de un buffer de medios:
 *  - RECHAZA HTML/texto disfrazado de medio (la lección exacta del referente).
 *  - RECHAZA firmas truncadas (PNG sin IEND, JPEG sin FFD9).
 *  - AVISA (no bloquea) por duración corta o silencio — la capa que consume
 *    decide si un aviso la descalifica para SU producto.
 */
export function qaForense(buf: Buffer, esperado?: TipoMedia): DictamenForense {
  const razones: string[] = []
  const avisos: string[] = []

  if (!buf || buf.length === 0) {
    return { veredicto: 'RECHAZADO', tipo: 'desconocido', tipoEsperado: esperado, razones: ['buffer vacío: el proveedor no devolvió bytes'], avisos, bytes: 0 }
  }

  const tipo = tipoPorMagicBytes(buf)

  // La lección central: HTML/texto donde debía ir un medio.
  if (tipo === 'html' || tipo === 'texto') {
    razones.push(
      `${tipo} disfrazado${esperado ? ` de ${esperado}` : ''}: la firma real de los bytes no es un medio (típico de errores HTTP renderizados o portales cautivos)`,
    )
    return { veredicto: 'RECHAZADO', tipo, tipoEsperado: esperado, razones, avisos, bytes: buf.length }
  }

  if (tipo === 'desconocido') {
    razones.push('firma de bytes desconocida: no es PNG/JPEG/WAV/MP4/SVG verificable')
    return { veredicto: 'RECHAZADO', tipo, tipoEsperado: esperado, razones, avisos, bytes: buf.length }
  }

  if (esperado && tipo !== esperado) {
    razones.push(`tipo real ${tipo} ≠ esperado ${esperado}: no se acepta el medio con otra identidad`)
    return { veredicto: 'RECHAZADO', tipo, tipoEsperado: esperado, razones, avisos, bytes: buf.length }
  }

  // Integridad estructural por tipo
  if (tipo === 'png' && !buf.subarray(Math.max(0, buf.length - 12)).toString('ascii').includes('IEND')) {
    razones.push('PNG truncado: falta el chunk IEND del final')
  }
  if (tipo === 'jpeg' && buf[buf.length - 2] !== 0xff && buf[buf.length - 1] !== 0xd9 && !buf.subarray(Math.max(0, buf.length - 4)).toString('hex').endsWith('ffd9')) {
    razones.push('JPEG truncado: falta el marcador de fin FFD9')
  }
  if (tipo === 'wav') {
    const dur = duracionWavAproximada(buf)
    if (dur > 0 && dur < UMBRAL_DURACION_S) avisos.push(`WAV de ${dur.toFixed(2)}s (<${UMBRAL_DURACION_S}s): probablemente vacío o cortado`)
    if (esSilenciosoWav(buf)) avisos.push('WAV completamente silencioso (amplitud máx ≈ 0): la síntesis no produjo audio audible')
  }

  return { veredicto: razones.length === 0 ? 'APROBADO' : 'RECHAZADO', tipo, tipoEsperado: esperado, razones, avisos, bytes: buf.length }
}

// ─────────────────── Taxonomía honesta de errores (v1.1) ───────────────────

export type ClaseError = 'VALIDACION' | 'LOCAL_TIMEOUT' | 'PROVEEDOR' | 'DESCONOCIDO'

export interface TaxonomiaError {
  clase: ClaseError
  /** true = reintentar no cambia el resultado (no se reintenta). */
  terminal: boolean
  nota: string
}

const REGLAS_TAXONOMIA: { clase: ClaseError; re: RegExp; nota: string }[] = [
  {
    clase: 'VALIDACION',
    re: /filtro de edad|t[eé]rminos prohibidos|inv[aá]lid|no est[aá] aprobada|no est[aá] aprobado|no est[aá] aprobado por QA|422|RECHAZADO_FILTRO|exige|raster de proveedor real/i,
    nota: 'fallo determinista de contenido/validación: reintentar no cambia el resultado',
  },
  {
    clase: 'LOCAL_TIMEOUT',
    re: /timeout|tiempo\s+(m[aá]ximo|de\s+espera)|AbortError|aborted|abortada|ETIMEDOUT|ECONNRESET.*local|operaci[oó]n\s+fue\s+aborted/i,
    nota: 'límite local de tiempo/abort del propio proceso: NO se reporta como fallo del proveedor sin evidencia externa (taxonomía honesta v1.1)',
  },
  {
    clase: 'PROVEEDOR',
    re: /piper|espeak|comfyui|nvidia|groq|proveedor|motor|HTTP\s+\d{3}|50[023]|ECONNREFUSED|ENOTFOUND|fetch (bloqueado|fallido)|produjo un WAV|disfrazado/i,
    nota: 'fallo del proveedor o de la red hacia él',
  },
]

/**
 * Clasifica un mensaje de error por evidencia. Orden constitucional:
 * VALIDACION > LOCAL_TIMEOUT > PROVEEDOR > DESCONOCIDO. Solo VALIDACION es
 * terminal; el resto es reintentable con tope (los reintentos se controlan
 * en el worker, aquí solo se opina).
 */
export function taxonomiaError(mensaje: string): TaxonomiaError {
  const m = (mensaje || '').toString()
  for (const { clase, re, nota } of REGLAS_TAXONOMIA) {
    if (re.test(m)) return { clase, terminal: clase === 'VALIDACION', nota }
  }
  return { clase: 'DESCONOCIDO', terminal: false, nota: 'causa no identificada: se asume transitoria y se reintenta con tope' }
}

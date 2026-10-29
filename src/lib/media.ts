// Almacenamiento de medios: sistema de archivos organizado por personaje/fecha (ficha sección 6).
// Piezas públicas en claro; piezas privadas cifradas con AES-256-GCM (archivo + miniatura).
import fs from 'fs'
import path from 'path'
import { cifrarBuffer, descifrarBuffer, type EncryptedBlob } from '@/lib/crypto'

const RAIZ = path.join(process.cwd(), 'media')

export function dirDePieza(characterId: string, fecha: Date = new Date()): string {
  const yyyyMm = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
  return path.join(RAIZ, characterId, yyyyMm)
}

/** Ruta base SIN extensión: el archivo claro es `<base>.svg` y el cifrado `<base>.enc`. */
export function rutaPieza(characterId: string, mediaId: string, tipo: 'full' | 'thumb', fecha: Date = new Date()): string {
  return path.join(dirDePieza(characterId, fecha), `${mediaId}_${tipo}`)
}

export function guardarClaro(base: string, contenido: string): void {
  fs.mkdirSync(path.dirname(base), { recursive: true })
  fs.writeFileSync(base + '.svg', contenido, 'utf8')
}

export function guardarCifrado(base: string, contenido: string, masterKey: Buffer): EncryptedBlob {
  fs.mkdirSync(path.dirname(base), { recursive: true })
  const enc = cifrarBuffer(Buffer.from(contenido, 'utf8'), masterKey)
  fs.writeFileSync(base + '.enc', enc.data)
  return enc
}

export function guardarIvTag(base: string, enc: EncryptedBlob): void {
  fs.writeFileSync(base + '.enc.iv', enc.iv, 'utf8')
  fs.writeFileSync(base + '.enc.tag', enc.tag, 'utf8')
}

export function leerClaro(base: string): string | null {
  try {
    return fs.readFileSync(base + '.svg', 'utf8')
  } catch {
    return null
  }
}

export function leerCifrado(base: string, masterKey: Buffer): string | null {
  try {
    const data = fs.readFileSync(base + '.enc')
    const iv = fs.readFileSync(base + '.enc.iv', 'utf8').trim()
    const tag = fs.readFileSync(base + '.enc.tag', 'utf8').trim()
    const plain = descifrarBuffer({ iv, tag, data }, masterKey)
    return plain ? plain.toString('utf8') : null
  } catch {
    return null
  }
}

export function miniaturaDe(svg: string): string {
  // El SVG ya escala por viewBox; la miniatura es el mismo arte con dimensiones menores.
  return svg.replace(/width="\d+" height="\d+"/, 'width="288" height="288"')
}

export function borrarPieza(base: string): void {
  for (const suf of ['.svg', '.enc', '.enc.iv', '.enc.tag']) {
    try {
      fs.unlinkSync(base + suf)
    } catch {
      /* no existía */
    }
  }
}

// ── Binarios (audio de muestras de voz, zips…) — mismo patrón .enc/.iv/.tag ──

/** Guarda un binario cifrado con la clave maestra (AES-256-GCM). Devuelve iv/tag para la BD. */
export function guardarBinarioCifrado(base: string, datos: Buffer, masterKey: Buffer): EncryptedBlob {
  fs.mkdirSync(path.dirname(base), { recursive: true })
  const enc = cifrarBuffer(datos, masterKey)
  fs.writeFileSync(base + '.enc', enc.data)
  guardarIvTag(base, enc)
  return enc
}

/** Lee y descifra un binario guardado con guardarBinarioCifrado. null si no existe o falla. */
export function leerBinarioCifrado(base: string, masterKey: Buffer): Buffer | null {
  try {
    const data = fs.readFileSync(base + '.enc')
    const iv = fs.readFileSync(base + '.enc.iv', 'utf8').trim()
    const tag = fs.readFileSync(base + '.enc.tag', 'utf8').trim()
    return descifrarBuffer({ iv, tag, data }, masterKey)
  } catch {
    return null
  }
}

/** Borra los archivos de un binario cifrado (mismo sufijo que borrarPieza). */
export function borrarBinario(base: string): void {
  borrarPieza(base)
}

export function carpetaDataset(characterId: string): string {
  return path.join(RAIZ, characterId, 'dataset')
}

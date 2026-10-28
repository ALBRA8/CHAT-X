// Criptografía real para EL ESTUDIO:
// - Contraseña del modo privado: scrypt + salt aleatoria (nunca texto plano)
// - Clave maestra de cifrado: aleatoria de 32 bytes, envuelta (wrapped) con la contraseña
// - Cifrado de piezas del carril privado: AES-256-GCM (archivo + miniatura)
import crypto from 'crypto'

const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEYLEN = 32

export function generarSalt(): string {
  return crypto.randomBytes(16).toString('hex')
}

export function hashContrasena(password: string, saltHex: string): string {
  return crypto.scryptSync(password, saltHex, KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }).toString('hex')
}

export function verificarContrasena(password: string, saltHex: string, hashHex: string): boolean {
  const intento = Buffer.from(hashContrasena(password, saltHex), 'hex')
  const real = Buffer.from(hashHex, 'hex')
  return intento.length === real.length && crypto.timingSafeEqual(intento, real)
}

function derivarDeContrasena(password: string, saltHex: string): Buffer {
  return crypto.scryptSync(password, saltHex, KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P })
}

// ── Clave maestra envuelta con la contraseña ──

export interface WrappedKey {
  iv: string
  tag: string
  data: string
}

export function envolverClaveMaestra(masterKey: Buffer, password: string, saltHex: string): WrappedKey {
  const kek = derivarDeContrasena(password, saltHex)
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', kek, iv)
  const data = Buffer.concat([cipher.update(masterKey), cipher.final()])
  return { iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex'), data: data.toString('hex') }
}

export function desenvolverClaveMaestra(wrapped: WrappedKey, password: string, saltHex: string): Buffer | null {
  try {
    const kek = derivarDeContrasena(password, saltHex)
    const decipher = crypto.createDecipheriv('aes-256-gcm', kek, Buffer.from(wrapped.iv, 'hex'))
    decipher.setAuthTag(Buffer.from(wrapped.tag, 'hex'))
    const out = Buffer.concat([decipher.update(Buffer.from(wrapped.data, 'hex')), decipher.final()])
    return out.length === KEYLEN ? out : null
  } catch {
    return null
  }
}

export function generarClaveMaestra(): Buffer {
  return crypto.randomBytes(KEYLEN)
}

export function parseWrapped(s: string): WrappedKey {
  const [iv, tag, data] = s.split(':')
  return { iv, tag, data }
}

export function serializeWrapped(w: WrappedKey): string {
  return `${w.iv}:${w.tag}:${w.data}`
}

// ── Cifrado de piezas con la clave maestra (AES-256-GCM) ──

export interface EncryptedBlob {
  iv: string // hex
  tag: string // hex
  data: Buffer
}

export function cifrarBuffer(plain: Buffer, masterKey: Buffer): EncryptedBlob {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv)
  const data = Buffer.concat([cipher.update(plain), cipher.final()])
  return { iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex'), data }
}

export function descifrarBuffer(enc: EncryptedBlob, masterKey: Buffer): Buffer | null {
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, Buffer.from(enc.iv, 'hex'))
    decipher.setAuthTag(Buffer.from(enc.tag, 'hex'))
    return Buffer.concat([decipher.update(enc.data), decipher.final()])
  } catch {
    return null
  }
}

// ── Sesión corta del modo privado ──

export function nuevoTokenSesion(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

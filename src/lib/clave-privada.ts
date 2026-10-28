// Gestión de la clave maestra de cifrado del carril privado.
// - La clave maestra (32 bytes aleatorios) se genera la primera vez que se define la contraseña.
// - Se guarda envuelta dos veces: con la contraseña (para desbloquear) y con un secreto del
//   servidor (para que los trabajos en segundo plano puedan cifrar sin sesión abierta).
// - El secreto del servidor vive en media/.server-secret (creado una sola vez, permisos 0600).
import fs from 'fs'
import path from 'path'
import {
  generarClaveMaestra,
  envolverClaveMaestra,
  desenvolverClaveMaestra,
  generarSalt,
  hashContrasena,
  verificarContrasena,
  parseWrapped,
  serializeWrapped,
} from '@/lib/crypto'
import { asegurarSettings } from '@/lib/compliance'
import { db } from '@/lib/db'

function secretoServidor(): Buffer {
  const ruta = path.join(process.cwd(), 'media', '.server-secret')
  try {
    const hex = fs.readFileSync(ruta, 'utf8').trim()
    if (hex.length === 64) return Buffer.from(hex, 'hex')
  } catch {
    /* crear */
  }
  const bytes = generarClaveMaestra()
  fs.mkdirSync(path.dirname(ruta), { recursive: true })
  fs.writeFileSync(ruta, bytes.toString('hex'), { mode: 0o600 })
  return bytes
}

export interface DefinirResultado {
  ok: boolean
  error?: string
}

/** Define la contraseña del modo privado por primera vez (o la cambia con la actual). */
export async function definirContrasenaPrivada(
  nueva: string,
  actual?: string,
): Promise<DefinirResultado> {
  if (nueva.length < 6) return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' }
  const s = await asegurarSettings()

  if (s.privateHash && s.privateSalt) {
    // Cambio de contraseña: exige la actual
    if (!actual) return { ok: false, error: 'Falta la contraseña actual.' }
    if (!verificarContrasena(actual, s.privateSalt, s.privateHash)) {
      return { ok: false, error: 'La contraseña actual no coincide.' }
    }
    // Re-envuelve la misma clave maestra con la nueva contraseña
    const masterKey = desenvolverClaveMaestra(parseWrapped(s.serverWrap!), secretoServidor().toString('hex'), 'server')
    if (!masterKey) return { ok: false, error: 'No se pudo recuperar la clave maestra.' }
    const salt = generarSalt()
    const wrap = envolverClaveMaestra(masterKey, nueva, salt)
    await db.settings.update({
      where: { id: 'main' },
      data: {
        privateSalt: salt,
        privateHash: hashContrasena(nueva, salt),
        privateWrap: serializeWrapped(wrap),
      },
    })
    return { ok: true }
  }

  // Primera vez
  const masterKey = generarClaveMaestra()
  const salt = generarSalt()
  const wrapPass = envolverClaveMaestra(masterKey, nueva, salt)
  const wrapServer = envolverClaveMaestra(masterKey, secretoServidor().toString('hex'), 'server')
  await db.settings.update({
    where: { id: 'main' },
    data: {
      privateSalt: salt,
      privateHash: hashContrasena(nueva, salt),
      privateWrap: serializeWrapped(wrapPass),
      serverWrap: serializeWrapped(wrapServer),
    },
  })
  return { ok: true }
}

/** Clave maestra para trabajos en segundo plano (cifrado de piezas aprobadas). */
export async function claveMaestraServidor(): Promise<Buffer | null> {
  const s = await asegurarSettings()
  if (!s.serverWrap) return null
  return desenvolverClaveMaestra(parseWrapped(s.serverWrap), secretoServidor().toString('hex'), 'server')
}

/** Clave maestra a partir de la contraseña (para abrir sesión). */
export async function claveMaestraPorContrasena(password: string): Promise<Buffer | null> {
  const s = await asegurarSettings()
  if (!s.privateWrap || !s.privateSalt) return null
  return desenvolverClaveMaestra(parseWrapped(s.privateWrap), password, s.privateSalt)
}

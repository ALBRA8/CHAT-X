// Sesión corta del modo privado 18+ (control de acceso real: contraseña + cookie httpOnly de corta duración)
import { hashToken } from '@/lib/crypto'

const TTL_MS = 30 * 60 * 1000 // 30 minutos

interface SesionActiva {
  expira: number
  masterKey: Buffer // solo en memoria, nunca persistida
}

const g = globalThis as unknown as {
  __estudioSesiones?: Map<string, SesionActiva>
}

function mapa(): Map<string, SesionActiva> {
  if (!g.__estudioSesiones) g.__estudioSesiones = new Map()
  return g.__estudioSesiones
}

export function abrirSesion(token: string, masterKey: Buffer): void {
  const m = mapa()
  // limpia expiradas
  const ahora = Date.now()
  for (const [k, v] of m) if (v.expira < ahora) m.delete(k)
  m.set(hashToken(token), { expira: ahora + TTL_MS, masterKey })
}

export function sesionValida(token: string | undefined | null): SesionActiva | null {
  if (!token) return null
  const s = mapa().get(hashToken(token))
  if (!s) return null
  if (s.expira < Date.now()) {
    mapa().delete(hashToken(token))
    return null
  }
  return s
}

export function minutosRestantes(token: string | undefined | null): number {
  const s = sesionValida(token)
  if (!s) return 0
  return Math.max(0, Math.ceil((s.expira - Date.now()) / 60000))
}

export function cerrarSesion(token: string | undefined | null): void {
  if (!token) return
  mapa().delete(hashToken(token))
}

export const COOKIE_PRIVADA = 'estudio_priv'
export const TTL_SEGUNDOS = TTL_MS / 1000

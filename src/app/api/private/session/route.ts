// Sesión del modo privado 18+: define/verifica contraseña (scrypt+salt) y cookie httpOnly de corta duración
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { asegurarSettings, registrarEvento } from '@/lib/compliance'
import { definirContrasenaPrivada, claveMaestraPorContrasena } from '@/lib/clave-privada'
import { nuevoTokenSesion, verificarContrasena } from '@/lib/crypto'
import { abrirSesion, cerrarSesion, COOKIE_PRIVADA, TTL_SEGUNDOS, minutosRestantes, sesionValida } from '@/lib/privado'

function cookieDeReq(req: NextRequest): string | undefined {
  return req.cookies.get(COOKIE_PRIVADA)?.value
}

// Estado del candado
export async function GET(req: NextRequest) {
  const s = await asegurarSettings()
  const token = cookieDeReq(req)
  const sesion = sesionValida(token)
  return NextResponse.json({
    privadaDefinida: Boolean(s.privateHash),
    desbloqueado: Boolean(sesion),
    minutosRestantes: sesion ? minutosRestantes(token) : 0,
  })
}

// Desbloquear (o definir contraseña la primera vez / cambiarla)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const s = await asegurarSettings()

  if (!s.privateHash) {
    // Primera definición de contraseña
    if (typeof body.nuevaContrasena !== 'string' || !body.nuevaContrasena) {
      return NextResponse.json({ error: 'Define la contraseña del modo privado.', primeraVez: true }, { status: 400 })
    }
    const r = await definirContrasenaPrivada(body.nuevaContrasena)
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })
  } else if (typeof body.nuevaContrasena === 'string' && body.nuevaContrasena) {
    // Cambio de contraseña
    const r = await definirContrasenaPrivada(body.nuevaContrasena, body.contrasenaActual)
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })
  } else {
    // Verificación normal
    if (typeof body.contrasena !== 'string' || !body.contrasena) {
      return NextResponse.json({ error: 'Introduce la contraseña del modo privado.' }, { status: 400 })
    }
    if (!verificarContrasena(body.contrasena, s.privateSalt!, s.privateHash!)) {
      await registrarEvento('acceso_privado', { resultado: 'denegado' })
      return NextResponse.json({ error: 'Contraseña incorrecta.' }, { status: 401 })
    }
  }

  const password = (body.nuevaContrasena as string) || (body.contrasena as string)
  const masterKey = await claveMaestraPorContrasena(password)
  if (!masterKey) return NextResponse.json({ error: 'No se pudo abrir la caja fuerte.' }, { status: 500 })

  const token = nuevoTokenSesion()
  abrirSesion(token, masterKey)

  await registrarEvento('acceso_privado', { resultado: 'desbloqueado', duracionMin: Math.round(TTL_SEGUNDOS / 60) })

  const res = NextResponse.json({ ok: true, minutosRestantes: Math.round(TTL_SEGUNDOS / 60) })
  res.cookies.set(COOKIE_PRIVADA, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: TTL_SEGUNDOS,
    path: '/',
  })
  return res
}

// Bloquear de nuevo
export async function DELETE(req: NextRequest) {
  cerrarSesion(cookieDeReq(req))
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_PRIVADA, '', { httpOnly: true, maxAge: 0, path: '/' })
  return res
}

export const dynamic = 'force-dynamic'

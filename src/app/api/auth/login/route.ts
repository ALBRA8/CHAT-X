// Login del operador (sección 6 de la orden maestra). Solo funciona si
// ADMIN_PASSWORD está definida; si no, responde 503 para que sea OBVIO que la
// auth no está activada (nadie debería creer que hay auth donde no la hay).
import { NextRequest, NextResponse } from 'next/server'

const PEPPER = 'chatx-admin-v1'

export const dynamic = 'force-dynamic'

async function sha256Hex(texto: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function POST(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD
  if (!password) {
    return NextResponse.json(
      { error: 'Auth admin no activada: define ADMIN_PASSWORD en .env para proteger las acciones que mutan.' },
      { status: 503 },
    )
  }
  const body = (await req.json().catch(() => ({}))) as { password?: string }
  const candidata = typeof body.password === 'string' ? body.password : ''
  if (!candidata) return NextResponse.json({ error: 'Falta password.' }, { status: 400 })

  // comparación por hash (el hash es estable; la contraseña nunca se compara en claro ni se guarda)
  const a = await sha256Hex(`${PEPPER}:${candidata}`)
  const b = await sha256Hex(`${PEPPER}:${password}`)
  if (a.length !== b.length || a !== b) {
    return NextResponse.json({ error: 'Contraseña incorrecta.' }, { status: 401 })
  }
  const res = NextResponse.json({ ok: true, mensaje: 'Sesión de operador activa (cookie httpOnly).' })
  res.cookies.set('chatx_admin', a, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false, // herramienta local: la exposición pública exige reverse proxy TLS
    maxAge: 60 * 60 * 12,
    path: '/',
  })
  return res
}

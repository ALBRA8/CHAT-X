// Auth admin OPCIONAL de CHAT-X (orden maestra sección 6).
// Inactiva por defecto: solo si ADMIN_PASSWORD está definida en .env el
// middleware exige cookie de sesión firmada para las acciones que mutan
// (POST/PUT/PATCH/DELETE). Verificación por recomputación de hash — sin
// almacenamiento de sesiones y sin copiar la contraseña nunca.
import { NextRequest, NextResponse } from 'next/server'

const PEPPER = 'chatx-admin-v1'

export const config = {
  matcher: ['/api/:path*'],
}

async function tokenEsperado(password: string): Promise<string> {
  const data = new TextEncoder().encode(`${PEPPER}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function comparacionConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function middleware(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD
  if (!password) return NextResponse.next() // auth no activada (entorno local/dev)

  const muta = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)
  const esLogin = req.nextUrl.pathname.startsWith('/api/auth/login')
  if (!muta || esLogin) return NextResponse.next()

  const cookie = req.cookies.get('chatx_admin')?.value ?? ''
  const esperado = await tokenEsperado(password)
  if (!cookie || !comparacionConstante(cookie, esperado)) {
    return NextResponse.json(
      { error: 'Acción protegida: autentícate en /api/auth/login (auth admin activa porque ADMIN_PASSWORD está definida).' },
      { status: 401 },
    )
  }
  return NextResponse.next()
}

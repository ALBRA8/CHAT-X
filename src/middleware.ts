// Auth admin OPCIONAL de CHAT-X (orden maestra sección 6).
// Inactiva por defecto: solo si ADMIN_PASSWORD está definida en .env el
// middleware exige cookie de sesión firmada para las acciones que mutan
// (POST/PUT/PATCH/DELETE). Verificación por recomputación de hash — sin
// almacenamiento de sesiones y sin copiar la contraseña nunca.
//
// EXENCIÓN DE WEBHOOKS FIRMADOS (S-017 F0.2): los receptores de máquina a
// máquina (daemon WhatsApp, identidad/puente Telegram, agent-leads) NO tienen
// cookie de navegador — su autenticación es HMAC-SHA256 fail-closed dentro de
// la propia ruta (503 sin secreto configurado, 401 con firma inválida,
// anti-replay con x-chatx-ts). El middleware NO les exige cookie: eximirlos
// aquí NO los abre, la cerradura real vive en cada ruta (ver
// src/app/api/whatsapp/conversacion/route.ts, src/app/api/telegram/*/route.ts
// y src/app/api/motores/agent-leads/webhook/route.ts). SOLO estas rutas
// exactas están exentas; todo lo demás que muta sigue tras cookie.
import { NextRequest, NextResponse } from 'next/server'

const PEPPER = 'chatx-admin-v1'

/** Rutas webhook que se autentican por secreto+HMAC fail-closed en la propia
 *  ruta (nunca por cookie). Única fuente de verdad — el test F0.2 afirma esta
 *  tabla. Cualquier ruta nueva de webhook firmado se añade AQUÍ con su prueba. */
export const RUTAS_WEBHOOK_FIRMADO: readonly string[] = [
  '/api/whatsapp/conversacion', // daemon WhatsApp real (x-chatx-ts + x-chatx-firma)
  '/api/telegram/conversacion', // puente Telegram (cerrojo compartido canales.ts)
  '/api/telegram/sesion', // identidad pública del bot presentada por el daemon firmado
  '/api/motores/agent-leads/webhook', // receptor agent-leads (token secreto fail-closed)
]

function esWebhookFirmado(pathname: string): boolean {
  return RUTAS_WEBHOOK_FIRMADO.some((r) => pathname === r || pathname.startsWith(`${r}/`))
}

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

  // Webhooks firmados: su cerradura es el HMAC de la ruta (fail-closed), no la
  // cookie. Se deja pasar para que la ruta autentique con SU mecanismo.
  if (esWebhookFirmado(req.nextUrl.pathname)) return NextResponse.next()

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

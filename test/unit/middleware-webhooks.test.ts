// F0.2 (S-017) — el cookie-auth NO debe romper los webhooks firmados.
// Bug real: con ADMIN_PASSWORD definida, el middleware devolvía 401 a los
// POST del daemon WhatsApp / puente Telegram / agent-leads antes de que la
// ruta pudiera autenticar por SU propio HMAC fail-closed — el bucle real
// moría detrás de la puerta equivocada.
// Tabla de decisión afirmada aquí (middleware + tabla RUTAS_WEBHOOK_FIRMADO):
//   - auth INACTIVA (sin ADMIN_PASSWORD): todo pasa (modo local/dev honesto)
//   - auth ACTIVA: POST sin cookie en ruta normal → 401
//   - auth ACTIVA: POST en webhook firmado → pasa el middleware; la cerradura
//     real es el HMAC de la ruta (503 sin secreto / 401 firma inválida — la
//     firma válida se construye con el mismo firmarCuerpo del contrato)
//   - auth ACTIVA: GET y /api/auth/login siguen libres (como siempre)
import { describe, test, expect, afterAll } from 'bun:test'
import { NextRequest } from 'next/server'
import { middleware, RUTAS_WEBHOOK_FIRMADO } from '@/middleware'
import { firmarCuerpo } from '@/lib/whatsapp/daemon'

const PASSWORD = 'clave-admin-f02-para-test'
const antes = process.env.ADMIN_PASSWORD
process.env.ADMIN_PASSWORD = PASSWORD
afterAll(() => {
  if (antes === undefined) delete process.env.ADMIN_PASSWORD
  else process.env.ADMIN_PASSWORD = antes
})

function peticion(url: string, metodo: string, headers: Record<string, string> = {}, cookie?: string): NextRequest {
  const req = new NextRequest(`http://localhost${url}`, { method: metodo, headers })
  if (cookie) Object.defineProperty(req, 'cookies', { value: { get: () => ({ value: cookie }) } })
  return req
}

async function estado(res: Response): Promise<number> {
  return res.status
}

describe('F0.2 · middleware vs webhooks firmados (auth admin ACTIVA)', () => {
  test('la tabla de rutas exentas es exacta (solo esas 4, nada más)', () => {
    expect([...RUTAS_WEBHOOK_FIRMADO].sort()).toEqual([
      '/api/motores/agent-leads/webhook',
      '/api/telegram/conversacion',
      '/api/telegram/sesion',
      '/api/whatsapp/conversacion',
    ])
  })

  test('POST sin cookie en ruta normal → 401 (el cerrojo cookie sigue intacto)', async () => {
    const res = await middleware(peticion('/api/characters', 'POST'))
    expect(await estado(res)).toBe(401)
  })

  test('POST del daemon en webhook firmado SIN firma → pasa el middleware (la ruta responde su 401/503 HMAC, no el cookie-auth)', async () => {
    const res = await middleware(peticion('/api/whatsapp/conversacion', 'POST'))
    expect(await estado(res)).not.toBe(401) // NextResponse.next() = 200 de paso
  })

  test('POST del daemon en webhook firmado CON firma HMAC válida → pasa el middleware', async () => {
    const cuerpo = JSON.stringify({ accion: 'pulso' })
    const ts = Date.now()
    const res = await middleware(
      peticion('/api/telegram/sesion', 'POST', {
        'Content-Type': 'application/json',
        'x-chatx-ts': String(ts),
        'x-chatx-firma': firmarCuerpo(ts, cuerpo, 'secreto-de-test-no-es-el-real-obvio'),
      }),
    )
    expect(await estado(res)).not.toBe(401)
  })

  test('cada ruta exenta individualmente pasa el cookie-auth (subrutas incluidas)', async () => {
    for (const ruta of RUTAS_WEBHOOK_FIRMADO) {
      const res = await middleware(peticion(ruta, 'POST'))
      expect(await estado(res)).not.toBe(401)
    }
  })

  test('una ruta webhook NO exenta sigue tras cookie (la exención no se arrastra)', async () => {
    const res = await middleware(peticion('/api/whatsapp/sesion', 'POST'))
    expect(await estado(res)).toBe(401)
    const res2 = await middleware(peticion('/api/whatsapp/conversacion/otra-cosa-que-no-existe/x', 'POST'))
    expect(await estado(res2)).not.toBe(401) // subruta del webhook exento → también pasa (la ruta 404 real la rechaza)
  })

  test('GET y login siguen libres con auth activa (sin cambios de siempre)', async () => {
    expect(await estado(await middleware(peticion('/api/characters', 'GET')))).not.toBe(401)
    expect(await estado(await middleware(peticion('/api/auth/login', 'POST')))).not.toBe(401)
  })

  test('auth INACTIVA (sin ADMIN_PASSWORD): todo pasa como en local/dev', async () => {
    const antes2 = process.env.ADMIN_PASSWORD
    delete process.env.ADMIN_PASSWORD
    try {
      expect(await estado(await middleware(peticion('/api/characters', 'POST')))).not.toBe(401)
    } finally {
      process.env.ADMIN_PASSWORD = antes2
    }
  })
})

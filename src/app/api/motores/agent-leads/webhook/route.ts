// Receptor de webhooks de AGENTE-LEADS (contrato definido en su repo:
// headers `X-AGENTE-LEADS-Event` + `Authorization: Bearer <secret>`).
// CRM-ALBRA aún no tiene receptor para este contrato; CHAT-X es el receptor
// natural del ecosistema. Los eventos se guardan inmutables (trazabilidad).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { registroEvento } from '@/lib/integracion-eventos'

export const dynamic = 'force-dynamic'

const EVENTOS_VALIDOS = new Set([
  'lead.created',
  'lead.scored',
  'lead.intelligenced',
  'lead.outreach_sent',
  'execution.completed',
])

export async function POST(req: NextRequest) {
  // FAIL-CLOSED: la autenticación va PRIMERO. Sin secreto configurado el receptor
  // rechaza (503): no se aceptan webhooks sin credencial verificable (sección 10).
  const cfg = await db.motorConfig.findUnique({ where: { motor: 'leads' } })
  const secretoEsperado = cfg?.apiKey?.trim()
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (!secretoEsperado) {
    await registroEvento('leads', 'webhook.rechazado', { motivo: 'sin secreto configurado (fail-closed)' })
    return NextResponse.json({ error: 'Receptor sin secreto configurado: guarda la apiKey del motor leads para activar el receptor (fail-closed).' }, { status: 503 })
  }
  if (token !== secretoEsperado) {
    await registroEvento('leads', 'webhook.rechazado', { motivo: 'bearer mismatch' })
    return NextResponse.json({ error: 'Credencial inválida' }, { status: 401 })
  }

  const evento = req.headers.get('x-agente-leads-event') ?? ''
  if (!evento) {
    return NextResponse.json({ error: 'Falta el header X-AGENTE-LEADS-Event' }, { status: 400 })
  }
  if (!EVENTOS_VALIDOS.has(evento)) {
    return NextResponse.json({ error: `Evento no reconocido: ${evento}` }, { status: 422 })
  }

  const payload = await req.json().catch(() => ({}))
  await registroEvento('leads', evento, payload as Record<string, unknown>)
  return NextResponse.json({ ok: true, recibido: evento })
}

export async function GET() {
  const eventos = await db.integracionEvent.findMany({
    where: { source: 'leads' },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json({ eventos })
}

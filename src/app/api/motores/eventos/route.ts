// Feed de eventos de integración del ecosistema (trazabilidad).
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const eventos = await db.integracionEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return NextResponse.json({ eventos })
}

// Aprobación humana de un paso en espera (sección 8: "aprobaciones humanas cuando correspondan").
import { NextResponse } from 'next/server'
import { resolverAprobacion } from '@/lib/flujos'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = (await req.json()) as { aprobado?: boolean; nota?: string }
    const r = await resolverAprobacion(id, Boolean(body.aprobado), (body.nota ?? '').slice(0, 400))
    if (!r.ok) return NextResponse.json({ error: r.mensaje }, { status: 409 })
    return NextResponse.json(r)
  } catch {
    return NextResponse.json({ error: 'Cuerpo JSON inválido.' }, { status: 400 })
  }
}

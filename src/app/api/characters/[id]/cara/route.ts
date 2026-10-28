// Cara canónica guardada del personaje (imagen SVG)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { leerClaro } from '@/lib/media'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const c = await db.character.findUnique({ where: { id } })
  if (!c?.canonicalPath) return new NextResponse('sin cara canónica', { status: 404 })
  const svg = leerClaro(c.canonicalPath.replace(/\.svg$/, ''))
  if (!svg) return new NextResponse('archivo no encontrado', { status: 404 })
  return new NextResponse(svg, {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'private, max-age=60' },
  })
}

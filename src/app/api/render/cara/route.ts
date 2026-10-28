// Vista previa en vivo de la cara canónica por semilla+variante+atributos (sin persistir).
// Usada por el paso 3 del asistente Genoma para regenerar hasta que guste.
import { NextRequest, NextResponse } from 'next/server'
import { getProvider } from '@/lib/provider'
import { LANE } from '@/lib/constants'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const seed = sp.get('seed') || 'semilla'
  const variant = Number(sp.get('variant')) || 0
  const nombre = sp.get('nombre') || 'Personaje'
  let attrs: Record<string, string> = {}
  try {
    attrs = JSON.parse(sp.get('attrs') || '{}')
  } catch {
    attrs = {}
  }

  const img = getProvider().generateImage({
    kind: 'canonica',
    seed: `${seed}:canonica:v${variant}`,
    baseSeed: seed,
    variant,
    brief: { escena: 'cara canónica', outfit: '', pose: '', encuadre: 'primer_plano', luz: 'estudio' },
    lane: LANE.PUBLICO,
    characterName: nombre,
  })

  return new NextResponse(img.svg, {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' },
  })
}

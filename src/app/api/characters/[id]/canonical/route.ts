// Fijar la cara canónica del personaje (genera archivo + pieza de procedencia)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getProvider } from '@/lib/provider'
import { guardarClaro, rutaPieza } from '@/lib/media'
import { characterDTO } from '@/lib/dto'
import { CHECKPOINT_SIMULADOR, ETIQUETA_IA, LANE } from '@/lib/constants'
import { registrarEvento } from '@/lib/compliance'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const c = await db.character.findUnique({ where: { id } })
  if (!c) return NextResponse.json({ error: 'Personaje no encontrado' }, { status: 404 })

  const variant = Number(body.variant) || 0
  const attrs = (JSON.parse(c.genome || '{}').atributos ?? {}) as Record<string, string>
  const seed = `${c.seed}:canonica:v${variant}`

  const img = getProvider().generateImage({
    kind: 'canonica',
    seed,
    baseSeed: c.seed,
    variant,
    brief: { escena: 'cara canónica', outfit: '', pose: '', encuadre: 'primer_plano', luz: 'estudio' },
    lane: LANE.PUBLICO,
    characterName: c.name,
  })

  const base = rutaPieza(c.id, `canonica_v${variant}`, 'full')
  guardarClaro(base, img.svg)
  const pathAbs = base + '.svg'

  await db.media.create({
    data: {
      characterId: c.id,
      kind: 'cara_canonica',
      lane: LANE.PUBLICO,
      prompt: `cara canónica · personaje: ${c.name} · variante ${variant}`,
      seed,
      checkpoint: CHECKPOINT_SIMULADOR,
      aiLabels: JSON.stringify([ETIQUETA_IA]),
      pipelineStatus: 'aprobado',
      qualityVerdict: 'APROBADO',
      filePath: pathAbs,
      thumbPath: pathAbs,
      provenance: JSON.stringify({
        tipo: 'cara_canonica',
        personaje: c.name,
        seed,
        variante: variant,
        checkpoint: CHECKPOINT_SIMULADOR,
        proveedor: getProvider().name,
        generadoEn: new Date().toISOString(),
      }),
    },
  })

  const updated = await db.character.update({
    where: { id },
    data: { canonicalVariant: variant, canonicalPath: pathAbs },
  })
  await registrarEvento('creacion', { tipo: 'cara_canonica', variante: variant, seed }, { characterId: id })
  return NextResponse.json({ character: characterDTO(updated) })
}

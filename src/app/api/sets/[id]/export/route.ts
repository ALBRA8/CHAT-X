// Exporta el paquete de un set: manifest JSON con metadata de procedencia,
// caption, etiqueta IA y precios (flujo B paso 4 — carga guiada en la plataforma).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const s = await db.set.findUnique({
    where: { id },
    include: {
      character: { select: { name: true, seed: true } },
      media: { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!s) return NextResponse.json({ error: 'Set no encontrado' }, { status: 404 })

  const manifest = {
    sistema: 'EL ESTUDIO (etiqueta interna de trabajo)',
    generado: new Date().toISOString(),
    set: {
      nombre: s.name,
      personaje: s.character.name,
      carril: s.lane,
      caption: s.caption,
      etiquetaIA: s.aiLabel,
      precioPPVSugerido: s.suggestedPrice,
      precioReal: s.realPrice,
      estado: s.publishStatus,
      piezas: s.media.length,
    },
    piezas: s.media.map((m) => ({
      id: m.id,
      tipo: m.kind,
      prompt: m.prompt,
      semilla: m.seed,
      checkpoint: m.checkpoint,
      loraHash: m.loraHash,
      veredictoQA: m.qualityVerdict,
      carril: m.lane,
      cifrada: Boolean(m.encIv),
      etiquetasIA: m.aiLabels,
      archivo: `/api/media/${m.id}/archivo?tipo=full`,
      miniatura: `/api/media/${m.id}/archivo?tipo=thumb`,
      creado: m.createdAt,
    })),
    notaProcedencia:
      'Cada pieza incluye prompt, semilla, checkpoint y hash de LoRA como prueba de originalidad.',
  }

  return new NextResponse(JSON.stringify(manifest, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="set-${s.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.json"`,
    },
  })
}

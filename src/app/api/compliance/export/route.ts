// Export del registro de compliance (flujo D paso 3: prueba de originalidad)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { complianceDTO } from '@/lib/dto'

function csvEscape(v: unknown): string {
  const s = String(v ?? '')
  return `"${s.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`
}

export async function GET(req: NextRequest) {
  const formato = req.nextUrl.searchParams.get('formato') === 'csv' ? 'csv' : 'json'

  if (formato === 'json') {
    const eventos = await db.complianceEvent.findMany({ orderBy: { createdAt: 'asc' } })
    const piezas = await db.media.findMany({ orderBy: { createdAt: 'asc' } })
    const body = {
      generado: new Date().toISOString(),
      sistema: 'EL ESTUDIO (etiqueta interna de trabajo)',
      nota: 'Registro de compliance append-only para prueba de originalidad.',
      piezas: piezas.map((p) => ({
        id: p.id,
        personaje: p.characterId,
        carril: p.lane,
        tipo: p.kind,
        prompt: p.prompt,
        semilla: p.seed,
        checkpoint: p.checkpoint,
        loraHash: p.loraHash,
        veredictoQA: p.qualityVerdict,
        motivoQA: p.qualityReason,
        filtros: p.filtersTriggered,
        etiquetasIA: p.aiLabels,
        pipeline: p.pipelineStatus,
        cifrado: Boolean(p.encIv),
        set: p.setId,
        creado: p.createdAt,
        procedencia: p.provenance,
      })),
      eventos: eventos.map(complianceDTO),
    }
    return new NextResponse(JSON.stringify(body, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="registro_compliance_${Date.now()}.json"`,
      },
    })
  }

  const piezas = await db.media.findMany({ orderBy: { createdAt: 'asc' }, include: { set: true } })
  const cab = [
    'pieza_id', 'fecha', 'personaje', 'carril', 'tipo', 'prompt', 'semilla', 'checkpoint',
    'lora_hash', 'veredicto_qa', 'motivo_qa', 'filtros', 'etiquetas_ia', 'pipeline',
    'cifrado', 'set', 'destino_publicacion',
  ].join(',')
  const filas = piezas.map((p) =>
    [
      p.id, p.createdAt.toISOString(), p.characterId, p.lane, p.kind, p.prompt, p.seed, p.checkpoint,
      p.loraHash, p.qualityVerdict, p.qualityReason, p.filtersTriggered, p.aiLabels, p.pipelineStatus,
      p.encIv ? 'si' : 'no', p.set?.name ?? '', p.set ? p.set.publishStatus : '',
    ].map(csvEscape).join(','),
  )
  const csv = [cab, ...filas].join('\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="registro_compliance_${Date.now()}.csv"`,
    },
  })
}

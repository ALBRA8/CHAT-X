// Calendario de publicación exportable (paridad ClonaKit con "IA Influencer":
// allí va tras paywall — aquí sale de datos reales de Sets y es gratis).
// Formatos: ics (Google Calendar/Metricool vía iCal) y csv (importación hoja de cálculo).
// Fechas: sets publicados usan publishedAt; el resto recibe fecha PROPUESTA
// determinista (día siguiente al de su creación, 19:00, escalonado por orden).
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface Pieza {
  inicio: Date
  titulo: string
  personaje: string
  carril: string
  caption: string
  etiquetaIA: string
  precio: number
  propuesto: boolean
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function icsFecha(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

export async function GET(req: Request) {
  const formato = new URL(req.url).searchParams.get('formato') === 'csv' ? 'csv' : 'ics'

  const sets = await db.set.findMany({
    where: { publishStatus: { in: ['borrador', 'cifrado', 'empaquetado', 'publicado'] } },
    include: { character: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  })

  const piezas: Pieza[] = sets.map((s, i) => {
    const propuesto = !s.publishedAt
    const inicio = s.publishedAt ?? new Date(new Date(s.createdAt).getTime() + (i + 1) * 24 * 3600 * 1000)
    inicio.setHours(19, 0, 0, 0)
    return {
      inicio,
      titulo: `${s.name} — ${s.character.name}`,
      personaje: s.character.name,
      carril: s.lane,
      caption: s.caption,
      etiquetaIA: s.aiLabel,
      precio: s.realPrice ?? s.suggestedPrice,
      propuesto,
    }
  })

  if (formato === 'csv') {
    const filas = [
      'fecha,titulo,personaje,carril,caption,etiqueta_ia,precio_usd,fecha_propuesta',
      ...piezas.map((p) =>
        [
          p.inicio.toISOString(),
          `"${p.titulo.replace(/"/g, '""')}"`,
          `"${p.personaje.replace(/"/g, '""')}"`,
          p.carril,
          `"${p.caption.replace(/"/g, '""').slice(0, 300)}"`,
          `"${p.etiquetaIA.replace(/"/g, '""')}"`,
          p.precio.toFixed(2),
          p.propuesto ? 'si' : 'no',
        ].join(','),
      ),
    ]
    return new NextResponse(filas.join('\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="chatx-calendario-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  }

  const eventos = piezas
    .map(
      (p) => [
        'BEGIN:VEVENT',
        `UID:chatx-${icsFecha(p.inicio)}-${p.personaje.replace(/\W/g, '')}@chatx.local`,
        `DTSTAMP:${icsFecha(new Date())}`,
        `DTSTART:${icsFecha(p.inicio)}`,
        `DTEND:${icsFecha(new Date(p.inicio.getTime() + 30 * 60 * 1000))}`,
        `SUMMARY:${icsEscape(p.titulo)}${p.propuesto ? ' (propuesto)' : ''}`,
        `DESCRIPTION:${icsEscape(`Carril: ${p.carril} · ${p.etiquetaIA} · precio ${p.precio.toFixed(2)} USD\n${p.caption}`)}`,
        'END:VEVENT',
      ].join('\r\n'),
    )
    .join('\r\n')

  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CHAT-X//Calendario Publicacion//ES', 'CALSCALE:GREGORIAN', eventos, 'END:VCALENDAR'].join('\r\n')
  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="chatx-calendario-${new Date().toISOString().slice(0, 10)}.ics"`,
    },
  })
}

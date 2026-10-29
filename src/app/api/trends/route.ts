// Trend-finder UGC (P2.7 de CLONAKIT_BRECHAS). Fuentes honestas:
//  - GET: tendencias registradas + señales internas + estado del conector RSS.
//  - POST action=registrar   → entrada manual del operador (análisis determinista).
//  - POST action=rss_refrescar → lee los feeds opt-in (env TREND_RSS_URLS).
//  - POST action=estado      → usar | descartar una tendencia.
// El filtro de edad se aplica a TODO texto que entra (analizarTrend lanza 422).
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { jsonError, jsonOk } from '@/lib/api-utils'
import { registrarEvento } from '@/lib/compliance'
import { analizarTrend, estadoConectorRSS, leerFeedsRSS, senalesInternas } from '@/lib/trends'

const ESTADOS = ['nueva', 'usada', 'descartada'] as const

export async function GET(req: NextRequest) {
  const characterId = req.nextUrl.searchParams.get('characterId') || undefined
  const estado = req.nextUrl.searchParams.get('estado')
  const [entradas, senales] = await Promise.all([
    db.trendEntry.findMany({
      where: estado && (ESTADOS as readonly string[]).includes(estado) ? { estado } : {},
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    senalesInternas(characterId),
  ])
  return jsonOk({
    tendencias: entradas.map((t) => ({
      id: t.id,
      fuente: t.fuente,
      tipo: t.tipo,
      titulo: t.titulo,
      url: t.url,
      estado: t.estado,
      analisis: JSON.parse(t.analisis || '{}'),
      metricas: JSON.parse(t.metricas || '{}'),
      createdAt: t.createdAt,
    })),
    senalesInternas: senales,
    conectorRSS: estadoConectorRSS(),
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const action = String(body.action || 'registrar')

  // ── Entrada manual del operador ──
  if (action === 'registrar') {
    const titulo = typeof body.titulo === 'string' ? body.titulo.trim() : ''
    const texto = typeof body.texto === 'string' ? body.texto.trim() : ''
    const url = typeof body.url === 'string' ? body.url.trim() : ''
    if (!titulo && !texto) return jsonError('Falta el contenido de la tendencia (titulo y/o texto).', 422)
    if (titulo.length > 300 || texto.length > 5000) return jsonError('Contenido demasiado largo (título máx 300, texto máx 5000).', 422)
    let analisis
    try {
      analisis = analizarTrend(titulo, texto)
    } catch (e) {
      return jsonError(e instanceof Error ? e.message : 'Filtro de edad', 422, { filtro: 'edad_aparente' })
    }
    const entrada = await db.trendEntry.create({
      data: {
        fuente: 'manual',
        tipo: String(body.tipo || 'competidor') === 'tendencia' ? 'tendencia' : 'competidor',
        titulo: titulo || analisis.gancho,
        url,
        texto: texto.slice(0, 5000),
        metricas: JSON.stringify({
          plataforma: typeof body.plataforma === 'string' ? body.plataforma.slice(0, 40) : '',
          interacciones: Number.isFinite(Number(body.interacciones)) ? Number(body.interacciones) : null,
          autor: typeof body.autor === 'string' ? body.autor.slice(0, 80) : '',
        }),
        analisis: JSON.stringify(analisis),
      },
    })
    await registrarEvento('trend_ingestida', { fuente: 'manual', titulo: entrada.titulo, formato: analisis.formato, keywords: analisis.keywords })
    return jsonOk({ id: entrada.id, analisis, mensaje: 'Tendencia registrada y analizada (determinista, sin LLM).' }, 201)
  }

  // ── Refresco del conector RSS opt-in ──
  if (action === 'rss_refrescar') {
    const cfg = estadoConectorRSS()
    if (cfg.estado === 'NO_CONFIGURADO') {
      return jsonOk({
        refrescadas: 0,
        conectorRSS: cfg,
        notaHonestidad: 'Conector RSS NO_CONFIGURADO: define TREND_RSS_URLS en .env para activarlo (máx 5 feeds, sindicación, sin scraping).',
      })
    }
    const { feeds } = await leerFeedsRSS()
    let refrescadas = 0
    const errores: string[] = []
    for (const feed of feeds) {
      if (feed.estado !== 'OPERATIVO') {
        errores.push(`${feed.fuente}: ${feed.detalle || 'error'}`)
        continue
      }
      for (const item of feed.items) {
        let analisis
        try {
          analisis = analizarTrend(item.titulo, '')
        } catch {
          continue // feed con contenido prohibido: ese ítem se salta, el feed no
        }
        const existente = await db.trendEntry.findFirst({ where: { url: item.url, fuente: feed.fuente } })
        if (existente) continue
        await db.trendEntry.create({
          data: {
            fuente: feed.fuente,
            tipo: 'tendencia',
            titulo: item.titulo,
            url: item.url,
            metricas: JSON.stringify({ fecha: item.fecha || '' }),
            analisis: JSON.stringify(analisis),
          },
        })
        refrescadas++
      }
    }
    if (refrescadas > 0) {
      await registrarEvento('trend_ingestida', { fuente: 'rss', refrescadas, feeds: feeds.length })
    }
    return jsonOk({ refrescadas, feeds: feeds.map((f) => ({ fuente: f.fuente, estado: f.estado, items: f.items.length, detalle: f.detalle })), errores })
  }

  // ── Cambio de estado (usar | descartar) ──
  if (action === 'estado') {
    const id = String(body.id || '')
    const nuevo = String(body.estado || '')
    if (!id) return jsonError('Falta el id de la tendencia.', 422)
    if (!(ESTADOS as readonly string[]).includes(nuevo)) return jsonError(`estado debe ser: ${ESTADOS.join(' | ')}`, 422)
    const existe = await db.trendEntry.findUnique({ where: { id } })
    if (!existe) return jsonError('Tendencia no encontrada', 404)
    await db.trendEntry.update({ where: { id }, data: { estado: nuevo } })
    return jsonOk({ id, estado: nuevo })
  }

  return jsonError(`action desconocida "${action}". Válidas: registrar | rss_refrescar | estado.`, 422)
}

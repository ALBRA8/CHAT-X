// Trend-finder + espía de competidores para UGC (P2.7 de CLONAKIT_BRECHAS).
//
// Origen: TokPrimeAI detecta formatos virales y vigila feeds de competidores
// para alimentar el carril social. Aquí el carril social (módulo UGC) publica
// pero NO descubre; este módulo le da oído.
//
// Fuentes con HONESTIDAD total y cero scraping agresivo (constitución):
//  1. ENTRADA MANUAL del operador: pega un post/competidor/tendencia y queda
//     analizada con keywords + formato + ángulos (siempre disponible).
//  2. SEÑALES INTERNAS: lo que YA funciona en la propia plataforma (sets con
//     ingresos, piezas aprobadas por escena, KPIs del mes) — determinista.
//  3. CONECTOR RSS OPT-IN: env TREND_RSS_URLS (sindicación diseñada para ser
//     leída; NO scraping de HTML). Límites duros: máx 5 feeds, 20 ítems por
//     feed, timeout 8s, sin credenciales → estado NO_CONFIGURADO declarado.
//
// El análisis es DETERMINISTA (sin LLM): mismas entradas → mismo análisis.
// Todo texto que entra pasa (y sale) por el filtro de edad aparente.
import { detectarTerminosProhibidos } from '@/lib/constants'
import { sanitizarTextoExterno } from '@/lib/saneo'

// ─────────────────────── Análisis determinista ───────────────────────

const STOPWORDS_TREND = new Set(
  ('de la que el en y a los se del las un por con no una su para es al lo como más pero sus le ya o este esta ' +
    'this that with from your have will can for are you the and about more when just only very much some what ' +
    'para entre sobre hasta desde porque también pero todos todas cada según sin tras video post sigan').split(' '),
)

export const FORMATOS_UGC = ['reel', 'carrusel', 'historia', 'post'] as const
export type FormatoUGC = (typeof FORMATOS_UGC)[number]

export interface AnalisisTrend {
  keywords: string[]
  formato: FormatoUGC
  gancho: string
  angulos: string[]
}

/** Palabras clave por frecuencia (≥4 letras, sin stopwords), orden estable. */
export function keywordsDe(texto: string, max = 8): string[] {
  const frec = new Map<string, number>()
  for (const w of texto
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)) {
    if (w.length < 4 || STOPWORDS_TREND.has(w) || /^\d+$/.test(w)) continue
    frec.set(w, (frec.get(w) || 0) + 1)
  }
  return [...frec.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([w]) => w)
}

/** Detección de formato por señales del texto (sin adivinar de más). */
export function formatoDe(texto: string): FormatoUGC {
  const t = texto.toLowerCase()
  if (/\b(reel|tiktok|shorts|video|vídeo)\b/.test(t)) return 'reel'
  if (/\b(carrusel|carousel|fotos|fotograf[ií]as|hilo)\b/.test(t)) return 'carrusel'
  if (/\b(story|historia|stories|encuesta)\b/.test(t)) return 'historia'
  return 'post'
}

/** Ángulos de contenido deterministas derivados de las keywords top. */
export function angulosDe(keywords: string[]): string[] {
  const k = keywords.slice(0, 3)
  const angulos: string[] = []
  if (k[0]) angulos.push(`Cómo empiezo el día relacionado con ${k[0]}`)
  if (k[1]) angulos.push(`Lo que nadie cuenta de ${k[1]}`)
  if (k[2]) angulos.push(`Mi rutina con ${k[2]} (detrás de cámaras)`)
  if (angulos.length === 0) angulos.push('Vlog cotidiano con el tono del genoma')
  return angulos
}

/**
 * Análisis completo de una entrada de tendencia. Lanza si viola el filtro.
 * Doble capa: el filtro de edad corre sobre el texto CRUDO (constitucional)
 * y el texto que alimenta el análisis/briefs pasa ANTES por el saneo
 * anti-inyección (una tendencia puede intentar secuestrar el prompt de
 * herramientas posteriores con "ignora tus instrucciones...").
 */
export function analizarTrend(titulo: string, texto: string): AnalisisTrend {
  const planoCrudo = `${titulo} ${texto}`
  const prohibidos = detectarTerminosProhibidos(planoCrudo)
  if (prohibidos.length > 0) {
    throw new Error(
      `Filtro de edad aparente: la tendencia contiene términos prohibidos "${prohibidos.join('", "')}". No se registra (regla constitucional).`,
    )
  }
  const tituloSano = sanitizarTextoExterno(titulo, 200).texto
  const textoSaneado = sanitizarTextoExterno(texto, 2000).texto
  const plano = `${tituloSano} ${textoSaneado}`
  const keywords = keywordsDe(plano)
  return {
    keywords,
    formato: formatoDe(plano),
    gancho: tituloSano.trim().slice(0, 120) || keywords.slice(0, 3).join(' · '),
    angulos: angulosDe(keywords),
  }
}

// ─────────────────────── Señales internas (fuente 2) ───────────────────────

export interface SenalInterna {
  tema: string
  signal: string
  fuerza: number // 1..3 (métrica simple y explicable)
}

export interface ResultadoSenalesInternas {
  senales: SenalInterna[]
  detalle: { setsConIngresos: number; piezasAprobadas: number; mesesConKpi: number }
}

/**
 * Lo que la propia plataforma ya sabe: sets con ingresos (caption = tema),
 * escenas con más piezas aprobadas, meses con KPI registrado. Determinista,
 * sin LLM y sin salir de la BD local.
 */
export async function senalesInternas(characterId?: string): Promise<ResultadoSenalesInternas> {
  const { db } = await import('@/lib/db')
  const whereSet = characterId ? { characterId } : {}
  const sets = await db.set.findMany({
    where: { ...whereSet, revenue: { gt: 0 } },
    select: { caption: true, name: true, revenue: true },
    orderBy: { revenue: 'desc' },
    take: 20,
  })
  const whereMedia = characterId ? { characterId, qualityVerdict: 'APROBADO' } : { qualityVerdict: 'APROBADO' }
  const piezas = await db.media.groupBy({
    by: ['sceneName'],
    where: whereMedia,
    _count: { _all: true },
    orderBy: { sceneName: 'asc' },
    take: 20,
  })
  const meses = await db.kpiEntry.groupBy({ by: ['month'], where: characterId ? { characterId } : {}, _count: { _all: true } })

  const senales: SenalInterna[] = []
  for (const s of sets.slice(0, 5)) {
    const tema = (s.caption || s.name).trim().slice(0, 80)
    if (!tema) continue
    senales.push({ tema, signal: `Set con ingresos ($${s.revenue.toFixed(0)})`, fuerza: s.revenue > 100 ? 3 : 2 })
  }
  const topEscenas = piezas
    .filter((p) => p.sceneName)
    .sort((a, b) => b._count._all - a._count._all)
    .slice(0, 5)
  for (const p of topEscenas) {
    senales.push({ tema: p.sceneName as string, signal: `${p._count._all} piezas aprobadas en esta escena`, fuerza: p._count._all >= 6 ? 3 : 1 })
  }
  for (const m of meses.slice(0, 3)) {
    senales.push({ tema: `Mes ${m.month} con KPI registrados`, signal: `${m._count._all} personajes con métricas`, fuerza: 1 })
  }
  return {
    senales: senales.sort((a, b) => b.fuerza - a.fuerza).slice(0, 10),
    detalle: { setsConIngresos: sets.length, piezasAprobadas: piezas.reduce((a, p) => a + p._count._all, 0), mesesConKpi: meses.length },
  }
}

// ─────────────────────── Conector RSS opt-in (fuente 3) ───────────────────────

export const RSS_MAX_FEEDS = 5
export const RSS_MAX_ITEMS = 20
const RSS_TIMEOUT_MS = 8000

export interface ItemRSS {
  titulo: string
  url: string
  fecha?: string
}

export interface ResultadoFeed {
  fuente: string
  estado: 'OPERATIVO' | 'ERROR'
  items: ItemRSS[]
  detalle?: string
}

/** Estado del conector HONESTO: sin env → NO_CONFIGURADO (no se disimula). */
export function estadoConectorRSS(): { estado: 'NO_CONFIGURADO' | 'CONFIGURADO'; feeds: string[]; ayuda: string } {
  const raw = (process.env.TREND_RSS_URLS || '').trim()
  if (!raw) {
    return {
      estado: 'NO_CONFIGURADO',
      feeds: [],
      ayuda: 'Define TREND_RSS_URLS (separadas por coma, máx 5) con feeds RSS que QUIERAS seguir. Sin credenciales ni scraping: solo sindicación.',
    }
  }
  return { estado: 'CONFIGURADO', feeds: raw.split(',').map((f) => f.trim()).filter(Boolean).slice(0, RSS_MAX_FEEDS), ayuda: '' }
}

/** Parser RSS/Atom mínimo por regex (sin dependencias). */
export function parsearRSS(xml: string): ItemRSS[] {
  const items: ItemRSS[] = []
  const bloques = [...xml.matchAll(/<(item|entry)[\s\S]*?<\/\1>/gi)]
  for (const b of bloques) {
    const bloque = b[0]
    const titulo = bloque.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim() || ''
    let url = bloque.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1] || ''
    if (!url) url = bloque.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i)?.[1]?.trim() || ''
    const fecha = bloque.match(/<(pubDate|published|updated)[^>]*>([^<]+)<\/\1>/i)?.[2]?.trim()
    if (titulo) items.push({ titulo: sanitizarTextoExterno(titulo.replace(/\s+/g, ' '), 200).texto, url, fecha })
    if (items.length >= RSS_MAX_ITEMS) break
  }
  return items
}

/** Lee los feeds configurados con límites duros. Errores por feed, jamás tumba. */
export async function leerFeedsRSS(): Promise<{ feeds: ResultadoFeed[]; estado: ReturnType<typeof estadoConectorRSS> }> {
  const cfg = estadoConectorRSS()
  if (cfg.estado === 'NO_CONFIGURADO') return { feeds: [], estado: cfg }
  const feeds: ResultadoFeed[] = []
  for (const fuente of cfg.feeds) {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), RSS_TIMEOUT_MS)
      const res = await fetch(fuente, {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'CHAT-X-TrendFinder/1.0 (RSS opt-in)' },
        redirect: 'error',
      })
      clearTimeout(t)
      if (!res.ok) {
        feeds.push({ fuente, estado: 'ERROR', items: [], detalle: `HTTP ${res.status}` })
        continue
      }
      const xml = (await res.text()).slice(0, 1024 * 1024)
      feeds.push({ fuente, estado: 'OPERATIVO', items: parsearRSS(xml) })
    } catch (e) {
      feeds.push({
        fuente,
        estado: 'ERROR',
        items: [],
        detalle: e instanceof Error ? (e.name === 'AbortError' ? `timeout ${RSS_TIMEOUT_MS / 1000}s` : e.message) : 'error de red',
      })
    }
  }
  return { feeds, estado: cfg }
}

// ─────────────────────── Tendencias → briefs del carril social ───────────────────────

export interface SugerenciaUGC {
  formato: FormatoUGC
  gancho: string
  briefTexto: string
  trendTitulo: string
  trendFuente: string
}

/**
 * Convierte una tendencia analizada en sugerencias CONCRETAS para el carril
 * social. Determinista y consciente del genoma (aficiones → ángulo propio).
 */
export function sugerenciasDesdeTrend(
  analisis: AnalisisTrend,
  opts: { trendTitulo: string; trendFuente: string; aficiones?: string[] },
  max = 3,
): SugerenciaUGC[] {
  const kw = analisis.keywords.length ? analisis.keywords : ['día a día']
  const aficion = (opts.aficiones || []).find((a) => a.trim().length > 2)?.trim()
  const base = [
    `${analisis.formato} — ${analisis.gancho} (primer plano, texto en pantalla corto)`,
    `${analisis.formato} — ${analisis.angulos[0] || kw.slice(0, 2).join(' + ')}`,
    `${analisis.formato} — ${aficion ? `${aficion} visto desde ${kw[0]}` : `${kw[0]} con el tono del genoma`}`,
  ]
  return base.slice(0, max).map((b) => ({
    formato: analisis.formato,
    gancho: analisis.gancho,
    briefTexto: b,
    trendTitulo: opts.trendTitulo,
    trendFuente: opts.trendFuente,
  }))
}

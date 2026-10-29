// Sugerencias de briefs para el carril social (UGC) a partir de las tendencias
// NUEVAS registradas (P2.7). Determinista y consciente del genoma: las aficiones
// del personaje entran como ángulo propio. No gasta créditos: son sugerencias —
// producir una pieza real pasa por el lote del Estudio/InstaDump de siempre.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { jsonError, jsonOk } from '@/lib/api-utils'
import { sugerenciasDesdeTrend, type AnalisisTrend } from '@/lib/trends'

export async function GET(req: NextRequest) {
  const characterId = req.nextUrl.searchParams.get('characterId')
  const max = Math.max(1, Math.min(10, Number(req.nextUrl.searchParams.get('max')) || 3))
  if (!characterId) return jsonError('Falta characterId (las sugerencias son por personaje).', 422)
  const c = await db.character.findUnique({ where: { id: characterId }, select: { id: true, genome: true, status: true } })
  if (!c) return jsonError('Personaje no encontrado', 404)

  let aficiones: string[] = []
  try {
    const g = JSON.parse(c.genome) as { aficiones?: string }
    aficiones = (g.aficiones || '').split(',').map((a) => a.trim()).filter(Boolean)
  } catch {
    aficiones = []
  }

  const tendencias = await db.trendEntry.findMany({ where: { estado: 'nueva' }, orderBy: { createdAt: 'desc' }, take: 10 })
  const sugerencias = tendencias.flatMap((t) => {
    let analisis: AnalisisTrend
    try {
      analisis = JSON.parse(t.analisis || '{}') as AnalisisTrend
    } catch {
      return []
    }
    if (!analisis || !Array.isArray(analisis.keywords)) return []
    return sugerenciasDesdeTrend(analisis, { trendTitulo: t.titulo, trendFuente: t.fuente, aficiones }, max).map((s) => ({ ...s, trendId: t.id }))
  })

  return jsonOk({
    sugerencias: sugerencias.slice(0, max),
    tendenciasConsideradas: tendencias.length,
    nota: 'Sugerencias deterministas desde tendencias NUEVAS. Usar una marca la tendencia como usada (POST /api/trends action=estado).',
  })
}

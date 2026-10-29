// Pruebas del trend-finder UGC (P2.7 de CLONAKIT_BRECHAS). Todo hermético:
// análisis determinista, detección de formato, ángulos, sugerencias para el
// carril social y el filtro de edad sobre la entrada (regla constitucional).
// La BD (señales internas) y el RSS real NO se tocan aquí (las cubren los
// checks API); el parser RSS sí, porque es puro.
import { describe, test, expect } from 'bun:test'
import {
  analizarTrend,
  angulosDe,
  formatoDe,
  keywordsDe,
  parsearRSS,
  sugerenciasDesdeTrend,
} from '@/lib/trends'

describe('P2.7 — análisis determinista de tendencias', () => {
  test('mismo texto → mismo análisis completo (keywords, formato, gancho, ángulos)', () => {
    const a = analizarTrend('Rutina de café en la mañana', 'mi rutina de café cafetería cafetería cafetería vlog')
    const b = analizarTrend('Rutina de café en la mañana', 'mi rutina de café cafetería cafetería cafetería vlog')
    expect(b).toEqual(a)
    expect(a.keywords[0]).toBe('cafetería')
    expect(a.gancho).toBe('Rutina de café en la mañana')
  })

  test('filtro de edad DURO: entrada con término prohibido lanza y no devuelve análisis', () => {
    expect(() => analizarTrend('chica loli estilo anime', 'contenido')).toThrow(/filtro de edad|prohibid/i)
  })

  test('detección de formato por señales del texto', () => {
    expect(formatoDe('nuevo reel de tiktok con tendencia')).toBe('reel')
    expect(formatoDe('carrusel con 5 fotos del set')).toBe('carrusel')
    expect(formatoDe('pregunta en story con encuesta')).toBe('historia')
    expect(formatoDe('texto plano sin señales')).toBe('post')
  })

  test('keywordsDe: orden estable por frecuencia, sin stopwords', () => {
    const kw = keywordsDe('playa playa playa atardecer atardecer surf para con the and', 4)
    expect(kw[0]).toBe('playa')
    expect(kw[1]).toBe('atardecer')
    expect(kw[2]).toBe('surf')
    expect(kw).not.toContain('the')
  })

  test('angulosDe genera hasta 3 ángulos desde las keywords top', () => {
    const ang = angulosDe(['café', 'parque', 'libros', 'sobrante'])
    expect(ang.length).toBe(3)
    expect(ang[0]).toContain('café')
    expect(angulosDe([]).length).toBe(1) // siempre hay al menos un ángulo
  })
})

describe('P2.7 — parser RSS puro', () => {
  test('extrae items de RSS 2.0 con límite de 20', () => {
    const items = Array.from({ length: 30 }, (_, i) => `<item><title>Tendencia ${i}</title><link>https://x.example/${i}</link><pubDate>2026-10-29</pubDate></item>`).join('')
    const res = parsearRSS(`<rss><channel>${items}</channel></rss>`)
    expect(res.length).toBe(20)
    expect(res[0].titulo).toBe('Tendencia 0')
    expect(res[0].url).toBe('https://x.example/0')
  })

  test('extrae items de Atom (link con href) y tolera CDATA', () => {
    const xml = `<feed><entry><title><![CDATA[Formato viral: vlogs de 30s]]></title><link href="https://a.example/1"/><updated>2026-10-29T00:00:00Z</updated></entry></feed>`
    const res = parsearRSS(xml)
    expect(res.length).toBe(1)
    expect(res[0].titulo).toBe('Formato viral: vlogs de 30s')
    expect(res[0].url).toBe('https://a.example/1')
  })

  test('XML vacío → 0 items sin lanzar', () => {
    expect(parsearRSS('<rss><channel></channel></rss>')).toEqual([])
  })
})

describe('P2.7 — sugerencias para el carril social', () => {
  const analisis = analizarTrend('Rutina de café', 'café cafetería vlog mañana')

  test('determinista y consciente del genoma (la afición entra como ángulo)', () => {
    const a = sugerenciasDesdeTrend(analisis, { trendTitulo: 'Rutina de café', trendFuente: 'manual', aficiones: ['fotografía analógica'] }, 3)
    const b = sugerenciasDesdeTrend(analisis, { trendTitulo: 'Rutina de café', trendFuente: 'manual', aficiones: ['fotografía analógica'] }, 3)
    expect(b).toEqual(a)
    expect(a.some((s) => s.briefTexto.includes('fotografía analógica'))).toBe(true)
    expect(a[0].formato).toBe(analisis.formato)
  })

  test('sin aficiones usa el tono del genoma y respeta el máximo', () => {
    const s = sugerenciasDesdeTrend(analisis, { trendTitulo: 'Rutina de café', trendFuente: 'manual' }, 2)
    expect(s.length).toBe(2)
    expect(s.every((x) => x.trendFuente === 'manual')).toBe(true)
  })

  test('la salida nunca contiene términos prohibidos (pools limpios por construcción)', () => {
    const s = sugerenciasDesdeTrend(analisis, { trendTitulo: 'Rutina de café', trendFuente: 'manual', aficiones: ['yoga'] }, 3)
    for (const x of s) {
      expect(() => analizarTrend(x.briefTexto, '')).not.toThrow()
    }
  })
})

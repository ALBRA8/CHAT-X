// Tests del brief por defecto del orquestador (estudio_lote sin brief explícito).
// El brief debe derivarse SOLO del genoma real del personaje y jamás lanzar.
import { describe, expect, test } from 'bun:test'
import { construirBriefPorDefecto } from '../../src/lib/flujos'

describe('construirBriefPorDefecto', () => {
  test('deriva la escena de las aficiones del genoma', () => {
    const b = construirBriefPorDefecto(JSON.stringify({ atributos: { edad_aparente: '28' }, aficiones: 'café, lectura, playa' }))
    expect(b.escena).toContain('café, lectura, playa')
    expect(b.encuadre).toBe('plano_medio')
    expect(b.luz).toBe('natural suave')
    expect(b.outfit.length).toBeGreaterThan(0)
    expect(b.pose.length).toBeGreaterThan(0)
  })

  test('usa lore si no hay aficiones', () => {
    const b = construirBriefPorDefecto(JSON.stringify({ lore: 'Modelo digital independiente' }))
    expect(b.escena).toContain('Modelo digital independiente')
  })

  test('genoma vacío → valores neutros, sin lanzar', () => {
    const b = construirBriefPorDefecto('{}')
    expect(b.escena).toContain('sesión casual en interior')
    expect(b.encuadre).toBe('plano_medio')
  })

  test('genoma corrupto (no JSON) → valores neutros, sin lanzar', () => {
    const b = construirBriefPorDefecto('esto-no-es-json{{{')
    expect(b.escena.length).toBeGreaterThan(0)
    expect(b.encuadre).toBe('plano_medio')
  })
})

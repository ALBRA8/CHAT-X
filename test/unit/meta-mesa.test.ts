// Tests F4 — lógica PURA de la Mesa Meta (FB/IG manual-first). Cubre
// src/lib/meta/mesa.ts: validación de la entrada pegada a mano (red, contacto
// opcional, texto, personaje CONCRETO), transiciones honestas de los
// borradores (borrador → usar | descartar; la historia no se re-estructura)
// y la máscara de la etiqueta del contacto. Nada toca BD ni red — esta mesa
// jamás se conecta a Meta.
import { describe, test, expect } from 'bun:test'
import {
  MAX_CONTACTO,
  MAX_TEXTO_ENTRADA,
  REDES,
  mostrarContacto,
  transicionBorradorMeta,
  validarEntradaMeta,
} from '@/lib/meta/mesa'

describe('validarEntradaMeta (pegar a mano, sin scraping ni sincronización)', () => {
  const base = { red: 'facebook', texto: 'hola, vi tu perfil y me interesa', personajeId: 'char-1' }

  test('entrada completa pasa; contacto opcional se recorta al tope', () => {
    const r = validarEntradaMeta(base)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.datos.red).toBe('facebook')
      expect(r.datos.contacto).toBe('')
    }
    const conContacto = validarEntradaMeta({ ...base, contacto: 'c'.repeat(200) })
    expect(conContacto.ok).toBe(true)
    if (conContacto.ok) expect(conContacto.datos.contacto).toHaveLength(MAX_CONTACTO)
  })

  test('red solo facebook o instagram (el cuarto Meta es FB/IG)', () => {
    expect(REDES).toEqual(['facebook', 'instagram'])
    const r = validarEntradaMeta({ ...base, red: 'telegram' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('facebook o instagram')
  })

  test('el texto es obligatorio (lo pega el operador) y con tope', () => {
    const r = validarEntradaMeta({ ...base, texto: '   ' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('pega a mano')
    const r2 = validarEntradaMeta({ ...base, texto: 'x'.repeat(MAX_TEXTO_ENTRADA + 1) })
    expect(r2.ok).toBe(false)
  })

  test('el borrador es de UN personaje concreto: sin personajeId se rechaza', () => {
    const r = validarEntradaMeta({ ...base, personajeId: '' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('genoma universal')
  })

  test('payload basura se rechaza sin crash', () => {
    expect(validarEntradaMeta(null).ok).toBe(false)
    expect(validarEntradaMeta('texto').ok).toBe(false)
  })
})

describe('transicionBorradorMeta (borrador → usar | descartar; historia intacta)', () => {
  test('usar y descartar solo desde borrador', () => {
    expect(transicionBorradorMeta('borrador', 'usar')).toEqual({ ok: true, estado: 'usado' })
    expect(transicionBorradorMeta('borrador', 'descartar')).toEqual({ ok: true, estado: 'descartado' })
  })

  test('lo usado/descartado es HISTORIA: no se re-estructura (evidencia completa)', () => {
    const r = transicionBorradorMeta('usado', 'usar')
    expect(r.ok).toBe(false)
    expect(r.error).toContain('historia')
    expect(transicionBorradorMeta('descartado', 'descartar').ok).toBe(false)
    expect(transicionBorradorMeta('usado', 'descartar').ok).toBe(false)
  })

  test('el rechazo enseña el camino honesto: pegar de nuevo = otro borrador', () => {
    const r = transicionBorradorMeta('usado', 'usar')
    expect(r.error).toContain('evidencia completa')
  })
})

describe('mostrarContacto (la mesa no es una libreta de PII ilimitada)', () => {
  test('sin etiqueta → (sin etiqueta); larga se recorta con elipsis', () => {
    expect(mostrarContacto('   ')).toBe('(sin etiqueta)')
    expect(mostrarContacto('María G.')).toBe('María G.')
    const larga = mostrarContacto('c'.repeat(80))
    expect(larga).toHaveLength(41)
    expect(larga.endsWith('…')).toBe(true)
  })
})

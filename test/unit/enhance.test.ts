// D-015 · A7 — tests del enhancer de prompt CONTABILIZADO.
// Módulo puro: prompts, parser robusto con filtro de edad bidireccional, estilos
// y coste. La contabilidad (cobro/reembolso/job) vive en la ruta y se verifica
// en el smoke E2E, no aquí.
import { describe, it, expect } from 'bun:test'
import {
  ESTILOS_MEJORA,
  esEstiloValido,
  fraseEstilo,
  promptSistemaMejora,
  promptUsuarioMejora,
  parsearMejora,
  costeMejora,
} from '@/lib/enhance'
import { COSTOS } from '@/lib/constants'
import { CATALOGO_ESTUDIO } from '@/lib/herramientas-catalogo'
import { HerramientaDefSchema } from '@/lib/herramientas'

describe('coste del enhancer (A7: contabilizada, nunca gratis ilimitada)', () => {
  it('costeMejora = COSTOS.ENHANCE = 1 cr por mejora', () => {
    expect(COSTOS.ENHANCE).toBe(1)
    expect(costeMejora()).toBe(COSTOS.ENHANCE)
  })
})

describe('estilos de mejora', () => {
  it('4 estilos propios, todos con frase de dirección', () => {
    expect(ESTILOS_MEJORA.length).toBe(4)
    for (const e of ESTILOS_MEJORA) {
      expect(esEstiloValido(e)).toBe(true)
      expect(fraseEstilo(e).length).toBeGreaterThan(10)
    }
    expect(esEstiloValido('nsfw-ultra')).toBe(false)
    expect(esEstiloValido(42)).toBe(false)
  })
})

describe('prompts (puros)', () => {
  it('el sistema exige JSON exclusivo y sujetos adultas; refusa minorías', () => {
    const s = promptSistemaMejora()
    expect(s).toContain('JSON')
    expect(s).toContain('BLOQUEADO')
    expect(s.toLowerCase()).toContain('adultas')
  })
  it('el usuario incluye escena, estilo y genoma opcional', () => {
    const u = promptUsuarioMejora('balcón al atardecer', 'editorial', { aficiones: 'fotografía análoga' })
    expect(u).toContain('balcón al atardecer')
    expect(u).toContain('editorial de moda')
    expect(u).toContain('fotografía análoga')
    const sinCtx = promptUsuarioMejora('playa', 'glam')
    expect(sinCtx).not.toContain('Aficiones')
  })
})

describe('parsearMejora — extracción robusta', () => {
  it('JSON limpio → brief con campos saneados', () => {
    const r = parsearMejora('{"escena":"balcón al atardecer","outfit":"vestido negro","pose":"apoyada en la baranda","luz":"dorado"}')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.brief.escena).toBe('balcón al atardecer')
      expect(r.brief.outfit).toBe('vestido negro')
      expect(r.brief.luz).toBe('dorado')
    }
  })
  it('JSON en code fence y con texto alrededor → extrae el primer objeto balanceado', () => {
    const r = parsearMejora('Claro, aquí tienes:\n```json\n{"escena":"estudio con fondo gris","pose":"sentada"}\n```\n¡Listo!')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.brief.escena).toBe('estudio con fondo gris')
  })
  it('comillas tipográficas del LLM se normalizan', () => {
    // Caso real: el LLM usa “ ” como DELIMITADORES de strings (JSON inválido
    // en seco; normalizado → JSON válido).
    const r = parsearMejora('{“escena”: “café con luz de mañana”, “pose”: “junto a la ventana”}')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.brief.escena).toBe('café con luz de mañana')
      expect(r.brief.pose).toBe('junto a la ventana')
    }
  })
  it('campos vacíos/ausentes quedan undefined; escena obligatoria', () => {
    const r = parsearMejora('{"escena":"terraza de noche"}')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.brief.escena).toBe('terraza de noche')
      expect(r.brief.outfit).toBeUndefined()
    }
    const sinEscena = parsearMejora('{"outfit":"vestido"}')
    expect(sinEscena.ok).toBe(false)
    if (!sinEscena.ok) expect(sinEscena.motivo).toBe('sin_json')
  })
  it('campos largos se recortan al tope (escena 500, resto 200)', () => {
    const larga = 'x'.repeat(700)
    const r = parsearMejora(JSON.stringify({ escena: larga, luz: 'y'.repeat(300) }))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.brief.escena.length).toBe(500)
      expect(r.brief.luz!.length).toBe(200)
    }
  })
  it('FILTRO DE EDAD en la salida: término prohibido → bloqueado con terminos', () => {
    const r = parsearMejora('{"escena":"retrato de una teen sonriendo en la playa"}')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.motivo).toBe('filtro_edad')
      expect(r.terminos?.length).toBeGreaterThan(0)
    }
  })
  it('patrón de edad explícita en la salida también bloquea', () => {
    const r = parsearMejora('{"escena":"chica de 17 años en su cuarto"}')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.motivo).toBe('filtro_edad')
  })
  it('sin JSON ni objeto incompleto → error honesto, nunca excepción', () => {
    for (const malo of ['lo siento, no puedo', '{"escena": "sin cerrar', '']) {
      const r = parsearMejora(malo)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.motivo).toBe('sin_json')
    }
  })
  it('refusa del modelo (escena=BLOQUEADO) → filtro_edad, no sin_json', () => {
    const r = parsearMejora('{"escena":"BLOQUEADO"}')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.motivo).toBe('filtro_edad')
  })
})

describe('la herramienta declarativa (una fila del catálogo, no una pantalla)', () => {
  const def = CATALOGO_ESTUDIO.find((d) => d.clave === 'mejorar_prompt')
  it('existe en el catálogo con contrato válido', () => {
    expect(def).toBeDefined()
    const parsed = HerramientaDefSchema.parse(def)
    expect(parsed.endpoint).toBe('/api/studio/enhance')
    expect(parsed.costeBase).toBe(COSTOS.ENHANCE)
    expect(parsed.salida.tipo).toBe('texto')
    expect(parsed.subgrupo).toBe('BRIEF')
    expect(parsed.chapas).toContain('BETA')
  })
  it('campos: escena requerida, estilo select, personaje opcional', () => {
    const parsed = HerramientaDefSchema.parse(def)
    const escena = parsed.campos.find((c) => c.name === 'escena')!
    expect(escena.required).toBe(true)
    const estilo = parsed.campos.find((c) => c.name === 'estilo')!
    expect(estilo.options?.length).toBe(4)
    const personaje = parsed.campos.find((c) => c.name === 'characterId')!
    expect(personaje.required).toBe(false)
  })
})

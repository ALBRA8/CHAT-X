// Pruebas del motor GFE "Modo Novia" (P1.1) — lógica de chat honesta:
// detección de intención, brief determinista desde genoma, plantillas de
// respuesta declaradas como plantilla (sin LLM fingido).
import { describe, test, expect } from 'bun:test'
import { detectarIntencion, briefDesdeGenoma, respuestaPlantilla, parseGenoma } from '@/lib/chat'
import type { Character } from '@prisma/client'

function personaje(overrides: Partial<Character> = {}): Character {
  return {
    id: 'c_test',
    name: 'Valentina',
    status: 'ACTIVO',
    audience: 'hispanohablantes 25-40',
    style: 'fotorrealista editorial cálida',
    anchorTrait: 'pecas visibles',
    seed: 'seed_valentina_001',
    genome: JSON.stringify({
      atributos: { genero: 'mujer', edadAparente: '27', cabello: 'castaño oscuro' },
      aficiones: 'café de especialidad, senderismo, fotografía analógica',
      lore: 'Bogotana, community manager antes de modelar virtual.',
      tono: 'cercano, pícaro, seguro',
    }),
    signKit: JSON.stringify([{ tipo: 'pecas', ubicacion: 'mejillas y nariz' }]),
    canonicalVariant: null,
    canonicalPath: null,
    loraHash: null,
    voiceContract: '{}',
    datasetCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Character
}

describe('detección de intención del chat GFE', () => {
  test('foto: sinónimos principales', () => {
    for (const t of ['mándame una foto', 'enséñame una selfie', 'quiero una imagen tuya', 'muéstrame pics', 'dame fotos modelando']) {
      expect(detectarIntencion(t)).toBe('foto')
    }
  })

  test('voz: sinónimos principales', () => {
    for (const t of ['mándame una nota de voz', 'háblame', 'quiero escucharte', 'un audio porfa']) {
      expect(detectarIntencion(t)).toBe('voz')
    }
  })

  test('texto por defecto y sin falsos positivos groseros', () => {
    expect(detectarIntencion('hola, ¿cómo estás?')).toBe('texto')
    expect(detectarIntencion('gracias por todo')).toBe('texto')
    // "voz" dentro de otra palabra no debe engañar: 'voz' aparece en 'envozar'… es inclusión simple: documentado
  })

  test('insensible a acentos y mayúsculas', () => {
    expect(detectarIntencion('MANDAME UNA FOTO')).toBe('foto')
    expect(detectarIntencion('mándame una foto')).toBe('foto')
    expect(detectarIntencion('HABLAME')).toBe('voz')
  })
})

describe('brief determinista desde el genoma', () => {
  test('escena sale de aficiones, outfit del style', () => {
    const b = briefDesdeGenoma(personaje())
    expect(b.escena).toContain('café de especialidad')
    expect(b.outfit).toBe('fotorrealista editorial cálida')
    expect(b.encuadre).toBe('plano_medio')
    expect(b.pose).toContain('natural')
  })

  test('genoma vacío → brief mínimo válido (nunca job sin brief)', () => {
    const c = personaje({ genome: '{}' })
    const b = briefDesdeGenoma(c)
    expect(b.escena.length).toBeGreaterThan(3)
    expect(b.outfit.length).toBeGreaterThan(3)
  })
})

describe('plantillas de respuesta (honestas, sin LLM)', () => {
  test('saludo usa nombre y aficiones del genoma', () => {
    const r = respuestaPlantilla(personaje(), 'hola qué tal')
    expect(r).toContain('Valentina')
    expect(r).toContain('café de especialidad')
  })

  test('la pregunta por su naturaleza responde con honestidad IA', () => {
    const r = respuestaPlantilla(personaje(), '¿eres real o eres ia?')
    expect(r.toLowerCase()).toContain('generada por ia')
    expect(r).toContain('etiquetado como IA')
  })

  test('despedida y genérico no vacíos', () => {
    expect(respuestaPlantilla(personaje(), 'adiós').length).toBeGreaterThan(5)
    expect(respuestaPlantilla(personaje(), 'cuéntame de tu día').length).toBeGreaterThan(5)
  })

  test('parseGenoma tolera JSON corrupto', () => {
    const g = parseGenoma(personaje({ genome: 'no-json' }))
    expect(Object.keys(g)).toEqual([])
  })
})

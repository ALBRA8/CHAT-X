// Pruebas del provider LLM (cerebro del chat GFE — P1.1 upgrade a LLM real).
// HERMÉTICAS: ninguna prueba toca la red externa. La sonda con key apunta a un
// puerto descartado local (127.0.0.1:9) para ejercitar el camino de ERROR real
// sin depender de proveedores; el estado honesto se verifica, no se finge.
// Niveles:
//  1) Config por env: base sin barra final, modelo y proveedor por defecto.
//  2) Sonda honesta: sin key → NO_CONFIGURADO (sin red); con key + base caída → ERROR.
//  3) System prompt del companion: única fuente (tarjeta P1.2 y chat usan el mismo).
//  4) Historial: solo texto entregado, recorte a las últimas N turnos, orden estable.
//  5) Salida segura: filtro de edad también en la SALIDA del LLM + tope de caracteres.
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import type { Character } from '@prisma/client'
import {
  sondearLLM,
  baseLLM,
  modeloLLM,
  etiquetaProveedor,
  promptSistemaCompanion,
  historialDesdeMensajes,
  salidaLLMSegura,
  claveLLM,
  type FilaHistorial,
} from '@/lib/provider/llm'
import { ETIQUETA_IA } from '@/lib/constants'

const ENV_BACKUP: Record<string, string | undefined> = {}

function conEnv(vars: Record<string, string | undefined>) {
  beforeEach(() => {
    for (const k of ['LLM_API_KEY', 'LLM_BASE_URL', 'LLM_MODEL', 'LLM_PROVEEDOR']) {
      ENV_BACKUP[k] = process.env[k]
      delete process.env[k]
    }
    for (const [k, v] of Object.entries(vars)) {
      if (v !== undefined) process.env[k] = v
    }
  })
  afterEach(() => {
    for (const k of Object.keys(ENV_BACKUP)) {
      if (ENV_BACKUP[k] === undefined) delete process.env[k]
      else process.env[k] = ENV_BACKUP[k]
    }
  })
}

function personajeFalso(): Character {
  return {
    id: 'char_test',
    createdAt: new Date(),
    updatedAt: new Date(),
    name: 'Valentina',
    status: 'ACTIVO',
    genome: JSON.stringify({
      tono: 'cálida, juguetona',
      lore: 'fotógrafa de montaña',
      aficiones: 'escalada, café de especialidad',
      atributos: { edadAparente: '27 años', cabello: 'castaño', ojos: 'miel' },
    }),
    signKit: JSON.stringify([{ tipo: 'lunar', ubicacion: 'mejilla izquierda' }]),
    seed: 'seed-123',
    anchorTrait: 'lunar en la mejilla',
    style: 'casual chic',
    audience: '18+',
    canonicalVariant: null,
    canonicalPath: null,
    voiceContract: '{}',
  } as unknown as Character
}

describe('configuración LLM por env', () => {
  conEnv({})
  test('base por defecto: Groq OpenAI-compatible, sin barra final', () => {
    expect(baseLLM()).toBe('https://api.groq.com/openai/v1')
    process.env.LLM_BASE_URL = 'https://openrouter.ai/api/v1///'
    expect(baseLLM()).toBe('https://openrouter.ai/api/v1')
  })
  test('modelo y proveedor por defecto honestos', () => {
    expect(modeloLLM()).toBe('llama-3.3-70b-versatile')
    expect(etiquetaProveedor()).toBe('groq')
  })
  test('claveLLM lee el env en cada llamada (inyección como ESPEAK_BIN)', () => {
    expect(claveLLM()).toBe('')
    process.env.LLM_API_KEY = 'gsk_prueba'
    expect(claveLLM()).toBe('gsk_prueba')
  })
})

describe('sonda honesta del LLM', () => {
  conEnv({})
  test('sin key → NO_CONFIGURADO, sin tocar la red', async () => {
    const s = await sondearLLM()
    expect(s.estado).toBe('NO_CONFIGURADO')
    expect(s.detalle).toContain('plantilla_genoma')
  })
  test('con key y base caída (puerto descartado local) → ERROR con detalle, no 200 fingido', async () => {
    process.env.LLM_API_KEY = 'gsk_prueba'
    process.env.LLM_BASE_URL = 'http://127.0.0.1:9'
    const s = await sondearLLM()
    expect(s.estado).toBe('ERROR')
    expect(s.detalle.length).toBeGreaterThan(0)
    expect(s.provedor).toBe('groq')
  })
})

describe('system prompt del companion (única fuente)', () => {
  conEnv({})
  test('incluye nombre, tono, lore, aficiones y la regla de honestidad IA', () => {
    const p = promptSistemaCompanion(personajeFalso())
    expect(p).toContain('Valentina')
    expect(p).toContain('cálida, juguetona')
    expect(p).toContain('fotógrafa de montaña')
    expect(p).toContain('escalada')
    expect(p).toContain(ETIQUETA_IA)
    expect(p).toContain('nunca afirmes ser humana')
    expect(p).toContain('18+')
  })
  test('incluye el signKit y oculta edadAparente de los atributos visuales', () => {
    const p = promptSistemaCompanion(personajeFalso())
    expect(p).toContain('lunar')
    expect(p).toContain('cabello: castaño')
    expect(p).not.toContain('edadAparente')
  })
})

describe('historial para el LLM', () => {
  test('solo texto entregado; descarta media y estados no entregados', () => {
    const filas: FilaHistorial[] = [
      { rol: 'operador', tipo: 'texto', texto: 'hola' },
      { rol: 'personaje', tipo: 'imagen', texto: 'Pieza lista (batch del chat).', estado: 'entregado' },
      { rol: 'personaje', tipo: 'texto', texto: '¡Hola! Soy Valentina.', estado: 'entregado' },
      { rol: 'personaje', tipo: 'texto', texto: 'generando…', estado: 'generando' },
      { rol: 'operador', tipo: 'texto', texto: '   ' },
    ]
    const h = historialDesdeMensajes(filas)
    expect(h).toHaveLength(2)
    expect(h[0]).toEqual({ rol: 'operador', texto: 'hola' })
    expect(h[1].rol).toBe('personaje')
  })
  test('recorta a las últimas N y conserva orden cronológico', () => {
    const filas: FilaHistorial[] = Array.from({ length: 20 }, (_, i) => ({
      rol: i % 2 === 0 ? 'operador' : 'personaje',
      tipo: 'texto',
      texto: `msg-${i}`,
    }))
    const h = historialDesdeMensajes(filas, 12)
    expect(h).toHaveLength(12)
    expect(h[0].texto).toBe('msg-8')
    expect(h[11].texto).toBe('msg-19')
  })
})

describe('salida del LLM bajo el mismo filtro de edad', () => {
  test('texto limpio pasa y se recorta al tope', () => {
    const ok = salidaLLMSegura('  ¡Hola! ¿Qué tal el día?  ', 20)
    expect(ok.ok).toBe(true)
    if (ok.ok) expect(ok.texto).toBe('¡Hola! ¿Qué tal el d')
    const largo = salidaLLMSegura('a'.repeat(900))
    expect(largo.ok).toBe(true)
    if (largo.ok) expect(largo.texto.length).toBe(700)
  })
  test('la salida con término prohibido se rechaza (el modelo no está por encima del filtro)', () => {
    const r = salidaLLMSegura('no puedo hablar de menores de 15 años en este contexto')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.motivo).toBe('filtro_edad')
      expect(r.terminos.length).toBeGreaterThan(0)
    }
  })
})

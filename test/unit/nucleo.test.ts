// Pruebas unitarias del núcleo puro de CHAT-X (bun:test, sin BD ni red).
import { describe, test, expect } from 'bun:test'
import {
  generarSalt,
  hashContrasena,
  verificarContrasena,
  generarClaveMaestra,
  envolverClaveMaestra,
  desenvolverClaveMaestra,
  parseWrapped,
  serializeWrapped,
  cifrarBuffer,
  descifrarBuffer,
} from '@/lib/crypto'
import { detectarTerminosProhibidos, LANE } from '@/lib/constants'
import { componerPrompt } from '@/lib/worker'
import { validarDefinicion } from '@/lib/flujos'
import { hexSha256 } from '@/lib/rng'

describe('crypto — contraseña privada (scrypt)', () => {
  test('hash + verificación correcta', () => {
    const salt = generarSalt()
    const hash = hashContrasena('clave-secreta-123', salt)
    expect(hash).not.toContain('clave')
    expect(verificarContrasena('clave-secreta-123', salt, hash)).toBe(true)
  })

  test('verificación rechaza contraseña incorrecta', () => {
    const salt = generarSalt()
    const hash = hashContrasena('correcta', salt)
    expect(verificarContrasena('incorrecta', salt, hash)).toBe(false)
  })

  test('dos hashes de la misma contraseña difieren (salt aleatorio)', () => {
    const a = hashContrasena('misma', generarSalt())
    const b = hashContrasena('misma', generarSalt())
    expect(a).not.toBe(b)
  })
})

describe('crypto — clave maestra (wrap AES-GCM + scrypt)', () => {
  test('envolver y desenvolver con la contraseña correcta devuelve la clave', () => {
    const clave = generarClaveMaestra()
    const salt = generarSalt()
    const w = envolverClaveMaestra(clave, 'pass-del-operador', salt)
    const d = desenvolverClaveMaestra(w, 'pass-del-operador', salt)
    expect(d).not.toBeNull()
    expect(d!.equals(clave)).toBe(true)
  })

  test('desenvolver con contraseña incorrecta devuelve null (fail-closed)', () => {
    const clave = generarClaveMaestra()
    const salt = generarSalt()
    const w = envolverClaveMaestra(clave, 'buena', salt)
    expect(desenvolverClaveMaestra(w, 'mala', salt)).toBeNull()
  })

  test('serializado parsea redondo', () => {
    const clave = generarClaveMaestra()
    const salt = generarSalt()
    const w = envolverClaveMaestra(clave, 'p', salt)
    const w2 = parseWrapped(serializeWrapped(w))
    expect(w2.iv).toBe(w.iv)
    expect(w2.tag).toBe(w.tag)
  })
})

describe('crypto — cifrado de piezas (AES-256-GCM)', () => {
  test('cifrar y descifrar roundtrip', () => {
    const clave = generarClaveMaestra()
    const contenido = Buffer.from('<svg>contenido privado 18+</svg>', 'utf8')
    const enc = cifrarBuffer(contenido, clave)
    const claro = descifrarBuffer(enc, clave)
    expect(claro).not.toBeNull()
    expect(claro!.toString('utf8')).toBe(contenido.toString('utf8'))
  })

  test('clave equivocada no descifra (null)', () => {
    const enc = cifrarBuffer(Buffer.from('x'), generarClaveMaestra())
    expect(descifrarBuffer(enc, generarClaveMaestra())).toBeNull()
  })
})

describe('compliance — filtro de edad aparente', () => {
  test('detecta términos prohibidos', () => {
    const t = detectarTerminosProhibidos('retrato de colegiala en aula')
    expect(t.length).toBeGreaterThan(0)
  })
  test('texto limpio pasa', () => {
    expect(detectarTerminosProhibidos('retrato editorial golden hour')).toHaveLength(0)
  })
  test('carriles separados por constante', () => {
    expect(LANE.PUBLICO).toBe('PUBLICO')
    expect(LANE.PRIVADO).toBe('PRIVADO')
  })
})

describe('worker — composición de prompt (procedencia)', () => {
  test('ensambla personaje + atributos + brief + carril', () => {
    const p = componerPrompt('Valentina', 'mirada cálida', { pelo: 'castaño', ojos: 'miel' }, { escena: 'terraza', outfit: 'vestido', pose: 'retrato', encuadre: 'plano_medio', luz: 'golden hour' }, 'PUBLICO')
    expect(p).toContain('personaje: Valentina')
    expect(p).toContain('rasgo ancla: mirada cálida')
    expect(p).toContain('pelo: castaño')
    expect(p).toContain('carril: PUBLICO')
  })
  test('filtra atributos vacíos', () => {
    const p = componerPrompt('X', '', { pelo: '' }, { escena: '', outfit: '', pose: '', encuadre: '', luz: '' }, 'PRIVADO')
    expect(p).toContain('carril: PRIVADO')
    expect(p).not.toContain('pelo:')
  })
})

describe('flujos — validación de definición (whitelist)', () => {
  test('acepta definición válida con tipos permitidos', () => {
    const v = validarDefinicion([
      { id: 'a', tipo: 'registrar_evento', nombre: 'x', params: {} },
      { id: 'b', tipo: 'programar_publicacion', nombre: 'y', params: { dias: 2 } },
      { id: 'c', tipo: 'ultra_step', nombre: 'z', params: { campaignId: 'c1' } },
    ])
    expect(v.ok).toBe(true)
  })
  test('rechaza tipo desconocido', () => {
    expect(validarDefinicion([{ id: 'a', tipo: 'rm_rf', nombre: 'x' }]).ok).toBe(false)
  })
  test('rechaza array vacío y más de 20 pasos', () => {
    expect(validarDefinicion([]).ok).toBe(false)
    const muchos = Array.from({ length: 21 }, (_, i) => ({ id: String(i), tipo: 'registrar_evento', nombre: 'x' }))
    expect(validarDefinicion(muchos).ok).toBe(false)
  })
  test('exige id/tipo/nombre strings', () => {
    expect(validarDefinicion([{ id: 1, tipo: 'registrar_evento', nombre: 'x' }]).ok).toBe(false)
  })
})

describe('rng — determinismo de semillas', () => {
  test('hexSha256 es estable para la misma entrada', () => {
    expect(hexSha256('valentina:seed:1')).toBe(hexSha256('valentina:seed:1'))
    expect(hexSha256('a')).not.toBe(hexSha256('b'))
  })
})

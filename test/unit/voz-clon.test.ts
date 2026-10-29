// Pruebas unitarias de la capa de voz — clonación local (capa 3).
// Sin BD ni procesos largos: validaciones puras, tamaños de embedding y
// honestidad de la sonda (en este host, sin paquetes de ML instalados, la
// sonda DEBE declarar NO_CONFIGURADO o ERROR — jamás OPERATIVO falso).
import { describe, test, expect } from 'bun:test'
import {
  consentimientoValido,
  sondaClonLocal,
  tamanoEmbeddingKb,
  validarMuestra,
  MUESTRA_MAX_BYTES,
} from '@/lib/voz'
import { guardarBinarioCifrado, leerBinarioCifrado, borrarBinario } from '@/lib/media'
import { generarClaveMaestra } from '@/lib/crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'

describe('voz — validación de muestras', () => {
  test('acepta wav y mp3 con tipo correcto', () => {
    expect(validarMuestra('muestra.wav', 'audio/wav', 1024).ok).toBe(true)
    expect(validarMuestra('muestra.mp3', 'audio/mpeg', 1024).ok).toBe(true)
  })

  test('acepta por extensión aunque el mime venga genérico', () => {
    expect(validarMuestra('muestra.m4a', 'application/octet-stream', 1024).ok).toBe(true)
    expect(validarMuestra('muestra.opus', '', 1024).ok).toBe(true)
  })

  test('rechaza archivos vacíos', () => {
    const r = validarMuestra('vacio.wav', 'audio/wav', 0)
    expect(r.ok).toBe(false)
    expect(r.motivo).toContain('vacío')
  })

  test('rechaza formatos no soportados', () => {
    const r = validarMuestra('foto.png', 'image/png', 1024)
    expect(r.ok).toBe(false)
    expect(r.motivo).toContain('formato no soportado')
  })

  test('rechaza muestras demasiado grandes', () => {
    const r = validarMuestra('enorme.wav', 'audio/wav', MUESTRA_MAX_BYTES + 1)
    expect(r.ok).toBe(false)
    expect(r.motivo).toContain('demasiado grande')
  })
})

describe('voz — consentimiento (regla dura)', () => {
  test('PROPIO y AUTORIZADO válidos; PENDIENTE y vacío rechazados', () => {
    expect(consentimientoValido('PROPIO')).toBe(true)
    expect(consentimientoValido('AUTORIZADO')).toBe(true)
    expect(consentimientoValido('PENDIENTE')).toBe(false)
    expect(consentimientoValido('')).toBe(false)
    expect(consentimientoValido('propio')).toBe(false) // estricto, sin lower-casing
  })
})

describe('voz — tamaño del embedding (identidad = KB, no MB)', () => {
  test('vector de 256 floats ≈ 1 KB, no MB', () => {
    // 256 floats × 4 bytes = 1024 bytes → base64 ≈ 1368 chars
    const b64 = Buffer.alloc(1024).toString('base64')
    const kb = tamanoEmbeddingKb(b64)
    expect(kb).toBeGreaterThan(0.9)
    expect(kb).toBeLessThan(1.1)
  })

  test('embedding vacío = 0 KB', () => {
    expect(tamanoEmbeddingKb('')).toBe(0)
  })
})

describe('voz — binario cifrado de muestras (AES-256-GCM)', () => {
  test('roundtrip binario cifrado en carpeta temporal', () => {
    const clave = generarClaveMaestra()
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'voz-test-'))
    const base = path.join(dir, 'muestra')
    const original = Buffer.from([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 250, 0, 17])

    const enc = guardarBinarioCifrado(base, original, clave)
    expect(enc.iv).toMatch(/^[0-9a-f]{24}$/)
    expect(fs.existsSync(base + '.enc')).toBe(true)
    expect(fs.existsSync(base + '.enc.iv')).toBe(true)
    expect(fs.existsSync(base + '.enc.tag')).toBe(true)

    const leido = leerBinarioCifrado(base, clave)
    expect(leido).not.toBeNull()
    expect(Buffer.compare(leido!, original)).toBe(0)

    // Con otra clave el descifrado falla (GCM auth)
    const otra = generarClaveMaestra()
    expect(leerBinarioCifrado(base, otra)).toBeNull()

    borrarBinario(base)
    expect(fs.existsSync(base + '.enc')).toBe(false)
    fs.rmSync(dir, { recursive: true, force: true })
  })
})

describe('voz — sonda honesta (sin ML instalado en este host)', () => {
  test('nunca declara OPERATIVO falso; siempre trae detalle humano', async () => {
    const s = await sondaClonLocal()
    expect(['OPERATIVO', 'NO_CONFIGURADO', 'ERROR']).toContain(s.estado)
    expect(s.detalle.length).toBeGreaterThan(0)
    if (s.estado === 'OPERATIVO') {
      // Solo aceptable si de verdad hay extractor y sintetizador
      expect(s.extractor).not.toBeNull()
      expect(s.sintetizadorOk).toBe(true)
    } else {
      expect(s.detalle).toMatch(/falta|no disponible|sin salida|ausente/i)
    }
  }, 30000)
})

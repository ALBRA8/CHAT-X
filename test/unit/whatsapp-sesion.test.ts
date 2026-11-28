// Tests F1 · W2 — sesión WhatsApp PROPIA del negocio (lógica pura).
// Cubre src/lib/whatsapp/sesion.ts: normalización E.164, huella + máscara del
// número, reto QR con caducidad, máquina de estados completa y cifrado en
// reposo del secreto (AES-256-GCM con clave dedicada). Nada toca BD ni red.
import { describe, test, expect } from 'bun:test'
import {
  QR_CADUCIDAD_MS,
  SECRETO_MIN_CHARS,
  cifrarSecretoSesion,
  derivarClaveSesion,
  descifrarSecretoSesion,
  estadoQr,
  huellaNumero,
  mascararNumero,
  nuevoDesafioQr,
  normalizarNumero,
  transicionSesion,
  validarConfirmacion,
} from '@/lib/whatsapp/sesion'

describe('normalizarNumero (E.164 honesto)', () => {
  test('acepta +, espacios, guiones y paréntesis; deja solo dígitos y el +', () => {
    expect(normalizarNumero('+57 (300) 123-4567')).toEqual({ ok: true, e164: '+573001234567' })
    expect(normalizarNumero('  +1 212 555 0100 ')).toEqual({ ok: true, e164: '+12125550100' })
    expect(normalizarNumero('573001234567')).toEqual({ ok: true, e164: '573001234567' })
  })

  test('rechaza basura, cortos y largos (máx 15 de E.164)', () => {
    expect(normalizarNumero('hola').ok).toBe(false)
    expect(normalizarNumero('123').ok).toBe(false)
    expect(normalizarNumero('+1234567890123456').ok).toBe(false)
    expect(normalizarNumero('').ok).toBe(false)
  })
})

describe('huellaNumero y mascararNumero (el número jamás en claro)', () => {
  test('la huella es determinista, distinta por número y no contiene el número', () => {
    const h1 = huellaNumero('+573001234567')
    expect(h1).toBe(huellaNumero('+573001234567'))
    expect(h1).not.toBe(huellaNumero('+573007654321'))
    expect(h1).toHaveLength(32)
    expect(h1).not.toContain('3001234567')
  })

  test('la máscara solo enseña la cola de 4', () => {
    expect(mascararNumero('+573001234567')).toBe('•••••4567')
  })
})

describe('nuevoDesafioQr y estadoQr (caducidad corta)', () => {
  test('vigente dentro de la ventana; caducado después; ausente sin reto', () => {
    const ahora = new Date('2026-11-20T12:00:00.000Z')
    const d = nuevoDesafioQr(ahora)
    expect(d.caducaEn.getTime() - d.creadoEn.getTime()).toBe(QR_CADUCIDAD_MS)
    expect(estadoQr(d, new Date(ahora.getTime() + 30_000))).toBe('vigente')
    expect(estadoQr(d, new Date(ahora.getTime() + QR_CADUCIDAD_MS + 1))).toBe('caducado')
    expect(estadoQr(null, ahora)).toBe('ausente')
  })

  test('cada reto es distinto (sin retos reutilizables)', () => {
    const ahora = new Date('2026-11-20T12:00:00.000Z')
    expect(nuevoDesafioQr(ahora).codigo).not.toBe(nuevoDesafioQr(ahora).codigo)
  })
})

describe('transicionSesion (máquina de estados completa)', () => {
  test('iniciar_espera_qr solo desde NO_CONFIGURADO o DESCONECTADA', () => {
    expect(transicionSesion('NO_CONFIGURADO', 'iniciar_espera_qr')).toEqual({ ok: true, estado: 'ESPERANDO_QR' })
    expect(transicionSesion('DESCONECTADA', 'iniciar_espera_qr')).toEqual({ ok: true, estado: 'ESPERANDO_QR' })
    expect(transicionSesion('ESPERANDO_QR', 'iniciar_espera_qr').ok).toBe(false)
    expect(transicionSesion('CONECTADA', 'iniciar_espera_qr').ok).toBe(false)
  })

  test('confirmar_conexion y rotar exigen sus estados de origen', () => {
    expect(transicionSesion('ESPERANDO_QR', 'confirmar_conexion')).toEqual({ ok: true, estado: 'CONECTADA' })
    expect(transicionSesion('CONECTADA', 'confirmar_conexion').ok).toBe(false)
    expect(transicionSesion('NO_CONFIGURADO', 'confirmar_conexion').ok).toBe(false)
    expect(transicionSesion('CONECTADA', 'rotar')).toEqual({ ok: true, estado: 'ESPERANDO_QR' })
    expect(transicionSesion('DESCONECTADA', 'rotar').ok).toBe(false)
  })

  test('desconectar desde ESPERANDO_QR o CONECTADA; caducar_qr solo desde ESPERANDO_QR', () => {
    expect(transicionSesion('CONECTADA', 'desconectar')).toEqual({ ok: true, estado: 'DESCONECTADA' })
    expect(transicionSesion('ESPERANDO_QR', 'desconectar')).toEqual({ ok: true, estado: 'DESCONECTADA' })
    expect(transicionSesion('NO_CONFIGURADO', 'desconectar').ok).toBe(false)
    expect(transicionSesion('ESPERANDO_QR', 'caducar_qr')).toEqual({ ok: true, estado: 'DESCONECTADA' })
    expect(transicionSesion('CONECTADA', 'caducar_qr').ok).toBe(false)
    expect(transicionSesion('DESCONECTADA', 'caducar_qr').ok).toBe(false)
  })
})

describe('cifrado del secreto de sesión (AES-256-GCM en reposo)', () => {
  const base = derivarClaveSesion(Buffer.alloc(32, 7))
  const otra = derivarClaveSesion(Buffer.alloc(32, 9))

  test('round-trip ida y vuelta con la clave correcta', () => {
    const secreto = 'blob-de-sesion-del-daemon-persistido-en-su-maquina'
    const wrap = cifrarSecretoSesion(secreto, base)
    expect(wrap).not.toContain(secreto)
    expect(descifrarSecretoSesion(wrap, base)).toBe(secreto)
  })

  test('clave equivocada, blob corrupto o ausente → null (jamás un secreto inventado)', () => {
    const secreto = 'otro-blob-de-sesion-para-pruebas-de-honestidad'
    const wrap = cifrarSecretoSesion(secreto, base)
    expect(descifrarSecretoSesion(wrap, otra)).toBeNull()
    const [iv, tag, data] = wrap.split(':')
    const corrompido = `${iv}:${tag}:${data.slice(0, -2)}ff`
    expect(descifrarSecretoSesion(corrompido, base)).toBeNull()
    expect(descifrarSecretoSesion(null, base)).toBeNull()
    expect(descifrarSecretoSesion('garbage', base)).toBeNull()
  })

  test('la clave derivada es de dominio propio y determinista', () => {
    const s = Buffer.alloc(32, 7)
    expect(claveDerivadaEsEstable(s)).toBe(true)
  })
})

// helper del test anterior (misma clave con buffer equivalente, 32 bytes)
function claveDerivadaEsEstable(s: Buffer): boolean {
  const a = derivarClaveSesion(s)
  const b = derivarClaveSesion(Buffer.from(s))
  return a.equals(b) && a.length === 32
}

describe('validarConfirmacion (guarda de confirmar_conexion)', () => {
  test('número válido + secreto de longitud mínima pasan', () => {
    const r = validarConfirmacion('+57 300 123 4567', 'x'.repeat(SECRETO_MIN_CHARS))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.e164).toBe('+573001234567')
  })

  test('rechaza número ausente/basura y secreto corto o excesivo', () => {
    expect(validarConfirmacion('', 'x'.repeat(50)).ok).toBe(false)
    expect(validarConfirmacion('no-soy-numero', 'x'.repeat(50)).ok).toBe(false)
    expect(validarConfirmacion('+573001234567', 'x'.repeat(SECRETO_MIN_CHARS - 1)).ok).toBe(false)
    expect(validarConfirmacion('+573001234567', 'x'.repeat(200_000)).ok).toBe(false)
    expect(validarConfirmacion('+573001234567', undefined).ok).toBe(false)
  })
})

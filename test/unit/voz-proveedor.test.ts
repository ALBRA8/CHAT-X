// Pruebas del provider de voz (P1.3: contrato de voz por personaje + TTS $0 local).
// Niveles:
//  1) Validación de contrato y parseo del guardado en BD (puro, sin I/O).
//  2) Sondeo honesto: ESPEAK_BIN inexistente → NO_DISPONIBLE (nunca 200 fingido).
//  3) Generación REAL con espeak-ng si el binario existe (rápido, $0): WAV RIFF
//     con duración > 0, y persistencia binaria clara/cifrada en media/.
//  4) Duración WAV por header.
import { describe, test, expect, afterAll } from 'bun:test'
import { spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  validarContratoVoz,
  parsearContratoGuardado,
  sondearProveedoresVoz,
  generarVoz,
  duracionWav,
  binarioEspeak,
  velocidadALengthScale,
  localizarModeloPiper,
  type ContratoVoz,
} from '@/lib/provider/voz'
import { guardarBinarioClaro, guardarBinarioCifrado, borrarPieza } from '@/lib/media'
import { descifrarBuffer } from '@/lib/crypto'

const CONTRATO_OK: ContratoVoz = {
  provedor: 'espeak-local',
  voz: 'es',
  velocidad: 170,
  tono: 50,
  actualizado: new Date().toISOString(),
}

describe('validación de contrato de voz', () => {
  test('acepta un contrato correcto y normaliza', () => {
    const v = validarContratoVoz({ provedor: 'espeak-local', voz: ' es-419 ', velocidad: 165.4, tono: 49.6 })
    expect(v.ok).toBe(true)
    if (v.ok) {
      expect(v.contrato.voz).toBe('es-419')
      expect(v.contrato.velocidad).toBe(165)
      expect(v.contrato.tono).toBe(50)
      expect(v.contrato.actualizado).toBeTruthy()
    }
  })

  test('rechaza provedor desconocido (sin invenciones)', () => {
    const v = validarContratoVoz({ provedor: 'voz-cloud-magica' })
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.errores.join(' ')).toContain('provedor')
  })

  test('rechaza velocidad y tono fuera de rango', () => {
    expect(validarContratoVoz({ provedor: 'espeak-local', velocidad: 10 }).ok).toBe(false)
    expect(validarContratoVoz({ provedor: 'espeak-local', tono: 200 }).ok).toBe(false)
    expect(validarContratoVoz({ provedor: 'espeak-local', voz: 'no-valida!!!' }).ok).toBe(false)
  })

  test('por defecto: voz es, velocidad 170, tono 50', () => {
    const v = validarContratoVoz({ provedor: 'piper-local' })
    expect(v.ok).toBe(true)
    if (v.ok) {
      expect(v.contrato.voz).toBe('es')
      expect(v.contrato.velocidad).toBe(170)
      expect(v.contrato.tono).toBe(50)
    }
  })

  test('parsearContratoGuardado: vacío/corrupto/inválido → null', () => {
    expect(parsearContratoGuardado('{}')).toBeNull()
    expect(parsearContratoGuardado('')).toBeNull()
    expect(parsearContratoGuardado(null)).toBeNull()
    expect(parsearContratoGuardado('no-json')).toBeNull()
    expect(parsearContratoGuardado(JSON.stringify({ provedor: 'inventado' }))).toBeNull()
    const ok = parsearContratoGuardado(JSON.stringify(CONTRATO_OK))
    expect(ok?.provedor).toBe('espeak-local')
  })
})

describe('sondeo honesto de proveedores', () => {
  test('siempre reporta los 2 proveedores con estado y detalle', () => {
    const s = sondearProveedoresVoz()
    expect(s.map((x) => x.provedor).sort()).toEqual(['espeak-local', 'piper-local'])
    for (const x of s) expect(['OPERATIVO', 'NO_DISPONIBLE', 'ERROR']).toContain(x.estado)
    expect(s.length).toBe(2)
  })

  test('binario inexistente → NO_DISPONIBLE (estado honesto, no ERROR genérico)', async () => {
    process.env.ESPEAK_BIN = '/no/existe/espeak-falso'
    try {
      const { estadoProveedor } = await import('@/lib/provider/voz')
      const s = estadoProveedor('espeak-local')
      expect(s.estado).toBe('NO_DISPONIBLE')
      const g = await generarVoz('prueba', CONTRATO_OK)
      expect(g.ok).toBe(false)
      if (!g.ok) expect(g.estado).toBe('NO_DISPONIBLE')
    } finally {
      delete process.env.ESPEAK_BIN
    }
  })
})

describe('generación real con espeak-ng (si está instalado — $0 local)', () => {
  const disponible = (() => {
    try {
      return spawnSync(binarioEspeak(), ['--version'], { timeout: 5000 }).status === 0
    } catch {
      return false
    }
  })()

  test_wav(disponible)
})

function test_wav(disponible: boolean) {
  if (!disponible) {
    test('espeak no disponible en esta máquina: la ruta responde honesto (skip de generación real)', () => {
      const s = sondearProveedoresVoz().find((x) => x.provedor === 'espeak-local')!
      expect(s.estado).toBe('NO_DISPONIBLE')
    })
    return
  }

  test('genera WAV real en español: RIFF + duración > 0', async () => {
    const g = await generarVoz('Hola, soy una nota de voz de prueba de CHAT-X.', { ...CONTRATO_OK, voz: 'es' })
    expect(g.ok).toBe(true)
    if (g.ok) {
      expect(g.wav.toString('ascii', 0, 4)).toBe('RIFF')
      expect(g.bytes).toBeGreaterThan(1000)
      expect(g.duracionS).toBeGreaterThan(0.3)
      expect(g.duracionS).toBeLessThan(30)
    }
  })

  test('persistencia binaria: claro .wav y cifrado .enc + IV/tag, y borrado completo', async () => {
    const g = await generarVoz('Prueba de persistencia de voz.', CONTRATO_OK)
    expect(g.ok).toBe(true)
    if (!g.ok) return
    const base = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'chatx-voz-')), 'pieza_test')
    guardarBinarioClaro(base, g.wav)
    expect(fs.readFileSync(base + '.wav').length).toBe(g.bytes)
    const clave = Buffer.alloc(32, 7)
    const enc = guardarBinarioCifrado(base, g.wav, clave)
    expect(enc.iv).toMatch(/^[0-9a-f]{24}$/) // IV GCM de 12 bytes como hex
    // Roundtrip binario EXACTO (el .enc es binario crudo; leerCifrado es solo para SVG/texto)
    const plain = descifrarBuffer(
      { iv: enc.iv, tag: enc.tag, data: fs.readFileSync(base + '.enc') },
      clave,
    )
    expect(plain).not.toBeNull()
    expect(plain!.equals(g.wav)).toBe(true)
    borrarPieza(base)
    expect(fs.existsSync(base + '.wav')).toBe(false)
    expect(fs.existsSync(base + '.enc')).toBe(false)
    expect(fs.existsSync(base + '.enc.iv')).toBe(false)
    expect(fs.existsSync(base + '.enc.tag')).toBe(false)
  })

  test('piper-local: sin paquete instalado responde NO_DISPONIBLE (sin fallback silencioso)', async () => {
    const s = sondearProveedoresVoz().find((x) => x.provedor === 'piper-local')!
    if (s.estado === 'OPERATIVO') return // si el fundador instala piper, este test deja de aplicar
    const g = await generarVoz('prueba piper', { ...CONTRATO_OK, provedor: 'piper-local' })
    expect(g.ok).toBe(false)
    if (!g.ok) expect(g.estado).toBe('NO_DISPONIBLE')
  })
}

describe('duracionWav (header PCM)', () => {
  test('no-WAV → 0', () => {
    expect(duracionWav(Buffer.from('no es un wav'))).toBe(0)
    expect(duracionWav(Buffer.alloc(10))).toBe(0)
  })

  test('WAV real generado por espeak: duración consistente con tamaño', async () => {
    const ok = (() => {
      try {
        return spawnSync(binarioEspeak(), ['--version'], { timeout: 5000 }).status === 0
      } catch {
        return false
      }
    })()
    if (!ok) return
    const g = await generarVoz('Uno dos tres cuatro cinco.', CONTRATO_OK)
    if (!g.ok) return
    // espeak 22050 Hz 16-bit mono → 44100 B/s de audio
    const esperado = (g.bytes - 44) / 44100
    expect(Math.abs(g.duracionS - esperado)).toBeLessThan(0.5)
  })
})

// ───────────────────────── Piper (P1.3 fase 2: síntesis cableada) ─────────────────────────

const CONTRATO_PIPER: ContratoVoz = { ...CONTRATO_OK, provedor: 'piper-local' }

function stubPiper(): string {
  // Stub de síntesis: WAV RIFF válido (1 s de silencio) + JSON del contrato del script real.
  const ruta = path.join(os.tmpdir(), `chatx_piper_stub_${process.pid}.py`)
  fs.writeFileSync(
    ruta,
    [
      'import argparse, json, wave',
      'ap = argparse.ArgumentParser()',
      "ap.add_argument('--texto', required=True)",
      "ap.add_argument('--modelo', required=True)",
      "ap.add_argument('--salida', required=True)",
      "ap.add_argument('--longitud-escala', type=float, default=1.0)",
      'a = ap.parse_args()',
      "assert a.texto, 'texto vacío'",
      "assert a.longitud_escala > 0, 'escala inválida'",
      "with wave.open(a.salida, 'wb') as w:",
      '    w.setnchannels(1); w.setsampwidth(2); w.setframerate(22050)',
      "    w.writeframes(b'\\x00\\x00' * 22050)",
      "print(json.dumps({'ok': True, 'duracion_s': 1.0, 'hz': 22050, 'bytes': 44 + 44100}))",
    ].join('\n'),
  )
  return ruta
}

describe('piper-local — sonda honesta de dos capas (paquete Y modelo)', () => {
  test('sin paquete (PIPER_PY inexistente) → NO_DISPONIBLE con causa exacta', () => {
    process.env.PIPER_PY = '/no/existe/piper-falso'
    try {
      const s = sondearProveedoresVoz().find((x) => x.provedor === 'piper-local')!
      expect(s.estado).toBe('NO_DISPONIBLE')
      expect(s.detalle).toContain('sin paquete piper')
    } finally {
      delete process.env.PIPER_PY
    }
  })

  test('paquete presente pero sin modelo (dir vacío) → NO_DISPONIBLE apuntando al modelo', () => {
    const dirVacio = fs.mkdtempSync(path.join(os.tmpdir(), 'chatx-piper-vacio-'))
    process.env.PIPER_MODELO_DIR = dirVacio
    try {
      const s = sondearProveedoresVoz().find((x) => x.provedor === 'piper-local')!
      expect(s.estado).toBe('NO_DISPONIBLE')
      expect(s.detalle).toContain('sin modelo onnx')
    } finally {
      delete process.env.PIPER_MODELO_DIR
    }
  })
})

describe('piper-local — helpers puros', () => {
  test('velocidadALengthScale: 170wpm≈neutral, extremos acotados', () => {
    expect(velocidadALengthScale(170)).toBeCloseTo(175 / 170, 5)
    expect(velocidadALengthScale(350)).toBeLessThan(velocidadALengthScale(100)) // más rápido = escala menor
    expect(velocidadALengthScale(400)).toBeGreaterThanOrEqual(0.3)
    expect(velocidadALengthScale(80)).toBeLessThanOrEqual(3)
    expect(velocidadALengthScale(0)).toBe(1)
    expect(velocidadALengthScale(NaN)).toBe(1)
  })

  test('localizarModeloPiper: dir inexistente → null; match por prefijo de idioma; sin match → disponible con exacto=false', () => {
    process.env.PIPER_MODELO_DIR = '/no/existe/dir-piper'
    try {
      expect(localizarModeloPiper('es')).toBeNull()
    } finally {
      delete process.env.PIPER_MODELO_DIR
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chatx-piper-loc-'))
    fs.writeFileSync(path.join(dir, 'en_US-amy-medium.onnx'), 'x')
    fs.writeFileSync(path.join(dir, 'es_ES-carlfm-x_low.onnx'), 'x')
    fs.writeFileSync(path.join(dir, 'es_ES-carlfm-x_low.onnx.json'), 'x') // el .json NO cuenta como modelo
    process.env.PIPER_MODELO_DIR = dir
    try {
      const es = localizarModeloPiper('es')
      expect(es?.exacto).toBe(true)
      expect(es?.onnx.endsWith('es_ES-carlfm-x_low.onnx')).toBe(true)
      const de = localizarModeloPiper('de')
      expect(de?.exacto).toBe(false)
      expect(de?.onnx.endsWith('.onnx')).toBe(true)
    } finally {
      delete process.env.PIPER_MODELO_DIR
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('piper-local — síntesis hermética con script stub', () => {
  test('generarVoz con stub: WAV RIFF + nota honesta de tono fijo', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chatx-piper-stub-'))
    fs.writeFileSync(path.join(dir, 'es_ES-carlfm-x_low.onnx'), 'x')
    process.env.PIPER_MODELO_DIR = dir
    process.env.PIPER_SCRIPT = stubPiper()
    try {
      const g = await generarVoz('Prueba hermética de piper.', { ...CONTRATO_PIPER, velocidad: 190, tono: 42 })
      expect(g.ok).toBe(true)
      if (g.ok) {
        expect(g.provedor).toBe('piper-local')
        expect(g.wav.toString('ascii', 0, 4)).toBe('RIFF')
        expect(g.duracionS).toBeGreaterThan(0.9)
        expect(g.nota).toContain('tono fijo')
        expect(g.nota).toContain('tono=42 ignorado')
      }
    } finally {
      delete process.env.PIPER_MODELO_DIR
      delete process.env.PIPER_SCRIPT
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  test('generarVoz sin modelo → NO_DISPONIBLE (sin fallback silencioso a espeak)', async () => {
    const dirVacio = fs.mkdtempSync(path.join(os.tmpdir(), 'chatx-piper-nomodel-'))
    process.env.PIPER_MODELO_DIR = dirVacio
    try {
      const g = await generarVoz('prueba', CONTRATO_PIPER)
      expect(g.ok).toBe(false)
      if (!g.ok) {
        expect(g.estado).toBe('NO_DISPONIBLE')
        expect(g.detalle).toContain('sin modelo onnx')
      }
    } finally {
      delete process.env.PIPER_MODELO_DIR
      fs.rmSync(dirVacio, { recursive: true, force: true })
    }
  })

  test('script que falla → ERROR con el bloqueo del JSON, no silenciado', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chatx-piper-fail-'))
    fs.writeFileSync(path.join(dir, 'es_ES-carlfm-x_low.onnx'), 'x')
    const script = path.join(os.tmpdir(), `chatx_piper_fail_${process.pid}.py`)
    fs.writeFileSync(script, [
      'import json, sys',
      "print(json.dumps({'ok': False, 'bloqueo': 'onnxruntime no disponible en el stub'}))",
      'sys.exit(1)',
    ].join('\n'))
    process.env.PIPER_MODELO_DIR = dir
    process.env.PIPER_SCRIPT = script
    try {
      const g = await generarVoz('prueba', CONTRATO_PIPER)
      expect(g.ok).toBe(false)
      if (!g.ok) {
        expect(g.estado).toBe('ERROR')
        expect(g.detalle).toContain('onnxruntime no disponible')
      }
    } finally {
      delete process.env.PIPER_MODELO_DIR
      delete process.env.PIPER_SCRIPT
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('piper-local — síntesis REAL (si paquete+modelo están instalados en esta máquina)', () => {
  const anterior = { py: process.env.PIPER_PY, script: process.env.PIPER_SCRIPT, dir: process.env.PIPER_MODELO_DIR }
  delete process.env.PIPER_PY
  delete process.env.PIPER_SCRIPT
  delete process.env.PIPER_MODELO_DIR
  const disponible = sondearProveedoresVoz().find((x) => x.provedor === 'piper-local')!.estado === 'OPERATIVO'

  test(disponible ? 'genera voz natural real (es_ES): RIFF + duración + nota' : 'piper no instalado aquí: sonda honesta (skip de síntesis real)', async () => {
    if (!disponible) return
    const g = await generarVoz('Hola, soy Valentina. Qué rico que me escribas.', { ...CONTRATO_PIPER, voz: 'es', velocidad: 175 })
    expect(g.ok).toBe(true)
    if (g.ok) {
      expect(g.wav.toString('ascii', 0, 4)).toBe('RIFF')
      expect(g.duracionS).toBeGreaterThan(0.5)
      expect(g.bytes).toBeGreaterThan(10000)
      expect(g.nota).toBeTruthy()
    }
  })

  afterAll(() => {
    if (anterior.py !== undefined) process.env.PIPER_PY = anterior.py
    if (anterior.script !== undefined) process.env.PIPER_SCRIPT = anterior.script
    if (anterior.dir !== undefined) process.env.PIPER_MODELO_DIR = anterior.dir
  })
})

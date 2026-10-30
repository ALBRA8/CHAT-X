// Pruebas del QA forense de medios + taxonomía honesta de errores (paridad
// de gobernanza destilada de YouTube-Automation: test_qa_forensics y la
// taxonomía v1.1 "watchdog local ≠ fallo del proveedor"). Todo hermético:
// activos enfermos FABRICADOS en memoria, sin red, sin BD, sin proveedores.
import { describe, test, expect } from 'bun:test'
import {
  duracionWavAproximada,
  esSilenciosoWav,
  qaForense,
  taxonomiaError,
  tipoPorMagicBytes,
} from '@/lib/qa-forense'

// ── utilidades de fabricación de activos (enfermos y sanos) ──

function pngSano(): Buffer {
  // PNG mínimo real: firma + IHDR + IEND (la firma basta para el dictamen forense)
  const firma = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.from('0000000DIHDR0000000100000001', 'hex')
  const iend = Buffer.from('00000000IEND', 'ascii')
  const crc = Buffer.from('AE426082', 'hex') // CRC del IHDR 1x1 canónico
  return Buffer.concat([firma, ihdr, crc, iend])
}

function wavConMuestras(amplitudPico: number, ms = 500): Buffer {
  const sampleRate = 8000
  const n = Math.floor((sampleRate * ms) / 1000)
  const header = Buffer.alloc(44)
  header.write('RIFF', 0, 'ascii')
  header.writeUInt32LE(36 + n * 2, 4)
  header.write('WAVE', 8, 'ascii')
  header.write('fmt ', 12, 'ascii')
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20) // PCM
  header.writeUInt16LE(1, 22) // mono
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * 2, 28) // byteRate
  header.writeUInt16LE(2, 32) // blockAlign
  header.writeUInt16LE(16, 34) // bits
  header.write('data', 36, 'ascii')
  header.writeUInt32LE(n * 2, 40)
  const datos = Buffer.alloc(n * 2)
  for (let i = 0; i < n; i++) datos.writeInt16LE(amplitudPico, i * 2)
  return Buffer.concat([header, datos])
}

// ── detección de tipo por firma real ──

describe('tipoPorMagicBytes — identidad real de los bytes', () => {
  test('PNG real se detecta por firma', () => {
    expect(tipoPorMagicBytes(pngSano())).toBe('png')
  })
  test('JPEG real (FFD8FF) se detecta', () => {
    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64), Buffer.from([0xff, 0xd9])])
    expect(tipoPorMagicBytes(jpeg)).toBe('jpeg')
  })
  test('MP4 real (caja ftyp) se detecta', () => {
    const mp4 = Buffer.concat([Buffer.alloc(4), Buffer.from('ftypisom', 'ascii'), Buffer.alloc(32)])
    expect(tipoPorMagicBytes(mp4)).toBe('mp4')
  })
  test('HTML disfrazado se delata', () => {
    expect(tipoPorMagicBytes(Buffer.from('<!DOCTYPE html><html><body>Error 502</body></html>'))).toBe('html')
  })
  test('texto plano se delata', () => {
    expect(tipoPorMagicBytes(Buffer.from('gateway error: upstream unavailable'))).toBe('texto')
  })
})

// ── la lección central: medios disfrazados ──

describe('qaForense — HTML/texto disfrazado de medio (lección del referente)', () => {
  test('página HTML donde debía ir un PNG → RECHAZADO con razón explícita', () => {
    const d = qaForense(Buffer.from('<!DOCTYPE html><html><body>ups</body></html>'), 'png')
    expect(d.veredicto).toBe('RECHAZADO')
    expect(d.tipo).toBe('html')
    expect(d.razones.join(' ')).toMatch(/disfrazado de png/i)
  })

  test('texto de error donde debía ir un WAV → RECHAZADO', () => {
    const d = qaForense(Buffer.from('{"error":"quota exceeded"}'), 'wav')
    expect(d.veredicto).toBe('RECHAZADO')
    expect(d.razones.join(' ')).toMatch(/disfrazado de wav/i)
  })

  test('buffer vacío → RECHAZADO honesto', () => {
    const d = qaForense(Buffer.alloc(0), 'png')
    expect(d.veredicto).toBe('RECHAZADO')
    expect(d.razones[0]).toMatch(/vacío/)
  })

  test('tipo real ≠ esperado → RECHAZADO sin disimular', () => {
    const d = qaForense(wavConMuestras(1000), 'png')
    expect(d.veredicto).toBe('RECHAZADO')
    expect(d.razones.join(' ')).toMatch(/wav ≠ esperado png/)
  })
})

// ── integridad estructural y avisos honestos ──

describe('qaForense — estructura, truncados y avisos', () => {
  test('PNG sano → APROBADO sin avisos', () => {
    const d = qaForense(pngSano(), 'png')
    expect(d.veredicto).toBe('APROBADO')
    expect(d.razones).toEqual([])
    expect(d.avisos).toEqual([])
  })

  test('PNG truncado (sin IEND) → RECHAZADO', () => {
    const roto = pngSano().subarray(0, pngSano().length - 8)
    const d = qaForense(roto, 'png')
    expect(d.veredicto).toBe('RECHAZADO')
    expect(d.razones.join(' ')).toMatch(/truncado.*IEND/i)
  })

  test('JPEG truncado (sin FFD9) → RECHAZADO', () => {
    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64), Buffer.from([0xff, 0xd9])])
    const d = qaForense(jpeg.subarray(0, jpeg.length - 2), 'jpeg')
    expect(d.veredicto).toBe('RECHAZADO')
    expect(d.razones.join(' ')).toMatch(/truncado.*FFD9/i)
  })

  test('WAV sano con voz → APROBADO', () => {
    const d = qaForense(wavConMuestras(3000), 'wav')
    expect(d.veredicto).toBe('APROBADO')
    expect(d.avisos).toEqual([])
  })

  test('WAV silencioso → APROBADO pero con AVISO honesto (no bloquea aquí; decide la capa)', () => {
    const d = qaForense(wavConMuestras(0), 'wav')
    expect(d.veredicto).toBe('APROBADO')
    expect(d.avisos.some((a) => a.toLowerCase().includes('silencioso'))).toBe(true)
  })

  test('WAV demasiado corto (<0.3s) → aviso de duración', () => {
    const d = qaForense(wavConMuestras(2000, 100), 'wav')
    expect(d.avisos.some((a) => a.includes('0.1s') || a.includes('<0.3s'))).toBe(true)
  })

  test('esSilenciosoWav distingue silencio real de audio bajo', () => {
    expect(esSilenciosoWav(wavConMuestras(0))).toBe(true)
    expect(esSilenciosoWav(wavConMuestras(35))).toBe(true) // por debajo del umbral ≈ -58 dBFS
    expect(esSilenciosoWav(wavConMuestras(300))).toBe(false)
  })

  test('duracionWavAproximada calcula honesto o 0', () => {
    expect(duracionWavAproximada(wavConMuestras(1000, 500))).toBeCloseTo(0.5, 1)
    expect(duracionWavAproximada(Buffer.from('no es un wav'))).toBe(0)
  })
})

// ── taxonomía honesta de errores ──

describe('taxonomiaError — watchdog local ≠ fallo del proveedor', () => {
  test('timeout/abort LOCAL se clasifica como LOCAL_TIMEOUT (jamás como proveedor)', () => {
    const t = taxonomiaError('This operation was aborted')
    expect(t.clase).toBe('LOCAL_TIMEOUT')
    expect(t.terminal).toBe(false)
    expect(t.nota).toMatch(/NO se reporta como fallo del proveedor/i)
    expect(taxonomiaError('timeout de 8s').clase).toBe('LOCAL_TIMEOUT')
  })

  test('fallo de proveedor real se clasifica como PROVEEDOR', () => {
    expect(taxonomiaError('piper falló: código 1').clase).toBe('PROVEEDOR')
    expect(taxonomiaError('HTTP 502 del motor').clase).toBe('PROVEEDOR')
    expect(taxonomiaError('espeak-ng produjo un medio rechazado por QA forense').clase).toBe('PROVEEDOR')
  })

  test('fallo de VALIDACION es TERMINAL (reintentar no cambia nada)', () => {
    const t = taxonomiaError('img2img: la referencia no está aprobada por QA')
    expect(t.clase).toBe('VALIDACION')
    expect(t.terminal).toBe(true)
    expect(taxonomiaError('La fuente contiene términos prohibidos por el filtro de edad').terminal).toBe(true)
  })

  test('desconocido → transitorio por defecto (reintentable con tope)', () => {
    const t = taxonomiaError('algo raro pasó')
    expect(t.clase).toBe('DESCONOCIDO')
    expect(t.terminal).toBe(false)
  })

  test('orden constitucional: validación gana sobre timeout cuando ambos aparecen', () => {
    // un rechazo de validación con palabra "timeout" incidental sigue siendo VALIDACION
    const t = taxonomiaError('filtro de edad: contenido prohibido tras timeout del proveedor')
    expect(t.clase).toBe('VALIDACION')
    expect(t.terminal).toBe(true)
  })
})

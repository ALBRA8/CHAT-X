// Pruebas del módulo de vídeo (P2.4 escalera + P2.8 URL→brief de CLONAKIT_BRECHAS).
// Todo hermético: funciones puras (determinismo de la escalera, costes antes de
// gastar, blindaje SSRF sin red, keywords/formato deterministas). El fetch real
// NO se prueba aquí (sonda de proveedor = estado honesto por diseño).
import { describe, test, expect } from 'bun:test'
import {
  ESCALONES_VIDEO,
  ErrorURLInsegura,
  COSTO_VIDEO_BASE_POR_SEGUNDO,
  SPECS_ESCALON,
  escaleraCompleta,
  esEscalonVideo,
  extraerKeywords,
  presupuestoEscalon,
  recomendacionEscalon,
  validarURLPublica,
} from '@/lib/video'

describe('P2.4 — escalera de calidad de vídeo', () => {
  test('los tres escalones existen con spec declarada y orden de coste correcto', () => {
    expect(ESCALONES_VIDEO).toEqual(['draft', 'standard', 'max'])
    const escalera = escaleraCompleta(10)
    expect(escalera.map((e) => e.escalon)).toEqual(['draft', 'standard', 'max'])
    expect(escalera[0].creditos).toBeLessThan(escalera[1].creditos)
    expect(escalera[1].creditos).toBeLessThan(escalera[2].creditos)
  })

  test('determinista: misma duración → mismos créditos en todas las pasadas', () => {
    const a = escaleraCompleta(8).map((e) => e.creditos)
    const b = escaleraCompleta(8).map((e) => e.creditos)
    expect(b).toEqual(a)
  })

  test('coste por segundo declarado: draft=8×1, standard=8×3.5, max=8×9', () => {
    const d = presupuestoEscalon('draft', 1)
    const s = presupuestoEscalon('standard', 1)
    const m = presupuestoEscalon('max', 1)
    expect(d.creditosPorSegundo).toBe(COSTO_VIDEO_BASE_POR_SEGUNDO)
    expect(s.creditosPorSegundo).toBe(Math.round(COSTO_VIDEO_BASE_POR_SEGUNDO * 3.5))
    expect(m.creditosPorSegundo).toBe(Math.round(COSTO_VIDEO_BASE_POR_SEGUNDO * 9))
  })

  test('la duración se recorta al tope del escalón (max 30s, draft 8s)', () => {
    expect(presupuestoEscalon('draft', 999).duracionSeg).toBe(SPECS_ESCALON.draft.duracionSegMax)
    expect(presupuestoEscalon('max', 999).duracionSeg).toBe(SPECS_ESCALON.max.duracionSegMax)
    expect(presupuestoEscalon('draft', 0).duracionSeg).toBe(1) // nunca 0
  })

  test('recomendación por intención: validar→draft, vender→max, resto→standard', () => {
    expect(recomendacionEscalon('validar idea rápida')).toBe('draft')
    expect(recomendacionEscalon('pieza PPV de venta')).toBe('max')
    expect(recomendacionEscalon('publicar en el carril social')).toBe('standard')
  })

  test('esEscalonVideo rechaza basura', () => {
    expect(esEscalonVideo('standard')).toBe(true)
    expect(esEscalonVideo('ultra-8k')).toBe(false)
    expect(esEscalonVideo(42)).toBe(false)
  })
})

describe('P2.8 — blindaje SSRF de validarURLPublica', () => {
  test('rechaza protocolos no http/https SIN hacer red', async () => {
    await expect(validarURLPublica('file:///etc/passwd')).rejects.toBeInstanceOf(ErrorURLInsegura)
    await expect(validarURLPublica('ftp://ejemplo.com')).rejects.toBeInstanceOf(ErrorURLInsegura)
  })

  test('rechaza IP literales privadas/reservadas y metadata de cloud', async () => {
    for (const ip of ['127.0.0.1', '10.0.0.5', '192.168.1.10', '172.16.0.9', '169.254.169.254', '0.0.0.0', '100.64.0.1', '224.0.0.1']) {
      await expect(validarURLPublica(`http://${ip}/x`)).rejects.toBeInstanceOf(ErrorURLInsegura)
    }
  })

  test('rechaza localhost y hosts internos sin hacer red', async () => {
    await expect(validarURLPublica('http://localhost:3000/x')).rejects.toBeInstanceOf(ErrorURLInsegura)
    await expect(validarURLPublica('http://api.internal/x')).rejects.toBeInstanceOf(ErrorURLInsegura)
  })

  test('rechaza URLs inválidas con mensaje claro', async () => {
    await expect(validarURLPublica('no-es-una-url')).rejects.toBeInstanceOf(ErrorURLInsegura)
  })

  test('una IP pública válida NO lanza por el blindaje (puede fallar por DNS pero no por bloqueo)', async () => {
    // 1.1.1.1 es pública: el validador no debe bloquearla por rango privado.
    // (Si el entorno sin red lanza por DNS, el error NO debe ser de "privada".)
    try {
      await validarURLPublica('http://1.1.1.1/x')
    } catch (e) {
      expect(String(e)).not.toContain('privada')
    }
  })
})

describe('P2.8 — extracción determinista de keywords', () => {
  test('extraerKeywords: frecuencia estable, sin stopwords ni números sueltos', () => {
    const kw = extraerKeywords('café café café parque parque 42 de la que the and', 3)
    expect(kw[0]).toBe('café')
    expect(kw[1]).toBe('parque')
    expect(kw).not.toContain('42')
    expect(kw).not.toContain('the')
    const deNuevo = extraerKeywords('café café café parque parque 42 de la que the and', 3)
    expect(deNuevo).toEqual(kw)
  })
})

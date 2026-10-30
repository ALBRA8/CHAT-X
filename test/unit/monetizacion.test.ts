// Pruebas del motor de monetización (P3 #9/#10/#12 de CLONAKIT_BRECHAS).
// Todo hermético: funciones puras — rollover con tope, packs eternos, split
// trazable, white-label. La honestidad del MODO_INTERNO es verificable: nada
// aquí cobra dinero real.
import { describe, test, expect } from 'bun:test'
import {
  MODO_LEDGER,
  MODO_MONETIZACION,
  PLANTILLAS_PACK,
  PLANTILLAS_PLAN,
  creditosTrasRenovacion,
  packPorId,
  precioPackMedido,
  splitMarketplace,
} from '@/lib/monetizacion'

describe('P3 #9 — suscripción con rollover (aritmética Apatero)', () => {
  test('los tres planes existen y el rollover crece con el plan', () => {
    expect(PLANTILLAS_PLAN.map((p) => p.id)).toEqual(['base', 'pro', 'estudio'])
    expect(PLANTILLAS_PLAN[0].rolloverPct).toBeLessThan(PLANTILLAS_PLAN[1].rolloverPct)
    expect(PLANTILLAS_PLAN[1].rolloverPct).toBeLessThan(PLANTILLAS_PLAN[2].rolloverPct)
  })

  test('Base sin rollover: los créditos sin usar se pierden al renovar', () => {
    const base = PLANTILLAS_PLAN[0]
    const r = creditosTrasRenovacion(400, base)
    expect(r.heredados).toBe(0)
    expect(r.creditos).toBe(base.creditosMes)
  })

  test('Pro: 25% de lo no usado, con tope absoluto de 500', () => {
    const pro = PLANTILLAS_PLAN[1]
    const r1 = creditosTrasRenovacion(400, pro) // 25% de 400 = 100
    expect(r1.heredados).toBe(100)
    expect(r1.creditos).toBe(pro.creditosMes + 100)
    const r2 = creditosTrasRenovacion(9000, pro) // 25% de 9000 = 2250 → tope 500
    expect(r2.heredados).toBe(500)
  })

  test('determinista y con saldo 0/negativo saneado', () => {
    const pro = PLANTILLAS_PLAN[1]
    expect(creditosTrasRenovacion(400, pro)).toEqual(creditosTrasRenovacion(400, pro))
    expect(creditosTrasRenovacion(-50, pro).heredados).toBe(0)
  })

  test('el detalle explica la política en lenguaje claro', () => {
    const r = creditosTrasRenovacion(400, PLANTILLAS_PLAN[2])
    expect(r.detalle).toContain('Estudio')
  })
})

describe('P3 #9 — packs eternos', () => {
  test('plantillas con descuento creciente y precio coherente', () => {
    expect(PLANTILLAS_PACK.map((p) => p.id)).toEqual(['pack100', 'pack500', 'pack1000'])
    expect(PLANTILLAS_PACK[0].descuentoPct).toBe(0)
    expect(PLANTILLAS_PACK[1].descuentoPct).toBe(10)
    expect(PLANTILLAS_PACK[2].descuentoPct).toBe(20)
    // a más créditos, precio por crédito igual o menor (el descuento nunca encarece)
    const porCredito = PLANTILLAS_PACK.map((p) => p.precioCents / p.creditos)
    expect(porCredito[1]).toBeLessThanOrEqual(porCredito[0])
    expect(porCredito[2]).toBeLessThanOrEqual(porCredito[1])
  })

  test('pack a medida: mínimo 50 créditos, descuento por escalón, determinista', () => {
    expect(precioPackMedido(10).creditos).toBe(50)
    expect(precioPackMedido(500).descuentoPct).toBe(10)
    expect(precioPackMedido(2000).descuentoPct).toBe(20)
    expect(precioPackMedido(600)).toEqual(precioPackMedido(600))
  })

  test('packPorId no inventa packs', () => {
    expect(packPorId('pack100')?.creditos).toBe(100)
    expect(packPorId('pack-inexistente')).toBeUndefined()
  })
})

describe('P3 #10 — split de marketplace trazable', () => {
  test('90/10 por defecto con redondeo que nunca pierde centavos', () => {
    const s = splitMarketplace(1000)
    expect(s.pctCreador).toBe(90)
    expect(s.creadorCents).toBe(900)
    expect(s.plataformaCents).toBe(100)
    expect(s.creadorCents + s.plataformaCents).toBe(s.brutoCents)
    const impar = splitMarketplace(999)
    expect(impar.creadorCents + impar.plataformaCents).toBe(999) // floor del creador → resto a plataforma
  })

  test('pct configurable con trazabilidad (pendiente de validar Kinku)', () => {
    const s = splitMarketplace(1000, 70)
    expect(s.pctCreador).toBe(70)
    expect(s.creadorCents).toBe(700)
  })

  test('entradas saneadas: bruto negativo → 0; pct fuera de rango → recortado', () => {
    expect(splitMarketplace(-5).brutoCents).toBe(0)
    expect(splitMarketplace(100, 150).pctCreador).toBe(100)
    expect(splitMarketplace(100, -3).pctCreador).toBe(0)
  })
})

describe('Honestidad del modo interno', () => {
  test('el modo declarado es INTERNO y el ledger nace en simulacion', () => {
    expect(MODO_MONETIZACION).toBe('INTERNO')
    expect(MODO_LEDGER).toBe('simulacion')
  })
})

// Pruebas del planificador InstaDump nativo (P2.5) y Outfit Swap (P2.6).
// Todo hermético: solo funciones puras — determinismo, variedad, seguridad del
// plan (pools vacíos de términos prohibidos por construcción) y clamps.
import { describe, test, expect } from 'bun:test'
import { planificarInstaDump, planificarOutfitSwap, PAQUETES_INSTADUMP } from '@/lib/instadump'
import { LOTE_MAX, detectarTerminosProhibidos } from '@/lib/constants'
import type { Brief } from '@/lib/provider/types'

const finDelBrief = (b: Brief): string => `${b.escena} ${b.outfit} ${b.pose} ${b.luz}`

describe('planificarInstaDump — P2.5', () => {
  test('determinista: mismos inputs → mismo plan completo', () => {
    const a = planificarInstaDump({ seedPersonaje: 'val-seed-1', paquete: 'mixto', count: 8 })
    const b = planificarInstaDump({ seedPersonaje: 'val-seed-1', paquete: 'mixto', count: 8 })
    expect(b).toEqual(a)
  })

  test('planes distintos entre personajes (semilla distinta → briefs distintos)', () => {
    const a = planificarInstaDump({ seedPersonaje: 'seed-A', paquete: 'mixto', count: 8 })
    const b = planificarInstaDump({ seedPersonaje: 'seed-B', paquete: 'mixto', count: 8 })
    expect(JSON.stringify(a.items)).not.toBe(JSON.stringify(b.items))
  })

  test('entrega exactamente count piezas y cada combo (escena|outfit|pose) es ÚNICO', () => {
    const plan = planificarInstaDump({ seedPersonaje: 's', paquete: 'mixto', count: 12 })
    expect(plan.items.length).toBe(12)
    const claves = plan.items.map((i) => `${i.brief.escena}|${i.brief.outfit}|${i.brief.pose}`)
    expect(new Set(claves).size).toBe(claves.length)
  })

  test('clamps: 0 → 1, 999 → LOTE_MAX, decimales → floor', () => {
    expect(planificarInstaDump({ seedPersonaje: 's', count: 0 }).items.length).toBe(1)
    expect(planificarInstaDump({ seedPersonaje: 's', count: 999 }).items.length).toBe(LOTE_MAX)
    expect(planificarInstaDump({ seedPersonaje: 's', count: 7.9 }).items.length).toBe(7)
  })

  test('paquete inválido cae a mixto (honesto, sin error 500)', () => {
    const plan = planificarInstaDump({ seedPersonaje: 's', paquete: 'paquete-inventado', count: 4 })
    expect(plan.paquete).toBe('mixto')
    expect((PAQUETES_INSTADUMP as readonly string[]).includes(plan.paquete)).toBe(true)
  })

  test('el plan es SEGURO por construcción: 0 términos prohibidos en cualquier paquete', () => {
    for (const paquete of PAQUETES_INSTADUMP) {
      const plan = planificarInstaDump({ seedPersonaje: 'seguridad', paquete, count: LOTE_MAX })
      for (const it of plan.items) {
        expect(detectarTerminosProhibidos(finDelBrief(it.brief))).toEqual([])
      }
    }
  })

  test('genoma-consciente: las aficiones entran como escenas propias', () => {
    const plan = planificarInstaDump({
      seedPersonaje: 'valentina',
      paquete: 'casual',
      count: 8,
      aficiones: ['fotografía analógica', 'el café de especialidad'],
    })
    const escenas = plan.items.map((i) => i.brief.escena).join(' | ')
    expect(escenas).toContain('momento fotografía analógica')
    expect(escenas).toContain('momento el café de especialidad')
  })

  test('ancla ("1 foto" de referencia): escena/outfit/luz del ancla se respetan en TODAS las piezas', () => {
    const plan = planificarInstaDump({
      seedPersonaje: 's',
      paquete: 'mixto',
      count: 6,
      ancla: { escena: 'mi terraza de La Candelaria', outfit: 'abrigo azul favorito' },
    })
    expect(plan.anclaAplicada).toBe(true)
    for (const it of plan.items) {
      expect(it.brief.escena).toBe('mi terraza de La Candelaria')
      expect(it.brief.outfit).toBe('abrigo azul favorito')
    }
  })

  test('sin ancla → anclaAplicada=false y briefs con escena distinta entre sí', () => {
    const plan = planificarInstaDump({ seedPersonaje: 's', paquete: 'glam', count: 6 })
    expect(plan.anclaAplicada).toBe(false)
    expect(new Set(plan.items.map((i) => i.brief.escena)).size).toBeGreaterThan(1)
  })

  test('blindaje: ancla con término prohibido → briefs sustituidos por el pool (nunca sale inseguro)', () => {
    const plan = planificarInstaDump({
      seedPersonaje: 's',
      paquete: 'mixto',
      count: 4,
      ancla: { escena: 'retrato infantil en el parque' },
    })
    for (const it of plan.items) {
      expect(detectarTerminosProhibidos(finDelBrief(it.brief))).toEqual([])
      expect(it.brief.escena).not.toContain('infantil')
    }
  })

  test('sceneName es descriptivo y sin caracteres raros', () => {
    const plan = planificarInstaDump({ seedPersonaje: 's', paquete: 'casual', count: 4 })
    for (const it of plan.items) {
      expect(it.sceneName).toMatch(/^dump_[a-z0-9_]+_[a-z0-9_]+$/)
    }
  })
})

describe('planificarOutfitSwap — P2.6', () => {
  test('outfit nuevo FIJO en todas las piezas; escena/encuadre/luz ancla intactos', () => {
    const plan = planificarOutfitSwap({
      outfit: 'chaqueta de cuero negra',
      count: 5,
      escena: 'café de barrio',
      encuadre: 'plano_medio',
      luz: 'luz de ventana',
    })
    expect(plan.outfit).toBe('chaqueta de cuero negra')
    expect(plan.items.length).toBe(5)
    for (const it of plan.items) {
      expect(it.brief.outfit).toBe('chaqueta de cuero negra')
      expect(it.brief.escena).toBe('café de barrio')
      expect(it.brief.encuadre).toBe('plano_medio')
      expect(it.brief.luz).toBe('luz de ventana')
    }
  })

  test('entrega exactamente count piezas incluso si count > poses del pool (ciclo + variantes)', () => {
    const plan = planificarOutfitSwap({ outfit: 'vestido rojo', count: 20 })
    expect(plan.items.length).toBe(20)
  })

  test('determinista y seguro por construcción', () => {
    const a = planificarOutfitSwap({ outfit: 'top de lino', count: 6, varianteBase: 3 })
    const b = planificarOutfitSwap({ outfit: 'top de lino', count: 6, varianteBase: 3 })
    expect(b).toEqual(a)
    for (const it of a.items) expect(detectarTerminosProhibidos(finDelBrief(it.brief))).toEqual([])
  })

  test('rechaza outfit vacío/solo espacios (error explícito, nunca plan vacío)', () => {
    expect(() => planificarOutfitSwap({ outfit: '   ', count: 4 })).toThrow(/outfit nuevo/i)
    expect(() => planificarOutfitSwap({ outfit: '', count: 4 })).toThrow(/outfit nuevo/i)
  })

  test('rechaza outfit mayor a 120 caracteres', () => {
    const largo = 'x'.repeat(121)
    expect(() => planificarOutfitSwap({ outfit: largo, count: 4 })).toThrow(/120/)
  })

  test('encuadre inválido cae a plano_medio (sin crash)', () => {
    const plan = planificarOutfitSwap({ outfit: 'suéter gris', count: 2, encuadre: 'gran_plano_inventado' })
    expect(plan.items[0].brief.encuadre).toBe('plano_medio')
  })

  test('sceneName distingue variantes (outfit_vN) para no colisionar por semilla', () => {
    const plan = planificarOutfitSwap({ outfit: 'mono de satén', count: 4, varianteBase: 10 })
    const nombres = plan.items.map((i) => i.sceneName)
    expect(new Set(nombres).size).toBe(4)
    expect(nombres[0]).toContain('_v10')
    expect(nombres[3]).toContain('_v13')
  })
})

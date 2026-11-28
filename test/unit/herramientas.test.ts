// Tests unitarios D-015 · A1 — contrato declarativo de herramientas.
// Cubre las funciones puras de src/lib/herramientas.ts: parse del contrato
// zod, visibilidad show/hide, validación, armado de payload con rutas de
// puntos, y coste estimado. Además valida que el catálogo sembrado del
// Estudio pase el contrato completo (una fila corrupta nunca debe entrar a BD).
import { describe, test, expect } from 'bun:test'
import {
  armaPayload,
  camposVisibles,
  costeEstimado,
  herramientaDesdeFila,
  HerramientaDefSchema,
  validarValores,
  valoresIniciales,
  type CampoDefEntrada,
  type FilaHerramienta,
} from '@/lib/herramientas'
import { CATALOGO_ESTUDIO } from '@/lib/herramientas-catalogo'

const CAMPOS_BASE: CampoDefEntrada[] = [
  { name: 'motor', type: 'select', label: 'Motor', options: [{ value: 'a', label: 'Motor A' }, { value: 'b', label: 'Motor B' }] },
  { name: 'intensidad', type: 'slider', label: 'Intensidad', min: 0, max: 1, step: 0.1, showWhen: { campo: 'motor', valores: ['b'] } },
  { name: 'prompt', type: 'textarea', label: 'Prompt', required: true },
  { name: 'solo_a', type: 'switch', label: 'Solo A', hideWhen: { campo: 'motor', valores: ['b'] } },
]

describe('HerramientaDefSchema (contrato zod)', () => {
  test('un select sin options es rechazado', () => {
    const r = HerramientaDefSchema.safeParse({
      clave: 'x', nombre: 'X', descripcion: 'Genera algo útil.', grupo: 'G',
      costeBase: 1, campos: [{ name: 'sel', type: 'select', label: 'Sel' }], endpoint: '/api/x',
    })
    expect(r.success).toBe(false)
  })

  test('un slider sin min/max es rechazado', () => {
    const r = HerramientaDefSchema.safeParse({
      clave: 'x', nombre: 'X', descripcion: 'Genera algo útil.', grupo: 'G',
      costeBase: 1, campos: [{ name: 's', type: 'slider', label: 'S' }], endpoint: '/api/x',
    })
    expect(r.success).toBe(false)
  })

  test('showWhen hacia un campo inexistente es rechazado', () => {
    const r = HerramientaDefSchema.safeParse({
      clave: 'x', nombre: 'X', descripcion: 'Genera algo útil.', grupo: 'G',
      costeBase: 1,
      campos: [
        { name: 'p', type: 'text', label: 'P', showWhen: { campo: 'fantasma', valores: ['1'] } },
      ],
      endpoint: '/api/x',
    })
    expect(r.success).toBe(false)
  })

  test('nombres de campos duplicados son rechazados y el endpoint debe ser /api/*', () => {
    const base = { clave: 'x', nombre: 'X', descripcion: 'Genera algo útil.', grupo: 'G', costeBase: 1 }
    expect(
      HerramientaDefSchema.safeParse({ ...base, campos: [{ name: 'a', type: 'text', label: 'A' }, { name: 'a', type: 'text', label: 'A2' }], endpoint: '/api/x' }).success,
    ).toBe(false)
    expect(
      HerramientaDefSchema.safeParse({ ...base, campos: [{ name: 'a', type: 'text', label: 'A' }], endpoint: 'https://otro.com/x' }).success,
    ).toBe(false)
  })
})

describe('camposVisibles (show_when / hide_when)', () => {
  test('intensidad solo aparece con motor=b; solo_a desaparece con motor=b', () => {
    expect(camposVisibles(CAMPOS_BASE, { motor: 'a' }).map((c) => c.name)).toEqual(['motor', 'prompt', 'solo_a'])
    expect(camposVisibles(CAMPOS_BASE, { motor: 'b' }).map((c) => c.name)).toEqual(['motor', 'intensidad', 'prompt'])
  })
})

describe('validarValores (required solo sobre campos VISIBLES)', () => {
  test('un required oculto por hide/show no bloquea', () => {
    const campos: CampoDefEntrada[] = [
      { name: 'modo', type: 'select', label: 'Modo', options: [{ value: '1', label: 'uno' }, { value: '2', label: 'dos' }] },
      { name: 'extra', type: 'text', label: 'Extra', required: true, showWhen: { campo: 'modo', valores: ['2'] } },
    ]
    expect(validarValores(campos, { modo: '1' }).ok).toBe(true)
    const r = validarValores(campos, { modo: '2' })
    expect(r.ok).toBe(false)
    expect(r.errores[0].campo).toBe('extra')
  })

  test('valor de select fuera del catálogo y slider fuera de rango se detectan', () => {
    expect(validarValores([CAMPOS_BASE[0]], { motor: 'zz' }).ok).toBe(false)
    const slider: CampoDefEntrada[] = [{ name: 'intensidad', type: 'slider', label: 'Intensidad', min: 0, max: 1, step: 0.1 }]
    expect(validarValores(slider, { intensidad: 1.5 }).ok).toBe(false)
  })
})

describe('valoresIniciales', () => {
  test('usa defaultValue, apaga switches y toma la primera opción de un select', () => {
    const v = valoresIniciales(CAMPOS_BASE)
    expect(v.motor).toBe('a')
    expect(v.intensidad).toBe(0)
    expect(v.prompt).toBe('')
    expect(v.solo_a).toBe(false)
  })
})

describe('armaPayload (rutas de puntos + payloadFijo)', () => {
  test('anida brief.*, omite opcionales vacíos y mezcla payloadFijo', () => {
    const def = {
      campos: [
        { name: 'personaje', type: 'character', label: 'P', required: true, ruta: 'characterId' },
        { name: 'carril', type: 'carril', label: 'C', required: true, ruta: 'lane' },
        { name: 'escena', type: 'textarea', label: 'E', required: true, ruta: 'brief.escena' },
        { name: 'luz', type: 'text', label: 'L', ruta: 'brief.luz' },
        { name: 'count', type: 'slider', label: 'N', min: 1, max: 32, required: true, ruta: 'count' },
      ] as CampoDefEntrada[],
      payloadFijo: { paquete: 'mixto' },
    }
    const p = armaPayload(def, { personaje: 'c1', carril: 'PUBLICO', escena: 'atardecer', luz: '', count: 8 })
    expect(p).toEqual({ characterId: 'c1', lane: 'PUBLICO', brief: { escena: 'atardecer' }, count: 8, paquete: 'mixto' })
  })

  test('un campo oculto por showWhen no viaja al payload', () => {
    const p = armaPayload({ campos: CAMPOS_BASE, payloadFijo: {} }, { motor: 'a', prompt: 'hola' })
    expect(p).toEqual({ motor: 'a', prompt: 'hola' })
    const p2 = armaPayload({ campos: CAMPOS_BASE, payloadFijo: {} }, { motor: 'b', prompt: 'hola' })
    expect(p2).toEqual({ motor: 'b', prompt: 'hola' })
  })
})

describe('costeEstimado (escalaCoste)', () => {
  test('multiplica por el campo marcado y redondea a 1 decimal', () => {
    const def = { costeBase: 2, campos: [{ name: 'count', type: 'slider', label: 'N', min: 1, max: 32, escalaCoste: true } as CampoDef] }
    expect(costeEstimado(def, { count: 8 })).toBe(16)
    expect(costeEstimado(def, {})).toBe(2)
  })
})

describe('herramientaDesdeFila (fila de BD → runtime)', () => {
  const fila: FilaHerramienta = {
    id: 'h1',
    clave: 'demo',
    nombre: 'Demo',
    descripcion: 'Genera una demo con dos campos.',
    grupo: 'G',
    fraseGrupo: 'frase',
    subgrupo: 'SUB',
    icono: '🧪',
    chapas: '["BETA"]',
    carril: 'PUBLICO',
    costeBase: 2,
    costeTexto: '2 cr × pieza',
    limiteTexto: 'hasta 8 piezas',
    salida: '{"tipo":"imagen"}',
    campos: JSON.stringify([
      { name: 'prompt', type: 'textarea', label: 'Prompt', required: true },
      { name: 'count', type: 'slider', label: 'N', min: 1, max: 8, escalaCoste: true, ruta: 'count' },
    ]),
    endpoint: '/api/demo',
    payloadFijo: '{"k":"v"}',
    activo: true,
    orden: 10,
  }

  test('parsea JSON de campos/chapas/salida y valida el contrato', () => {
    const h = herramientaDesdeFila(fila)
    expect(h.chapas).toEqual(['BETA'])
    expect(h.campos).toHaveLength(2)
    expect(h.salida.tipo).toBe('imagen')
    expect(h.payloadFijo).toEqual({ k: 'v' })
  })

  test('una fila con campos corruptos lanza error honesto (no se pinta)', () => {
    const corrupta = { ...fila, campos: '[{"name":"mal","type":"tipo_inventado","label":"M"}]' }
    expect(() => herramientaDesdeFila(corrupta)).toThrow()
  })
})

describe('CATALOGO_ESTUDIO (el seed nunca debe entrar corrupto a la BD)', () => {
  test('las 3 herramientas del Estudio pasan el contrato completo', () => {
    expect(CATALOGO_ESTUDIO.length).toBeGreaterThanOrEqual(3)
    for (const def of CATALOGO_ESTUDIO) {
      const r = HerramientaDefSchema.safeParse(def)
      expect(r.success).toBe(true)
    }
  })

  test('cada herramienta apunta a un endpoint real del Estudio y declara límite y coste', () => {
    const claves = CATALOGO_ESTUDIO.map((d) => d.clave)
    expect(claves).toEqual(expect.arrayContaining(['fabrica_fotos', 'instadump', 'outfit_swap']))
    for (const def of CATALOGO_ESTUDIO) {
      expect(def.endpoint.startsWith('/api/studio/')).toBe(true)
      expect(def.limiteTexto.length).toBeGreaterThan(0)
      expect(def.costeTexto.length).toBeGreaterThan(0)
      // Herramientas de LOTE escalan el coste por pieza (slider count);
      // las de coste PLANO por llamada (salida texto, p.ej. mejorar_prompt
      // A7) no tienen multiplicador: 1 mejora = 1 llamada = 1 coste.
      const esLote = def.salida.cantidad !== undefined
      expect(def.campos.some((c) => c.escalaCoste)).toBe(esLote)
    }
  })

  test('el formulario declarado reproduce los contratos reales de los endpoints', () => {
    const rutas = (clave: string) =>
      CATALOGO_ESTUDIO.filter((d) => d.clave === clave).flatMap((d) => d.campos.map((c) => c.ruta ?? c.name))
    // /api/studio/lote recibe brief anidado + characterId + lane + count
    expect(rutas('fabrica_fotos')).toEqual(
      expect.arrayContaining(['characterId', 'lane', 'brief.escena', 'brief.outfit', 'brief.pose', 'brief.encuadre', 'brief.luz', 'count']),
    )
    // instadump plano + paquete fijo
    expect(rutas('instadump')).toEqual(expect.arrayContaining(['escena', 'outfit', 'luz', 'count']))
    // outfit-swap plano con outfit obligatorio
    expect(rutas('outfit_swap')).toEqual(expect.arrayContaining(['outfit', 'escena', 'luz', 'encuadre', 'count']))
  })
})

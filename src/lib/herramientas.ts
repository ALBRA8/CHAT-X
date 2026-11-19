// D-015 · A1 "Formularios como datos" — contrato declarativo de herramientas.
// Adaptado del patrón /api/workflows de MIAFACTORY (destripe §17.12): cada
// herramienta se describe con datos (campos, opciones, reglas show/hide) y un
// solo renderizador la pinta. Diferencias a propósito (adaptación, no copia):
//  - tipos de campo propios de CHAT-X: `character` (personaje ACTIVO) y
//    `carril` (público SFW / privado 18+ con gate), no sus tipos de LoRA/NSFW;
//  - `ruta` (puntos, ej. "brief.escena") arma el payload para NUESTROS
//    endpoints reales, que siguen siendo la única verdad del coste y del
//    compliance (jamás se confía al cliente).
// Este módulo es puro (sin BD ni React) para poder testearlo y usarlo igual
// en cliente, servidor y seed.

import { z } from 'zod'

// ── Esquema de campo ──

export const CAMPO_TIPOS = [
  'text',
  'textarea',
  'number',
  'slider',
  'select',
  'switch',
  'character', // selector de personaje ACTIVO (options las llena el runtime)
  'carril', // público SFW / privado 18+ (gate real, no etiqueta)
] as const
export type CampoTipo = (typeof CAMPO_TIPOS)[number]

export type Valor = string | number | boolean

const ValorSchema = z.union([z.string(), z.number(), z.boolean()])

export const OpcionSchema = z.object({
  value: z.string(),
  label: z.string().min(1),
  descripcion: z.string().optional(),
  badge: z.string().optional(), // "RECOMENDADO", "NUEVO"… (texto propio, nunca el del referente)
})

export const CampoDefSchema = z
  .object({
    name: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'clave de campo (letras, números y _)'),
    type: z.enum(CAMPO_TIPOS),
    label: z.string().min(1),
    required: z.boolean().default(false),
    defaultValue: ValorSchema.optional(),
    placeholder: z.string().optional(),
    helpText: z.string().optional(), // una línea de ayuda visible
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().optional(),
    options: z.array(OpcionSchema).optional(), // solo select
    showWhen: z.object({ campo: z.string(), valores: z.array(ValorSchema) }).optional(),
    hideWhen: z.object({ campo: z.string(), valores: z.array(ValorSchema) }).optional(),
    escalaCoste: z.boolean().default(false), // el coste estimado multiplica por este campo
    ruta: z.string().optional(), // destino en el payload (puntos); por defecto el name
    mediaFila: z.boolean().default(false), // layout: media fila en desktop
  })
  .superRefine((c, ctx) => {
    if (c.type === 'select' && (!c.options || c.options.length === 0)) {
      ctx.addIssue({ code: 'custom', message: `campo select "${c.name}" exige options[]` })
    }
    if (c.type === 'slider' && (c.min === undefined || c.max === undefined)) {
      ctx.addIssue({ code: 'custom', message: `campo slider "${c.name}" exige min y max` })
    }
    if (c.type !== 'select' && c.options) {
      ctx.addIssue({ code: 'custom', message: `solo select lleva options ("${c.name}")` })
    }
  })

export type CampoDef = z.infer<typeof CampoDefSchema>
// Tipo para DECLARAR datos crudos (catálogo/seed/tests): los campos con
// default (.default) son opcionales aquí y el parse los aplica.
export type CampoDefEntrada = z.input<typeof CampoDefSchema>

// ── Esquema de herramienta completa (fila de BD o definición de seed) ──

export const SALIDA_TIPOS = ['imagen', 'video', 'audio', 'compare', 'zip'] as const

export const HerramientaDefSchema = z
  .object({
    clave: z.string().regex(/^[a-z][a-z0-9_]*$/, 'clave de herramienta en snake_case'),
    nombre: z.string().min(1),
    descripcion: z.string().min(1), // verbo imperativo + qué hace + un detalle práctico
    grupo: z.string().min(1),
    fraseGrupo: z.string().default(''),
    subgrupo: z.string().default(''),
    icono: z.string().default('🛠️'),
    chapas: z.array(z.string()).default([]),
    carril: z.enum(['PUBLICO', 'PRIVADO']).default('PUBLICO'),
    costeBase: z.number().min(0),
    costeTexto: z.string().default(''),
    limiteTexto: z.string().default(''),
    salida: z
      .object({
        tipo: z.enum(SALIDA_TIPOS),
        cantidad: z.union([z.number(), z.literal('lote')]).optional(),
        incluyeOriginal: z.boolean().optional(),
      })
      .default({ tipo: 'imagen' }),
    campos: z.array(CampoDefSchema).min(1),
    endpoint: z.string().regex(/^\/api\//, 'endpoint propio de CHAT-X'),
    payloadFijo: z.record(z.string(), ValorSchema).default({}),
    orden: z.number().default(100),
  })
  .superRefine((h, ctx) => {
    // Las reglas show/hide deben apuntar a campos que EXISTEN (contrato cerrado).
    const nombres = new Set(h.campos.map((c) => c.name))
    h.campos.forEach((c, i) => {
      for (const regla of [c.showWhen, c.hideWhen]) {
        if (regla && !nombres.has(regla.campo)) {
          ctx.addIssue({
            code: 'custom',
            message: `${h.clave}: campo "${c.name}" referencia "${regla.campo}" que no existe`,
            path: ['campos', i],
          })
        }
      }
    })
    const dup = h.campos.map((c) => c.name).filter((n, i, a) => a.indexOf(n) !== i)
    if (dup.length > 0) {
      ctx.addIssue({ code: 'custom', message: `${h.clave}: campos duplicados ${[...new Set(dup)].join(', ')}` })
    }
  })

export type HerramientaDef = z.infer<typeof HerramientaDefSchema>
export type HerramientaDefEntrada = z.input<typeof HerramientaDefSchema>

// ── Tipo runtime (lo que consumen la API, el renderizador y las vistas) ──

export interface HerramientaT extends HerramientaDef {
  id: string
  activo: boolean
}

export type FilaHerramienta = {
  id: string
  clave: string
  nombre: string
  descripcion: string
  grupo: string
  fraseGrupo: string
  subgrupo: string
  icono: string
  chapas: string
  carril: string
  costeBase: number
  costeTexto: string
  limiteTexto: string
  salida: string
  campos: string
  endpoint: string
  payloadFijo: string
  activo: boolean
  orden: number
}

/** Parsea una fila de BD al tipo runtime. Lanza con detalle honesto si la fila está corrupta. */
export function herramientaDesdeFila(f: FilaHerramienta): HerramientaT {
  const def = HerramientaDefSchema.parse({
    clave: f.clave,
    nombre: f.nombre,
    descripcion: f.descripcion,
    grupo: f.grupo,
    fraseGrupo: f.fraseGrupo,
    subgrupo: f.subgrupo,
    icono: f.icono,
    chapas: JSON.parse(f.chapas || '[]'),
    carril: f.carril,
    costeBase: f.costeBase,
    costeTexto: f.costeTexto,
    limiteTexto: f.limiteTexto,
    salida: JSON.parse(f.salida || '{}'),
    campos: JSON.parse(f.campos || '[]'),
    endpoint: f.endpoint,
    payloadFijo: JSON.parse(f.payloadFijo || '{}'),
    orden: f.orden,
  })
  return { ...def, id: f.id, activo: f.activo }
}

// ── Reglas visibilidad (se evalúan en cliente y pueden re-validarse en servidor) ──

export type Valores = Record<string, Valor | undefined>

export function camposVisibles(campos: readonly CampoDefEntrada[], valores: Valores): CampoDefEntrada[] {
  return campos.filter((c) => {
    if (c.showWhen && !c.showWhen.valores.includes(valores[c.showWhen.campo] as Valor)) return false
    if (c.hideWhen && c.hideWhen.valores.includes(valores[c.hideWhen.campo] as Valor)) return false
    return true
  })
}

// ── Valores iniciales desde el contrato ──

export function valoresIniciales(campos: readonly CampoDefEntrada[]): Valores {
  const v: Valores = {}
  for (const c of campos) {
    if (c.defaultValue !== undefined) v[c.name] = c.defaultValue
    else if (c.type === 'switch') v[c.name] = false
    else if (c.type === 'slider' || c.type === 'number') v[c.name] = c.min ?? 1
    else if (c.type === 'select') v[c.name] = c.options?.[0]?.value ?? ''
    else if (c.type === 'carril') v[c.name] = 'PUBLICO'
    else v[c.name] = ''
  }
  return v
}

// ── Validación (cliente antes de enviar; disponible para re-validar en servidor) ──

export function validarValores(
  campos: readonly CampoDefEntrada[],
  valores: Valores,
): { ok: boolean; errores: { campo: string; mensaje: string }[] } {
  const errores: { campo: string; mensaje: string }[] = []
  for (const c of camposVisibles(campos, valores)) {
    const v = valores[c.name]
    const vacio = v === undefined || v === null || v === '' || (c.type === 'character' && v === '')
    if (c.required && vacio) {
      errores.push({ campo: c.name, mensaje: `${c.label} es obligatorio` })
      continue
    }
    if (vacio) continue
    if (c.type === 'select' && c.options && !c.options.some((o) => o.value === v)) {
      errores.push({ campo: c.name, mensaje: `${c.label}: valor fuera del catálogo` })
    }
    if ((c.type === 'slider' || c.type === 'number') && typeof v === 'number') {
      if (c.min !== undefined && v < c.min) errores.push({ campo: c.name, mensaje: `${c.label}: mínimo ${c.min}` })
      if (c.max !== undefined && v > c.max) errores.push({ campo: c.name, mensaje: `${c.label}: máximo ${c.max}` })
    }
  }
  return { ok: errores.length === 0, errores }
}

// ── Arma el payload para el endpoint real (rutas con puntos + payloadFijo) ──

export function armaPayload(
  def: Pick<HerramientaDefEntrada, 'campos' | 'payloadFijo'>,
  valores: Valores,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  const asignar = (ruta: string, valor: unknown) => {
    const partes = ruta.split('.')
    let nodo = payload
    for (let i = 0; i < partes.length - 1; i++) {
      const p = partes[i]
      if (typeof nodo[p] !== 'object' || nodo[p] === null) nodo[p] = {}
      nodo = nodo[p] as Record<string, unknown>
    }
    nodo[partes[partes.length - 1]] = valor
  }
  for (const c of camposVisibles(def.campos, valores)) {
    const v = valores[c.name]
    const vacio = v === undefined || v === null || v === ''
    if (vacio && !c.required) continue // campos opcionales vacíos no viajan
    if (vacio) continue // los required vacíos los detecta validarValores antes
    asignar(c.ruta ?? c.name, v)
  }
  return { ...payload, ...def.payloadFijo }
}

// ── Coste estimado ANTES de generar (el real lo dice el endpoint) ──

export function costeEstimado(def: Pick<HerramientaDefEntrada, 'costeBase' | 'campos'>, valores: Valores): number {
  const escala = def.campos.find((c) => c.escalaCoste)
  const factor = escala ? Number(valores[escala.name] ?? 1) : 1
  return Math.round(def.costeBase * factor * 10) / 10
}

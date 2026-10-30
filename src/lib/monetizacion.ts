// Monetización de la plataforma (P3 de CLONAKIT_BRECHAS): suscripción con
// rollover + packs eternos (Apatero #9), split 90/10 de marketplace (Kinku #10)
// y white-label por configuración (#12, pieza mínima honesta).
//
// MODO_INTERNO — HONESTIDAD PRIMERO: CHAT-X hoy es de UN operador (el
// fundador); no hay procesador de pagos (Stripe/Whop/JVZoo = cuenta externa +
// gasto → bloqueado externamente). Por eso TODO el motor corre en modo
// 'simulacion': calcula renovaciones, rollover, packs y splits REALES en
// aritmética, los registra en LedgerMonetizacion con modo='simulacion' y jamás
// presenta un cobro como real. Cuando el fundador abra a terceros con un
// procesador, el mismo código pasa a modo='real' cambiando UNA puerta.
//
// El split 90/10 es CONFIGURABLE con trazabilidad (pctCreador en cada entrada
// del ledger): la validación real de las condiciones de Kinku sigue pendiente
// del fundador — el motor no fetichiza el 90.

export const MODO_MONETIZACION = 'INTERNO' as const
export const MODO_LEDGER = 'simulacion' as const

// ─────────────────────── #9 Suscripción con rollover ───────────────────────

export interface PlanSuscripcion {
  id: string
  nombre: string
  precioCents: number // USD cents / mes
  creditosMes: number // créditos que llegan CADA mes
  rolloverPct: number // % de créditos NO usados que se conservan
  capRollover: number // tope absoluto de créditos heredados (anti-acumulación infinita)
}

// Plantillas deterministas (Apatero: suscripción + rollover con tope).
export const PLANTILLAS_PLAN: PlanSuscripcion[] = [
  { id: 'base', nombre: 'Base', precioCents: 900, creditosMes: 500, rolloverPct: 0, capRollover: 0 },
  { id: 'pro', nombre: 'Pro', precioCents: 2900, creditosMes: 2000, rolloverPct: 25, capRollover: 500 },
  { id: 'estudio', nombre: 'Estudio', precioCents: 9900, creditosMes: 8000, rolloverPct: 50, capRollover: 4000 },
]

export function planPorId(id: string): PlanSuscripcion | undefined {
  return PLANTILLAS_PLAN.find((p) => p.id === id)
}

/**
 * Renovación mensual con rollover (función PURA — la aritmética de Apatero):
 * nuevo saldo = créditos del mes + min(créditos sin usar, tope por %, tope absoluto).
 * El rollover NUNCA supera capRollover ni el porcentaje del plan.
 */
export function creditosTrasRenovacion(saldoActual: number, plan: PlanSuscripcion): { creditos: number; heredados: number; detalle: string } {
  const sinUsar = Math.max(0, Math.floor(saldoActual))
  const porPct = Math.floor((sinUsar * plan.rolloverPct) / 100)
  const heredados = Math.min(sinUsar, porPct, plan.capRollover)
  const creditos = plan.creditosMes + heredados
  return {
    creditos,
    heredados,
    detalle:
      plan.rolloverPct === 0
        ? `Plan ${plan.nombre}: sin rollover — los ${sinUsar} créditos sin usar se pierden al renovar (política del plan).`
        : `Plan ${plan.nombre}: ${sinUsar} sin usar → heredan ${heredados} (min de ${plan.rolloverPct}%=${porPct}, tope absoluto=${plan.capRollover}). Nuevo saldo: ${creditos}.`,
  }
}

// ─────────────────────── #9 Packs eternos ───────────────────────

export interface PackEterno {
  id: string
  creditos: number
  precioCents: number
  descuentoPct: number // vs precio por crédito del plan Pro (referencia declarada)
}

export const REF_PRECIO_CREDITO_CENTS = 2 // 1 crédito ≈ 2¢ (referencia del pack base)

// Packs ETERNOS: no caducan NUNCA (a diferencia del rollover mensual).
export const PLANTILLAS_PACK: PackEterno[] = [
  { id: 'pack100', creditos: 100, precioCents: 250, descuentoPct: 0 },
  { id: 'pack500', creditos: 500, precioCents: 900, descuentoPct: 10 },
  { id: 'pack1000', creditos: 1000, precioCents: 1600, descuentoPct: 20 },
]

export function packPorId(id: string): PackEterno | undefined {
  return PLANTILLAS_PACK.find((p) => p.id === id)
}

/** Precio de un pack a medida (mín 50 créditos) con el mismo escalón de descuentos. */
export function precioPackMedido(creditos: number): PackEterno {
  const c = Math.max(50, Math.min(100000, Math.round(creditos)))
  const descuentoPct = c >= 1000 ? 20 : c >= 500 ? 10 : 0
  const precioCents = Math.round(c * REF_PRECIO_CREDITO_CENTS * (1 - descuentoPct / 100))
  return { id: 'pack_medido', creditos: c, precioCents, descuentoPct }
}

// ─────────────────────── #10 Split de marketplace ───────────────────────

export const PCT_CREADOR_DEFECTO = 90 // estilo Kinku — PENDIENTE de validar contra sus condiciones reales

export interface SplitMarketplace {
  brutoCents: number
  creadorCents: number
  plataformaCents: number
  pctCreador: number
}

/** Split bruto→creador/plataforma con % configurable (trazable en el ledger). */
export function splitMarketplace(brutoCents: number, pctCreador: number = PCT_CREADOR_DEFECTO): SplitMarketplace {
  const bruto = Math.max(0, Math.round(brutoCents))
  const pct = Math.max(0, Math.min(100, Math.round(pctCreador)))
  const creadorCents = Math.floor((bruto * pct) / 100)
  return { brutoCents: bruto, creadorCents, plataformaCents: bruto - creadorCents, pctCreador: pct }
}

// ─────────────────────── #12 White-label (pieza mínima) ───────────────────────

export interface ConfigWhiteLabel {
  marca: string
  colorPrimario: string
  dominio: string
  activo: boolean
}

/**
 * Marca blanca por ENV (MARCA_NOMBRE, MARCA_COLOR, MARCA_DOMINIO). Pieza mínima
 * honesta de #12: el white-label COMPLETO (multi-tenant real con compliance
 * reforzado) sigue PENDIENTE y lo dice la brecha — esto solo permite mostrar
 * otra marca en la superficie sin tocar código.
 */
export function configWhiteLabel(): ConfigWhiteLabel {
  const marca = (process.env.MARCA_NOMBRE || '').trim()
  return {
    marca: marca || 'CHAT-X',
    colorPrimario: (process.env.MARCA_COLOR || '').trim() || '#7c3aed',
    dominio: (process.env.MARCA_DOMINIO || '').trim() || '',
    activo: Boolean(marca),
  }
}

// ─────────────────────── Resumen para la API ───────────────────────

export function resumenMonetizacion() {
  return {
    modo: MODO_MONETIZACION,
    notaHonestidad:
      'MODO_INTERNO: motor de monetización operativo en SIMULACIÓN (ledger modo=simulacion). Sin procesador de pagos no se cobra nada real — abrir a terceros requiere cuenta externa (bloqueado hoy) y compliance reforzado.',
    planes: PLANTILLAS_PLAN,
    packs: PLANTILLAS_PACK,
    split: { pctCreadorDefecto: PCT_CREADOR_DEFECTO, nota: 'Estilo Kinku 90/10, configurable por operación; validación de condiciones reales pendiente del fundador.' },
    whiteLabel: configWhiteLabel(),
    pendientesExternos: [
      'Procesador de pagos real (Stripe/Whop/JVZoo) — cuenta + gasto: bloqueado externamente.',
      'Validación del 90/10 real de Kinku — decisión del fundador.',
      'Multi-tenant completo para white-label real (#12) — arquitectura pendiente.',
      'Agente de llamadas IA (#13) — requiere proveedor de telefonía (bloqueado externamente).',
    ],
  }
}

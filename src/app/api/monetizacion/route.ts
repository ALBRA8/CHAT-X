// API de monetización (P3 de CLONAKIT_BRECHAS). MODO_INTERNO honesto:
//  - GET: planes, packs, split, white-label, estado y últimas entradas del ledger.
//  - POST action=simular_renovacion → aritmética real de rollover, entrada en ledger (modo=simulacion).
//  - POST action=simular_pack       → pack eterno (plantilla o a medida), entrada en ledger.
//  - POST action=simular_comision   → split marketplace trazado con pctCreador usado.
// Nada cobra dinero real: sin procesador de pagos cada entrada queda marcada
// modo='simulacion' — la honestidad está en la BD, no solo en el discurso.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { jsonError, jsonOk } from '@/lib/api-utils'
import { asegurarSettings } from '@/lib/compliance'
import {
  MODO_LEDGER,
  PLANTILLAS_PLAN,
  creditosTrasRenovacion,
  packPorId,
  precioPackMedido,
  resumenMonetizacion,
  splitMarketplace,
} from '@/lib/monetizacion'

export async function GET() {
  const [entradas, agg, settings] = await Promise.all([
    db.ledgerMonetizacion.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
    db.ledgerMonetizacion.aggregate({
      _sum: { brutoCents: true, creadorCents: true, plataformaCents: true },
      _count: { _all: true },
    }),
    asegurarSettings(),
  ])
  return jsonOk({
    ...resumenMonetizacion(),
    ledger: entradas,
    totales: {
      operaciones: agg._count._all,
      brutoCents: agg._sum.brutoCents || 0,
      creadorCents: agg._sum.creadorCents || 0,
      plataformaCents: agg._sum.plataformaCents || 0,
    },
    saldoCreditosPlataforma: settings.credits,
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const action = String(body.action || '')
  const settings = await asegurarSettings()

  if (action === 'simular_renovacion') {
    const planId = String(body.planId || '')
    const plan = PLANTILLAS_PLAN.find((p) => p.id === planId)
    if (!plan) return jsonError(`planId debe ser uno de: base | pro | estudio (recibido: "${planId}").`, 422)
    const saldoActual = Number.isFinite(Number(body.saldoActual)) ? Number(body.saldoActual) : settings.credits
    const r = creditosTrasRenovacion(saldoActual, plan)
    const entrada = await db.ledgerMonetizacion.create({
      data: {
        tipo: 'renovacion',
        concepto: `Plan ${plan.nombre} — renovación mensual`,
        brutoCents: plan.precioCents,
        creditos: plan.creditosMes,
        saldoCreditos: r.creditos,
        modo: MODO_LEDGER,
        meta: JSON.stringify({ planId: plan.id, saldoAnterior: saldoActual, heredados: r.heredados, rolloverPct: plan.rolloverPct, capRollover: plan.capRollover }),
      },
    })
    return jsonOk({ entrada, aritmetica: r, nota: 'SIMULACIÓN (modo=simulacion en el ledger): aritmética real de rollover, cero cobros reales.' }, 201)
  }

  if (action === 'simular_pack') {
    const packId = String(body.packId || '')
    const pack = packPorId(packId) || (packId === 'pack_medido' ? precioPackMedido(Number(body.creditos) || 0) : undefined)
    if (!pack) return jsonError('packId debe ser: pack100 | pack500 | pack1000 | pack_medido (con creditos).', 422)
    const entrada = await db.ledgerMonetizacion.create({
      data: {
        tipo: 'pack',
        concepto: `Pack eterno de ${pack.creditos} créditos (no caduca)`,
        brutoCents: pack.precioCents,
        creditos: pack.creditos,
        saldoCreditos: settings.credits, // informativo: el saldo de plataforma no cambia en simulación
        modo: MODO_LEDGER,
        meta: JSON.stringify({ packId: pack.id, descuentoPct: pack.descuentoPct, eterno: true }),
      },
    })
    return jsonOk({ entrada, pack, nota: 'SIMULACIÓN: pack ETERNO (sin caducidad, a diferencia del rollover mensual).' }, 201)
  }

  if (action === 'simular_comision') {
    const brutoCents = Math.round(Number(body.brutoCents) || 0)
    if (brutoCents <= 0) return jsonError('brutoCents debe ser un número positivo (centavos USD del ingreso bruto).', 422)
    const pctCreador = Number.isFinite(Number(body.pctCreador)) ? Number(body.pctCreador) : undefined
    const s = splitMarketplace(brutoCents, pctCreador)
    const entrada = await db.ledgerMonetizacion.create({
      data: {
        tipo: 'comision',
        concepto: String(body.concepto || 'Venta de marketplace (split trazado)').slice(0, 120),
        brutoCents: s.brutoCents,
        creadorCents: s.creadorCents,
        plataformaCents: s.plataformaCents,
        pctCreador: s.pctCreador,
        modo: MODO_LEDGER,
        meta: JSON.stringify({ splitConfigurable: true, nota: '90/10 por defecto — validación Kinku pendiente del fundador' }),
      },
    })
    return jsonOk({ entrada, split: s, nota: 'SIMULACIÓN con split trazado: el pct usado queda en pctCreador para auditarlo.' }, 201)
  }

  return jsonError('action debe ser: simular_renovacion | simular_pack | simular_comision.', 422)
}

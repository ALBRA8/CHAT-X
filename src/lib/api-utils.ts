import { NextResponse } from 'next/server'

export function jsonError(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: message, ...extra }, { status })
}

export function jsonOk(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, { status })
}

/**
 * Gasto comprometido HOY (suma de costEstimate de los jobs creados hoy).
 * Conservador: los reembolsos devuelven saldo pero NO liberan el contador
 * diario (propiedad anti-abuse deliberada: un loop fallido no puede repetirse
 * indefinidamente cobrando y reembolsando).
 */
export async function gastoHoy(): Promise<number> {
  const { db } = await import('@/lib/db')
  const inicio = new Date()
  inicio.setHours(0, 0, 0, 0)
  const agg = await db.job.aggregate({
    where: { createdAt: { gte: inicio } },
    _sum: { costEstimate: true },
  })
  return agg._sum.costEstimate ?? 0
}

/**
 * Estimación de coste visible antes de generar (Anexo A regla 8) + techo de
 * consumo diario (orden maestra sección 6: límites de consumo). Punto ÚNICO de
 * cobro: toda la plataforma pasa por aquí.
 */
export async function asegurarSaldo(coste: number): Promise<{ ok: boolean; saldo: number; error?: string }> {
  const { db } = await import('@/lib/db')
  const s = await db.settings.findUnique({ where: { id: 'main' } })
  const saldo = s?.credits ?? 0
  if (saldo < coste) {
    return { ok: false, saldo, error: `Créditos insuficientes: necesitas ${coste} y hay ${Math.round(saldo)}.` }
  }
  const limite = s?.limiteDiario ?? 0
  if (limite > 0) {
    const gastado = await gastoHoy()
    if (gastado + coste > limite) {
      return {
        ok: false,
        saldo,
        error: `Límite diario de consumo alcanzado: hoy llevas ${Math.round(gastado)} cr comprometidos y el techo es ${Math.round(limite)}. Sube el límite en Ajustes o espera a mañana (0 = sin límite).`,
      }
    }
  }
  await db.settings.update({ where: { id: 'main' }, data: { credits: { decrement: coste } } })
  return { ok: true, saldo: saldo - coste }
}

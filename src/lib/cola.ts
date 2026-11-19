// D-015 · A2 "Jobs con coste real" — lógica PURA de cola, coste y caducidad.
// Adaptado de la anatomía de job de MIAFACTORY (destripe §19.1-19.8): posición
// en cola visible, coste presupuestado vs real por trabajo, caducidad de media
// declarada en casa. Diferencias a propósito (adaptación, no copia):
//  - la cola REAL vive en la BD (claim atómico del worker en src/lib/worker.ts);
//    aquí solo se calculan estados DERIVADOS para la API y las vistas;
//  - no existe crédito vendible ni saldo de proveedor (CHAT-X es plataforma
//    privada del estudio — MUSE_BRIEF §4; el saldo es el de Settings);
//  - nada caduca en silencio: "caducada" es un estado visible, jamás una purga.
// Módulo puro (sin BD ni React) para poder testearlo y usarlo igual en
// cliente, servidor y seed — mismo criterio que src/lib/herramientas.ts.

// ── Posición en cola ──────────────────────────────────────────────────────

/** Recorre jobs YA ordenados como los lee el worker (priority asc, createdAt
 *  asc) y devuelve id → posición (1-based) SOLO de los `en_cola`. Los
 *  `procesando` y demás no ocupan puesto: la cola es de los que esperan. */
export function posicionesEnCola(jobs: readonly { id: string; status: string }[]): Map<string, number> {
  const pos = new Map<string, number>()
  let n = 0
  for (const j of jobs) {
    if (j.status === 'en_cola') pos.set(j.id, ++n)
  }
  return pos
}

// ── Duración del trabajo (análogo honesto de gpu_cost_time) ───────────────

/** Ms entre startedAt y finishedAt. null si falta una punta (en cola, en
 *  curso o trabajo que nunca inició) — nunca se inventa una duración. */
export function duracionMs(startedAt: Date | null, finishedAt: Date | null): number | null {
  if (!startedAt || !finishedAt) return null
  return Math.max(0, finishedAt.getTime() - startedAt.getTime())
}

// ── Coste presupuestado vs real ───────────────────────────────────────────

export type VeredictoCoste = 'pendiente' | 'reembolsado' | 'ajustado_bajo' | 'ajustado_alto' | 'exacto'

export interface ResumenCoste {
  presupuestado: number
  real: number
  /** estimate − real, redondeado a 1 decimal. >0: la diferencia volvió al saldo. */
  delta: number
  veredicto: VeredictoCoste
}

const EPS = 0.0001
const r1 = (x: number) => Math.round(x * 10) / 10

/** Lee el veredicto honesto del coste de un job TERMINADO o en curso.
 *  - pendiente: todavía no hay coste real que comparar (en cola / procesando).
 *  - reembolsado: terminó con coste real 0 (fallido → reembolso único del worker).
 *  - ajustado_bajo: real < presupuesto → la diferencia volvió al saldo (gastar()).
 *  - ajustado_alto: real > presupuesto → el proveedor costó más de lo presupuestado.
 *  - exacto: real = presupuesto. */
export function resumenCoste(costEstimate: number, costReal: number, status: string): ResumenCoste {
  const presupuestado = r1(costEstimate)
  const real = r1(costReal)
  const delta = r1(presupuestado - real)
  let veredicto: VeredictoCoste
  if (status === 'en_cola' || status === 'procesando') {
    veredicto = 'pendiente'
  } else if (real <= EPS) {
    veredicto = 'reembolsado'
  } else if (delta > EPS) {
    veredicto = 'ajustado_bajo'
  } else if (delta < -EPS) {
    veredicto = 'ajustado_alto'
  } else {
    veredicto = 'exacto'
  }
  return { presupuestado, real, delta, veredicto }
}

// ── Caducidad de media declarada en casa ──────────────────────────────────

export type EstadoCaducidad = 'permanente' | 'vigente' | 'caducada'

/** null = permanente (la política por defecto de TODO lo producido). Con fecha
 *  declarada: vigente si aún no llega, caducada si ya pasó. "caducada" es un
 *  ESTADO VISIBLE para el operador — nunca borra nada automáticamente. */
export function estadoCaducidad(caducaEn: Date | null, ahora: Date = new Date()): EstadoCaducidad {
  if (!caducaEn) return 'permanente'
  return caducaEn.getTime() > ahora.getTime() ? 'vigente' : 'caducada'
}

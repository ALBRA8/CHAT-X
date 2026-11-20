// F1 · W4 (EMBUDO §7 · PROJECT_STATE hito 3) — iniciativas programadas del canal
// WhatsApp PROPIO. La mitad que falta para cerrar el bucle: además de responder
// (W3), el negocio puede escribir primero — SIEMPRE 1:1 y con destinatario
// explícito. Sala limpia (D-007): solo conceptos generales (cola de mensajes
// programados, consentimiento por contacto, disyuntor en vivo) — cero código,
// contratos o constantes de los clones.
// Reglas que este módulo hace cumplir por diseño:
//  - Programar NO es enviar: una iniciativa programada es una fila en la BD de
//    la casa; SOLO sale cuando el daemon real la recoge (poll firmado), la
//    sesión sigue CONECTADA y el pacing W1 la deja pasar (disyuntor en vivo:
//    circuito abierto frena iniciativas, no respuestas).
//  - El QUÉ lo decide el cerebro + gate humano (§3 de la especificación): el
//    operador programa y puede dejar un breve (intención), pero el texto final
//    lo escribe el cerebro (plantilla del genoma o LLM con salida segura) en el
//    momento de la entrega — jamás texto libre del operador sin filtro.
//  - Sin campañas masivas (§7): techos por chat ya en W1 (máx 8/día, calentamiento
//    máx 2/24 h) + tope de programadas pendientes por chat + tope por poll.
//  - Módulo puro (sin BD, red ni reloj propio): todo inyectado y testeable —
//    mismo criterio que pacing.ts, sesion.ts y conversacion.ts.
import type { DecisionEnvio } from './pacing'

// ── Límites del contrato ──────────────────────────────────────────────────

export const MAX_CHATID = 128 // mismo tope que conversacion.ts
export const MAX_BRIEF = 300 // el breve del operador (intención, no texto final)
/** Tope de iniciativas programadas PENDIENTES por chat: programar en cascada
 *  contra el mismo contacto no es conversación 1:1, es cola de difusión. */
export const MAX_PROGRAMADAS_POR_CHAT = 3
/** Tope por poll del daemon: goteo conservador — aunque haya varias vencidas,
 *  salen pocas por tick y cada una pasa su gate de pacing. */
export const MAX_POR_POLL = 5
/** Horizonte máximo de programación: más lejos no es planificación, es acumulación. */
export const MAX_HORIZONTE_DIAS = 30

export type EstadoIniciativa = 'programada' | 'en_cola' | 'enviado' | 'fallado' | 'bloqueado_pacing'

// ── Validación de la programación (operador, panel Canal) ─────────────────

export interface ProgramacionIniciativa {
  chatId: string
  programadaEn: Date | null // null = vence ya (el pacing decide CUÁNDO de verdad)
  brief: string // intención para el cerebro (vacío = el genoma decide solo)
}

export function validarProgramacion(p: unknown): { ok: true; datos: ProgramacionIniciativa } | { ok: false; error: string } {
  if (typeof p !== 'object' || p === null) return { ok: false, error: 'Payload ausente.' }
  const o = p as Record<string, unknown>
  const chatId = typeof o.chatId === 'string' ? o.chatId.trim() : ''
  if (!chatId) return { ok: false, error: 'Falta chatId: el contacto consentido que recibe la iniciativa.' }
  if (chatId.length > MAX_CHATID) return { ok: false, error: `chatId demasiado largo (máx ${MAX_CHATID}).` }
  if (!/\d/.test(chatId)) return { ok: false, error: 'chatId sin dígitos: no parece un chat de WhatsApp.' }
  let programadaEn: Date | null = null
  if (typeof o.programadaEn === 'string' && o.programadaEn.trim()) {
    const d = new Date(o.programadaEn)
    if (Number.isNaN(d.getTime())) return { ok: false, error: 'programadaEn no es una fecha válida (ISO esperado).' }
    programadaEn = d
  }
  const brief = typeof o.texto === 'string' ? o.texto.trim().slice(0, MAX_BRIEF) : ''
  return { ok: true, datos: { chatId, programadaEn, brief } }
}

/** Horizonte de programación: una fecha demasiado lejana se rechaza (400) —
 *  la iniciativa vencida ya la recoge el daemon; lo lejano es acumulación. */
export function fueraDeHorizonte(programadaEn: Date, ahora: Date): boolean {
  const max = ahora.getTime() + MAX_HORIZONTE_DIAS * 24 * 60 * 60 * 1000
  return programadaEn.getTime() > max
}

// ── Veredicto de entrega (puro, por iniciativa) ───────────────────────────

export interface CerebroIniciativa {
  texto: string
  modo: string // 'plantilla_genoma' | 'llm_<proveedor>'
  meta: Record<string, unknown>
}

export type EstadoVeredictoIniciativa = 'en_cola' | 'sigue_programada'

export interface VeredictoIniciativa {
  entregar: boolean // true = el daemon debe enviar textoSalida YA
  textoSalida: string | null
  estado: EstadoVeredictoIniciativa
  motivo: string // frase honesta para compliance y panel
  meta: Record<string, unknown>
}

/** El veredicto por iniciativa, con el MISMO orden de honestidad que
 *  resolverSalida (W3): si el pacing (con disyuntor en vivo) dice no, la
 *  iniciativa SIGUE programada (no se descarta, no se envía) con motivo y
 *  reintentarEn; si dice sí, sale en cola con el texto del cerebro.
 *  Diferencia clave con W3: el cerebro ya corrió o no ANTES de este veredicto —
 *  la ruta solo llama al LLM cuando el pacing pasa (regla $0). */
export function resolverIniciativa(
  decisionPacing: DecisionEnvio,
  cerebro: CerebroIniciativa | null,
): VeredictoIniciativa {
  if (!decisionPacing.permitido) {
    return {
      entregar: false,
      textoSalida: null,
      estado: 'sigue_programada',
      motivo: decisionPacing.detalle,
      meta: { pacing: decisionPacing.motivo, reintentarEn: decisionPacing.reintentarEn },
    }
  }
  if (!cerebro) {
    // Cableado incorrecto del caller: honesto ante todo, NADA se envía.
    return {
      entregar: false,
      textoSalida: null,
      estado: 'sigue_programada',
      motivo: 'El veredicto pidió cerebro pero no llegó resultado (cableado interno): nada se envía.',
      meta: { bug: 'cerebro_ausente' },
    }
  }
  return {
    entregar: true,
    textoSalida: cerebro.texto,
    estado: 'en_cola',
    motivo: decisionPacing.detalle,
    meta: { pacing: 'ok', modo: cerebro.modo },
  }
}

// ── Cancelación explícita (jamás en silencio) ─────────────────────────────

export type ResultadoCancelacion = { ok: true } | { ok: false; error: string }

/** Cancelar SOLO cabe en programada: en_cola ya fue instruida al daemon (no
 *  hay "des-instruir" honesto), enviado/fallado son historia, bloqueado_pacing
 *  es el fin de cola fría de una RESPUESTA — las iniciativas no viven ahí. */
export function transicionCancelacion(estadoActual: string): ResultadoCancelacion {
  if (estadoActual === 'programada') return { ok: true }
  if (estadoActual === 'en_cola')
    return { ok: false, error: 'La iniciativa ya fue instruida al daemon (en_cola): no se puede des-instruir. Si el daemon aún no la envió, reportará el fallo.' }
  return { ok: false, error: `Solo una iniciativa programada se cancela (estado actual: ${estadoActual}).` }
}

// ── Texto de iniciativa de la plantilla del genoma (fallback honesto) ─────

/** Saludo de apertura del personaje, SFW por diseño y derivado del genoma —
 *  mismo espíritu que respuestaPlantilla (W3): sin LLM también hay cerebro. */
export function iniciativaPlantilla(c: { name: string; genome: string; style: string }): string {
  let g: { tono?: string; aficiones?: string; lore?: string } = {}
  try {
    g = JSON.parse(c.genome || '{}') as { tono?: string; aficiones?: string; lore?: string }
  } catch {
    /* genoma vacío */
  }
  const aficion = g.aficiones ? g.aficiones.split(',')[0].toLowerCase() : ''
  const apertura = aficion
    ? `Soy ${c.name}${g.lore ? `, ${g.lore.toLowerCase()}` : ''}. Estaba con mi ${aficion} y me acordé de ti.`
    : `Soy ${c.name}${g.lore ? `, ${g.lore.toLowerCase()}` : ''}. Me acordé de ti y quería saludar.`
  return `${g.tono ? `[${g.tono}] ` : ''}${apertura} ¿Cómo va tu día?`
}

// F1 · W5 (EMBUDO §7 · PROJECT_STATE hito 3) — LÓGICA PURA del daemon REAL del
// canal WhatsApp PROPIO. Este es el lado del bucle que corre en la MÁQUINA DEL
// FUNDADOR (daemon/whatsapp, librería open-source $0): toca la red de WhatsApp,
// firma contra CHAT-X y obedece las instrucciones del cerebro + pacing.
// Sala limpia (D-007): conceptos generales (sesión persistida, reintentos con
// tope, clasificación de fallos) — cero código, contratos o constantes de los clones.
// Módulo puro (sin BD, sin red, sin reloj propio, aleatorio inyectado): mismo
// criterio que pacing.ts, sesion.ts, conversacion.ts e iniciativas.ts.
// Honestidad ante todo:
//  - El daemon NUNCA decide QUÉ (eso es del cerebro en CHAT-X) ni CUÁNDO de
//    fondo (eso es del pacing): solo ejecuta instrucciones firmadas y reporta
//    el resultado VERDADERO de cada envío (enviado / fallado + señal de riesgo).
//  - Sin secreto HMAC válido el daemon NO ARRANCA (lección auditable de la
//    sala: fail-closed desde el arranque, no a mitad de conversación).
import crypto from 'crypto'
import { PULSO_VIVO_MS } from '../canales'
import { firmarWebhook } from './conversacion'

// ── Constantes del contrato ───────────────────────────────────────────────

/** Reintentos con tope por envío: los reintentos infinitos son firma de
 *  autómata y abren la puerta al bloqueo. Después del tope, el fallo se
 *  reporta HONESTO (fallado) y la fila queda para revisión humana. */
export const REINTENTOS_MAX = 3

/** Retardo base entre envíos (ms) + proporción de jitter: NUNCA un metrónomo
 *  exacto (W1). El daemon espera esto ANTES de cada envío saliente. */
export const RETARDO_BASE_MS = 1500
export const PROPORCION_JITTER = 0.4

/** Secretos mínimos: igual barrera que la auditable — un secreto corto no es
 *  una credencial, es una cortesía. */
export const SECRETO_MIN = 24

/** El pulso (heartbeat) se considera vivo dentro de esta ventana: ver
 *  PULSO_VIVO_MS en src/lib/canales.ts (re-importado arriba). */

// ── Clasificación de fallos (¿alimenta el disyuntor?) ─────────────────────

const RIESGO_PATRONES =
  /timeout|timed out|connection closed|conn cerrada|disconnected|desconectad|stream errored|restart required|conflict|rate.?limit|5\d\d|internal server|bad gateway|service unavailable/i

/** true si el fallo del envío es SEÑAL DE RIESGO para el número (timeout de
 *  sesión, conexión cerrada, 5xx del servidor, rate limit) → alimenta el
 *  disyuntor W1. Un fallo benigno (número inválido, mensaje vacío) NO abre
 *  el circuito: el problema es del chat, no del número. */
export function clasificarErrorRiesgo(detalle: string): boolean {
  return RIESGO_PATRONES.test(detalle || '')
}

// ── Plan de reintento (backoff exponencial + jitter, con tope) ────────────

export interface PlanReintento {
  reintentar: boolean
  /** ms de espera ANTES del próximo intento (0 si no reintenta). */
  esperaMs: number
  rendirse: boolean
  /** Frase honesta para el log local del daemon. */
  detalle: string
}

/** `intentos` = envíos FALLIDOS consumidos hasta ahora (0 = primer intento
 *  aún no hecho). Backoff exponencial base·2^(n-1) con jitter obligatorio
 *  (W1: un metrónomo exacto es firma de autómata). Determinista con el
 *  aleatorio inyectado. */
export function planReintento(
  intentos: number,
  aleatorio: () => number,
  baseMs: number = RETARDO_BASE_MS,
): PlanReintento {
  if (intentos >= REINTENTOS_MAX) {
    return { reintentar: false, esperaMs: 0, rendirse: true, detalle: `Tope de ${REINTENTOS_MAX} reintentos consumido: el fallo se reporta tal cual, para revisión humana.` }
  }
  const bruto = baseMs * Math.pow(2, Math.max(0, intentos - 1))
  const p = Math.min(1, Math.max(0, PROPORCION_JITTER))
  const esperaMs = Math.max(0, Math.round(bruto + (aleatorio() * 2 - 1) * bruto * p))
  return { reintentar: true, esperaMs, rendirse: false, detalle: `Reintento ${intentos + 1}/${REINTENTOS_MAX} en ${esperaMs} ms (backoff con jitter).` }
}

// ── Parseo HONESTO de la instrucción del webhook ──────────────────────────

export type AccionInstruccion = 'enviar' | 'nada'

export interface InstruccionWebhook {
  accion: AccionInstruccion
  texto: string | null
  /** id de la fila saliente — el daemon lo devuelve en marcar_envio. */
  mensajeId: string | null
  estado: string | null
  motivo: string | null
}

/** Traduce la respuesta de /api/whatsapp/conversacion a una instrucción
 *  ejecutable. Respuesta basura o status raro → 'nada' con motivo (el daemon
 *  jamás improvisa un texto que el cerebro no firmó). */
export function parsearInstruccion(status: number, json: unknown): InstruccionWebhook {
  const base: InstruccionWebhook = { accion: 'nada', texto: null, mensajeId: null, estado: null, motivo: null }
  if (typeof json !== 'object' || json === null) {
    return { ...base, motivo: `Respuesta del webhook no es un objeto (HTTP ${status}): nada se envía.` }
  }
  const o = json as Record<string, unknown>
  const estado = typeof o.estado === 'string' ? o.estado : null
  const motivo = typeof o.motivo === 'string' ? o.motivo : typeof o.error === 'string' ? o.error : null
  const mensajeId = typeof o.mensajeId === 'string' ? o.mensajeId : null
  if (status < 200 || status >= 300) {
    return { ...base, estado, motivo: motivo ?? `Webhook respondió HTTP ${status}: nada se envía.` }
  }
  if (o.responder === true && typeof o.texto === 'string' && o.texto.trim()) {
    // instrucción de envío (también la re-entrega idempotente de una cola viva)
    return { accion: 'enviar', texto: o.texto, mensajeId, estado: estado ?? 'en_cola', motivo }
  }
  return { ...base, estado, motivo: motivo ?? 'CHAT-X pidió no responder: nada se envía.' }
}

// ── Plan de arranque (sesión CHAT-X vs. credenciales locales) ─────────────

export type PlanArranque = 'registrar' | 'continuar' | 'parar_operador'

export interface ResultadoArranque {
  plan: PlanArranque
  detalle: string
}

/** Decide el arranque comparando el estado HONESTO de la sesión en CHAT-X con
 *  las credenciales locales del daemon:
 *  - registrar:   CHAT-X no tiene sesión viva (NO_CONFIGURADO/DESCONECTADA/
 *                 ESPERANDO_QR) → iniciar_espera_qr + confirmar_conexion al
 *                 emparejar (cada conexión pasa por espera fresca: higiene).
 *  - continuar:   CHAT-X ya está CONECTADA con el MISMO número (huella igual)
 *                 y secreto presente → el daemon sigue sin re-handshake.
 *  - parar_operador: contradicción (huella distinta = número cambió; CHAT-X
 *                 inalcanzable; secreto ausente) → el daemon SE DETIENE y lo
 *                 declara: nada se finge ni se sobreescribe en silencio.
 *  `huellaLocal` es la huella del número emparejado en esta máquina (null si
 *  aún no hay credenciales). */
export function planArranque(
  estadoCHATX: string | null,
  secretoPresente: boolean,
  huellaLocal: string | null,
  huellaCHATX: string | null,
  chatxAlcanzable: boolean,
): ResultadoArranque {
  if (!chatxAlcanzable) {
    return { plan: 'parar_operador', detalle: 'CHAT-X no responde: el daemon no trabaja sin su casa (nada se finge offline).' }
  }
  if (estadoCHATX === 'CONECTADA') {
    if (!secretoPresente) {
      return { plan: 'parar_operador', detalle: 'CHAT-X dice CONECTADA pero el secreto de sesión no está: revisa el panel (rotar o desconectar) — el daemon no sobreescribe.' }
    }
    if (huellaLocal && huellaCHATX && huellaLocal !== huellaCHATX) {
      return { plan: 'parar_operador', detalle: 'La huella del número local NO coincide con la de CHAT-X: el número cambió — exige rotación humana antes de continuar.' }
    }
    return { plan: 'continuar', detalle: 'Sesión CONECTADA con el mismo número: el daemon continúa sin re-emparejar.' }
  }
  return { plan: 'registrar', detalle: `Sesión ${estadoCHATX ?? 'desconocida'}: el daemon pide espera fresca y confirma al emparejar.` }
}

// ── Huella local del número (misma separación de dominio que la casa) ─────

/** Igual que huellaNumero() en sesion.ts — duplicada A CONSCIÓN para que el
 *  daemon no arrastre el cifrado del carril privado. El test de drift afirma
 *  que ambas producen la MISMA huella (si una cambia, el test rompe). */
export function huellaDaemon(e164: string): string {
  return crypto.createHash('sha256').update(`chatx-wa-num:${e164}`).digest('hex').slice(0, 32)
}

// ── Constructores de payloads del webhook (firmado por el daemon) ─────────

/** Cuerpo JSON del POST 'entrante'. `recibidoEn` opcional (ISO del momento
 *  real en que llegó — la BD de la casa lo guarda en meta). */
export function payloadEntrante(id: string, chatId: string, texto: string, recibidoEn?: string | null): string {
  return JSON.stringify({
    accion: 'entrante',
    id: id.trim(),
    chatId: chatId.trim(),
    texto: texto.trim(),
    ...(recibidoEn ? { recibidoEn } : {}),
  })
}

/** Cuerpo JSON del POST 'marcar_envio' — el resultado VERDADERO del envío. */
export function payloadMarca(id: string, resultado: 'enviado' | 'fallado', errorRiesgo: boolean, detalle: string): string {
  return JSON.stringify({ accion: 'marcar_envio', id: id.trim(), resultado, errorRiesgo, detalle: detalle.slice(0, 300) })
}

/** Cuerpo JSON del poll de iniciativas vencidas (W4). */
export function payloadPoll(): string {
  return JSON.stringify({ accion: 'iniciativas_vencidas' })
}

/** Firma del webhook de la casa (HMAC-SHA256 de `${ts}.${cuerpo}`) — el mismo
 *  cerrojo que verifica CHAT-X. Una sola implementación vive en conversacion.ts. */
export function firmarCuerpo(tsMs: number, cuerpo: string, secreto: string): string {
  return firmarWebhook(tsMs, cuerpo, secreto)
}

// F1 · W3 (EMBUDO §7 · PROJECT_STATE hito 3) — bucle de conversación del canal
// WhatsApp PROPIO del negocio. Mitad CHAT-X del bucle: webhook de entrada
// FIRMADO (HMAC-SHA256, fail-closed) → cerebro modo novia (los MISMOS filtros
// de edad que /api/chat) → gate → decisión de pacing (W1) → instrucción de
// envío al daemon. Sala limpia (D-007): conceptos generales (cola con marcas,
// firma HMAC de webhook, idempotencia por id) — cero código, contratos o
// constantes de los clones.
// Reglas que este módulo hace cumplir por diseño:
//  - Aquí NO hay sesión real de WhatsApp y NO se finge: CHAT-X decide QUÉ y
//    registra todo en casa; el daemon (máquina del fundador) es el ÚNICO que
//    toca la red de WhatsApp.
//  - WhatsApp es canal SFW (EMBUDO §4): si la entrada del contacto o la salida
//    del cerebro activa el filtro de edad, NADA sale por WhatsApp y queda
//    auditado (compliance append-only) para revisión humana.
//  - El número es el activo: el pacing (W1) decide CUÁNDO con sus topes
//    conservadores; sin sesión CONECTADA no hay conversación ninguna.
//  - Módulo puro (sin BD, red ni reloj propio): todo inyectado y testeable —
//    mismo criterio que pacing.ts y sesion.ts.
import crypto from 'crypto'
import type { ConfigPacing, DecisionEnvio, MarcaEnvio } from './pacing'

// Cerrojo HMAC de la casa (una sola implementación para TODOS los cuartos
// propios — F1 WhatsApp y F3 Telegram): vive en src/lib/canales.ts y se
// re-exporta aquí para que los consumos previos (W3/W4, tests) no cambien.
export { TOLERANCIA_FIRMA_MS, firmarWebhook, verificarFirmaWebhook, type MotivoFirmaInvalida } from '../canales'

// ── Límites del contrato con el daemon ────────────────────────────────────

export const MAX_TEXTO_ENTRADA = 600 // mismo tope que el GFE del operador
export const MAX_CHATID = 128
export const MAX_ID_ENTRADA = 128
export const MAX_DETALLE = 300
// (TOLERANCIA_FIRMA_MS vive en src/lib/canales.ts y se re-exporta arriba.)

export type DireccionMensaje = 'entrada' | 'salida'
export type EstadoMensaje = 'recibido' | 'en_cola' | 'enviado' | 'fallado' | 'bloqueado_pacing'
export type ResultadoEnvioDaemon = 'enviado' | 'fallado'

// ── Firma del webhook (daemon → CHAT-X): ver src/lib/canales.ts — re-export arriba ──

// ── Validación de los payloads del daemon ─────────────────────────────────

export interface MensajeEntrante {
  idEntrada: string // id que puso el daemon (idempotencia de reenvíos)
  chatId: string
  texto: string
  recibidoEn: Date | null
}

export function validarEntrante(p: unknown): { ok: true; datos: MensajeEntrante } | { ok: false; error: string } {
  if (typeof p !== 'object' || p === null) return { ok: false, error: 'Payload ausente.' }
  const o = p as Record<string, unknown>
  const idEntrada = typeof o.id === 'string' ? o.id.trim() : ''
  if (!idEntrada) return { ok: false, error: 'Falta el id del mensaje (lo pone el daemon; sirve para no procesar dos veces un reenvío).' }
  if (idEntrada.length > MAX_ID_ENTRADA) return { ok: false, error: `id demasiado largo (máx ${MAX_ID_ENTRADA}).` }
  const chatId = typeof o.chatId === 'string' ? o.chatId.trim() : ''
  if (!chatId) return { ok: false, error: 'Falta chatId: el chat de WhatsApp que escribió.' }
  if (chatId.length > MAX_CHATID) return { ok: false, error: `chatId demasiado largo (máx ${MAX_CHATID}).` }
  if (!/\d/.test(chatId)) return { ok: false, error: 'chatId sin dígitos: no parece un chat de WhatsApp.' }
  const texto = typeof o.texto === 'string' ? o.texto.trim() : ''
  if (!texto) return { ok: false, error: 'Falta el texto del mensaje.' }
  if (texto.length > MAX_TEXTO_ENTRADA) return { ok: false, error: `texto demasiado largo (máx ${MAX_TEXTO_ENTRADA}).` }
  let recibidoEn: Date | null = null
  if (typeof o.recibidoEn === 'string' && o.recibidoEn) {
    const d = new Date(o.recibidoEn)
    if (!Number.isNaN(d.getTime())) recibidoEn = d
  }
  return { ok: true, datos: { idEntrada, chatId, texto, recibidoEn } }
}

export interface MarcaEnvioDaemon {
  id: string // id de la fila WhatsAppMensaje (salida) que este webhook devolvió
  resultado: ResultadoEnvioDaemon
  errorRiesgo: boolean // fallo CON señal de riesgo → alimenta el disyuntor
  detalle: string
}

export function validarMarcaEnvio(p: unknown): { ok: true; datos: MarcaEnvioDaemon } | { ok: false; error: string } {
  if (typeof p !== 'object' || p === null) return { ok: false, error: 'Payload ausente.' }
  const o = p as Record<string, unknown>
  const id = typeof o.id === 'string' ? o.id.trim() : ''
  if (!id) return { ok: false, error: 'Falta el id del mensaje saliente (el webhook lo devolvió al aceptar la respuesta).' }
  const resultado = o.resultado
  if (resultado !== 'enviado' && resultado !== 'fallado')
    return { ok: false, error: 'resultado debe ser "enviado" o "fallado".' }
  const errorRiesgo = o.errorRiesgo === true || o.errorRiesgo === 'true'
  const detalle = typeof o.detalle === 'string' ? o.detalle.trim().slice(0, MAX_DETALLE) : ''
  return { ok: true, datos: { id, resultado, errorRiesgo, detalle } }
}

// ── Marcas de pacing desde filas de BD (puramente funcional) ──────────────

export interface FilaParaMarca {
  chatId: string
  estado: string
  tipo: string
  errorRiesgo: boolean
  enviadoEn: Date | null
  updatedAt: Date | string
}

/** Filas ya SALIDAS (enviado/fallado) → MarcaEnvio para decidirEnvio().
 *  Los bloqueos (bloqueado_pacing) NO cuentan: nunca tocaron la red. El
 *  disyuntor solo se alimenta de fallos CON señal de riesgo (W1). */
export function marcasDesdeFilas(filas: readonly FilaParaMarca[]): MarcaEnvio[] {
  return filas
    .filter((f) => f.estado === 'enviado' || f.estado === 'fallado')
    .map((f) => ({
      chatId: f.chatId,
      t: f.enviadoEn ?? (f.updatedAt instanceof Date ? f.updatedAt : new Date(f.updatedAt)),
      tipo: f.tipo === 'iniciativa' ? ('iniciativa' as const) : ('respuesta' as const),
      error: f.estado === 'fallado' && f.errorRiesgo,
    }))
}

// ── Pacing desde la configuración en caliente ─────────────────────────────

/** Valores crudos de configuración (BD panel > env > defecto) → ConfigPacing.
 *  Solo se exponen los 4 topes operativos; calentamiento y disyuntor quedan en
 *  defecto del código (líneas de seguridad, se afirman en código, no en UI).
 *  Un valor inválido NO rompe nada: vuelve al defecto (honesto y conservador). */
export function parsearPacingConfig(
  valores: { silencioDesde?: string; silencioHasta?: string; maxRespuestas?: string; maxIniciativas?: string },
  defecto: ConfigPacing,
): ConfigPacing {
  const num = (v: string | undefined, min: number, max: number, siFalla: number): number => {
    if (v === undefined || v.trim() === '') return siFalla
    const n = Number(v)
    if (!Number.isInteger(n) || n < min || n > max) return siFalla
    return n
  }
  return {
    ...defecto,
    desdeHoraSilencio: num(valores.silencioDesde, 0, 23, defecto.desdeHoraSilencio),
    hastaHoraSilencio: num(valores.silencioHasta, 0, 23, defecto.hastaHoraSilencio),
    maxRespuestasPorDia: num(valores.maxRespuestas, 1, 200, defecto.maxRespuestasPorDia),
    maxIniciativasPorDia: num(valores.maxIniciativas, 1, 100, defecto.maxIniciativasPorDia),
  }
}

// ── Resolución del bucle (gate + pacing, pura) ────────────────────────────

/** Resultado del cerebro, ya SEGURO: la ruta resolvió plantilla/LLM y en caso
 *  de filtro de edad en la salida ya cayó a plantilla auditada (igual que
 *  /api/chat). Este módulo no conoce LLM: solo recibe el texto final. */
export interface CerebroResuelto {
  texto: string
  modo: string // 'plantilla_genoma' | 'llm_<proveedor>'
  meta: Record<string, unknown>
}

export type EstadoSalida = 'en_cola' | 'bloqueado_pacing' | 'bloqueado_filtro'

export interface ResultadoResolver {
  responder: boolean // true = el daemon debe enviar textoSalida YA
  textoSalida: string | null
  estadoSalida: EstadoSalida
  motivo: string // frase honesta para compliance y panel
  meta: Record<string, unknown>
}

export interface EntradaResolver {
  filtroEntradaTripo: boolean
  decisionPacing: DecisionEnvio
  /** Presente SOLO si el veredicto llegó a la fase del cerebro: la ruta llama
   *  al LLM después de resolver (si el pacing bloquea, el cerebro no se gasta
   *  — regla $0). */
  cerebro?: CerebroResuelto
}

/** Orden del veredicto (el primero que aplique gana):
 *  1. filtro de edad en la ENTRADA → nada sale, sin cerebro, sin salida; el
 *     mensaje queda auditado para revisión humana;
 *  2. pacing dice no → la conversación queda en cola fría (bloqueado_pacing)
 *     con motivo + reintentarEn: el daemon repregunta cuando el pacing abra;
 *  3. todo en orden → en_cola con instrucción de envío inmediato. */
export function resolverSalida(p: EntradaResolver): ResultadoResolver {
  if (p.filtroEntradaTripo) {
    return {
      responder: false,
      textoSalida: null,
      estadoSalida: 'bloqueado_filtro',
      motivo:
        'El mensaje del contacto activó el filtro de edad de la plataforma: sin respuesta automática; queda en el log de compliance para revisión humana.',
      meta: { filtro: 'entrada' },
    }
  }
  if (!p.decisionPacing.permitido) {
    return {
      responder: false,
      textoSalida: p.cerebro?.texto ?? null,
      estadoSalida: 'bloqueado_pacing',
      motivo: p.decisionPacing.detalle,
      meta: { pacing: p.decisionPacing.motivo, reintentarEn: p.decisionPacing.reintentarEn, ...(p.cerebro ? { modo: p.cerebro.modo } : {}) },
    }
  }
  if (!p.cerebro) {
    // Cableado incorrecto del caller: honesto ante todo, NADA se envía.
    return {
      responder: false,
      textoSalida: null,
      estadoSalida: 'bloqueado_pacing',
      motivo: 'El veredicto pidió cerebro pero no llegó resultado (cableado interno): nada se envía.',
      meta: { bug: 'cerebro_ausente' },
    }
  }
  return {
    responder: true,
    textoSalida: p.cerebro.texto,
    estadoSalida: 'en_cola',
    motivo: p.decisionPacing.detalle,
    meta: { pacing: 'ok', modo: p.cerebro.modo },
  }
}

// ── Transición al reportar el envío (marcar_envio) ────────────────────────

export interface ResultadoTransicionEnvio {
  ok: boolean
  estado?: EstadoMensaje
  idempotente?: boolean // el daemon re-reportó lo mismo: sin efecto, sin error
  error?: string
}

/** Reglas del reporte del daemon:
 *  - en_cola → enviado | fallado: el ciclo normal;
 *  - mismo estado repetido: idempotente (los reintentos de red no rompen);
 *  - fallado → enviado: legítimo (el reintento del daemon por fin salió);
 *  - enviado → fallado: contradicción (lo entregado no se des-entrega) → 409;
 *  - bloqueado_pacing: nada se envió jamás → el daemon repregunta entrante;
 *  - recibido: es una fila ENTRANTE, no un envío. */
export function transicionEnvio(
  estadoActual: EstadoMensaje,
  resultado: ResultadoEnvioDaemon,
): ResultadoTransicionEnvio {
  if (estadoActual === resultado) return { ok: true, estado: estadoActual, idempotente: true }
  if (estadoActual === 'en_cola') return { ok: true, estado: resultado, idempotente: false }
  if (estadoActual === 'fallado' && resultado === 'enviado')
    return { ok: true, estado: 'enviado', idempotente: false } // el reintento salió: se actualiza
  if (estadoActual === 'bloqueado_pacing')
    return {
      ok: false,
      error:
        'Esta respuesta está bloqueada por pacing: nada se envió. Vuelve a pedir el mensaje entrante cuando el pacing abra.',
    }
  if (estadoActual === 'recibido') return { ok: false, error: 'Esa fila es un mensaje ENTRANTE, no un envío saliente.' }
  return {
    ok: false,
    error: `Contradicción: la fila está ${estadoActual} y el daemon reporta ${resultado}. Queda en el log de compliance para revisión humana.`,
  }
}

// ── Máscara del chatId para panel y logs ──────────────────────────────────

/** •••••4567@s.whatsapp.net — la cola de 4 dígitos del chat; los grupos se
 *  distinguen por su dominio. El chatId completo jamás sale a la UI. */
export function mascararChatId(chatId: string): string {
  const at = chatId.lastIndexOf('@')
  if (at === -1) {
    const digitos = chatId.replace(/\D/g, '')
    return digitos ? `•••••${digitos.slice(-4)}` : '•••••'
  }
  const cola = chatId.slice(0, at).replace(/\D/g, '').slice(-4)
  return `•••••${cola || '••••'}${chatId.slice(at)}`
}

// F3 (EMBUDO §7 · cuarto #3 de CASA PROPIA) — canal Telegram PROPIO del negocio.
// Lógica PURA del cuarto: igual que WhatsApp (W2/W3/W4) en honestidad, distinto
// en contrato: un bot de Telegram NO empareja por QR — necesita SU TOKEN, que
// descansa SOLO en la máquina del fundador (el daemon es el único que toca la
// red de Telegram). Aquí solo viven datos públicos (id/@usuario del bot, getMe).
// Reglas del cuarto por diseño:
//  - Fail-closed igual que la casa: sin telegram.webhook_secreto el receptor
//    está APAGADO (503); firma ausente/mala/vencida → 401 (cerrojo compartido
//    en src/lib/canales.ts — una sola implementación para todos los cuartos).
//  - Canal SFW POR AHORA: el filtro de edad aplica en ENTRADA y SALIDA igual
//    que WhatsApp; el 18+ de Telegram espera verificación de términos y
//    procesador (NORTE §2: ningún canal se habilita por suposición). El cobro
//    (Stars/procesador) NO se construye — regla $0 hasta orden del fundador.
//  - Memoria POR CHAT en BD propia (TelegramMensaje): dos contactos jamás
//    comparten contexto entre sí ni con el GFE ni con el cuarto WhatsApp.
//  - El chatId de Telegram es el id NUMÉRICO de la API de bots (usuarios
//    positivos, grupos/canales negativos) — NUNCA un @handle que el operador
//    escriba a mano (eso es de la Mesa Meta, F4).
//  - Módulo puro (sin BD, red ni reloj propio): todo inyectado y testeable.
import { PULSO_VIVO_MS } from '../canales'
import type { DecisionEnvio } from '../whatsapp/pacing'

// ── Límites del contrato con el daemon ────────────────────────────────────

export const MAX_CHATID = 64 // ids numéricos de Telegram (grupos -100… caben holgados)
export const MAX_ID_ENTRADA = 64 // update_id del bot
export const MAX_BOT_ID = 32
export const MAX_BOT_USUARIO = 64
export const MAX_PROGRAMADAS_POR_CHAT = 3 // consentimiento 1:1 (mismo criterio que WhatsApp W4)
export const MAX_POR_POLL = 5 // goteo por poll del daemon
export const MAX_HORIZONTE_DIAS = 30

export type EstadoSesionTelegram = 'NO_CONFIGURADO' | 'CONECTADA' | 'DESCONECTADA'
export type AccionSesionTelegram = 'confirmar_conexion' | 'desconectar'

// ── Validación del entrante (payload del daemon) ──────────────────────────

export interface MensajeEntranteTelegram {
  idEntrada: string
  chatId: string
  texto: string
  recibidoEn: Date | null
}

/** El chatId de Telegram es numérico (opcional '-' inicial para grupos/canales).
 *  Un @handle o cualquier texto no-numérico se rechaza: eso no es un chat de
 *  la API de bots, es invento del operador. */
export function validarEntranteTelegram(p: unknown): { ok: true; datos: MensajeEntranteTelegram } | { ok: false; error: string } {
  if (typeof p !== 'object' || p === null) return { ok: false, error: 'Payload ausente.' }
  const o = p as Record<string, unknown>
  const idEntrada = typeof o.id === 'string' ? o.id.trim() : ''
  if (!idEntrada) return { ok: false, error: 'Falta el id del update (lo pone el daemon; sirve para no procesar dos veces un reenvío).' }
  if (idEntrada.length > MAX_ID_ENTRADA) return { ok: false, error: `id demasiado largo (máx ${MAX_ID_ENTRADA}).` }
  const chatId = typeof o.chatId === 'string' ? o.chatId.trim() : ''
  if (!chatId) return { ok: false, error: 'Falta chatId: el id numérico del chat de Telegram.' }
  if (chatId.length > MAX_CHATID) return { ok: false, error: `chatId demasiado largo (máx ${MAX_CHATID}).` }
  if (!/^-?\d+$/.test(chatId)) return { ok: false, error: 'chatId no es un id numérico de Telegram (usuarios positivos, grupos/canales negativos) — los @handles NO son chatIds.' }
  const texto = typeof o.texto === 'string' ? o.texto.trim() : ''
  if (!texto) return { ok: false, error: 'Falta el texto del mensaje.' }
  if (texto.length > 600) return { ok: false, error: 'texto demasiado largo (máx 600).' }
  let recibidoEn: Date | null = null
  if (typeof o.recibidoEn === 'string' && o.recibidoEn) {
    const d = new Date(o.recibidoEn)
    if (!Number.isNaN(d.getTime())) recibidoEn = d
  }
  return { ok: true, datos: { idEntrada, chatId, texto, recibidoEn } }
}

/** •••••7890 (usuario) · -•••••7890 (grupo/canal, se distingue por el signo).
 *  El chatId completo jamás sale a la UI — solo para el daemon firmado. */
export function mascararChatIdTelegram(chatId: string): string {
  const negativo = chatId.startsWith('-')
  const digitos = chatId.replace(/^-/, '').replace(/\D/g, '')
  if (!digitos) return '•••••'
  return `${negativo ? '-' : ''}•••••${digitos.slice(-4)}`
}

// ── Confirmación del bot (identidad PÚBLICA del getMe — jamás el token) ───

export interface IdentidadBot {
  botId: string
  botUsuario: string
}

/** El daemon presenta lo que getMe le dio: id y @usuario del bot. El TOKEN
 *  JAMÁS viaja a CHAT-X (vive solo en la máquina del fundador). */
export function validarConfirmacionBot(botId: unknown, botUsuario: unknown): { ok: true; datos: IdentidadBot } | { ok: false; error: string } {
  const id = typeof botId === 'string' ? botId.trim() : typeof botId === 'number' ? String(botId) : ''
  if (!/^\d{4,32}$/.test(id)) return { ok: false, error: 'botId inválido: el daemon presenta el id numérico público del bot (getMe), no el token.' }
  const usuario = typeof botUsuario === 'string' ? botUsuario.trim() : ''
  if (!/^@[A-Za-z0-9_]{4,63}$/.test(usuario))
    return { ok: false, error: 'botUsuario inválido: debe ser el @usuario público del bot (ej. @muse_bot).' }
  return { ok: true, datos: { botId: id, botUsuario: usuario } }
}

// ── Máquina de estados del cuarto (pura) ──────────────────────────────────

export interface ResultadoTransicionTelegram {
  ok: boolean
  estado?: EstadoSesionTelegram
  error?: string
}

/** Reglas:
 *  - confirmar_conexion: desde NO_CONFIGURADO o DESCONECTADA → CONECTADA (la
 *    ruta exige además que el webhook esté firmado: la identidad del bot viaja
 *    por el canal firmado, no por una llamada abierta). Desde CONECTADA →
 *    rechazado: para cambiar de bot, primero desconectar (explícito).
 *  - desconectar: desde CONECTADA o DESCONECTADA → DESCONECTADA; desde
 *    NO_CONFIGURADO → rechazo honesto (no hay nada que bajar). */
export function transicionSesionTelegram(estadoActual: EstadoSesionTelegram, accion: AccionSesionTelegram): ResultadoTransicionTelegram {
  switch (accion) {
    case 'confirmar_conexion':
      if (estadoActual === 'CONECTADA')
        return { ok: false, error: 'El bot ya está CONECTADO: para cambiarlo, primero desconectar (explícito) — nada se sobreescribe en silencio.' }
      return { ok: true, estado: 'CONECTADA' }
    case 'desconectar':
      if (estadoActual === 'NO_CONFIGURADO') return { ok: false, error: 'No hay bot conectado que desconectar (nunca se configuró).' }
      return { ok: true, estado: 'DESCONECTADA' }
  }
}

// ── Pulso del daemon (señal viva, jamás un estado inventado) ──────────────

export type EstadoPulso = 'sin_pulso' | 'vivo' | 'tibio'

/** 'vivo' = heartbeat dentro de PULSO_VIVO_MS; 'tibio' = pasó la ventana (el
 *  daemon puede estar caído — aviso en el panel); 'sin_pulso' = nunca latió.
 *  El ESTADO de la sesión NO cambia por el pulso: lo cambia el daemon
 *  presentando su identidad o el operador bajándola. */
export function estadoPulso(ultimoPulsoEn: Date | string | null, ahora: Date): EstadoPulso {
  if (!ultimoPulsoEn) return 'sin_pulso'
  const t = ultimoPulsoEn instanceof Date ? ultimoPulsoEn : new Date(ultimoPulsoEn)
  const diff = ahora.getTime() - t.getTime()
  if (diff < 0) return 'tibio' // pulso del futuro: reloj desalineado — tibio, no vivo
  return diff < PULSO_VIVO_MS ? 'vivo' : 'tibio'
}

// ── Programación de iniciativas (mismo espíritu que WhatsApp W4) ──────────

export interface ProgramacionIniciativaTelegram {
  chatId: string
  programadaEn: Date | null
  brief: string
}

export function validarProgramacionTelegram(p: unknown): { ok: true; datos: ProgramacionIniciativaTelegram } | { ok: false; error: string } {
  if (typeof p !== 'object' || p === null) return { ok: false, error: 'Payload ausente.' }
  const o = p as Record<string, unknown>
  const chatId = typeof o.chatId === 'string' ? o.chatId.trim() : ''
  if (!chatId) return { ok: false, error: 'Falta chatId: el id numérico del contacto consentido.' }
  if (chatId.length > MAX_CHATID) return { ok: false, error: `chatId demasiado largo (máx ${MAX_CHATID}).` }
  if (!/^-?\d+$/.test(chatId)) return { ok: false, error: 'chatId no es un id numérico de Telegram (los @handles NO son chatIds).' }
  let programadaEn: Date | null = null
  if (typeof o.programadaEn === 'string' && o.programadaEn.trim()) {
    const d = new Date(o.programadaEn)
    if (Number.isNaN(d.getTime())) return { ok: false, error: 'programadaEn no es una fecha válida (ISO esperado).' }
    programadaEn = d
  }
  const brief = typeof o.texto === 'string' ? o.texto.trim().slice(0, 300) : ''
  return { ok: true, datos: { chatId, programadaEn, brief } }
}

/** Horizonte máximo de programación (igual que WhatsApp: lo lejano es
 *  acumulación, no planificación). */
export function fueraDeHorizonte(programadaEn: Date, ahora: Date): boolean {
  return programadaEn.getTime() > ahora.getTime() + MAX_HORIZONTE_DIAS * 24 * 60 * 60 * 1000
}

// ── Veredicto y transiciones (lógica de la casa, compartida) ──────────────

/** El veredicto por iniciativa REUTILIZA resolverIniciativa de WhatsApp W4:
 *  el orden de honestidad (pacing con disyuntor en vivo → cerebro) es idéntico
 *  porque es UNA constitución, no dos. */
export {
  resolverIniciativa,
  transicionCancelacion,
  type VeredictoIniciativa,
  type CerebroIniciativa,
} from '../whatsapp/iniciativas'

/** El bucle entrante (filtro → pacing → cerebro) y el reporte del envío son
 *  LA MISMA lógica que WhatsApp W3 — compartida, no copiada. */
export {
  transicionEnvio,
  validarMarcaEnvio,
  resolverSalida,
  parsearPacingConfig,
  marcasDesdeFilas,
} from '../whatsapp/conversacion'
export type { EstadoMensaje, ResultadoEnvioDaemon, CerebroResuelto } from '../whatsapp/conversacion'

/** Afirmación de diseño: el veredicto de iniciativa de Telegram respeta el
 *  mismo contrato que el de WhatsApp (misma constitución). Si WhatsApp cambia
 *  su firma, esto rompe en tsc — y es mejor romper en tsc que divergir. */
export function verificarContratoCompartido(
  decisionPacing: DecisionEnvio,
): { entregar: boolean; estado: 'en_cola' | 'sigue_programada' } {
  if (!decisionPacing.permitido) return { entregar: false, estado: 'sigue_programada' }
  return { entregar: true, estado: 'en_cola' }
}

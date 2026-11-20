// F1 · W2 (EMBUDO §7 · PROJECT_STATE hito 3) — sesión WhatsApp PROPIA del negocio.
// Lógica PURA: máquina de estados de la sesión, reto QR con caducidad, huella
// del número y cifrado en reposo del secreto de sesión (AES-256-GCM con clave
// derivada del secreto del servidor + separación de dominio). Sala limpia
// (D-007): solo conceptos generales (QR de emparejamiento, sesión persistida,
// rotación/logout) — cero código, contratos o constantes de los clones.
// Honestidad ante todo:
//  - CONECTADA solo llega cuando el daemon real (máquina del fundador) presenta
//    número + secreto tras el emparejamiento VERDADERO — nunca se inventa.
//  - El secreto jamás viaja en claro por respuestas ni logs: se guarda cifrado
//    y el número como huella hash + máscara de últimos 4.
//  - Mismo criterio que src/lib/whatsapp/pacing.ts y src/lib/cola.ts: sin BD,
//    sin red, sin reloj propio — todo inyectado y testeable.
import crypto from 'crypto'
import { cifrarBuffer, descifrarBuffer } from '@/lib/crypto'

// ── Estados y acciones ─────────────────────────────────────────────────────

export type EstadoSesion = 'NO_CONFIGURADO' | 'ESPERANDO_QR' | 'CONECTADA' | 'DESCONECTADA'

export type AccionSesion =
  | 'iniciar_espera_qr'
  | 'confirmar_conexion'
  | 'rotar'
  | 'desconectar'
  | 'caducar_qr'

/** Un QR de emparejamiento vive ~1 minuto: si nadie lo confirma, vence y hay
 *  que pedir otro. Ventana corta a propósito (higiene del número). */
export const QR_CADUCIDAD_MS = 60_000

/** Límites del blob de sesión que acepta confirmar_conexion (credenciales
 *  serializadas de la librería del daemon — nunca una cadena vacía ni un
 *  volcado absurdo). */
export const SECRETO_MIN_CHARS = 16
export const SECRETO_MAX_CHARS = 131_072

// ── Número: normalizar, huella y máscara ───────────────────────────────────

/** Normaliza a formato E.164 aceptando espacios, guiones y paréntesis.
 *  Sin '+' el número se acepta igual (el daemon lo manda ya normalizado);
 *  el límite de E.164 (máx 15 dígitos) se respeta siempre. */
export function normalizarNumero(entrada: string): { ok: true; e164: string } | { ok: false; error: string } {
  const limpio = entrada.trim().replace(/[\s\-().]/g, '')
  const conMas = limpio.startsWith('+')
  const digitos = limpio.replace(/\D/g, '')
  if (!digitos) return { ok: false, error: 'Sin dígitos: da el número en formato E.164 (ej. +573001234567).' }
  if (digitos.length < 8) return { ok: false, error: 'Demasiado corto: E.164 exige al menos 8 dígitos.' }
  if (digitos.length > 15) return { ok: false, error: 'Demasiado largo: E.164 admite máx 15 dígitos.' }
  return { ok: true, e164: `${conMas ? '+' : ''}${digitos}` }
}

/** Huella del número: SHA-256 con separación de dominio, recortada a 32 hex.
 *  La BD guarda ESTO, jamás el número en claro; sirve para detectar si el
 *  número cambió sin revelarlo. */
export function huellaNumero(e164: string): string {
  return crypto.createHash('sha256').update(`chatx-wa-num:${e164}`).digest('hex').slice(0, 32)
}

/** Máscara visible para el panel: solo la cola de 4 dígitos. */
export function mascararNumero(e164: string): string {
  return `•••••${e164.replace(/\D/g, '').slice(-4)}`
}

// ── Reto QR (espera de emparejamiento) ─────────────────────────────────────

export interface DesafioQr {
  codigo: string
  creadoEn: Date
  caducaEn: Date
}

/** Reto aleatorio que CHAT-X pone en espera; el daemon real (W3) lo cambia
 *  por el par verdadero al escanear el QR. Caducidad corta por higiene. */
export function nuevoDesafioQr(ahora: Date, caducidadMs: number = QR_CADUCIDAD_MS): DesafioQr {
  return {
    codigo: crypto.randomBytes(24).toString('base64url'),
    creadoEn: ahora,
    caducaEn: new Date(ahora.getTime() + caducidadMs),
  }
}

export type EstadoQr = 'ausente' | 'vigente' | 'caducado'

export function estadoQr(desafio: { caducaEn: Date | string } | null, ahora: Date): EstadoQr {
  if (!desafio) return 'ausente'
  const caduca = desafio.caducaEn instanceof Date ? desafio.caducaEn : new Date(desafio.caducaEn)
  return caduca.getTime() > ahora.getTime() ? 'vigente' : 'caducado'
}

// ── Máquina de estados (pura) ──────────────────────────────────────────────

export interface ResultadoTransicion {
  ok: boolean
  estado?: EstadoSesion
  error?: string
}

/** Valida la transición pedido SIN tocar BD (la ruta la aplica si ok).
 *  Reglas:
 *  - iniciar_espera_qr: desde NO_CONFIGURADO o DESCONECTADA; una sesión
 *    CONECTADA exige rotar (logout explícito) y no re-abre espera.
 *  - confirmar_conexion: solo desde ESPERANDO_QR (el resto lo guarda la ruta:
 *    QR vigente + número + secreto).
 *  - rotar: solo desde CONECTADA → vuelve a ESPERANDO_QR con secreto invalidado.
 *  - desconectar: desde ESPERANDO_QR o CONECTADA → DESCONECTADA (borra secreto).
 *  - caducar_qr: solo desde ESPERANDO_QR → DESCONECTADA. */
export function transicionSesion(estadoActual: EstadoSesion, accion: AccionSesion): ResultadoTransicion {
  switch (accion) {
    case 'iniciar_espera_qr':
      if (estadoActual === 'CONECTADA')
        return { ok: false, error: 'La sesión está CONECTADA: para re-emparejar usa rotar (logout explícito), no una nueva espera.' }
      if (estadoActual === 'ESPERANDO_QR')
        return { ok: false, error: 'Ya hay un emparejamiento en espera: usa caducar_qr si el reto venció.' }
      return { ok: true, estado: 'ESPERANDO_QR' }
    case 'confirmar_conexion':
      if (estadoActual !== 'ESPERANDO_QR')
        return { ok: false, error: `confirmar_conexion solo procede desde ESPERANDO_QR (estado actual: ${estadoActual}).` }
      return { ok: true, estado: 'CONECTADA' }
    case 'rotar':
      if (estadoActual !== 'CONECTADA')
        return { ok: false, error: `rotar solo procede desde CONECTADA (estado actual: ${estadoActual}).` }
      return { ok: true, estado: 'ESPERANDO_QR' }
    case 'desconectar':
      if (estadoActual === 'NO_CONFIGURADO')
        return { ok: false, error: 'No hay sesión que desconectar (nunca se configuró).' }
      return { ok: true, estado: 'DESCONECTADA' }
    case 'caducar_qr':
      if (estadoActual !== 'ESPERANDO_QR')
        return { ok: false, error: 'No hay emparejamiento en espera que caducar.' }
      return { ok: true, estado: 'DESCONECTADA' }
  }
}

// ── Cifrado del secreto de sesión (en reposo, AES-256-GCM) ────────────────

/** Clave DEDICADA para la sesión WhatsApp, derivada del secreto del servidor
 *  con separación de dominio (otro dominio ≠ la clave maestra del carril
 *  privado: comprometer una no compromete la otra). */
export function derivarClaveSesion(secretoServidor: Buffer): Buffer {
  return crypto
    .createHash('sha256')
    .update(Buffer.concat([secretoServidor, Buffer.from('whatsapp-sesion-v1')]))
    .digest()
}

/** Cifra el blob de sesión → cadena iv:tag:datos (hex), lista para la BD. */
export function cifrarSecretoSesion(secreto: string, clave: Buffer): string {
  const blob = cifrarBuffer(Buffer.from(secreto, 'utf8'), clave)
  return `${blob.iv}:${blob.tag}:${blob.data.toString('hex')}`
}

/** Descifra el blob guardado. null si falta, está corrupto o la clave no es —
 *  jamás una excepción ruidosa ni un secreto inventado. */
export function descifrarSecretoSesion(wrap: string | null | undefined, clave: Buffer): string | null {
  if (!wrap) return null
  const [iv, tag, data] = wrap.split(':')
  if (!iv || !tag || !data) return null
  const buf = descifrarBuffer({ iv, tag, data: Buffer.from(data, 'hex') }, clave)
  return buf ? buf.toString('utf8') : null
}

/** Valida los datos que acompañan confirmar_conexion (número + secreto). */
export function validarConfirmacion(
  numero: unknown,
  secreto: unknown,
): { ok: true; e164: string; secreto: string } | { ok: false; error: string } {
  if (typeof numero !== 'string' || !numero.trim()) return { ok: false, error: 'Falta el número del negocio (formato E.164).' }
  const num = normalizarNumero(numero)
  if (!num.ok) return { ok: false, error: num.error }
  if (typeof secreto !== 'string' || secreto.length < SECRETO_MIN_CHARS)
    return { ok: false, error: `El secreto de sesión es demasiado corto (mín ${SECRETO_MIN_CHARS} caracteres).` }
  if (secreto.length > SECRETO_MAX_CHARS)
    return { ok: false, error: `El secreto de sesión excede el máximo (${SECRETO_MAX_CHARS} caracteres).` }
  return { ok: true, e164: num.e164, secreto }
}

// Cerrojo de los cuartos de CASA PROPIA (EMBUDO §7): firma HMAC-SHA256 de los
// webhooks de los daemons PROPIOS (F1 WhatsApp, F3 Telegram, los que vengan).
// Una sola implementación para TODOS los cuartos: el daemon firma
// `${timestamp}.${cuerpo}` con el secreto de su canal (panel > env) y la ruta
// verifica en tiempo constante con ventana anti-replay. Sala limpia: concepto
// general de webhook firmado — cero código de los clones.
import crypto from 'crypto'

/** Anti-replay: la firma muere 5 minutos después de nacer. */
export const TOLERANCIA_FIRMA_MS = 5 * 60_000

/** Ventana del pulso (heartbeat) de un daemon: dentro de este lapso la casa
 *  considera que el daemon respira (señal visible en el panel — el ESTADO
 *  sigue siendo el honesto de la BD, el pulso no lo sobreescribe). */
export const PULSO_VIVO_MS = 10 * 60_000

/** Firma HMAC-SHA256 sobre `${timestamp}.${cuerpo}`: atar el cuerpo al instante
 *  evita que un mensaje viejo capturado se reenvíe con firma válida (replay). */
export function firmarWebhook(tsMs: number, cuerpo: string, secreto: string): string {
  return crypto.createHmac('sha256', secreto).update(`${tsMs}.${cuerpo}`).digest('hex')
}

export type MotivoFirmaInvalida =
  | 'falta_firma'
  | 'falta_ts'
  | 'ts_invalido'
  | 'timestamp_vencido'
  | 'firma_invalida'

/** Verificación en tiempo constante (timingSafeEqual). La ruta comprueba
 *  ANTES que haya secreto configurado (fail-closed 503): aquí un secreto vacío
 *  produce firma_invalida siempre, pero jamás se llega con receptor abierto. */
export function verificarFirmaWebhook(
  cuerpo: string,
  firma: string | null,
  ts: string | null,
  secreto: string,
  ahora: Date,
): { ok: true } | { ok: false; motivo: MotivoFirmaInvalida } {
  if (!firma) return { ok: false, motivo: 'falta_firma' }
  if (!ts) return { ok: false, motivo: 'falta_ts' }
  const tsMs = Number(ts)
  if (!Number.isFinite(tsMs) || tsMs <= 0) return { ok: false, motivo: 'ts_invalido' }
  if (Math.abs(ahora.getTime() - tsMs) > TOLERANCIA_FIRMA_MS) return { ok: false, motivo: 'timestamp_vencido' }
  const esperada = firmarWebhook(tsMs, cuerpo, secreto)
  const a = Buffer.from(esperada, 'hex')
  const b = Buffer.from(firma, 'hex')
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, motivo: 'firma_invalida' }
  return { ok: true }
}

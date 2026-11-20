// F1 (EMBUDO §7 · PROJECT_STATE hito 3) — daemon WhatsApp PROPIO del negocio.
// W1: lógica PURA de pacing anti-ban. Sala limpia: solo conceptos generales
// (sesión propia, ritmo propio, topos diarios, horas silenciosas, enfriamiento
// ante señales de bloqueo) — cero código, contratos o constantes de los clones.
// Reglas que este módulo hace cumplir por diseño:
//  - WhatsApp es canal SFW (EMBUDO §4): el contenido explícito jamás pasa por
//    aquí; este módulo solo decide CUÁNDO, jamás QUÉ.
//  - El número es el activo: los defectos son conservadores y el gate humano
//    del cerebro (/api/chat) sigue siendo la última barrera de contenido.
//  - Módulo puro (sin BD, red ni reloj propio): el daemon le pasa historial,
//    configuración y "ahora" — mismo criterio que src/lib/cola.ts.

// ── Tipos ─────────────────────────────────────────────────────────────────

/** Marca de un envío ya hecho (o intentado con error) por el daemon.
 *  `t` acepta Date o ISO; `tipo` distingue lo que el contacto abrió primero
 *  (respuesta) de lo que el negocio inicia de su propio pulso (iniciativa). */
export interface MarcaEnvio {
  chatId: string
  t: Date | string
  tipo: 'respuesta' | 'iniciativa'
  /** true si el envío falló con señal de riesgo (timeout de sesión, rechazo
   *  del servidor de WhatsApp, etc.) — alimenta el disyuntor. */
  error?: boolean
}

export interface ConfigPacing {
  /** Hora LOCAL (0-23) de inicio de la ventana silenciosa. */
  desdeHoraSilencio: number
  /** Hora LOCAL (0-23) en que la ventana termina. */
  hastaHoraSilencio: number
  /** Techo diario por chat de respuestas (el contacto escribió primero). */
  maxRespuestasPorDia: number
  /** Techo diario por chat de iniciativas (el negocio escribe primero). */
  maxIniciativasPorDia: number
  /** Ventana de calentamiento desde la PRIMERA iniciativa al chat. */
  calentamientoMs: number
  /** Techo de iniciativas dentro de la ventana de calentamiento. */
  maxIniciativasCalentamiento: number
  /** Ventana que mira el disyuntor para contar fallos de riesgo. */
  ventanaFallosMs: number
  /** Fallos de riesgo dentro de la ventana que abren el circuito. */
  fallosParaEnfriar: number
  /** Cuánto queda el circuito abierto tras el último fallo de riesgo. */
  enfriamientoMs: number
}

/** Defectos conservadores: el objetivo es que un número personal del negocio
 *  nunca parezca un autómata. Todo se puede ajustar por configuración en
 *  caliente (BD panel > env > defecto) cuando el daemon se cablee (W3). */
export const PACING_DEFECTO: ConfigPacing = {
  desdeHoraSilencio: 22,
  hastaHoraSilencio: 8,
  maxRespuestasPorDia: 60,
  maxIniciativasPorDia: 8,
  calentamientoMs: 24 * 60 * 60 * 1000,
  maxIniciativasCalentamiento: 2,
  ventanaFallosMs: 30 * 60 * 1000,
  fallosParaEnfriar: 3,
  enfriamientoMs: 2 * 60 * 60 * 1000,
}

export type MotivoBloqueo =
  | 'circuito_abierto'
  | 'horas_silencio'
  | 'techo_respuestas'
  | 'techo_iniciativas'
  | 'calentamiento'

export interface DecisionEnvio {
  permitido: boolean
  motivo: 'ok' | MotivoBloqueo
  /** ISO de cuándo conviene reintentar; null si el motivo no tiene hora
   *  natural de desbloqueo. El daemon recalcula igualmente en cada tick. */
  reintentarEn: string | null
  /** Frase honesta para el log de compliance y el panel. */
  detalle: string
}

// ── Utilidades internas ───────────────────────────────────────────────────

const aFecha = (t: Date | string): Date => (t instanceof Date ? t : new Date(t))

/** Clave de día LOCAL (no UTC): los techos diarios se leen en el calendario
 *  del operador, no en el servidor de nadie. */
const claveDia = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// ── Disyuntor (temperatura de la sesión) ──────────────────────────────────

export type Temperatura = 'normal' | 'enfriando'

/** Señales de riesgo recientes (de CUALQUIER chat: un bloqueo afecta al
 *  número entero, no al chat) → circuito abierto hasta últimoFallo + enfriamiento. */
export function temperatura(
  marcas: readonly MarcaEnvio[],
  cfg: ConfigPacing,
  ahora: Date,
): { estado: Temperatura; hasta: Date | null } {
  const fallos = marcas
    .filter((m) => m.error)
    .map((m) => aFecha(m.t).getTime())
    .sort((a, b) => b - a)
  const desde = ahora.getTime() - cfg.ventanaFallosMs
  const enVentana = fallos.filter((t) => t >= desde)
  if (enVentana.length < cfg.fallosParaEnfriar) return { estado: 'normal', hasta: null }
  const ultimoFallo = enVentana[0]
  const hasta = new Date(ultimoFallo + cfg.enfriamientoMs)
  // Si el enfriamiento ya venció, el circuito está de vuelta: la ventana es
  // histórica, el bloqueo no.
  if (hasta.getTime() <= ahora.getTime()) return { estado: 'normal', hasta: null }
  return { estado: 'enfriando', hasta }
}

// ── Gate de envío ─────────────────────────────────────────────────────────

/** Decide si el daemon puede mandar un mensaje AHORA a un chat.
 *  Orden de veredicto (el primero que aplique gana):
 *  1. circuito abierto  → solo bloquea INICIATIVAS (responder lo que el
 *     contacto abrió es la señal más humana y de menor riesgo);
 *  2. horas silencio    → bloquea ambos tipos (ningún humano escribe a 3 am);
 *  3. techo diario      → respuestas e iniciativas se cuentan por separado;
 *  4. calentamiento     → iniciativas a un chat joven dentro de su ventana. */
export function decidirEnvio(
  marcas: readonly MarcaEnvio[],
  chatId: string,
  esIniciativa: boolean,
  cfg: ConfigPacing,
  ahora: Date,
): DecisionEnvio {
  // 1. Disyuntor — solo frena iniciativas.
  if (esIniciativa) {
    const temp = temperatura(marcas, cfg, ahora)
    if (temp.estado === 'enfriando' && temp.hasta) {
      return {
        permitido: false,
        motivo: 'circuito_abierto',
        reintentarEn: temp.hasta.toISOString(),
        detalle: `Circuito abierto: ${cfg.fallosParaEnfriar} fallos de riesgo en ${Math.round(cfg.ventanaFallosMs / 60000)} min — iniciativas en pausa hasta que pase el enfriamiento`,
      }
    }
  }

  // 2. Horas silencio (ventana que cruza medianoche).
  const hora = ahora.getHours()
  const cruzaMedianoche = cfg.desdeHoraSilencio > cfg.hastaHoraSilencio
  const enSilencio = cruzaMedianoche
    ? hora >= cfg.desdeHoraSilencio || hora < cfg.hastaHoraSilencio
    : hora >= cfg.desdeHoraSilencio && hora < cfg.hastaHoraSilencio
  if (enSilencio) {
    const despertar = new Date(ahora)
    if (hora >= cfg.desdeHoraSilencio) despertar.setDate(despertar.getDate() + 1)
    despertar.setHours(cfg.hastaHoraSilencio, 0, 0, 0)
    return {
      permitido: false,
      motivo: 'horas_silencio',
      reintentarEn: despertar.toISOString(),
      detalle: `Ventana silenciosa ${cfg.desdeHoraSilencio}:00–${cfg.hastaHoraSilencio}:00 — se reintenta a las ${cfg.hastaHoraSilencio}:00`,
    }
  }

  const dia = claveDia(ahora)
  const delChat = marcas.filter((m) => m.chatId === chatId && claveDia(aFecha(m.t)) === dia)

  // 3. Techos diarios por tipo.
  const bloqueoTecho = (
    motivo: 'techo_respuestas' | 'techo_iniciativas',
    tope: number,
  ): DecisionEnvio => {
    const manana = new Date(ahora)
    manana.setDate(manana.getDate() + 1)
    manana.setHours(0, 0, 0, 0)
    const que = motivo === 'techo_respuestas' ? 'respuestas' : 'iniciativas'
    return {
      permitido: false,
      motivo,
      reintentarEn: manana.toISOString(),
      detalle: `Techo diario de ${que} alcanzado (${tope}) — se puede escribir de nuevo mañana`,
    }
  }

  if (!esIniciativa && delChat.filter((m) => m.tipo === 'respuesta').length >= cfg.maxRespuestasPorDia) {
    return bloqueoTecho('techo_respuestas', cfg.maxRespuestasPorDia)
  }
  if (esIniciativa && delChat.filter((m) => m.tipo === 'iniciativa').length >= cfg.maxIniciativasPorDia) {
    return bloqueoTecho('techo_iniciativas', cfg.maxIniciativasPorDia)
  }

  // 4. Calentamiento: solo iniciativas, contadas desde la PRIMERA iniciativa
  //    del chat (las respuestas no inician relación y no la alargan).
  if (esIniciativa) {
    const tiemposIniciativas = marcas
      .filter((m) => m.chatId === chatId && m.tipo === 'iniciativa')
      .map((m) => aFecha(m.t).getTime())
      .sort((a, b) => a - b)
    if (tiemposIniciativas.length > 0) {
      const primera = tiemposIniciativas[0]
      const enCalentamiento = ahora.getTime() - primera < cfg.calentamientoMs
      const enVentanaCalor = tiemposIniciativas.filter(
        (t) => t >= primera && t <= primera + cfg.calentamientoMs,
      )
      if (enCalentamiento && enVentanaCalor.length >= cfg.maxIniciativasCalentamiento) {
        return {
          permitido: false,
          motivo: 'calentamiento',
          reintentarEn: new Date(primera + cfg.calentamientoMs).toISOString(),
          detalle: `Chat en calentamiento: máx ${cfg.maxIniciativasCalentamiento} iniciativas en las primeras ${Math.round(cfg.calentamientoMs / 3600000)} h — el ritmo sube solo con el tiempo`,
        }
      }
    }
  }

  return { permitido: true, motivo: 'ok', reintentarEn: null, detalle: 'Dentro del pacing: topos, horario y temperatura en orden' }
}

// ── Ritmo entre envíos ────────────────────────────────────────────────────

/** Retardo en ms para el próximo envío: base ± proporcion·base, uniforme.
 *  Un metrónomo exacto es la firma más fácil de detectar; el jitter es
 *  obligatorio, no decorativo. Determinista con `aleatorio` inyectado. */
export function retardoConJitter(baseMs: number, proporcion: number, aleatorio: () => number): number {
  if (baseMs <= 0) return 0
  const p = Math.min(1, Math.max(0, proporcion))
  const bruto = baseMs + (aleatorio() * 2 - 1) * baseMs * p
  return Math.max(0, Math.round(bruto))
}

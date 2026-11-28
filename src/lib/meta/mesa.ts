// F4 (EMBUDO §7 · cuarto #4) — MESA META: FB/IG MANUAL-FIRST. El cuarto más
// delicado del embudo: Meta banea adulto Y automatización ToS-violadora
// (EMBUDO §4) — por eso esta mesa NO envía nada, NO tiene webhook y NO toca la
// red de Meta. El operador pega a mano el mensaje que llegó, el CEREBRO escribe
// el borrador (mismos filtros de edad que /api/chat) y el operador lo envía
// MANUALMENTE desde la propia app de Meta. Automatización: cero.
// Reglas del cuarto por diseño:
//  - Manual-first con evidencia: cada borrador nace de una ENTRADA pegada por
//    el operador (el contacto es una etiqueta que él escribe — jamás scraping
//    ni sincronización de cuentas).
//  - El QUÉ lo escribe el cerebro (plantilla del genoma o LLM con salida
//    segura) — el operador no redacta la respuesta: la acepta o pide otra.
//  - Estados honestos: borrador → usado | descartado; lo usado/descartado es
//    historia y no se re-estructura (nada cambia en silencio).
//  - Módulo puro (sin BD, red ni reloj propio): todo inyectado y testeable.

// ── Límites del contrato ──────────────────────────────────────────────────

export const MAX_TEXTO_ENTRADA = 600 // mismo tope que los canales y el GFE
export const MAX_CONTACTO = 80 // etiqueta que escribe el operador (manual-first)
export const REDES = ['facebook', 'instagram'] as const
export type RedMeta = (typeof REDES)[number]

export type EstadoBorradorMeta = 'borrador' | 'usado' | 'descartado'
export type AccionBorradorMeta = 'usar' | 'descartar'

// ── Validación de la entrada pegada a mano ────────────────────────────────

export interface EntradaMesaMeta {
  red: RedMeta
  contacto: string
  texto: string
  personajeId: string
}

export function validarEntradaMeta(p: unknown): { ok: true; datos: EntradaMesaMeta } | { ok: false; error: string } {
  if (typeof p !== 'object' || p === null) return { ok: false, error: 'Payload ausente.' }
  const o = p as Record<string, unknown>
  const red = typeof o.red === 'string' ? o.red.trim() : ''
  if (!REDES.includes(red as RedMeta)) return { ok: false, error: `red debe ser facebook o instagram (llegó: ${red || 'vacío'}).` }
  const contacto = typeof o.contacto === 'string' ? o.contacto.trim().slice(0, MAX_CONTACTO) : ''
  // El contacto es OPCIONAL (etiqueta propia del operador): un borrador sin
  // etiqueta vale para calentamientos rápidos; lo que jamás es obligatorio
  // aquí es identidad de terceros (no se scrapea, no se sincroniza).
  const texto = typeof o.texto === 'string' ? o.texto.trim() : ''
  if (!texto) return { ok: false, error: 'Falta el texto del mensaje que llegó (el operador lo pega a mano).' }
  if (texto.length > MAX_TEXTO_ENTRADA) return { ok: false, error: `texto demasiado largo (máx ${MAX_TEXTO_ENTRADA}).` }
  const personajeId = typeof o.personajeId === 'string' ? o.personajeId.trim() : ''
  if (!personajeId) return { ok: false, error: 'Falta personajeId: el borrador lo escribe el cerebro de UN personaje concreto (no hay genoma universal).' }
  return { ok: true, datos: { red: red as RedMeta, contacto, texto, personajeId } }
}

// ── Transición de un borrador (pura) ──────────────────────────────────────

export interface ResultadoTransicionMeta {
  ok: boolean
  estado?: EstadoBorradorMeta
  error?: string
}

/** Reglas honestas:
 *  - usar: solo desde borrador (el operador copió el texto y lo envió a mano
 *    desde la app de Meta — CHAT-X registra el hecho, jamás lo envía).
 *  - descartar: solo desde borrador.
 *  - usado/descartado son HISTORIA: no se re-estructura (si el operador quiere
 *    otra respuesta al mismo mensaje, pega la entrada de nuevo y pide otro
 *    borrador — queda evidencia completa). */
export function transicionBorradorMeta(estadoActual: string, accion: AccionBorradorMeta): ResultadoTransicionMeta {
  if (estadoActual !== 'borrador') {
    return {
      ok: false,
      error:
        accion === 'usar'
          ? `Ese borrador ya está ${estadoActual}: la historia no se re-estructura. Pega la entrada de nuevo si necesitas otro borrador (queda evidencia completa).`
          : `Ese borrador ya está ${estadoActual}: la historia no se re-estructura.`,
    }
  }
  return { ok: true, estado: accion === 'usar' ? 'usado' : 'descartado' }
}

// ── Máscara de contacto (por si el operador pega algo largo) ──────────────

/** La etiqueta del contacto la puso el operador (manual-first), pero la UI la
 *  recorta igual: la mesa no es una libreta de PII ilimitada. */
export function mostrarContacto(contacto: string): string {
  const limpio = contacto.trim()
  if (!limpio) return '(sin etiqueta)'
  return limpio.length > 40 ? `${limpio.slice(0, 40)}…` : limpio
}

// Provider LLM — cerebro del chat GFE (upgrade honesto de P1.1: plantilla_genoma → LLM real).
//
// Contrato con la constitución:
//  - API OpenAI-compatible con Groq por defecto; base/modelo/key/proveedor por env
//    (LLM_BASE_URL, LLM_MODEL, LLM_API_KEY, LLM_PROVEEDOR) — leídos en CADA llamada,
//    como ESPEAK_BIN, para poder inyectarlos en pruebas.
//  - Sonda REAL (nunca promesa de landing): GET {base}/models. Un bloqueo regional del
//    egreso (403 en el edge antes de autenticar) se declara como ERROR con su detalle —
//    es exactamente lo que pasa con api.groq.com desde la máquina de build actual.
//  - Sin fallbacks silenciosos: si el LLM no está operativo, la ruta responde con la
//    plantilla del genoma DECLARANDO el modo y el motivo en meta (modo, llmEstado,
//    llmFallo). Nunca se etiqueta una respuesta de plantilla como LLM.
//  - La SALIDA del LLM pasa por el mismo filtro de edad duro que la entrada
//    (salidaLLMSegura): una respuesta generada con términos prohibidos se descarta y
//    se degrada a plantilla con evento de compliance — el modelo no está por encima
//    del filtro.
import type { Character } from '@prisma/client'
import { ETIQUETA_IA, PATRON_EDAD_MENOR, detectarTerminosProhibidos } from '@/lib/constants'
import { parseGenoma } from '@/lib/chat'

export type EstadoLLM = 'OPERATIVO' | 'NO_CONFIGURADO' | 'ERROR'

export interface SondaLLM {
  provedor: string
  estado: EstadoLLM
  detalle: string
  modelo: string
  base: string
}

/** Key del proveedor LLM (inyectable por env en pruebas — lectura en cada llamada). */
export function claveLLM(): string {
  return (process.env.LLM_API_KEY || '').trim()
}

/** Base OpenAI-compatible; por defecto Groq. Sin barra final. */
export function baseLLM(): string {
  return (process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1').trim().replace(/\/+$/, '')
}

/** Modelo a usar (Groq: llama-3.3-70b-versatile es el workhorse gratuito). */
export function modeloLLM(): string {
  return (process.env.LLM_MODEL || 'llama-3.3-70b-versatile').trim()
}

/** Etiqueta del proveedor para compliance/procedencia (groq | together | openrouter | ...). */
export function etiquetaProveedor(): string {
  return (process.env.LLM_PROVEEDOR || 'groq').trim().toLowerCase()
}

/** Sonda real: OPERATIVO solo si {base}/models responde 2xx con la key configurada. */
export async function sondearLLM(): Promise<SondaLLM> {
  const provedor = etiquetaProveedor()
  const base = baseLLM()
  const modelo = modeloLLM()
  if (!claveLLM()) {
    return {
      provedor,
      estado: 'NO_CONFIGURADO',
      detalle: 'sin LLM_API_KEY — el chat usa plantillas del genoma (meta.modo=plantilla_genoma, declarado)',
      modelo,
      base,
    }
  }
  try {
    const ctl = new AbortController()
    const t = setTimeout(() => ctl.abort(), 8000)
    let r: Response
    try {
      r = await fetch(`${base}/models`, { headers: { Authorization: `Bearer ${claveLLM()}` }, signal: ctl.signal })
    } finally {
      clearTimeout(t)
    }
    if (r.ok) {
      return { provedor, estado: 'OPERATIVO', detalle: `API respondió ${r.status} en ${base}/models`, modelo, base }
    }
    const cuerpo = await r.text().catch(() => '')
    return {
      provedor,
      estado: 'ERROR',
      detalle: `HTTP ${r.status} de ${base}/models — ${cuerpo.slice(0, 140) || 'sin cuerpo'} (si es 403 en el edge: bloqueo regional del egreso, no de la key)`,
      modelo,
      base,
    }
  } catch (e) {
    return { provedor, estado: 'ERROR', detalle: `sin respuesta de ${base}: ${(e as Error).message.slice(0, 140)}`, modelo, base }
  }
}

/** System prompt del companion — ÚNICA fuente (la tarjeta P1.2 y el chat P1.1 usan el mismo). */
export function promptSistemaCompanion(c: Character): string {
  const genome = parseGenoma(c)
  const signKit = JSON.parse(c.signKit || '[]') as unknown[]
  return [
    `Eres ${c.name}, una creadora de contenido adulta verificada como IA (18+, ${genome.atributos?.edadAparente ?? 'edad adulta'}).`,
    `Personalidad y tono: ${genome.tono || c.style || 'cercano'}.`,
    `Historia: ${genome.lore || 'sin lore definido'}.`,
    `Aficiones: ${genome.aficiones || 'sin aficiones definidas'}.`,
    `Apariencia (rasgos estables, nunca contradecir): ${Object.entries(genome.atributos ?? {})
      .filter(([k]) => k !== 'edadAparente')
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ') || c.anchorTrait || 'sin atributos definidos'}.`,
    signKit.length ? `Rasgos de firma siempre visibles: ${signKit.map((s) => JSON.stringify(s)).join(', ')}.` : '',
    `Reglas: mantén coherencia con tu genoma; nunca afirmes ser humana; nunca negues ser generada por IA si te lo preguntan (${ETIQUETA_IA}).`,
    `Contenido: respeta el filtro de edad de la plataforma; rechaza cualquier tema con menores.`,
    `Estilo de respuesta: mensajes cortos de chat (1-4 frases), en el idioma del operador, sin listas ni encabezados.`,
  ]
    .filter(Boolean)
    .join('\n')
}

export interface FilaHistorial {
  rol: string
  tipo: string
  texto: string | null
  estado?: string
}

export interface MsgLLM {
  rol: 'operador' | 'personaje'
  texto: string
}

/** Historial para el LLM: solo texto entregado, recortado a las últimas `max` turnos. */
export function historialDesdeMensajes(
  filas: FilaHistorial[],
  max = 12,
): MsgLLM[] {
  const utiles = filas
    .filter((f) => f.tipo === 'texto' && f.texto && f.texto.trim())
    .filter((f) => f.rol === 'operador' || f.estado === undefined || f.estado === 'entregado')
    .map((f) => ({ rol: f.rol as MsgLLM['rol'], texto: (f.texto as string).trim() }))
  return utiles.slice(-max)
}

/** Filtro de la SALIDA del LLM: mismo estándar que la entrada. Puro y testeable. */
export function salidaLLMSegura(
  texto: string,
  maxCaracteres = 700,
): { ok: true; texto: string } | { ok: false; motivo: 'filtro_edad'; terminos: string[] } {
  const prohibidos = detectarTerminosProhibidos(texto)
  if (prohibidos.length) return { ok: false, motivo: 'filtro_edad', terminos: prohibidos }
  if (PATRON_EDAD_MENOR.test(texto)) return { ok: false, motivo: 'filtro_edad', terminos: ['patrón de menor'] }
  return { ok: true, texto: texto.trim().slice(0, maxCaracteres) }
}

export type ResultadoLLM =
  | { ok: true; texto: string; modelo: string; provedor: string; uso: { promptTokens?: number; completionTokens?: number } | null }
  | { ok: false; estado: EstadoLLM; detalle: string }

/**
 * Genera la respuesta del personaje con el LLM configurado.
 * Devuelve estado honesto; la ruta decide fallback declarado a plantilla.
 */
export async function generarRespuestaLLM(
  c: Character,
  historial: MsgLLM[],
  textoOperador: string,
): Promise<ResultadoLLM> {
  if (!claveLLM()) return { ok: false, estado: 'NO_CONFIGURADO', detalle: 'sin LLM_API_KEY' }
  const mensajes = [
    { role: 'system', content: promptSistemaCompanion(c) },
    ...historial.map((m) => ({ role: m.rol === 'operador' ? ('user' as const) : ('assistant' as const), content: m.texto })),
    { role: 'user' as const, content: textoOperador },
  ]
  try {
    const ctl = new AbortController()
    const t = setTimeout(() => ctl.abort(), 30000)
    let r: Response
    try {
      r = await fetch(`${baseLLM()}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${claveLLM()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modeloLLM(), messages: mensajes, max_tokens: 300, temperature: 0.8 }),
        signal: ctl.signal,
      })
    } finally {
      clearTimeout(t)
    }
    if (!r.ok) {
      const cuerpo = await r.text().catch(() => '')
      return { ok: false, estado: 'ERROR', detalle: `HTTP ${r.status} — ${cuerpo.slice(0, 160) || 'sin cuerpo'}` }
    }
    const j = (await r.json()) as {
      choices?: { message?: { content?: string } }[]
      usage?: { prompt_tokens?: number; completion_tokens?: number }
    }
    const texto = (j.choices?.[0]?.message?.content ?? '').trim()
    if (!texto) return { ok: false, estado: 'ERROR', detalle: 'respuesta vacía del LLM' }
    return {
      ok: true,
      texto,
      modelo: modeloLLM(),
      provedor: etiquetaProveedor(),
      uso: j.usage ? { promptTokens: j.usage.prompt_tokens, completionTokens: j.usage.completion_tokens } : null,
    }
  } catch (e) {
    return { ok: false, estado: 'ERROR', detalle: `sin respuesta: ${(e as Error).message.slice(0, 160)}` }
  }
}

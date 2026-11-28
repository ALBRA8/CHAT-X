// D-015 · A7 — "Mejorar con IA" del prompt, CONTABILIZADA (destripe MIAFACTORY
// §19.5, adaptado: el concepto y el contrato, jamás su código ni sus textos).
//
// Reglas de la adaptación a CHAT-X:
//  - NUNCA gratis ni ilimitado: cada mejora es un Job propio con coste
//    (COSTOS.ENHANCE), cobrada por el punto único (asegurarSaldo) y reembolsada
//    si falla — la contabilidad la hace la RUTA, este módulo es puro.
//  - El LLM se resuelve con la configuración en caliente del panel
//    (BD > .env > defecto, vía valorConfig) — es el primer consumidor cableado
//    al panel de Configuración; el chat aún lee env directo (migración aparte).
//  - El filtro de edad de la plataforma es DURO y BIDIRECCIONAL: la escena de
//    entrada se bloquea ANTES de gastar (en la ruta) y la salida del LLM pasa
//    por salidaLLMSegura AQUÍ — un enhancer que inventa términos prohibidos
//    se rechaza con reembolso, nunca se entrega.
//  - Resultado ESTRUCTURADO (brief {escena, outfit, pose, luz}), no texto libre:
//    el operador lo copia directo a la Fábrica de fotos.
import { salidaLLMSegura } from '@/lib/provider/llm'
import { COSTOS } from '@/lib/constants'

// ── Estilos de mejora (categorías propias, no las del referente) ──

export const ESTILOS_MEJORA = ['cinematografico', 'lifestyle', 'editorial', 'glam'] as const
export type EstiloMejora = (typeof ESTILOS_MEJORA)[number]

export function esEstiloValido(v: unknown): v is EstiloMejora {
  return typeof v === 'string' && (ESTILOS_MEJORA as readonly string[]).includes(v)
}

/** Guía de cada estilo: una frase propia que orienta al LLM. */
export function fraseEstilo(estilo: EstiloMejora): string {
  switch (estilo) {
    case 'cinematografico':
      return 'tratamiento cinematográfico: luz con dirección y motivo, atmósfera concreta, composición con profundidad'
    case 'lifestyle':
      return 'lifestyle natural: momento cotidiano creíble, luz de ventana o exterior suave, espontaneidad sin pose forzada'
    case 'editorial':
      return 'editorial de moda: dirección de arte limpia, contraste controlado, actitud segura y pose pensada'
    case 'glam':
      return 'glam: luz brillante y favorecedora, detalles de vestuario cuidados, look de noche con acabado pulido'
  }
}

// ── Prompts (puros, testeables) ──

export function promptSistemaMejora(): string {
  return [
    'Eres el asistente de briefs de un estudio de creadoras virtuales verificadas como IA (contenido adulto 18+, siempre etiquetado como IA).',
    'Tu trabajo: mejorar UNA escena de un brief de foto. Respondes EXCLUSIVAMENTE con un objeto JSON válido, sin texto alrededor, sin bloques de código.',
    'Formato exacto: {"escena": "...", "outfit": "...", "pose": "...", "luz": "..."}.',
    'Reglas: conserva el lugar y la intención de la escena original; añade detalle concreto (materiales, colores, hora del día, elementos de ambiente); nunca cambies la identidad ni añadas personas adicionales; describe en español neutro, frases cortas y concretas (máx ~25 palabras por campo).',
    'Los sujetos son siempre adultas. Si el texto original contuviera cualquier indicio de minoría de edad, refusa con {"escena": "BLOQUEADO"} y nada más.',
  ].join('\n')
}

export function promptUsuarioMejora(
  escena: string,
  estilo: EstiloMejora,
  contextoGenoma?: { aficiones?: string; lore?: string; tono?: string },
): string {
  const partes = [
    `Escena original: "${escena}"`,
    `Dirección de estilo: ${fraseEstilo(estilo)}.`,
  ]
  if (contextoGenoma?.aficiones) partes.push(`Aficiones del personaje (para coherencia): ${contextoGenoma.aficiones}.`)
  if (contextoGenoma?.lore) partes.push(`Lore del personaje: ${contextoGenoma.lore.slice(0, 160)}.`)
  partes.push('Devuelve solo el JSON.')
  return partes.join('\n')
}

// ── Salida estructurada ──

export interface BriefMejorado {
  escena: string
  outfit?: string
  pose?: string
  luz?: string
}

const MAX_ESCENA = 500
const MAX_CAMPO = 200

/**
 * Extrae el primer objeto JSON balanceado del texto del LLM (tolera fences
 * ```json, texto alrededor y comillas tipográficas) y lo valida campo a campo:
 * strings recortados a su tope y FILTRO DE EDAD en la salida (salidaLLMSegura).
 * Falla con motivo honesto, nunca con excepción.
 */
export function parsearMejora(
  texto: string,
): { ok: true; brief: BriefMejorado } | { ok: false; motivo: 'sin_json' | 'filtro_edad'; detalle: string; terminos?: string[] } {
  const bruto = (texto || '').replace(/[\u201c\u201d]/g, '"').replace(/[\u2018\u2019]/g, "'")
  const inicio = bruto.indexOf('{')
  if (inicio === -1) return { ok: false, motivo: 'sin_json', detalle: 'el LLM no devolvió ningún objeto JSON' }
  let fin = -1
  let profundidad = 0
  let enString = false
  let escape = false
  for (let i = inicio; i < bruto.length; i++) {
    const ch = bruto[i]
    if (enString) {
      if (escape) escape = false
      else if (ch === '\\') escape = true
      else if (ch === '"') enString = false
      continue
    }
    if (ch === '"') enString = true
    else if (ch === '{') profundidad++
    else if (ch === '}') {
      profundidad--
      if (profundidad === 0) {
        fin = i
        break
      }
    }
  }
  if (fin === -1) return { ok: false, motivo: 'sin_json', detalle: 'el JSON del LLM llegó incompleto (sin cierre)' }
  let o: Record<string, unknown>
  try {
    o = JSON.parse(bruto.slice(inicio, fin + 1)) as Record<string, unknown>
  } catch {
    return { ok: false, motivo: 'sin_json', detalle: 'el JSON del LLM no se pudo parsear' }
  }
  const refusa = typeof o.escena === 'string' && o.escena.trim().toUpperCase() === 'BLOQUEADO'
  if (refusa) return { ok: false, motivo: 'filtro_edad', detalle: 'el LLM detectó contenido no permitido en la escena y se negó', terminos: ['solicitud del propio modelo'] }
  const limpiar = (v: unknown, max: number): { texto: string } | { texto: null; bloqueo: string; terminos: string[] } => {
    if (typeof v !== 'string' || !v.trim()) return { texto: '' }
    const r = salidaLLMSegura(v.trim(), max)
    if (!r.ok) return { texto: null, bloqueo: r.motivo, terminos: r.terminos }
    return { texto: r.texto }
  }
  const escena = limpiar(o.escena, MAX_ESCENA)
  if (escena.texto === null) return { ok: false, motivo: 'filtro_edad', detalle: `la escena mejorada viola el filtro de edad (${escena.bloqueo})`, terminos: escena.terminos }
  if (!escena.texto) return { ok: false, motivo: 'sin_json', detalle: 'el JSON no trae "escena" usable' }
  const brief: BriefMejorado = { escena: escena.texto }
  for (const campo of ['outfit', 'pose', 'luz'] as const) {
    const c = limpiar(o[campo], MAX_CAMPO)
    if (c.texto === null) return { ok: false, motivo: 'filtro_edad', detalle: `el campo "${campo}" viola el filtro de edad (${c.bloqueo})`, terminos: c.terminos }
    if (c.texto) brief[campo] = c.texto
  }
  return { ok: true, brief }
}

// ── Coste (la ruta cobra; aquí solo la cifra, única fuente) ──

export function costeMejora(): number {
  return COSTOS.ENHANCE
}

// ── Llamada al LLM con la configuración resuelta (sin BD: la ruta inyecta) ──

export interface ConfigLLMResuelta {
  clave: string
  base: string
  modelo: string
  maxTokens: number
  timeoutMs: number
  provedor: string
  fuente: string // 'bd' | 'env' | 'defecto' — de dónde salió la API key
}

export type ResultadoMejora =
  | { ok: true; texto: string; modelo: string; provedor: string; uso: { promptTokens?: number; completionTokens?: number } | null }
  | { ok: false; estado: 'NO_CONFIGURADO' | 'ERROR'; detalle: string }

/** Llamada OpenAI-compatible real. Sin fallbacks silenciosos: los errores son honestos. */
export async function llamarLLMMejora(cfg: ConfigLLMResuelta, sistema: string, usuario: string): Promise<ResultadoMejora> {
  if (!cfg.clave) return { ok: false, estado: 'NO_CONFIGURADO', detalle: 'sin API key del LLM — configúrala en el panel de Configuración (llm.api_key) o en .env (LLM_API_KEY)' }
  try {
    const ctl = new AbortController()
    const t = setTimeout(() => ctl.abort(), cfg.timeoutMs)
    let r: Response
    try {
      r = await fetch(`${cfg.base}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${cfg.clave}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: cfg.modelo,
          messages: [
            { role: 'system', content: sistema },
            { role: 'user', content: usuario },
          ],
          max_tokens: cfg.maxTokens,
          temperature: 0.7,
        }),
        signal: ctl.signal,
      })
    } finally {
      clearTimeout(t)
    }
    if (!r.ok) {
      const cuerpo = await r.text().catch(() => '')
      return { ok: false, estado: 'ERROR', detalle: `HTTP ${r.status} de ${cfg.base}/chat/completions — ${cuerpo.slice(0, 160) || 'sin cuerpo'}` }
    }
    const j = (await r.json()) as {
      choices?: { message?: { content?: string | null; reasoning_content?: string | null }; finish_reason?: string | null }[]
      usage?: { prompt_tokens?: number; completion_tokens?: number }
    }
    const choice = j.choices?.[0]
    const texto = (choice?.message?.content ?? '').trim()
    if (!texto) {
      const fin = choice?.finish_reason ?? 'desconocido'
      const quemo = choice?.message?.reasoning_content ? ' (el modelo gastó tokens en reasoning_content)' : ''
      return {
        ok: false,
        estado: 'ERROR',
        detalle: `respuesta vacía del LLM (finish_reason=${fin}${quemo})${fin === 'length' ? ` — sube llm.max_tokens en el panel (hoy ${cfg.maxTokens})` : ''}`,
      }
    }
    return { ok: true, texto, modelo: cfg.modelo, provedor: cfg.provedor, uso: j.usage ? { promptTokens: j.usage.prompt_tokens, completionTokens: j.usage.completion_tokens } : null }
  } catch (e) {
    const msg = (e as Error).name === 'AbortError' ? `timeout del LLM tras ${cfg.timeoutMs} ms` : (e as Error).message.slice(0, 160)
    return { ok: false, estado: 'ERROR', detalle: msg }
  }
}

// Saneo de texto externo — anti-inyección de instrucciones (sala limpia).
//
// Lección destilada de YouTube-Automation (§30 security hardening, v2.19):
// TODO texto que entra desde fuera (RSS, entrada manual, og: de una URL,
// transcripciones, títulos scrapeados) puede intentar secuestrar el prompt
// de un LLM o envenenar briefs con instrucciones falsas ("ignora tus
// instrucciones anteriores y ..."). Aquí NO se copia código: se reimplementa
// el patrón al estilo CHAT-X — determinista, auditable y honesto.
//
// Reglas:
//  1. El filtro de edad aparente SIEMPRE corre sobre el texto CRUDO antes
//     (regla constitucional); el saneo es una segunda capa, no un sustituto.
//  2. Los patrones de inyección se NEUTRALIZAN (se marcan), no se descarta
//     el texto entero: la tendencia puede ser legítima aunque un fragmento
//     intente secuestrar el prompt. Lo neutralizado queda declarado.
//  3. Mismo texto → mismo saneo (determinista, sin LLM).

/** Patrones de secuestro de prompt/instrucciones (ES + EN + tokens de rol). */
const PATRONES_INYECCION: { nombre: string; re: RegExp }[] = [
  { nombre: 'ignorar-instrucciones-es', re: /\b(?:ignora\w*|olvida|desestima|borra)\s+(?:todas\s+)?(?:las\s+|tus\s+|mis\s+)?(?:instrucciones|indicaciones|reglas|directrices|consignas)\b(?:\s+(?:anteriores|previas|de\s+antes|previo\w*))?/gi },
  { nombre: 'ignorar-instrucciones-en', re: /\b(?:ignore|disregard|forget|discard)\s+(?:all\s+|any\s+|your\s+|the\s+)?(?:previous|prior|above|earlier)?\s*(?:instructions|guidelines|rules|directives|prompts?)\b/gi },
  { nombre: 'nuevo-rol', re: /\b(?:a\s+partir\s+de\s+ahora|des\s+de\s+ahora|desde\s+ahora|now\s+on)\s+(?:eres|serás|sera|you\s+are|actúa|actua|act\s+as)\b/gi },
  { nombre: 'fingir-rol', re: /\b(?:eres|you\s+are|tú\s+eres|tu\s+eres)\s+(?:ahora\s+|now\s+)?(?:un\s+|una\s+)?(?:asistente|assistant|modelo|model|ia|ai|dan|jailbreak)\b/gi },
  { nombre: 'marcador-de-rol', re: /(?:^|\n)\s*(?:system|assistant|developer)\s*[:：]/gi },
  { nombre: 'token-especial-chatml', re: /<\|?\s*(?:im_start|im_end|system|endoftext|eot_id)\s*\|?>/gi },
  { nombre: 'exfiltrar-prompt', re: /\b(?:revela|revelá|revela|mu[eé]strame|muestra\s+me|dime|rep[ií]tame|repite|repeat|print|show)\s+(?:tu\s+|tu\s+)?(?:prompt|instrucciones|system\s*prompt|instrucci[oó]n\s+del\s+sistema)\b/gi },
]

/** Caracteres de control invisibles (salvo \n y \t) usados para ocultar texto. */
const RE_CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u2028\u2029\uFEFF]/g

const ENTIDADES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
}

export interface ResultadoSaneo {
  /** Texto saneado, listo para análisis/briefs/prompts. */
  texto: string
  /** Nombres de los patrones neutralizados (auditoría honesta). */
  patronesNeutralizados: string[]
  /** true si se recortó por el tope de longitud. */
  recortado: boolean
  /** Longitud original antes del saneo (trazabilidad). */
  bytesOriginales: number
}

const MARCA = '[texto externo neutralizado]'

/**
 * Sanea texto EXTERNO antes de que entre a análisis, briefs o prompts:
 * neutraliza intentos de inyección de instrucciones, decodifica entidades
 * HTML básicas, quita caracteres de control invisibles y aplica tope duro
 * de longitud. Determinista: mismas entradas → misma salida.
 */
export function sanitizarTextoExterno(texto: string, max = 600): ResultadoSaneo {
  const bytesOriginales = texto.length
  const patronesNeutralizados: string[] = []

  let t = texto.normalize('NFC')

  // 1. Entidades HTML básicas (los metadatos og: vienen escapados a veces)
  for (const [ent, chr] of Object.entries(ENTIDADES)) {
    t = t.split(ent).join(chr)
  }

  // 2. Caracteres de control y separadores invisibles → espacio
  t = t.replace(RE_CONTROL, ' ')

  // 3. Neutralización de patrones de inyección (cada hit queda auditado)
  for (const { nombre, re } of PATRONES_INYECCION) {
    re.lastIndex = 0 // seguridad: regex /g reutilizadas
    if (re.test(t)) {
      re.lastIndex = 0
      t = t.replace(re, MARCA)
      if (!patronesNeutralizados.includes(nombre)) patronesNeutralizados.push(nombre)
    }
  }

  // 4. Espacios colapsados y recorte duro con nota honesta
  t = t.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  let recortado = false
  if (t.length > max) {
    t = `${t.slice(0, Math.max(0, max - 1)).trimEnd()}…`
    recortado = true
  }

  return { texto: t, patronesNeutralizados, recortado, bytesOriginales }
}

/** Variante cómoda: devuelve solo el texto saneado. */
export function textoSano(texto: string, max = 600): string {
  return sanitizarTextoExterno(texto, max).texto
}

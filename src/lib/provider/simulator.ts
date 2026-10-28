// PROVEEDOR SIMULADOR — imágenes placeholder SVG deterministas por semilla.
// Misma semilla de personaje → misma paleta y formas base (coherencia de identidad);
// la composición de escena cambia por variante/brief.
// El QA determinista aprueba ~85% por semilla para poder probar la puerta de calidad.
import { rngDesde, hashCadena } from '@/lib/rng'
import { CHECKPOINT_SIMULADOR, LANE, type Lane } from '@/lib/constants'
import type { Brief, GenerationRequest, GeneratedImage, Provider, VeredictoIdentidad } from './types'

// ───────────────────────── QA determinista ─────────────────────────

const MOTIVOS_IDENTIDAD = [
  'La mandíbula no coincide con la cara canónica',
  'Los ojos se desvían del color y forma canónicos',
  'Deriva de identidad: el tono de piel difiere de la LoRA',
  'El peinado no respeta el rasgo ancla del personaje',
]

export function veredictoIdentidad(seed: string): VeredictoIdentidad {
  const r = hashCadena('qa-identidad:' + seed) % 100
  if (r < 85) return { aprueba: true }
  const motivo = MOTIVOS_IDENTIDAD[hashCadena('mot:' + seed) % MOTIVOS_IDENTIDAD.length]
  return { aprueba: false, motivo: `Coherencia de identidad: ${motivo}` }
}

export function veredictoAnatomia(seed: string): VeredictoIdentidad {
  const r = hashCadena('qa-anatomia:' + seed) % 100
  if (r < 92) return { aprueba: true }
  const motivo = hashCadena('mot:' + seed) % 2 === 0 ? 'Manos mal formadas detectadas' : 'Proporciones anatómicas implausibles'
  return { aprueba: false, motivo: `Anatomía: ${motivo}` }
}

// ───────────────────────── Paleta de identidad ─────────────────────────

interface IdentidadVisual {
  hue: number // tono base del personaje
  skinL: number
  skinC: number
  hairHue: number
  hairSat: number
  hairL: number
  eyeHue: number
  lipsHue: number
  pecas: boolean
  faceW: number
  headTilt: number
}

function identidadDe(semilla: string, attrs?: Record<string, string>): IdentidadVisual {
  const rand = rngDesde('identidad:' + semilla)
  const hue = Math.floor(rand() * 360)
  const peloOpciones = [
    { h: 20, s: 45, l: 30 }, // castaño
    { h: 48, s: 60, l: 62 }, // rubio
    { h: 280, s: 15, l: 18 }, // negro
    { h: 12, s: 65, l: 40 }, // rojo
    { h: 330, s: 55, l: 68 }, // rosa
    { h: 220, s: 10, l: 72 }, // cenizo
  ]
  const peloIdx = Math.floor(rand() * peloOpciones.length)
  const pelo = peloOpciones[peloIdx]
  // El atributo pelo del genoma puede sugerir el tono
  const attrPelo = (attrs?.pelo || '').toLowerCase()
  if (attrPelo.includes('rosa')) pelo.h = 330
  if (attrPelo.includes('rubio')) pelo.h = 48
  if (attrPelo.includes('negro')) pelo.h = 280
  if (attrPelo.includes('casta')) pelo.h = 20
  if (attrPelo.includes('rojo') || attrPelo.includes('pelirroja')) pelo.h = 12
  const ojosOpciones = [140, 30, 340, 90, 45]
  const eyeHue = ojosOpciones[Math.floor(rand() * ojosOpciones.length)]
  return {
    hue,
    skinL: 74 + rand() * 12,
    skinC: 22 + rand() * 18,
    hairHue: pelo.h,
    hairSat: pelo.s,
    hairL: pelo.l,
    eyeHue,
    lipsHue: 350 + rand() * 15,
    pecas: (attrs?.pecas === 'si') || rand() < 0.35,
    faceW: 0.88 + rand() * 0.2,
    headTilt: (rand() - 0.5) * 8,
  }
}

function hsl(h: number, s: number, l: number, a = 1): string {
  return a >= 1 ? `hsl(${((h % 360) + 360) % 360} ${s}% ${l}%)` : `hsl(${((h % 360) + 360) % 360} ${s}% ${l} / ${a})`
}

function escXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function truncar(s: string, n: number): string {
  const t = s.trim()
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}

const ENCUDRE_LABEL: Record<string, string> = {
  primer_plano: 'primer plano',
  plano_medio: 'plano medio',
  cuerpo_entero: 'cuerpo entero',
}

// ───────────────────────── Generación del SVG ─────────────────────────

function luzEstilo(luz: string, rand: () => number): { angulo: number; tinte: string; op: number; extra: 'foco' | 'suave' | 'rim' | 'noche' } {
  const l = luz.toLowerCase()
  if (l.includes('cálid') || l.includes('calid') || l.includes('dorado') || l.includes('atardecer')) return { angulo: 35 + rand() * 20, tinte: hsl(38, 90, 60), op: 0.18, extra: 'foco' }
  if (l.includes('neón') || l.includes('neon')) return { angulo: 300 + rand() * 30, tinte: hsl(160, 80, 55), op: 0.22, extra: 'rim' }
  if (l.includes('nocturn') || l.includes('noche')) return { angulo: 200 + rand() * 40, tinte: hsl(260, 30, 30), op: 0.32, extra: 'noche' }
  if (l.includes('estudio')) return { angulo: 90, tinte: hsl(40, 15, 90), op: 0.12, extra: 'rim' }
  if (l.includes('natural') || l.includes('ventana') || l.includes('día') || l.includes('dia')) return { angulo: 120 + rand() * 30, tinte: hsl(50, 70, 75), op: 0.14, extra: 'suave' }
  return { angulo: 60 + rand() * 240, tinte: hsl(45, 40, 80), op: 0.12, extra: 'suave' }
}

function silueta(id: IdentidadVisual, cx: number, headR: number, conCuerpo: boolean, conPiernas: boolean, outfitHue: number, outfitColor: string): string {
  const s: string[] = []
  const cy = conPiernas ? headR * 2.6 : conCuerpo ? 400 : 430
  const skin = hsl(28, id.skinC, id.skinL)
  const skinSombra = hsl(28, id.skinC, id.skinL - 10)

  // piernas (cuerpo entero)
  if (conPiernas) {
    const legH = 250
    s.push(`<path d="M ${cx - headR * 0.55} 540 L ${cx - headR * 0.62} ${540 + legH} q 0 16 14 16 l 10 0 q 12 0 12 -16 L ${cx - 8} 540 Z" fill="${hsl(id.hue, 25, 32)}"/>`)
    s.push(`<path d="M ${cx + headR * 0.55} 540 L ${cx + headR * 0.62} ${540 + legH} q 0 16 -14 16 l -10 0 q -12 0 -12 -16 L ${cx + 8} 540 Z" fill="${hsl(id.hue, 25, 36)}"/>`)
  }

  // torso / outfit
  if (conCuerpo || conPiernas) {
    const topY = conPiernas ? 470 : 540
    const shoulder = conPiernas ? headR * 1.7 : headR * 1.55
    s.push(`<path d="M ${cx - shoulder * 0.62} ${topY + 40} C ${cx - shoulder} ${topY + 55}, ${cx - shoulder * 0.95} ${topY + 120}, ${cx - shoulder * 0.8} ${conPiernas ? 620 : 700} L ${cx + shoulder * 0.8} ${conPiernas ? 620 : 700} C ${cx + shoulder * 0.95} ${topY + 120}, ${cx + shoulder} ${topY + 55}, ${cx + shoulder * 0.62} ${topY + 40} Q ${cx} ${topY + 8}, ${cx - shoulder * 0.62} ${topY + 40} Z" fill="${outfitColor}"/>`)
    // escote / detalle
    s.push(`<path d="M ${cx - headR * 0.5} ${topY + 38} Q ${cx} ${topY + 78}, ${cx + headR * 0.5} ${topY + 38} L ${cx + headR * 0.42} ${topY + 52} Q ${cx} ${topY + 95}, ${cx - headR * 0.42} ${topY + 52} Z" fill="${skin}"/>`)
    // brazos
    s.push(`<path d="M ${cx - shoulder * 0.72} ${topY + 52} q -26 90 -14 ${conPiernas ? 210 : 170}" stroke="${skin}" stroke-width="${headR * 0.22}" fill="none" stroke-linecap="round"/>`)
    s.push(`<path d="M ${cx + shoulder * 0.72} ${topY + 52} q 26 90 14 ${conPiernas ? 210 : 170}" stroke="${skinSombra}" stroke-width="${headR * 0.22}" fill="none" stroke-linecap="round"/>`)
  }

  // cuello
  s.push(`<rect x="${cx - headR * 0.22}" y="${cy + headR * 0.72}" width="${headR * 0.44}" height="${headR * 0.5}" rx="${headR * 0.18}" fill="${skinSombra}"/>`)

  // cabeza
  s.push(`<g transform="rotate(${id.headTilt} ${cx} ${cy})">`)
  // pelo trasero
  const hairBackR = headR * 1.18
  s.push(`<ellipse cx="${cx}" cy="${cy + headR * 0.05}" rx="${hairBackR * id.faceW}" ry="${hairBackR}" fill="${hsl(id.hairHue, id.hairSat, id.hairL - 6)}"/>`)
  // cara
  s.push(`<ellipse cx="${cx}" cy="${cy}" rx="${headR * 0.82 * id.faceW}" ry="${headR}" fill="${skin}"/>`)
  // pelo frontal (flequillo variable)
  const fringe = 0.18 + rngDesde('fringe:' + cx)() * 0.16
  s.push(`<path d="M ${cx - headR * 0.86 * id.faceW} ${cy - headR * 0.1} Q ${cx - headR * 0.5 * id.faceW} ${cy - headR * (1.05 + fringe)}, ${cx + headR * 0.12 * id.faceW} ${cy - headR * 0.98} Q ${cx + headR * 0.7 * id.faceW} ${cy - headR * 0.92}, ${cx + headR * 0.86 * id.faceW} ${cy - headR * 0.05} Q ${cx + headR * 0.4} ${cy - headR * (0.5 + fringe)}, ${cx - headR * 0.2} ${cy - headR * (0.42 + fringe)} Q ${cx - headR * 0.6} ${cy - headR * 0.3}, ${cx - headR * 0.86 * id.faceW} ${cy - headR * 0.1} Z" fill="${hsl(id.hairHue, id.hairSat, id.hairL)}"/>`)
  // ojos
  const eyeY = cy - headR * 0.08
  const eyeDx = headR * 0.34
  const eyeRx = headR * 0.16
  for (const sign of [-1, 1]) {
    const ex = cx + sign * eyeDx
    s.push(`<ellipse cx="${ex}" cy="${eyeY}" rx="${eyeRx}" ry="${headR * 0.075}" fill="#ffffff"/>`)
    s.push(`<circle cx="${ex + sign * headR * 0.02}" cy="${eyeY}" r="${headR * 0.05}" fill="${hsl(id.eyeHue, 60, 35)}"/>`)
    s.push(`<circle cx="${ex + sign * headR * 0.02}" cy="${eyeY}" r="${headR * 0.02}" fill="#0a0a0a"/>`)
    // pestaña/ceja
    s.push(`<path d="M ${ex - eyeRx} ${eyeY - headR * 0.14} Q ${ex} ${eyeY - headR * 0.2}, ${ex + eyeRx} ${eyeY - headR * 0.12}" stroke="${hsl(id.hairHue, id.hairSat, Math.max(12, id.hairL - 10))}" stroke-width="${headR * 0.035}" fill="none" stroke-linecap="round"/>`)
  }
  // nariz
  s.push(`<path d="M ${cx} ${eyeY + headR * 0.1} q ${headR * 0.05} ${headR * 0.12}, 0 ${headR * 0.16}" stroke="${skinSombra}" stroke-width="${headR * 0.03}" fill="none" stroke-linecap="round"/>`)
  // boca
  s.push(`<path d="M ${cx - headR * 0.16} ${cy + headR * 0.38} Q ${cx} ${cy + headR * 0.47}, ${cx + headR * 0.16} ${cy + headR * 0.38}" stroke="${hsl(id.lipsHue, 55, 45)}" stroke-width="${headR * 0.05}" fill="none" stroke-linecap="round"/>`)
  // pecas
  if (id.pecas) {
    const fr = rngDesde('pecas:' + cx)
    for (let i = 0; i < 9; i++) {
      const px = cx + (fr() - 0.5) * headR * 1.0
      const py = eyeY + headR * (0.08 + fr() * 0.14)
      s.push(`<circle cx="${px}" cy="${py}" r="${headR * 0.014}" fill="${hsl(20, 45, 45, 0.55)}"/>`)
    }
  }
  s.push(`</g>`)
  return s.join('\n    ')
}

function generarSvg(req: GenerationRequest, width: number, height: number): string {
  const id = identidadDe(req.baseSeed)
  const compRand = rngDesde(`comp:${req.seed}:${req.variant}`)
  const brief: Brief = req.brief
  const esPreview = req.kind === 'preview'
  const esDataset = req.kind === 'dataset'
  const esCanon = req.kind === 'canonica'

  // encuadre
  const encuadre = esCanon ? 'primer_plano' : brief.encuadre || 'plano_medio'
  const conPiernas = encuadre === 'cuerpo_entero'
  const conCuerpo = conPiernas || encuadre === 'plano_medio'
  const headR = esCanon ? 150 : encuadre === 'primer_plano' ? 185 : conPiernas ? 95 : 128
  const cx = 384 + (compRand() - 0.5) * 40
  const cy = conPiernas ? 250 : encuadre === 'primer_plano' ? 340 : 320

  // fondo por escena
  const sceneHue = (id.hue + Math.floor(compRand() * 70) - 35 + 360) % 360
  const luz = luzEstilo(brief.luz || 'natural', compRand)
  const g1 = hsl(sceneHue, 30, luz.extra === 'noche' ? 14 : 20)
  const g2 = hsl((sceneHue + 40) % 360, 25, luz.extra === 'noche' ? 26 : 38)
  const outfitHue = hashCadena('outfit:' + (brief.outfit || 'casual')) % 360
  const outfitColor = hsl(outfitHue, 32, 34)

  // blobs de escena (composición cambia por variante)
  const blobs: string[] = []
  for (let i = 0; i < 4; i++) {
    const bx = compRand() * 768
    const by = compRand() * 500
    const br = 60 + compRand() * 160
    blobs.push(`<circle cx="${bx.toFixed(0)}" cy="${by.toFixed(0)}" r="${br.toFixed(0)}" fill="${hsl((sceneHue + 20 * i) % 360, 30, 30, 0.18)}"/>`)
  }

  const laneEsPrivado = req.lane === LANE.PRIVADO
  const badgeFill = laneEsPrivado ? '#fb7185' : '#fbbf24'
  const badgeText = laneEsPrivado ? 'CARRIL PRIVADO · 18+' : 'CARRIL PÚBLICO · SFW'
  const kindTag = esCanon
    ? 'CARA CANÓNICA'
    : esDataset
      ? `DATASET ${((req.index ?? 0) + 1)}/${req.total ?? ''}`
      : esPreview
        ? 'VISTA PREVIA'
        : 'RENDER FINAL'

  const sceneLabel = esCanon ? 'identidad del personaje' : truncar(brief.escena || 'escena libre', 44)
  const outfitLabel = esCanon ? id.pecas ? 'con pecas' : '—' : truncar(brief.outfit || '—', 30)
  const luzLabel = esCanon ? 'luz de estudio' : truncar(brief.luz || '—', 24)
  const encuadreLabel = ENCUDRE_LABEL[encuadre] ?? encuadre

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 768 768" role="img" aria-label="Imagen simulada de ${escXml(req.characterName)}">
  <defs>
    <linearGradient id="bg" gradientTransform="rotate(${luz.angulo.toFixed(0)} 0.5 0.5)">
      <stop offset="0%" stop-color="${g2}"/>
      <stop offset="100%" stop-color="${g1}"/>
    </linearGradient>
    <radialGradient id="glow" cx="${luz.extra === 'foco' ? 0.7 : 0.5}" cy="0.22" r="0.75">
      <stop offset="0%" stop-color="${luz.tinte}" stop-opacity="${luz.op}"/>
      <stop offset="100%" stop-color="${luz.tinte}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="768" height="768" fill="url(#bg)"/>
  ${blobs.join('\n  ')}
  <rect width="768" height="768" fill="url(#glow)"/>
  ${luz.extra === 'noche' ? `<rect width="768" height="768" fill="hsl(250 20 8 / 0.35)"/>` : ''}
  <g>
    ${silueta(id, cx, headR, conCuerpo, conPiernas, outfitHue, outfitColor)}
  </g>
  ${luz.extra === 'rim' ? `<path d="M ${cx - headR} ${cy} a ${headR} ${headR} 0 0 1 ${headR * 2} 0" stroke="${luz.tinte}" stroke-width="6" fill="none" opacity="0.5"/>` : ''}
  <g font-family="ui-sans-serif, system-ui, sans-serif">
    <text x="24" y="42" font-size="22" font-weight="700" fill="#fafafa" opacity="0.92">${escXml(req.characterName)}</text>
    <text x="24" y="68" font-size="15" fill="#fafafa" opacity="0.6">${kindTag}${req.loraHash ? ' · LoRA ' + escXml(req.loraHash.slice(0, 10)) : ''}${esCanon ? '' : ' · ' + escXml(encuadreLabel)}</text>
    <rect x="529" y="20" rx="12" ry="12" width="215" height="30" fill="#0a0a0a" opacity="0.55"/>
    ${laneEsPrivado ? `<g transform="translate(543,26)"><rect x="0" y="7" width="14" height="11" rx="2.5" fill="${badgeFill}"/><path d="M 3 7 v-2.5 a 4 4 0 0 1 8 0 V 7" stroke="${badgeFill}" stroke-width="2.4" fill="none"/></g><text x="566" y="40" font-size="13" font-weight="600" fill="${badgeFill}">${badgeText}</text>` : `<text x="543" y="40" font-size="13" font-weight="600" fill="${badgeFill}">${badgeText}</text>`}
    <rect x="0" y="688" width="768" height="80" fill="#0a0a0a" opacity="0.55"/>
    <text x="24" y="716" font-size="17" font-weight="600" fill="#fafafa" opacity="0.85">escena: ${escXml(sceneLabel)}</text>
    <text x="24" y="740" font-size="13" fill="#fafafa" opacity="0.62">outfit: ${escXml(outfitLabel)}   ·   luz: ${escXml(luzLabel)}   ·   pose: ${escXml(truncar(esCanon ? '—' : brief.pose || '—', 24))}</text>
    <text x="744" y="740" font-size="11" text-anchor="end" fill="#fafafa" opacity="0.45">seed ${escXml(String(req.seed))} · v${req.variant} · checkpoint ${CHECKPOINT_SIMULADOR}</text>
  </g>
</svg>`
  return svg
}

// ───────────────────────── Proveedor ─────────────────────────

export const simulador: Provider = {
  name: 'simulador',
  esSimulado: true,
  generateImage(req: GenerationRequest): GeneratedImage {
    return {
      svg: generarSvg(req, req.kind === 'preview' ? 576 : 768, req.kind === 'preview' ? 576 : 768),
      width: req.kind === 'preview' ? 576 : 768,
      height: req.kind === 'preview' ? 576 : 768,
    }
  },
  checkIdentidad(seed: string): VeredictoIdentidad {
    return veredictoIdentidad(seed)
  },
  checkAnatomia(seed: string): VeredictoIdentidad {
    return veredictoAnatomia(seed)
  },
}

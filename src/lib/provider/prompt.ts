// Utilidades compartidas por los providers de generación real (ComfyUI y local-cpu).
import type { GenerationRequest } from './types'

/** Prompt compuesto a partir del brief — misma receta para todos los providers reales. */
export function componerPrompt(req: GenerationRequest): string {
  const b = req.brief
  const partes = [
    req.characterName,
    b.escena,
    b.outfit ? `wearing ${b.outfit}` : '',
    b.pose ? `${b.pose}` : '',
    b.encuadre ? `framing: ${b.encuadre}` : '',
    b.luz ? `lighting: ${b.luz}` : '',
    req.kind === 'dataset' ? 'training photo, neutral background' : '',
  ].filter(Boolean)
  return partes.join(', ')
}

/** Semilla numérica determinista (31 bits) derivada de la semilla de la pieza. */
export function seedNumerica(seed: string): number {
  return Math.abs(Number(BigInt('0x' + Buffer.from(seed).toString('hex').slice(0, 12))) % 2147483647) || 1
}

/** Contenedor SVG con la imagen raster embebida: reutiliza todo el pipeline existente. */
export function envolverPngEnSvg(base64: string, width: number, height: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><image href="data:image/png;base64,${base64}" width="${width}" height="${height}"/></svg>`
}

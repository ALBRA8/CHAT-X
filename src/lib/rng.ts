// Generador determinista de números pseudoaleatorios (para el simulador y el QA determinista)

export function hashCadena(str: string): number {
  // xmur3
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return (h ^= h >>> 16) >>> 0
}

export function rngDesde(semilla: string): () => number {
  // mulberry32
  let a = hashCadena(semilla)
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hexSha256(input: string): string {
  // FNV-1a 32bit expandido — suficiente para huellas visuales deterministas.
  // Para hashes reales de archivos se usa crypto en lib/crypto.ts.
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  for (let i = 0; i < input.length; i++) {
    h1 = Math.imul(h1 ^ input.charCodeAt(i), 0x01000193) >>> 0
    h2 = Math.imul(h2 + input.charCodeAt(i) * (i + 7), 0x85ebca6b) >>> 0
  }
  return (
    h1.toString(16).padStart(8, '0') +
    h2.toString(16).padStart(8, '0') +
    hashCadena('v2:' + input).toString(16).padStart(8, '0')
  )
}

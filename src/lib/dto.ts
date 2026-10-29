// Serializadores para la API (parsean los campos JSON guardados como texto)
import type { Character, Job, Media, Set, KpiEntry, ComplianceEvent, LoraVersion } from '@prisma/client'

export interface Genome {
  atributos: Record<string, string>
  aficiones: string
  lore: string
  tono: string
}

export interface RasgoFirmante {
  tipo: string
  descripcion: string
  ubicacion: string
  // A3 (adopción ClonaKit del Batch C, patrón Enhancor Freckle Control): los rasgos
  // firmantes aceptan intensidad, no solo presencia. 1 sutil … 5 dominante.
  // Opcional por compatibilidad: filas antiguas sin campo se tratan como 3 (media).
  intensidad?: number
}

export function genomeDe(character: Character): Genome {
  try {
    const g = JSON.parse(character.genome) as Partial<Genome>
    return {
      atributos: g.atributos ?? {},
      aficiones: g.aficiones ?? '',
      lore: g.lore ?? '',
      tono: g.tono ?? '',
    }
  } catch {
    return { atributos: {}, aficiones: '', lore: '', tono: '' }
  }
}

export function signKitDe(character: Character): RasgoFirmante[] {
  try {
    return JSON.parse(character.signKit) as RasgoFirmante[]
  } catch {
    return []
  }
}

export function parseJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback
  try {
    return JSON.parse(s) as T
  } catch {
    return fallback
  }
}

export type CharacterDTO = ReturnType<typeof characterDTO>
export function characterDTO(c: Character) {
  return {
    id: c.id,
    name: c.name,
    status: c.status,
    audience: c.audience,
    style: c.style,
    anchorTrait: c.anchorTrait,
    seed: c.seed,
    genome: genomeDe(c),
    signKit: signKitDe(c),
    canonicalVariant: c.canonicalVariant,
    tieneCaraCanonica: Boolean(c.canonicalPath),
    loraHash: c.loraHash,
    datasetCount: c.datasetCount,
    createdAt: c.createdAt,
  }
}

export type JobDTO = ReturnType<typeof jobDTO>
export function jobDTO(j: Job) {
  return {
    id: j.id,
    type: j.type,
    characterId: j.characterId,
    priority: j.priority,
    status: j.status,
    progress: j.progress,
    costEstimate: j.costEstimate,
    costReal: j.costReal,
    payload: parseJson<Record<string, unknown>>(j.payload, {}),
    result: parseJson<Record<string, unknown>>(j.result, {}),
    error: j.error,
    createdAt: j.createdAt,
    startedAt: j.startedAt,
    finishedAt: j.finishedAt,
  }
}

export type MediaDTO = ReturnType<typeof mediaDTO>
export function mediaDTO(m: Media) {
  return {
    id: m.id,
    characterId: m.characterId,
    kind: m.kind,
    lane: m.lane,
    prompt: m.prompt,
    seed: m.seed,
    checkpoint: m.checkpoint,
    loraHash: m.loraHash,
    batchId: m.batchId,
    sceneName: m.sceneName,
    qualityVerdict: m.qualityVerdict,
    qualityReason: m.qualityReason,
    filtersTriggered: parseJson<string[]>(m.filtersTriggered, []),
    aiLabels: parseJson<string[]>(m.aiLabels, []),
    pipelineStatus: m.pipelineStatus,
    cifrado: Boolean(m.encIv),
    provenance: parseJson<Record<string, unknown>>(m.provenance, {}),
    setId: m.setId,
    createdAt: m.createdAt,
  }
}

export type SetDTO = ReturnType<typeof setDTO>
export function setDTO(s: Set, mediaCount?: number) {
  return {
    id: s.id,
    characterId: s.characterId,
    name: s.name,
    lane: s.lane,
    caption: s.caption,
    aiLabel: s.aiLabel,
    suggestedPrice: s.suggestedPrice,
    realPrice: s.realPrice,
    publishStatus: s.publishStatus,
    revenue: s.revenue,
    publishedAt: s.publishedAt,
    createdAt: s.createdAt,
    piecesCount: mediaCount,
  }
}

export type KpiDTO = ReturnType<typeof kpiDTO>
export function kpiDTO(k: KpiEntry) {
  return { ...k }
}

export type ComplianceDTO = ReturnType<typeof complianceDTO>
export function complianceDTO(e: ComplianceEvent) {
  return {
    id: e.id,
    type: e.type,
    mediaId: e.mediaId,
    characterId: e.characterId,
    detail: parseJson<Record<string, unknown>>(e.detail, {}),
    createdAt: e.createdAt,
  }
}

export type LoraVersionDTO = ReturnType<typeof loraDTO>
export function loraDTO(v: LoraVersion) {
  return {
    id: v.id,
    hash: v.hash,
    note: v.note,
    costReal: v.costReal,
    createdAt: v.createdAt,
  }
}

"use client"
// Capa de datos del frontend: fetch + hooks TanStack Query
import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'

export async function api<T = Record<string, unknown>>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    ...opts,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error((data as { error?: string }).error || `Error ${res.status}`) as Error & {
      status?: number
      data?: Record<string, unknown>
    }
    err.status = res.status
    err.data = data
    throw err
  }
  return data as T
}

// ── Tipos ──

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
  // A3 (Enhancor Freckle Control): intensidad del rasgo, 1 sutil … 5 dominante.
  // Opcional por compatibilidad con kit guardado antes de esta adopción (ausencia = 3).
  intensidad?: number
}

export interface CharacterT {
  id: string
  name: string
  status: 'BORRADOR' | 'ENTRENANDO' | 'ACTIVO' | 'PAUSADA'
  audience: string
  style: string
  anchorTrait: string
  seed: string
  genome: Genome
  signKit: RasgoFirmante[]
  canonicalVariant: number | null
  tieneCaraCanonica: boolean
  loraHash: string | null
  datasetCount: number
  createdAt: string
}

export interface JobT {
  id: string
  type: string
  characterId: string | null
  characterName: string | null
  priority: number
  status: 'en_cola' | 'procesando' | 'listo' | 'fallido'
  progress: number
  costEstimate: number
  costReal: number
  payload: Record<string, unknown>
  result: Record<string, unknown>
  error: string | null
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
}

export interface MediaT {
  id: string
  characterId: string
  kind: string
  lane: 'PUBLICO' | 'PRIVADO'
  prompt: string
  seed: string
  checkpoint: string
  loraHash: string | null
  batchId: string | null
  sceneName: string | null
  qualityVerdict: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'
  qualityReason: string | null
  filtersTriggered: string[]
  aiLabels: string[]
  pipelineStatus: 'borrador' | 'qa' | 'aprobado' | 'cifrado' | 'publicado'
  cifrado: boolean
  provenance: Record<string, unknown>
  setId: string | null
  createdAt: string
  set?: { id: string; name: string; publishStatus: string } | null
}

export interface SetT {
  id: string
  characterId: string
  characterName?: string
  name: string
  lane: 'PUBLICO' | 'PRIVADO'
  caption: string
  aiLabel: string
  suggestedPrice: number
  realPrice: number | null
  publishStatus: string
  revenue: number
  publishedAt: string | null
  createdAt: string
  piecesCount: number | null
}

export interface KpiEntryT {
  id: string
  characterId: string
  characterName?: string
  month: string
  revenue: number
  subs: number
  paidMessages: number
  ppv: number
  gpuCost: number
  publishedPieces: number
  qaRejectionRate: number
  source: string
}

export interface AgregadoT {
  characterId: string
  nombre: string
  estado: string
  costeGpuMes: number
  piezasPublicadas: number
  tasaRechazoQa: number
}

export interface EventoT {
  id: string
  type: string
  mediaId: string | null
  characterId: string | null
  detail: Record<string, unknown>
  createdAt: string
}

export interface PresetT {
  nombre: string
  escena: string
  outfit: string
  pose: string
  encuadre: string
  luz: string
}

// ── Hooks ──

export function useCharacters() {
  return useQuery({
    queryKey: ['characters'],
    queryFn: () => api<{ characters: CharacterT[] }>('/api/characters'),
    select: (d) => d.characters,
  })
}

export function useCharacter(id: string | null) {
  return useQuery({
    queryKey: ['character', id],
    queryFn: () =>
      api<{ character: CharacterT; loraVersions: { id: string; hash: string; note: string; costReal: number; createdAt: string }[] }>(
        `/api/characters/${id}`,
      ),
    enabled: Boolean(id),
    refetchInterval: 2500,
  })
}

export function useJobs(activos: boolean) {
  return useQuery({
    queryKey: ['jobs', activos],
    queryFn: () => api<{ jobs: JobT[] }>(`/api/jobs?activos=${activos ? '1' : '0'}`),
    select: (d) => d.jobs,
    refetchInterval: (q) => {
      const jobs = q.state.data?.jobs ?? []
      const activo = jobs.some((j) => j.status === 'en_cola' || j.status === 'procesando')
      return activo ? 1500 : 5000
    },
  })
}

export function useMedia(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v) sp.set(k, v)
  })
  return useQuery({
    queryKey: ['media', sp.toString()],
    queryFn: () => api<{ media: MediaT[] }>(`/api/media?${sp.toString()}`),
    refetchInterval: 3000,
  })
}

export function useSets() {
  return useQuery({
    queryKey: ['sets'],
    queryFn: () => api<{ sets: SetT[] }>('/api/sets'),
    select: (d) => d.sets,
  })
}

export function useSetDetalle(id: string | null) {
  return useQuery({
    queryKey: ['set', id],
    queryFn: () => api<{ set: SetT; piezas: MediaT[] }>(`/api/sets/${id}`),
    enabled: Boolean(id),
  })
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () =>
      api<{ credits: number; privadaDefinida: boolean; presets: PresetT[]; provider: string }>('/api/settings'),
    refetchInterval: 6000,
  })
}

export function usePrivado() {
  return useQuery({
    queryKey: ['privado'],
    queryFn: () =>
      api<{ privadaDefinida: boolean; desbloqueado: boolean; minutosRestantes: number }>('/api/private/session'),
    refetchInterval: 15000,
  })
}

export function useCompliance() {
  return useQuery({
    queryKey: ['compliance'],
    queryFn: () => api<{ eventos: EventoT[]; piezas: MediaT[] }>('/api/compliance'),
    refetchInterval: 8000,
  })
}

export function useKpi() {
  return useQuery({
    queryKey: ['kpi'],
    queryFn: () =>
      api<{
        entries: KpiEntryT[]
        agregados: AgregadoT[]
        mesActual: string
      }>('/api/kpi'),
  })
}

export function useInvalidate() {
  const qc = useQueryClient()
  return (...keys: string[]) => {
    for (const k of keys) void qc.invalidateQueries({ queryKey: [k] })
  }
}

export function useAccion<TVars>(fn: (vars: TVars) => Promise<unknown>, keys: string[]) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => invalidate(...keys),
  })
}

export type { UseQueryOptions }

"use client"
// Capa de datos de la plataforma central: motores del ecosistema + eventos.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/components/estudio/api'

export interface ContratoRutaT {
  metodo: 'GET' | 'POST'
  ruta: string
  que: string
}

export interface MotorDefT {
  id: string
  nombre: string
  modulo: number
  rol: string
  stack: string
  puertoPorDefecto: string
  urlPorDefecto: string
  healthPath: string
  datosReales?: { descripcion: string; ruta: string; metodo: 'GET' | 'POST' }
  capacidades: string[]
  contratos: ContratoRutaT[]
  envRequeridas: string[]
  notasIntegracion: string[]
  estadoNota: string
}

export type EstadoMotorT = 'NO_CONFIGURADO' | 'INALCANZABLE' | 'NO_AUTORIZADO' | 'OPERATIVO'

export interface SondaT {
  estado: EstadoMotorT
  latenciaMs: number | null
  detalle: string
  verificadoEn: string
}

export interface EstadoCompletoT {
  motor: string
  estado: SondaT
  config: { url: string; apiKey: string; configurada: boolean; actualizadoEn: string | null }
}

export interface MotoresRespuesta {
  motores: MotorDefT[]
  estados: EstadoCompletoT[]
  resumen: { operativos: number; conProblemas: number; sinConfigurar: number }
}

export function useMotores() {
  return useQuery({
    queryKey: ['motores'],
    queryFn: () => api<MotoresRespuesta>('/api/motores'),
    refetchInterval: 30000,
  })
}

export function useMotorDetalle(motor: string | null) {
  return useQuery({
    queryKey: ['motor', motor],
    queryFn: () => api<{ estado: EstadoCompletoT; datos: { ok: boolean; detalle: string; datos?: unknown } | null }>(`/api/motores/${motor}`),
    enabled: Boolean(motor),
    refetchInterval: 30000,
  })
}

export function useGuardarMotor(motor: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vals: { url: string; apiKey: string }) =>
      api<{ ok: boolean; estado: EstadoCompletoT }>(`/api/motores/${motor}`, { method: 'PUT', body: JSON.stringify(vals) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['motores'] })
      void qc.invalidateQueries({ queryKey: ['motor', motor] })
    },
  })
}

export function useAccionMotor(motor: string) {
  return useMutation({
    mutationFn: (body: { accion: string; envelope?: string }) =>
      api<{ ok: boolean; detalle: string; respuesta?: string; datos?: unknown }>(`/api/motores/${motor}/accion`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  })
}

export interface EventoIntegracionT {
  id: string
  source: string
  event: string
  detail: string
  createdAt: string
}

export function useEventosIntegracion(soloLeads: boolean) {
  return useQuery({
    queryKey: ['eventos-integracion', soloLeads],
    queryFn: () =>
      api<{ eventos: EventoIntegracionT[] }>(
        soloLeads ? '/api/motores/agent-leads/webhook' : '/api/motores/eventos',
      ),
    select: (d) => d.eventos,
    refetchInterval: 15000,
  })
}

// ───────────────── Orquestador de flujos (módulo Automatización) ─────────────────

export interface PasoDefT {
  id: string
  tipo: string
  nombre: string
  params: Record<string, unknown>
  requiereAprobacion?: boolean
  opcional?: boolean
  intentos?: number
}

export interface EstadoPasoT {
  estado: 'pendiente' | 'en_curso' | 'completado' | 'fallido' | 'omitido' | 'esperando_aprobacion'
  resultado?: unknown
  error?: string
  iniciadoEn?: string
  terminadoEn?: string
  intentos?: number
}

export interface FlujoT {
  id: string
  nombre: string
  descripcion: string
  definicion: string
  activo: boolean
  createdAt: string
  ejecuciones?: EjecucionT[]
}

export interface EjecucionT {
  id: string
  flujoId: string
  estado: 'en_curso' | 'esperando_aprobacion' | 'completada' | 'fallida' | 'cancelada'
  pasosEstado: string
  variables: string
  registro: string
  createdAt: string
  finishedAt: string | null
}

export function useFlujos() {
  return useQuery({
    queryKey: ['flujos'],
    queryFn: () => api<{ flujos: FlujoT[] }>('/api/flujos'),
    select: (d) => d.flujos,
  })
}

export function useEjecutarFlujo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (flujoId: string) => api<{ ejecucionId: string }>(`/api/flujos/${flujoId}/ejecutar`, { method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['flujos'] }),
  })
}

export function useEjecucion(id: string | null) {
  return useQuery({
    queryKey: ['ejecucion', id],
    queryFn: () => api<{ ejecucion: EjecucionT & { flujo: { nombre: string; definicion: string } } }>(`/api/flujos/ejecuciones/${id}`),
    enabled: Boolean(id),
    refetchInterval: (q) => {
      const estado = q.state.data?.ejecucion.estado
      return estado === 'en_curso' || estado === 'esperando_aprobacion' ? 2000 : false
    },
  })
}

export function useAprobarPaso(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vals: { aprobado: boolean; nota?: string }) =>
      api<{ ok: boolean; mensaje: string }>(`/api/flujos/ejecuciones/${id}/aprobar`, { method: 'POST', body: JSON.stringify(vals) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ejecucion', id] })
      void qc.invalidateQueries({ queryKey: ['flujos'] })
    },
  })
}

export function useCancelarEjecucion(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api<{ ok: boolean }>(`/api/flujos/ejecuciones/${id}/cancelar`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ejecucion', id] })
      void qc.invalidateQueries({ queryKey: ['flujos'] })
    },
  })
}

export function useSistema() {
  return useQuery({
    queryKey: ['sistema'],
    queryFn: () =>
      api<{
        host: { plataforma: string; cpus: number; ramGb: number; discoLibreGb: number; nota: string }
        gpu: { nombre: string; vramMb: number; driver: string; cuda: string; fuente: string }
        proveedor: { actual: string; esSimulado: boolean; comfy?: { ok: boolean; detalle: string; vramMb?: number } }
        cola: { enCola: number; procesando: number; listos: number; fallidos: number }
        generadoEn: string
      }>('/api/sistema'),
    refetchInterval: 30000,
  })
}

export interface PiezaCalendario {
  fecha: string
  titulo: string
  personaje: string
  carril: string
  caption: string
  etiquetaIA: string
  precio: number
}

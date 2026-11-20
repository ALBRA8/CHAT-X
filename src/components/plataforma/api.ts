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

// ───────────────── Panel de Configuración (configuración en caliente) ─────────────────
// Contrato con la constitución: la fuente de cada valor se DECLARA (panel > .env >
// defecto), los secretos viajan siempre enmascarados (la API jamás los devuelve
// completos) y las sondas son reales contra los proveedores, nunca decorativas.

export type FuenteConfigT = 'bd' | 'env' | 'defecto'

export interface EntradaConfigT {
  clave: string
  etiqueta: string
  descripcion: string
  categoria: 'llm' | 'voz' | 'media' | 'general'
  tipo: 'texto' | 'secreto' | 'numero'
  envVar: string // respaldo declarado (.env del operador)
  valor: string // ya enmascarado si tipo='secreto'
  definido: boolean
  fuente: FuenteConfigT
  actualizadoEn: string | null // ISO de la fila en BD, null si no hay fila
}

export interface RespuestaConfigT {
  entradas: EntradaConfigT[]
  resumen: { total: number; desdePanel: number; desdeEnv: number }
}

export function useConfiguracion() {
  return useQuery({
    queryKey: ['configuracion'],
    queryFn: () => api<RespuestaConfigT>('/api/configuracion'),
  })
}

export function useGuardarConfiguracion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entradas: { clave: string; valor: string }[]) =>
      api<{ ok: boolean; claves: string[] }>('/api/configuracion', {
        method: 'PUT',
        body: JSON.stringify({ entradas }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['configuracion'] })
      void qc.invalidateQueries({ queryKey: ['sistema'] }) // media.proveedor puede cambiar en caliente
    },
  })
}

export function useRestaurarConfiguracion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (clave: string) =>
      api<{ ok: boolean; clave: string }>(`/api/configuracion?clave=${encodeURIComponent(clave)}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['configuracion'] })
      void qc.invalidateQueries({ queryKey: ['sistema'] })
    },
  })
}

// Sonda individual de un proveedor (misma forma en llm/imagen/voz/video).
export interface SondaConfigT {
  provedor: string
  estado: string
  detalle: string
}

export interface SondasConfigT {
  llm: { provedor: string; estado: string; detalle: string; modelo: string; base: string } | null
  voz: SondaConfigT[]
  imagen: SondaConfigT | null
  video: { estado: string; detalle: string; comoActivar: string } | null
}

// Sondas REALES «Probar todo ahora»: POST /api/configuracion/probar ejecuta las
// sondas de verdad (GET {base}/models del LLM, binarios locales de voz, proveedor
// de imagen activo, escalera de vídeo) con la config vigente.
export function useSondasConfiguracion() {
  return useQuery({
    queryKey: ['configuracion-sondas'],
    queryFn: () =>
      api<SondasConfigT>('/api/configuracion/probar', { method: 'POST', body: JSON.stringify({ objetivo: 'todo' }) }),
  })
}

// ───────────────── Canal WhatsApp propio (F1 · W2+W4) ─────────────────
// Estado honesto del canal (GET /api/whatsapp/conversacion) + iniciativas
// programadas (GET/POST /api/whatsapp/iniciativas). Los chatId viajan SIEMPRE
// enmascarados; los secretos solo como "presente".

export interface CanalRespuesta {
  honesto: string
  sesion: { estado: string; numeroMascarado: string | null; secretoPresente: boolean; conectadaEn: string | null }
  webhook: { secretoPresente: boolean; fuente: string }
  personaje: { id: string | null; nombre: string | null; activo: boolean; fuente: string }
  pacing: { silencio: string; maxRespuestasPorDia: number; maxIniciativasPorDia: number; temperatura: 'normal' | 'enfriando'; temperaturaHasta: string | null }
  hoy: { respuestasEnviadas: number; iniciativasEnviadas: number; iniciativasProgramadas: number; fallosRiesgo: number; enCola: number; bloqueadosPacing: number }
  ultimos: { id: string; chat: string; direccion: string; tipo: string; estado: string; texto: string; pacingMotivo: string | null; pacingReintentarEn: string | null; errorRiesgo: boolean; createdAt: string }[]
  actualizadoEn: string
}

export function useCanal() {
  return useQuery({
    queryKey: ['canal-whatsapp'],
    queryFn: () => api<CanalRespuesta>('/api/whatsapp/conversacion'),
    refetchInterval: 30000,
  })
}

export function useAccionSesionWhatsApp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { accion: string; numero?: string; secretoSesion?: string }) =>
      api<{ ok: boolean; estado: string; detalle: string; numeroMascarado?: string | null; rotaciones?: number }>('/api/whatsapp/sesion', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['canal-whatsapp'] })
    },
  })
}

export interface IniciativaProgramadaT {
  id: string
  chat: string
  programadaEn: string | null
  brief: string
  vencida: boolean
  pacingMotivo: string | null
  pacingReintentarEn: string | null
  createdAt: string
}

export interface IniciativaHistorialT {
  id: string
  chat: string
  estado: string
  texto: string
  modo: string | null
  programadaPor: string | null
  errorRiesgo: boolean
  updatedAt: string
}

export interface IniciativasRespuesta {
  honesto: string
  personaje: { id: string | null; nombre: string | null; activo: boolean }
  topes: { programadasPorChat: number }
  programadas: IniciativaProgramadaT[]
  historial: IniciativaHistorialT[]
  actualizadoEn: string
}

export function useIniciativas() {
  return useQuery({
    queryKey: ['iniciativas-whatsapp'],
    queryFn: () => api<IniciativasRespuesta>('/api/whatsapp/iniciativas'),
    refetchInterval: 30000,
  })
}

export function useProgramarIniciativa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vals: { chatId: string; programadaEn?: string; texto?: string }) =>
      api<{ ok: boolean; id: string; estado: string; programadaEn: string | null; chat: string; motivo: string }>('/api/whatsapp/iniciativas', {
        method: 'POST',
        body: JSON.stringify({ accion: 'programar', ...vals }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['iniciativas-whatsapp'] })
      void qc.invalidateQueries({ queryKey: ['canal-whatsapp'] })
    },
  })
}

export function useCancelarIniciativa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api<{ ok: boolean; cancelada: string; motivo: string }>('/api/whatsapp/iniciativas', {
        method: 'POST',
        body: JSON.stringify({ accion: 'cancelar', id }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['iniciativas-whatsapp'] })
      void qc.invalidateQueries({ queryKey: ['canal-whatsapp'] })
    },
  })
}

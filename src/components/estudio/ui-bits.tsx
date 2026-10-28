"use client"
// Piezas de UI compartidas de EL ESTUDIO
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { COSTOS } from '@/lib/constants'
import type { CharacterT, MediaT, JobT } from './api'

export const fmtCred = (n: number) => `${Math.round(n * 10) / 10}`
export const fmtDinero = (n: number) => `$${(Math.round(n * 100) / 100).toLocaleString('es-MX')}`

export function fmtFecha(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const ESTADO_STYLES: Record<string, string> = {
  BORRADOR: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
  ENTRENANDO: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  ACTIVO: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  PAUSADA: 'bg-zinc-600/20 text-zinc-400 border-zinc-600/40',
}

export function EstadoBadge({ estado }: { estado: string }) {
  return (
    <Badge variant="outline" className={cn('text-[11px]', ESTADO_STYLES[estado] ?? '')}>
      {estado.toLowerCase()}
    </Badge>
  )
}

const PIPELINE_STYLES: Record<string, string> = {
  borrador: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
  qa: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  aprobado: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  cifrado: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  publicado: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
}

export function PipelineBadge({ estado }: { estado: string }) {
  return (
    <Badge variant="outline" className={cn('text-[11px]', PIPELINE_STYLES[estado] ?? '')}>
      {estado}
    </Badge>
  )
}

export function VeredictoBadge({ veredicto }: { veredicto: string }) {
  const style =
    veredicto === 'APROBADO'
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      : veredicto === 'RECHAZADO'
        ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
  return (
    <Badge variant="outline" className={cn('text-[11px]', style)}>
      QA: {veredicto.toLowerCase()}
    </Badge>
  )
}

export function CarrilBadge({ lane }: { lane: string }) {
  return lane === 'PRIVADO' ? (
    <Badge variant="outline" className="text-[11px] bg-rose-500/10 text-rose-300 border-rose-500/30">
      privado 18+
    </Badge>
  ) : (
    <Badge variant="outline" className="text-[11px] bg-amber-500/10 text-amber-200 border-amber-500/30">
      público SFW
    </Badge>
  )
}

export function JobBadge({ status }: { status: string }) {
  const style =
    status === 'listo'
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      : status === 'fallido'
        ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
        : status === 'procesando'
          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
          : 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30'
  return (
    <Badge variant="outline" className={cn('text-[11px]', style)}>
      {status.replace('_', ' ')}
    </Badge>
  )
}

const JOB_LABEL: Record<string, string> = {
  dataset: 'dataset',
  entrenamiento: 'entrenamiento LoRA',
  lote_fotos: 'lote de fotos',
  render_final: 'render final',
  cifrado: 'cifrado',
}
export const jobLabel = (t: string) => JOB_LABEL[t] ?? t

/** Imagen de pieza. El carril privado NUNCA se muestra fuera del estudio privado. */
export function MediaImg({
  media,
  size = 'thumb',
  className,
  mostrarPrivado = false,
}: {
  media: Pick<MediaT, 'id' | 'lane' | 'qualityVerdict'>
  size?: 'thumb' | 'full'
  className?: string
  mostrarPrivado?: boolean
}) {
  const esPrivada = media.lane === 'PRIVADO'
  const src = mostrarPrivado || !esPrivada ? `/api/media/${media.id}/archivo?tipo=${size}` : null
  if (!src) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-1 rounded-md border border-rose-500/20 bg-rose-500/5 text-rose-300/80 text-xs aspect-square',
          className,
        )}
        aria-label="Pieza cifrada del carril privado"
      >
        <span aria-hidden>🔒</span>
        <span className="text-[10px] text-center px-1">cifrada · solo en estudio privado</span>
      </div>
    )
  }
  return (

    <img
      src={src}
      alt={`pieza ${media.id}`}
      loading="lazy"
      className={cn('rounded-md border border-border object-cover aspect-square w-full', className)}
    />
  )
}

export function CaraCanonica({ character, className }: { character: CharacterT; className?: string }) {
  if (!character.tieneCaraCanonica) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-md border border-dashed border-border text-zinc-500 text-xs aspect-square bg-zinc-900',
          className,
        )}
      >
        sin cara canónica
      </div>
    )
  }
  return (

    <img
      src={`/api/characters/${character.id}/cara`}
      alt={`Cara canónica de ${character.name}`}
      className={cn('rounded-md border border-border object-cover aspect-square w-full', className)}
    />
  )
}

export function Vacio({ icono, titulo, texto }: { icono: string; titulo: string; texto: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-10 px-6 text-center">
      <span className="text-3xl" aria-hidden>
        {icono}
      </span>
      <p className="font-medium text-sm">{titulo}</p>
      <p className="text-xs text-muted-foreground max-w-sm">{texto}</p>
    </div>
  )
}

export function StatCard({
  etiqueta,
  valor,
  detalle,
  icono,
}: {
  etiqueta: string
  valor: string
  detalle?: string
  icono?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{etiqueta}</p>
        {icono ? (
          <span aria-hidden className="text-sm opacity-60">
            {icono}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{valor}</p>
      {detalle ? <p className="mt-0.5 text-[11px] text-muted-foreground">{detalle}</p> : null}
    </div>
  )
}

export const ETIQUETAS_COSTE = {
  preview: COSTOS.PREVIEW,
  render: COSTOS.RENDER_FINAL,
  datasetFoto: COSTOS.FOTO_DATASET,
  lora: COSTOS.ENTRENAMIENTO_LORA,
  cifrado: COSTOS.CIFRADO,
}

export function ProgresoJob({ job }: { job: JobT }) {
  const pct = job.status === 'listo' ? 100 : job.progress
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
      <div
        className={cn('h-full rounded-full transition-all', job.status === 'fallido' ? 'bg-rose-500' : 'bg-primary')}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

"use client"
// Panel del Estudio (ficha 4.1): roster, cola global, alertas QA. Mobile-first.
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'
import { ChevronDown, Clapperboard, PlayCircle } from 'lucide-react'
import { useCharacters, useJobs, useKpi, useMedia, useSets, useSettings } from './api'
import type { CharacterT, JobT } from './api'
import {
  CaraCanonica,
  EstadoBadge,
  ProgresoJob,
  StatCard,
  Vacio,
  VeredictoBadge,
  fmtDinero,
  fmtFecha,
  jobLabel,
  JobBadge,
} from './ui-bits'

export default function PanelView({ onAbrirEstudio }: { onAbrirEstudio: (c: CharacterT) => void }) {
  const { data: characters } = useCharacters()
  const { data: jobs } = useJobs(false)
  const { data: sets } = useSets()
  const { data: kpi } = useKpi()
  const { data: rechazadas } = useMedia({ veredicto: 'RECHAZADO', limit: '8' })
  const { data: settings } = useSettings()
  const [colaAbierta, setColaAbierta] = useState(false)

  const activos = jobs?.filter((j) => j.status === 'en_cola' || j.status === 'procesando') ?? []
  const recientes = jobs?.slice(0, 12) ?? []
  const agregadoPor = (id: string) => kpi?.agregados.find((a) => a.characterId === id)
  const ingresoPor = (id: string) => {
    const mes = kpi?.mesActual
    const e = kpi?.entries.find((x) => x.characterId === id && x.month === mes)
    return e?.revenue ?? 0
  }
  const setEnCurso = (id: string) => sets?.find((s) => s.characterId === id && s.publishStatus !== 'publicado')
  const ingresosMes = kpi?.entries.filter((e) => e.month === kpi.mesActual).reduce((a, e) => a + e.revenue, 0) ?? 0
  const gpuMes = kpi?.agregados.reduce((a, g) => a + g.costeGpuMes, 0) ?? 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard etiqueta="Saldo de créditos" valor={fmtDinero(settings?.credits ?? 0)} detalle="economía interna" icono="🪙" />
        <StatCard etiqueta="Personajes" valor={String(characters?.length ?? 0)} detalle={`${characters?.filter((c) => c.status === 'ACTIVO').length ?? 0} activos`} icono="🎭" />
        <StatCard etiqueta="Ingresos del mes" valor={fmtDinero(ingresosMes)} detalle="pegados desde la plataforma" icono="📈" />
        <StatCard etiqueta="Coste GPU del mes" valor={fmtDinero(gpuMes)} detalle="trabajos últimos 30 días" icono="⚡" />
      </div>

      <section aria-labelledby="roster-titulo">
        <div className="flex items-center justify-between mb-3">
          <h2 id="roster-titulo" className="text-lg font-semibold">
            Roster
          </h2>
          <span className="text-xs text-muted-foreground">toca un personaje para abrirlo en el estudio</span>
        </div>
        {!characters || characters.length === 0 ? (
          <Vacio
            icono="🎬"
            titulo="Aún no hay personajes"
            texto="Abre la pestaña Genoma y crea tu primera modelo virtual con el asistente de 7 pasos."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {characters.map((c) => (
              <Card key={c.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <CaraCanonica character={c} className="w-20 h-20 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{c.name}</h3>
                        <EstadoBadge estado={c.status} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {c.anchorTrait || 'sin rasgo ancla'} · {c.loraHash ? `LoRA ${c.loraHash.slice(5, 15)}` : 'sin LoRA'}
                      </p>
                      <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                        <div>
                          <dt className="text-muted-foreground inline">Set en curso: </dt>
                          <dd className="inline font-medium">{setEnCurso(c.id)?.name ?? '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground inline">Ingresos mes: </dt>
                          <dd className="inline font-medium text-emerald-300">{fmtDinero(ingresoPor(c.id))}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground inline">GPU mes: </dt>
                          <dd className="inline font-medium">{fmtDinero(agregadoPor(c.id)?.costeGpuMes ?? 0)}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground inline">Rechazo QA: </dt>
                          <dd className="inline font-medium">{agregadoPor(c.id)?.tasaRechazoQa ?? 0}%</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                  {c.status === 'ACTIVO' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-3 w-full"
                      onClick={() => onAbrirEstudio(c)}
                    >
                      <PlayCircle className="mr-1.5 h-4 w-4" aria-hidden /> Abrir en el Estudio
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="cola-titulo">
        <h2 id="cola-titulo" className="text-lg font-semibold mb-3">
          Cola de trabajos
        </h2>
        {activos.length > 0 && (
          <div className="space-y-2 mb-3">
            {activos.map((j) => (
              <JobRow key={j.id} job={j} destacado />
            ))}
          </div>
        )}
        <Collapsible open={colaAbierta} onOpenChange={setColaAbierta}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
              {colaAbierta ? 'Ocultar historial' : `Ver historial reciente (${recientes.length})`}
              <ChevronDown className="ml-1 h-4 w-4" aria-hidden />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {recientes.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Sin trabajos todavía.</p>
            ) : (
              recientes.map((j) => <JobRow key={j.id} job={j} />)
            )}
          </CollapsibleContent>
        </Collapsible>
      </section>

      <section aria-labelledby="qa-titulo">
        <h2 id="qa-titulo" className="text-lg font-semibold mb-3">
          Alertas de QA
        </h2>
        {!rechazadas || rechazadas.media.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground flex items-center gap-2">
              <Clapperboard className="h-4 w-4" aria-hidden /> Sin rechazos recientes: la puerta de calidad está en verde.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {rechazadas.media.map((m) => (
              <Card key={m.id} className="border-rose-500/20">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <VeredictoBadge veredicto={m.qualityVerdict} />
                    <span className="text-muted-foreground">{fmtFecha(m.createdAt)}</span>
                  </div>
                  <p className="text-xs mt-1.5">{m.qualityReason}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">prompt: {m.prompt}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function JobRow({ job, destacado = false }: { job: JobT; destacado?: boolean }) {
  return (
    <div className={destacado ? 'rounded-lg border border-primary/30 bg-card p-3' : 'rounded-lg border border-border bg-card/60 p-3'}>
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <JobBadge status={job.status} />
        <span className="font-medium">{jobLabel(job.type)}</span>
        {job.characterName ? <span className="text-muted-foreground">· {job.characterName}</span> : null}
        <span className="ml-auto tabular-nums text-muted-foreground">
          {Math.round(job.costReal || job.costEstimate)} cr. · {fmtFecha(job.createdAt)}
        </span>
      </div>
      {(job.status === 'procesando' || job.status === 'en_cola') && (
        <div className="mt-2">
          <Progress value={job.progress} className="h-1.5" />
        </div>
      )}
      {job.error ? <p className="mt-1.5 text-[11px] text-rose-300">{job.error}</p> : null}
    </div>
  )
}

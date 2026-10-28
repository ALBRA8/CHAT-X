'use client'
// MÓDULO 7 — AUTOMATIZACIÓN (orquestador de flujos, secciones 8-9 del prompt maestro).
// Cada paso de cada ejecución llama al contrato real del motor correspondiente.
// Los estados se leen de la BD en vivo (polling 2 s mientras corre).
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  useFlujos,
  useEjecutarFlujo,
  useEjecucion,
  useAprobarPaso,
  useCancelarEjecucion,
  type PasoDefT,
  type EstadoPasoT,
} from './api'
import { fmtFecha } from '@/components/estudio/ui-bits'

const COLOR_ESTADO: Record<string, string> = {
  en_curso: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  esperando_aprobacion: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  completada: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  fallida: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  cancelada: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/30',
}

const COLOR_PASO: Record<string, string> = {
  pendiente: 'text-muted-foreground',
  en_curso: 'text-sky-300',
  completado: 'text-emerald-300',
  fallido: 'text-rose-300',
  omitido: 'text-amber-300',
  esperando_aprobacion: 'text-amber-300',
}

export default function AutomatizacionView() {
  const { data: flujos, isLoading } = useFlujos()
  const ejecutar = useEjecutarFlujo()
  const [activa, setActiva] = useState<string | null>(null)

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Flujos de extremo a extremo</CardTitle>
          <CardDescription className="text-xs">
            Disparador manual hoy (los webhooks de entrada están documentados como siguiente paso). Cada paso ejecuta el contrato real del motor: sondas HTTP, validación/submit de Production JSON, acciones del CRM, lotes del Estudio, eventos de trazabilidad. Con aprobación humana, reintentos y registro completo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Cargando flujos…</p>
          ) : (
            <div className="space-y-2">
              {(flujos ?? []).map((f) => (
                <div key={f.id} className={`rounded-lg border p-3 ${f.activo ? 'border-border/60 bg-card' : 'border-border/30 opacity-60'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">{f.nombre}</p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{f.descripcion}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {JSON.parse(f.definicion).map((p: PasoDefT) => (
                          <Badge key={p.id} variant="outline" className="text-[10px] font-normal">
                            {p.nombre}{p.requiereAprobacion ? ' · requiere OK humano' : ''}{p.opcional ? ' · opcional' : ''}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Button
                        size="sm"
                        className="h-7 text-[11px]"
                        disabled={ejecutar.isPending || !f.activo}
                        onClick={() =>
                          ejecutar.mutate(f.id, {
                            onSuccess: (r) => setActiva(r.ejecucionId),
                            onError: (e) => alert(e instanceof Error ? e.message : 'No se pudo ejecutar'),
                          })
                        }
                      >
                        Ejecutar
                      </Button>
                      <span className="text-[10px] text-muted-foreground">{(f.ejecuciones ?? []).length} ejecuciones</span>
                    </div>
                  </div>
                  {(f.ejecuciones ?? []).slice(0, 3).map((e) => (
                    <button key={e.id} onClick={() => setActiva(e.id)} className="mt-2 flex w-full items-center justify-between gap-2 rounded border border-border/40 px-2 py-1.5 text-left hover:bg-muted/40">
                      <span className="text-[10px] text-muted-foreground">{fmtFecha(e.createdAt)}</span>
                      <Badge variant="outline" className={`text-[10px] ${COLOR_ESTADO[e.estado] ?? ''}`}>{e.estado.replace('_', ' ')}</Badge>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {activa ? <MonitorEjecucion id={activa} onCerrar={() => setActiva(null)} /> : null}
    </div>
  )
}

function MonitorEjecucion({ id, onCerrar }: { id: string; onCerrar: () => void }) {
  const { data, isLoading } = useEjecucion(id)
  const aprobar = useAprobarPaso(id)
  const cancelar = useCancelarEjecucion(id)
  const [nota, setNota] = useState('')

  if (isLoading || !data) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-xs text-muted-foreground">Cargando ejecución…</CardContent>
      </Card>
    )
  }
  const e = data.ejecucion
  const pasos = JSON.parse(e.flujo.definicion) as PasoDefT[]
  const estados = JSON.parse(e.pasosEstado) as Record<string, EstadoPasoT>
  const registro = JSON.parse(e.registro) as { ts: string; paso: string; nivel: string; mensaje: string }[]
  const vivos = e.estado === 'en_curso' || e.estado === 'esperando_aprobacion'
  const done = pasos.filter((p) => ['completado', 'omitido'].includes(estados[p.id]?.estado ?? 'pendiente')).length
  const pendienteAprob = pasos.find((p) => estados[p.id]?.estado === 'esperando_aprobacion')

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm">Ejecución en vivo — {e.flujo.nombre}</CardTitle>
            <CardDescription className="text-xs">
              {fmtFecha(e.createdAt)} {e.finishedAt ? `· terminó ${fmtFecha(e.finishedAt)}` : vivos ? '· actualizando cada 2 s' : ''}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className={`text-[11px] ${COLOR_ESTADO[e.estado] ?? ''}`}>{e.estado.replace('_', ' ')}</Badge>
            {vivos ? (
              <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={cancelar.isPending} onClick={() => cancelar.mutate()}>
                Cancelar
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={onCerrar}>
              Cerrar
            </Button>
          </div>
        </div>
        <Progress value={(done / Math.max(1, pasos.length)) * 100} className="mt-2 h-1.5" />
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Pasos con estado real */}
        <div className="space-y-1">
          {pasos.map((p, i) => {
            const st = estados[p.id]
            return (
              <div key={p.id} className="flex items-start justify-between gap-2 rounded-md border border-border/50 px-3 py-2">
                <div className="min-w-0">
                  <p className={`text-xs font-medium ${COLOR_PASO[st?.estado ?? 'pendiente'] ?? ''}`}>
                    {i + 1}. {p.nombre}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    tipo {p.tipo}
                    {st?.intentos ? ` · intento ${st.intentos}` : ''}
                    {st?.error ? ` · ${st.error.slice(0, 140)}` : ''}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px]">{st?.estado ?? 'pendiente'}</Badge>
              </div>
            )
          })}
        </div>

        {/* Aprobación humana */}
        {pendienteAprob ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
            <p className="text-xs font-semibold text-amber-300">Aprobación humana requerida</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{String(pendienteAprob.params?.mensaje ?? pendienteAprob.nombre)}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                value={nota}
                onChange={(ev) => setNota(ev.target.value)}
                placeholder="nota opcional"
                className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-xs"
              />
              <Button size="sm" className="h-8 text-[11px]" disabled={aprobar.isPending} onClick={() => aprobar.mutate({ aprobado: true, nota })}>
                Aprobar y continuar
              </Button>
              <Button size="sm" variant="destructive" className="h-8 text-[11px]" disabled={aprobar.isPending} onClick={() => aprobar.mutate({ aprobado: false, nota })}>
                Rechazar
              </Button>
            </div>
          </div>
        ) : null}

        {/* Registro de trazabilidad */}
        <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-border/50 bg-muted/20 p-2 font-mono">
          {registro.slice(-40).map((r, i) => (
            <p key={i} className={`text-[10px] leading-relaxed ${r.nivel === 'error' ? 'text-rose-300' : r.nivel === 'warn' ? 'text-amber-300' : r.nivel === 'ok' ? 'text-emerald-300' : 'text-muted-foreground'}`}>
              {r.ts.slice(11, 19)} [{r.paso}] {r.mensaje}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

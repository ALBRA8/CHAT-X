'use client'
// MÓDULO 7 — AUTOMATIZACIÓN (orquestador de flujos, secciones 8-9 del prompt maestro).
// Cada paso de cada ejecución llama al contrato real del motor correspondiente.
// Los estados se leen de la BD en vivo (polling 2 s mientras corre).
// Principio de usabilidad: el humano ve qué pasa y qué se le pide; el detalle
// técnico (tipos, registro paso a paso) queda a un clic, nunca desaparece.
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  CheckCircle2,
  CircleDashed,
  CircleSlash,
  Clock,
  Hand,
  Loader2,
  OctagonX,
  TriangleAlert,
} from 'lucide-react'
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
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

/** Estado de una ejecución → lo que ve el humano (etiqueta, color, icono). */
const ESTADO_EJECUCION: Record<string, { texto: string; clase: string; Icono: typeof CheckCircle2 }> = {
  en_curso: { texto: 'en curso', clase: 'bg-sky-500/10 text-sky-300 border-sky-500/30', Icono: Loader2 },
  esperando_aprobacion: { texto: 'esperando tu aprobación', clase: 'bg-amber-500/10 text-amber-300 border-amber-500/30', Icono: Hand },
  completada: { texto: 'completada', clase: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30', Icono: CheckCircle2 },
  fallida: { texto: 'falló', clase: 'bg-rose-500/10 text-rose-300 border-rose-500/30', Icono: TriangleAlert },
  cancelada: { texto: 'cancelada', clase: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/30', Icono: CircleSlash },
}

/** Estado de un paso → lo que ve el humano. */
const ESTADO_PASO: Record<string, { texto: string; textoClase: string; pillClase: string; Icono: typeof CheckCircle2 }> = {
  pendiente: { texto: 'en espera', textoClase: 'text-muted-foreground', pillClase: '', Icono: CircleDashed },
  en_curso: { texto: 'trabajando', textoClase: 'text-sky-300', pillClase: 'bg-sky-500/10 text-sky-300 border-sky-500/30', Icono: Loader2 },
  completado: { texto: 'hecho', textoClase: 'text-emerald-300', pillClase: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30', Icono: CheckCircle2 },
  fallido: { texto: 'con error', textoClase: 'text-rose-300', pillClase: 'bg-rose-500/10 text-rose-300 border-rose-500/30', Icono: TriangleAlert },
  omitido: { texto: 'omitido', textoClase: 'text-amber-300', pillClase: 'bg-amber-500/10 text-amber-300 border-amber-500/30', Icono: CircleSlash },
  esperando_aprobacion: { texto: 'esperando tu OK', textoClase: 'text-amber-300', pillClase: 'bg-amber-500/10 text-amber-300 border-amber-500/30', Icono: Hand },
}

/** Qué hace cada tipo de paso, en palabras humanas. */
const TIPO_HUMANO: Record<string, string> = {
  registrar_evento: 'deja constancia en el registro',
  sondear_motor: 'comprueba que el motor responde',
  aprobacion_humana: 'pide tu decisión antes de seguir',
  estudio_lote: 'encarga un lote de fotos al Estudio',
  estudio_esperar_job: 'espera el resultado del Estudio',
  crm_accion: 'ejecuta una acción en el CRM',
  ultra_step: 'ejecuta un paso de campaña en ULTRA',
  programar_publicacion: 'agenda la publicación en el calendario',
}

export default function AutomatizacionView() {
  const { data: flujos, isLoading } = useFlujos()
  const ejecutar = useEjecutarFlujo()
  const { toast } = useToast()
  const [activa, setActiva] = useState<string | null>(null)

  return (
    <div className="space-y-5">
      {/* Qué es esto, en humano */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Tus flujos automáticos</CardTitle>
          <CardDescription className="text-xs">
            Un flujo hace el trabajo de punta a punta: consulta motores, produce contenido y — cuando la decisión es tuya — se detiene y te pide el visto bueno. Nada se envía ni se publica sin tu aprobación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Cargando flujos…</p>
          ) : (flujos ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">Todavía no hay flujos definidos.</p>
          ) : (
            <div className="space-y-2">
              {(flujos ?? []).map((f) => (
                <div key={f.id} className={cn('rounded-lg border p-3', f.activo ? 'border-border/60 bg-card' : 'border-border/30 opacity-60')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">{f.nombre}</p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{f.descripcion}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {JSON.parse(f.definicion).map((p: PasoDefT) => (
                          <Badge key={p.id} variant="outline" className="text-[10px] font-normal">
                            {p.nombre}
                            {p.requiereAprobacion ? ' · pide tu OK' : ''}
                            {p.opcional ? ' · opcional' : ''}
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
                            onSuccess: (r) => {
                              setActiva(r.ejecucionId)
                              toast({ title: 'Flujo en marcha', description: 'Sigue el avance en el monitor de abajo; te pedirá el OK cuando toque.' })
                            },
                            onError: (e) =>
                              toast({ title: 'No se pudo ejecutar el flujo', description: e instanceof Error ? e.message : 'Error desconocido' }),
                          })
                        }
                      >
                        Ejecutar
                      </Button>
                      <span className="text-[10px] text-muted-foreground">
                        {(() => {
                          const n = (f.ejecuciones ?? []).length
                          return n === 0 ? 'sin ejecuciones aún' : n === 1 ? '1 ejecución' : `${n} ejecuciones`
                        })()}
                      </span>
                    </div>
                  </div>
                  {(f.ejecuciones ?? []).slice(0, 3).map((e) => {
                    const est = ESTADO_EJECUCION[e.estado]
                    return (
                      <button key={e.id} onClick={() => setActiva(e.id)} className="mt-2 flex w-full items-center justify-between gap-2 rounded border border-border/40 px-2 py-1.5 text-left hover:bg-muted/40">
                        <span className="text-[10px] text-muted-foreground">{fmtFecha(e.createdAt)}</span>
                        {est ? (
                          <Badge variant="outline" className={cn('gap-1 text-[10px]', est.clase)}>
                            <est.Icono className={cn('h-3 w-3', e.estado === 'en_curso' && 'animate-spin')} aria-hidden />
                            {est.texto}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">{e.estado.replace('_', ' ')}</Badge>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {activa ? <MonitorEjecucion id={activa} onCerrar={() => setActiva(null)} /> : null}

      {/* Cómo funcionan por dentro — plegado, pero a un clic */}
      <details className="rounded-lg border border-border/60 bg-card">
        <summary className="cursor-pointer select-none px-4 py-3 text-xs font-medium">
          ¿Cómo funcionan por dentro?
        </summary>
        <div className="space-y-2 border-t border-border/60 px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
          <p>
            El disparador es manual hoy; los webhooks de entrada están documentados como siguiente paso. Cada paso ejecuta el contrato real del motor correspondiente: sondas HTTP, validación y envío del Production JSON, acciones del CRM, lotes del Estudio y eventos de trazabilidad.
          </p>
          <p>
            Con aprobación humana en los pasos que lo exigen, reintentos controlados y registro completo de cada intento. Los estados se leen de la base de datos local en vivo (cada 2 s mientras corre).
          </p>
        </div>
      </details>
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
  const estEjecucion = ESTADO_EJECUCION[e.estado]

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm">Ejecución en vivo — {e.flujo.nombre}</CardTitle>
            <CardDescription className="text-xs">
              {fmtFecha(e.createdAt)} {e.finishedAt ? `· terminó ${fmtFecha(e.finishedAt)}` : vivos ? '· se actualiza cada 2 s' : ''}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5">
            {estEjecucion ? (
              <Badge variant="outline" className={cn('gap-1 text-[11px]', estEjecucion.clase)}>
                <estEjecucion.Icono className={cn('h-3 w-3', e.estado === 'en_curso' && 'animate-spin')} aria-hidden />
                {estEjecucion.texto}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[11px]">{e.estado.replace('_', ' ')}</Badge>
            )}
            {vivos ? (
              <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={cancelar.isPending} onClick={() => cancelar.mutate()}>
                <OctagonX className="mr-1 h-3 w-3" aria-hidden />
                {cancelar.isPending ? 'Cancelando…' : 'Cancelar'}
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={onCerrar}>
              Cerrar
            </Button>
          </div>
        </div>
        <Progress value={(done / Math.max(1, pasos.length)) * 100} className="mt-2 h-1.5" aria-label={`${done} de ${pasos.length} pasos completados`} />
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Pasos con estado real y humano */}
        <div className="space-y-1">
          {pasos.map((p, i) => {
            const st = estados[p.id]
            const est = ESTADO_PASO[st?.estado ?? 'pendiente'] ?? ESTADO_PASO.pendiente
            return (
              <div key={p.id} className="flex items-start justify-between gap-2 rounded-md border border-border/50 px-3 py-2">
                <div className="min-w-0">
                  <p className={cn('text-xs font-medium', est.textoClase)}>
                    {i + 1}. {p.nombre}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {TIPO_HUMANO[p.tipo] ?? p.tipo}
                    {st?.intentos ? ` · intento ${st.intentos}` : ''}
                    {st?.error ? ` · ${st.error.slice(0, 140)}` : ''}
                  </p>
                </div>
                <Badge variant="outline" className={cn('shrink-0 gap-1 text-[10px]', est.pillClase)}>
                  <est.Icono className={cn('h-3 w-3', (st?.estado ?? 'pendiente') === 'en_curso' && 'animate-spin')} aria-hidden />
                  {est.texto}
                </Badge>
              </div>
            )
          })}
        </div>

        {/* Tu decisión: el flujo no sigue sin ti */}
        {pendienteAprob ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
              <Hand className="h-3.5 w-3.5" aria-hidden />
              El flujo espera tu decisión
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {String(pendienteAprob.params?.mensaje ?? `Paso «${pendienteAprob.nombre}» necesita tu visto bueno.`)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                value={nota}
                onChange={(ev) => setNota(ev.target.value)}
                placeholder="nota opcional (queda registrada)"
                aria-label="Nota opcional para la aprobación"
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

        {/* Registro técnico: completo, plegado para no estorbar */}
        <details className="rounded-md border border-border/50 bg-muted/20 p-2.5">
          <summary className="cursor-pointer select-none text-[11px] font-medium">
            Registro técnico paso a paso ({registro.length} entradas)
          </summary>
          <div className="mt-2 max-h-64 space-y-1 overflow-y-auto font-mono">
            {registro.slice(-40).map((r, i) => (
              <p key={i} className={cn('text-[10px] leading-relaxed', r.nivel === 'error' ? 'text-rose-300' : r.nivel === 'warn' ? 'text-amber-300' : r.nivel === 'ok' ? 'text-emerald-300' : 'text-muted-foreground')}>
                {r.ts.slice(11, 19)} [{r.paso}] {r.mensaje}
              </p>
            ))}
            {registro.length === 0 ? (
              <p className="text-[10px] text-muted-foreground">Sin entradas todavía.</p>
            ) : null}
          </div>
        </details>

        {/* Ayuda mínima de lectura */}
        <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3" aria-hidden />
          Los pasos marcados «opcional» pueden saltarse si el motor no está disponible; el flujo continúa con lo demás.
        </p>
      </CardContent>
    </Card>
  )
}

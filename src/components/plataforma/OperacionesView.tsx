"use client"
// MÓDULO 1 — CENTRO DE OPERACIONES.
// Todos los datos provienen de fuentes reales: BD local (personajes, trabajos,
// compliance, KPIs) y sondas HTTP a los motores. Cero indicadores inventados.
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useCharacters, useJobs, useCompliance, useKpi } from '@/components/estudio/api'
import { fmtDinero, fmtFecha, JobBadge } from '@/components/estudio/ui-bits'
import { useMotores, useSistema, type MotorDefT } from './api'
import { EstadoPill } from './bits'

export default function OperacionesView({ onAbrirModulo }: { onAbrirModulo: (m: string) => void }) {
  const { data: chars } = useCharacters()
  const { data: jobs } = useJobs(false)
  const { data: compliance } = useCompliance()
  const { data: kpi } = useKpi()
  const { data: motores, isLoading: cargandoMotores } = useMotores()
  const { data: sistema } = useSistema()

  const activos = (chars ?? []).filter((c) => c.status === 'ACTIVO').length
  const entrenando = (chars ?? []).filter((c) => c.status === 'ENTRENANDO').length
  const enCola = (jobs ?? []).filter((j) => j.status === 'en_cola' || j.status === 'procesando').length
  const fallidos = (jobs ?? []).filter((j) => j.status === 'fallido').length
  const eventosHoy = (compliance?.eventos ?? []).filter(
    (e) => Date.now() - new Date(e.createdAt).getTime() < 24 * 3600 * 1000,
  )
  const ingresosMes = (kpi?.entries ?? []).reduce((a, k) => a + k.revenue, 0)
  const costeGpuMes = (kpi?.entries ?? []).reduce((a, k) => a + k.gpuCost, 0)

  return (
    <div className="space-y-5">
      {/* Resumen real */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Cardito etiqueta="Modelos activos" valor={String(activos)} detalle={`${entrenando} en entrenamiento`} />
        <Cardito etiqueta="Trabajos en cola" valor={String(enCola)} detalle={fallidos > 0 ? `${fallidos} fallidos — revisar` : 'sin fallos'} alerta={fallidos > 0} />
        <Cardito etiqueta="Eventos compliance (24h)" valor={String(eventosHoy.length)} detalle="log append-only" />
        <Cardito etiqueta="Ingresos registrados" valor={fmtDinero(ingresosMes)} detalle={`coste GPU: ${fmtDinero(costeGpuMes)}`} />
      </div>

      {/* GPU y proveedor generativo — medición real (nvidia-smi / ComfyUI / BD) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">GPU y producción audiovisual</CardTitle>
          <CardDescription className="text-xs">
            Medición real del host del servidor. La GPU de producción vive en TU máquina: corre <code className="text-[10px]">bash scripts/detectar_gpu.sh</code> allí y activa ComfyUI según docs/MOTOR_GPU.md.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sistema ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Cardito
                etiqueta="GPU detectada"
                valor={sistema.gpu.nombre === 'none' ? '—' : sistema.gpu.nombre}
                detalle={sistema.gpu.vramMb > 0 ? `${sistema.gpu.vramMb} MB VRAM · driver ${sistema.gpu.driver}` : sistema.gpu.fuente}
                alerta={sistema.gpu.nombre === 'none'}
              />
              <Cardito
                etiqueta="Proveedor generativo"
                valor={sistema.proveedor.actual}
                detalle={sistema.proveedor.esSimulado ? 'simulado: fotos placeholder (sin GPU aún)' : sistema.proveedor.comfy?.ok ? sistema.proveedor.comfy.detalle : 'proveedor real sin responder'}
                alerta={sistema.proveedor.esSimulado}
              />
              <Cardito etiqueta="Cola de trabajos" valor={`${sistema.cola.enCola + sistema.cola.procesando}`} detalle={`${sistema.cola.listos} listos · ${sistema.cola.fallidos} fallidos`} alerta={sistema.cola.fallidos > 0} />
              <Cardito etiqueta="Host" valor={`${sistema.host.cpus} vCPU · ${sistema.host.ramGb} GB`} detalle={`${sistema.host.discoLibreGb} GB libres de disco`} />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Midiendo sistema…</p>
          )}
        </CardContent>
      </Card>

      {/* Estado de integraciones — sondas reales */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Estado de las integraciones</CardTitle>
          <CardDescription className="text-xs">
            Cada estado sale de una sonda HTTP real contra el motor ({cargandoMotores ? 'sondeando…' : 'renovada cada 30 s'}). Nada se supone: si un motor no corre en su puerto, se muestra inalcanzable.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {motores ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
                  {motores.resumen.operativos} operativos
                </Badge>
                <Badge variant="outline" className="text-[11px] bg-rose-500/10 text-rose-300 border-rose-500/30">
                  {motores.resumen.conProblemas} con problemas
                </Badge>
                <Badge variant="outline" className="text-[11px]">
                  {motores.resumen.sinConfigurar} sin configurar
                </Badge>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {motores.estados.map((e) => {
                  const def = motores.motores.find((m) => m.id === e.motor) as MotorDefT
                  return (
                    <button
                      key={e.motor}
                      onClick={() => onAbrirModulo(moduloDeId(e.motor))}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-card p-3 text-left transition-colors hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">{def.nombre}</p>
                        <p className="truncate text-[10px] text-muted-foreground">módulo {def.modulo} · {def.stack}</p>
                      </div>
                      <EstadoPill estado={e.estado.estado} latenciaMs={e.estado.latenciaMs} />
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Sondeando motores…</p>
          )}
        </CardContent>
      </Card>

      {/* Trabajos recientes reales */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Trabajos y procesos recientes</CardTitle>
          <CardDescription className="text-xs">Cola real del Estudio (dataset, entrenamiento LoRA, lotes, renders, cifrado).</CardDescription>
        </CardHeader>
        <CardContent>
          {(jobs ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin trabajos registrados todavía.</p>
          ) : (
            <div className="space-y-1.5">
              {(jobs ?? []).slice(0, 6).map((j) => (
                <div key={j.id} className="flex items-center justify-between gap-2 rounded-md border border-border/50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{j.type}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {j.characterName ?? '—'} · {fmtFecha(j.createdAt)} · coste {fmtDinero(j.costReal)}
                    </p>
                  </div>
                  <JobBadge status={j.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accesos rápidos */}
      <div className="grid gap-2 md:grid-cols-3">
        <AccesoRapido titulo="Nacer modelo" texto="Genoma: audiencia → atributos → dataset → LoRA → examen → ACTIVA" onClick={() => onAbrirModulo('estudio')} />
        <AccesoRapido titulo="Primer set PPV" texto="Fábrica: brief → coste → previews → QA → render → export a Fanvue" onClick={() => onAbrirModulo('estudio')} />
        <AccesoRapido titulo="Conectar motores" texto="Configura la URL de cada motor cuando lo corras en tu máquina" onClick={() => onAbrirModulo('youtube')} />
      </div>
    </div>
  )
}

function moduloDeId(motorId: string): string {
  switch (motorId) {
    case 'youtube':
      return 'youtube'
    case 'crm':
    case 'whatspower':
    case 'ultra':
      return 'comercial'
    case 'nexscope':
    case 'leads':
    case 'agentegeneral':
      return 'investigacion'
    case 'cazador':
      return 'ugc'
    default:
      return 'operaciones'
  }
}

function Cardito({ etiqueta, valor, detalle, alerta }: { etiqueta: string; valor: string; detalle?: string; alerta?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${alerta ? 'text-rose-400' : ''}`}>{valor}</p>
      {detalle ? <p className="mt-0.5 text-[11px] text-muted-foreground">{detalle}</p> : null}
    </div>
  )
}

function AccesoRapido({ titulo, texto, onClick }: { titulo: string; texto: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-lg border border-border/70 bg-card p-4 text-left transition-colors hover:bg-muted/40">
      <p className="text-xs font-semibold">{titulo}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{texto}</p>
    </button>
  )
}

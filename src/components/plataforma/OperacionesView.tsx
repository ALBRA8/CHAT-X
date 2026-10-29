"use client"
// MÓDULO 1 — CENTRO DE OPERACIONES.
// Diseño humano-primero: primero las acciones y lo que pide atención; los
// detalles técnicos quedan a un clic. Todos los datos provienen de fuentes
// reales: BD local (personajes, trabajos, compliance, KPIs) y sondas HTTP a
// los motores. Cero indicadores inventados.
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Bot,
  Briefcase,
  Clapperboard,
  Crosshair,
  Image as ImageIcon,
  Megaphone,
  MessageCircle,
  Search,
  Share2,
  Sparkles,
  Telescope,
  Users,
  Workflow,
} from 'lucide-react'
import { useCharacters, useJobs, useCompliance, useKpi } from '@/components/estudio/api'
import { fmtDinero, fmtFecha, JobBadge } from '@/components/estudio/ui-bits'
import { useMotores, useSistema, useFlujos, type MotorDefT } from './api'
import { EstadoPill } from './bits'

const ACCIONES = [
  { id: 'estudio', titulo: 'Crear fotos y sets', texto: 'Del brief al set aprobado, listo para vender', Icono: ImageIcon },
  { id: 'youtube', titulo: 'Producir un video', texto: 'Producción audiovisual con el motor YT', Icono: Clapperboard },
  { id: 'comercial', titulo: 'Clientes y conversaciones', texto: 'CRM, leads y canales de mensajería', Icono: Briefcase },
  { id: 'automatizacion', titulo: 'Lanzar un flujo', texto: 'Automatiza de punta a punta con tu aprobación', Icono: Workflow },
]

const ICONO_MOTOR: Record<string, typeof Bot> = {
  youtube: Clapperboard,
  crm: Briefcase,
  whatspower: MessageCircle,
  ultra: Megaphone,
  nexscope: Telescope,
  leads: Search,
  agentegeneral: Bot,
  cazador: Crosshair,
  agentekrea: ImageIcon,
  comuniti: Share2,
}

export default function OperacionesView({ onAbrirModulo }: { onAbrirModulo: (m: string) => void }) {
  const { data: chars } = useCharacters()
  const { data: jobs } = useJobs(false)
  const { data: compliance } = useCompliance()
  const { data: kpi } = useKpi()
  const { data: motores, isLoading: cargandoMotores } = useMotores()
  const { data: sistema } = useSistema()
  const { data: flujos } = useFlujos()

  const activos = (chars ?? []).filter((c) => c.status === 'ACTIVO').length
  const entrenando = (chars ?? []).filter((c) => c.status === 'ENTRENANDO').length
  const enCola = (jobs ?? []).filter((j) => j.status === 'en_cola' || j.status === 'procesando').length
  const fallidos = (jobs ?? []).filter((j) => j.status === 'fallido').length
  const eventosHoy = (compliance?.eventos ?? []).filter(
    (e) => Date.now() - new Date(e.createdAt).getTime() < 24 * 3600 * 1000,
  )
  const ingresosMes = (kpi?.entries ?? []).reduce((a, k) => a + k.revenue, 0)

  // Aprobaciones humanas pendientes (gate real del orquestador)
  const aprobacionesPendientes = (flujos ?? []).flatMap((f) =>
    (f.ejecuciones ?? [])
      .filter((e) => e.estado === 'esperando_aprobacion')
      .map((e) => ({ flujo: f.nombre, ejecucionId: e.id, fecha: e.createdAt })),
  )

  const atenTrabajos = fallidos > 0
  const atenMotores = (motores?.resumen.conProblemas ?? 0) > 0
  const hayAtencion = atenTrabajos || atenMotores || aprobacionesPendientes.length > 0

  return (
    <div className="space-y-5">
      {/* 1 — Requiere tu atención (solo cuando existe algo real) */}
      {hayAtencion ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-amber-300">
              <Sparkles className="h-4 w-4" aria-hidden />
              Requiere tu atención
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {aprobacionesPendientes.map((a) => (
              <AtencionItem
                key={a.ejecucionId}
                texto={`Un paso del flujo «${a.flujo}» espera tu aprobación`}
                boton="Revisar y aprobar"
                onClick={() => onAbrirModulo('automatizacion')}
              />
            ))}
            {atenTrabajos ? (
              <AtencionItem
                texto={`${fallidos} trabajo${fallidos > 1 ? 's' : ''} terminó con error — revisa el motivo y vuelve a lanzar`}
                boton="Ver trabajos"
                onClick={() => onAbrirModulo('estudio')}
              />
            ) : null}
            {atenMotores ? (
              <AtencionItem
                texto={`${motores?.resumen.conProblemas} motor${motores!.resumen.conProblemas > 1 ? 'es' : ''} ${motores!.resumen.conProblemas > 1 ? 'necesitan' : 'necesita'} atención (credencial o no responde) — revisa la lista de abajo`}
                boton="Ir al motor"
                onClick={() => onAbrirModulo(moduloDeId(motorConProblema(motores?.estados ?? [])))}
              />
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2.5 text-xs text-emerald-300">
          <span aria-hidden className="text-sm">✓</span>
          Todo en orden — nada pendiente de tu intervención.
        </div>
      )}

      {/* 2 — Acciones principales */}
      <div>
        <h2 className="mb-2 text-sm font-semibold">¿Qué quieres hacer hoy?</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ACCIONES.map((a) => (
            <button
              key={a.id}
              onClick={() => onAbrirModulo(a.id)}
              className="group rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary transition-colors group-hover:bg-primary/25">
                <a.Icono className="h-4.5 w-4.5" aria-hidden />
              </span>
              <p className="mt-2.5 text-sm font-semibold">{a.titulo}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{a.texto}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 3 — Resumen real, en una tira compacta */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Cardito etiqueta="Modelos activos" valor={String(activos)} detalle={entrenando > 0 ? `${entrenando} entrenando` : 'sin entrenamientos'} />
        <Cardito etiqueta="Trabajos en marcha" valor={String(enCola)} detalle={fallidos > 0 ? `${fallidos} con error` : 'sin errores'} alerta={fallidos > 0} />
        <Cardito etiqueta="Ingresos registrados" valor={fmtDinero(ingresosMes)} detalle="desde el KPI de ventas" />
        <Cardito etiqueta="Compliance (24 h)" valor={String(eventosHoy.length)} detalle="eventos registrados" />
      </div>

      {/* 4 — Tus motores: estado claro y directo al módulo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Tus motores</CardTitle>
          <CardDescription className="text-xs">
            {cargandoMotores
              ? 'Comprobando ahora…'
              : `${motores?.resumen.operativos} listos · ${motores?.resumen.conProblemas} requieren atención · ${motores?.resumen.sinConfigurar} sin configurar. Toca uno para abrir su módulo.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {motores ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {motores.estados.map((e) => {
                const def = motores.motores.find((m) => m.id === e.motor) as MotorDefT
                const Icono = ICONO_MOTOR[e.motor] ?? Bot
                return (
                  <button
                    key={e.motor}
                    onClick={() => onAbrirModulo(moduloDeId(e.motor))}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-card p-3 text-left transition-colors hover:bg-muted/40"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Icono className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">{def.nombre}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{def.rol}</p>
                      </div>
                    </div>
                    <EstadoPill estado={e.estado.estado} latenciaMs={e.estado.latenciaMs} />
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Comprobando motores…</p>
          )}
        </CardContent>
      </Card>

      {/* 5 — Trabajos recientes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Trabajos recientes</CardTitle>
          <CardDescription className="text-xs">Producción del Estudio: datasets, entrenamientos, lotes y renders.</CardDescription>
        </CardHeader>
        <CardContent>
          {(jobs ?? []).length === 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">Aún no hay trabajos. Empieza creando tu primera modelo o un set de fotos.</p>
              <button onClick={() => onAbrirModulo('estudio')} className="rounded-md border border-border px-2.5 py-1 text-[11px] font-medium hover:bg-muted/40">
                Ir al Estudio
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {(jobs ?? []).slice(0, 6).map((j) => (
                <div key={j.id} className="flex items-center justify-between gap-2 rounded-md border border-border/50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{j.type}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {j.characterName ?? '—'} · {fmtFecha(j.createdAt)}
                    </p>
                  </div>
                  <JobBadge status={j.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 6 — Detalles técnicos (GPU, host, proveedor): detrás, pero disponibles */}
      <details className="rounded-lg border border-border/60 bg-card">
        <summary className="cursor-pointer select-none px-4 py-3 text-xs font-medium">
          Detalles técnicos — GPU, proveedor generativo y host
        </summary>
        <div className="border-t border-border/60 px-4 py-3">
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
                detalle={sistema.proveedor.esSimulado ? 'fotos de prueba (sin GPU aún)' : sistema.proveedor.comfy?.ok ? sistema.proveedor.comfy.detalle : 'proveedor real sin responder'}
                alerta={sistema.proveedor.esSimulado}
              />
              <Cardito
                etiqueta="Cola de trabajos"
                valor={`${sistema.cola.enCola + sistema.cola.procesando}`}
                detalle={`${sistema.cola.listos} listos · ${sistema.cola.fallidos} con error`}
                alerta={sistema.cola.fallidos > 0}
              />
              <Cardito etiqueta="Servidor" valor={`${sistema.host.cpus} vCPU · ${sistema.host.ramGb} GB`} detalle={`${sistema.host.discoLibreGb} GB libres de disco`} />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Midiendo sistema…</p>
          )}
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            La GPU de producción vive en tu máquina: corre <code className="text-[10px]">bash scripts/detectar_gpu.sh</code> allí y activa ComfyUI según docs/MOTOR_GPU.md.
          </p>
        </div>
      </details>
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
    case 'agentekrea':
      return 'estudio'
    default:
      return 'operaciones'
  }
}

function motorConProblema(estados: { motor: string; estado: { estado: string } }[]): string {
  const malo = estados.find((e) => e.estado.estado === 'NO_AUTORIZADO' || e.estado.estado === 'INALCANZABLE')
  return malo?.motor ?? 'operaciones'
}

function AtencionItem({ texto, boton, onClick }: { texto: string; boton: string; onClick: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-500/25 bg-card px-3 py-2">
      <p className="min-w-0 text-xs">{texto}</p>
      <button onClick={onClick} className="shrink-0 rounded-md bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/25">
        {boton}
      </button>
    </div>
  )
}

function Cardito({ etiqueta, valor, detalle, alerta }: { etiqueta: string; valor: string; detalle?: string; alerta?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3.5">
      <p className="text-[11px] text-muted-foreground">{etiqueta}</p>
      <p className={`mt-0.5 text-xl font-semibold tabular-nums ${alerta ? 'text-rose-400' : ''}`}>{valor}</p>
      {detalle ? <p className="mt-0.5 text-[10px] text-muted-foreground">{detalle}</p> : null}
    </div>
  )
}

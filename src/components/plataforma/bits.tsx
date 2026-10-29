"use client"
// Piezas de UI compartidas de la plataforma central.
// Principio (fase de usabilidad): primero lo humano — estado claro con icono +
// etiqueta y una frase de qué hacer; la profundidad técnica (capacidades,
// contratos, env, sonda cruda) queda a un clic en «Detalles técnicos».
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertTriangle, CheckCircle2, CircleDashed, CircleSlash } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtFecha } from '@/components/estudio/ui-bits'
import { useGuardarMotor } from './api'
import type { MotorDefT, EstadoCompletoT, EstadoMotorT } from './api'

const ESTADO_PILL: Record<EstadoMotorT, { texto: string; clase: string; Icono: typeof CheckCircle2 }> = {
  OPERATIVO: { texto: 'Listo', Icono: CheckCircle2, clase: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  NO_AUTORIZADO: { texto: 'Requiere atención', Icono: AlertTriangle, clase: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  INALCANZABLE: { texto: 'No disponible', Icono: CircleSlash, clase: 'bg-rose-500/10 text-rose-300/90 border-rose-500/25' },
  NO_CONFIGURADO: { texto: 'Sin configurar', Icono: CircleDashed, clase: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' },
}

export function EstadoPill({ estado, latenciaMs }: { estado: EstadoMotorT; latenciaMs?: number | null }) {
  const p = ESTADO_PILL[estado]
  return (
    <Badge variant="outline" className={cn('gap-1 text-[11px]', p.clase)}>
      <p.Icono className="h-3 w-3 shrink-0" aria-hidden />
      {p.texto}
      {estado === 'OPERATIVO' && typeof latenciaMs === 'number' ? <span className="opacity-60">· {latenciaMs} ms</span> : ''}
    </Badge>
  )
}

/** Frase humana por estado: qué significa y qué hacer a continuación. */
function fraseEstado(estado: EstadoMotorT, def: MotorDefT): { frase: string; clase: string; Icono: typeof CheckCircle2 } {
  switch (estado) {
    case 'OPERATIVO':
      return {
        frase: 'Motor vivo y respondiendo. Las acciones de esta página trabajan contra datos reales.',
        clase: 'border-emerald-500/25 bg-emerald-500/5 text-emerald-200/90',
        Icono: CheckCircle2,
      }
    case 'NO_AUTORIZADO':
      return {
        frase: 'El motor está vivo pero pide credencial. Guárdala en «Conectar motor» para habilitar todas las acciones.',
        clase: 'border-amber-500/30 bg-amber-500/5 text-amber-200/90',
        Icono: AlertTriangle,
      }
    case 'INALCANZABLE':
      return {
        frase: `No responde en el puerto ${def.puertoPorDefecto}. Arranca el motor en tu máquina; si usa otra dirección, indícala en «Conectar motor».`,
        clase: 'border-rose-500/20 bg-rose-500/5 text-rose-200/80',
        Icono: CircleSlash,
      }
    case 'NO_CONFIGURADO':
      return {
        frase: 'Todavía no tiene dirección asignada. Usa «Conectar motor» para decirle a CHAT-X dónde corre.',
        clase: 'border-border bg-muted/30 text-muted-foreground',
        Icono: CircleDashed,
      }
  }
}

/** Tarjeta estándar de motor: estado humano primero, técnica detrás a un clic. */
export function TarjetaMotor({
  def,
  estado,
  detalleExtra,
  children,
}: {
  def: MotorDefT
  estado?: EstadoCompletoT
  detalleExtra?: React.ReactNode
  children?: React.ReactNode
}) {
  const [abierto, setAbierto] = useState(false)
  const sonda = estado?.estado
  const humano = sonda ? fraseEstado(sonda.estado, def) : null

  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold">{def.nombre}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2 text-xs leading-relaxed">{def.rol}</CardDescription>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {sonda ? <EstadoPill estado={sonda.estado} latenciaMs={sonda.latenciaMs} /> : null}
            <span className="text-[10px] text-muted-foreground">puerto {def.puertoPorDefecto}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {humano && sonda ? (
          <div className={cn('flex items-start gap-2 rounded-md border p-2.5 text-xs leading-relaxed', humano.clase)}>
            <humano.Icono className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{humano.frase}</span>
          </div>
        ) : null}

        {detalleExtra}
        {children}

        <details className="rounded-md border border-border/60 bg-muted/20 p-2.5">
          <summary className="cursor-pointer text-[11px] font-medium select-none">
            Detalles técnicos — capacidades, contrato y configuración
          </summary>
          <div className="mt-3 space-y-3">
            {sonda ? (
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">Última comprobación:</span> {sonda.detalle}
                <span className="block opacity-70">verificado {fmtFecha(sonda.verificadoEn)}</span>
              </p>
            ) : null}

            <div>
              <p className="mb-1 text-[11px] font-semibold">Qué puede hacer</p>
              <ul className="space-y-1 text-[11px] text-muted-foreground">
                {def.capacidades.map((c) => (
                  <li key={c} className="flex gap-1.5">
                    <span aria-hidden className="text-emerald-400">▪</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="mb-1 text-[11px] font-semibold">Contrato (cómo lo opera CHAT-X)</p>
              <ul className="space-y-1 text-[11px] text-muted-foreground">
                {def.contratos.map((c) => (
                  <li key={c.ruta + c.metodo} className="flex gap-1.5">
                    <Badge variant="outline" className="h-4 shrink-0 px-1 text-[9px]">{c.metodo}</Badge>
                    <span><code className="text-[10px]">{c.ruta}</code> — {c.que}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-[11px] font-medium">Variables que exige el motor</p>
                <ul className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                  {def.envRequeridas.map((e) => <li key={e}>· {e}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-medium">Notas honestas</p>
                <ul className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                  {def.notasIntegracion.map((n) => <li key={n}>· {n}</li>)}
                </ul>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
              <Badge variant="outline" className="text-[10px]">{def.stack}</Badge>
              {def.estadoNota ? <Badge variant="outline" className="text-[10px]">{def.estadoNota}</Badge> : null}
            </div>
          </div>
        </details>

        <div className="flex items-center gap-2 border-t border-border/60 pt-2">
          <Dialog open={abierto} onOpenChange={setAbierto}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-[11px]">
                Conectar motor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-sm">Conectar {def.nombre}</DialogTitle>
              </DialogHeader>
              <FormularioConexion motor={def} estado={estado} onGuardado={() => setAbierto(false)} />
            </DialogContent>
          </Dialog>
          {estado?.config.configurada ? (
            <span className="text-[10px] text-muted-foreground">
              configurado {fmtFecha(estado.config.actualizadoEn)}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground">dirección por defecto: <code className="text-[10px]">{def.urlPorDefecto}</code></span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function FormularioConexion({
  motor,
  estado,
  onGuardado,
}: {
  motor: MotorDefT
  estado?: EstadoCompletoT
  onGuardado: () => void
}) {
  const [url, setUrl] = useState(estado?.config.url || motor.urlPorDefecto)
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const guardarMut = useGuardarMotor(motor.id)

  const guardar = async () => {
    setError(null)
    try {
      await guardarMut.mutateAsync({ url, apiKey })
      onGuardado()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor={`url-${motor.id}`} className="text-xs">Dirección del motor (URL)</Label>
        <Input id={`url-${motor.id}`} value={url} onChange={(e) => setUrl(e.target.value)} placeholder={motor.urlPorDefecto} className="h-8 text-xs" />
        <p className="text-[10px] text-muted-foreground">
          El motor corre en TU máquina con su propio arranque (ej. <code>start.sh</code> de YOUTUBE-AUTOMATION en el puerto {motor.puertoPorDefecto}).
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`key-${motor.id}`} className="text-xs">Credencial (solo si el motor la pide)</Label>
        <Input id={`key-${motor.id}`} type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="albra_… / MASTER_API_KEY / secreto de webhooks" className="h-8 text-xs" />
        <p className="text-[10px] text-muted-foreground">Se guarda en la base de datos local del panel; nunca se sube a GitHub.</p>
      </div>
      {error ? <p className="text-[11px] text-rose-400">{error}</p> : null}
      <Button size="sm" onClick={guardar} disabled={guardarMut.isPending} className="w-full">
        {guardarMut.isPending ? 'Guardando…' : 'Guardar y comprobar ahora'}
      </Button>
    </div>
  )
}

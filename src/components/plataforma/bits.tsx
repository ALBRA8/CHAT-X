"use client"
// Piezas de UI compartidas de la plataforma central.
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { fmtFecha } from '@/components/estudio/ui-bits'
import { useGuardarMotor } from './api'
import type { MotorDefT, EstadoCompletoT, EstadoMotorT } from './api'

const ESTADO_PILL: Record<EstadoMotorT, { texto: string; clase: string }> = {
  OPERATIVO: { texto: '● operativo', clase: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  INALCANZABLE: { texto: '● inalcanzable', clase: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
  NO_AUTORIZADO: { texto: '● sin credencial', clase: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  NO_CONFIGURADO: { texto: '○ sin configurar', clase: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' },
}

export function EstadoPill({ estado, latenciaMs }: { estado: EstadoMotorT; latenciaMs?: number | null }) {
  const p = ESTADO_PILL[estado]
  return (
    <Badge variant="outline" className={cn('text-[11px]', p.clase)}>
      {p.texto}
      {estado === 'OPERATIVO' && typeof latenciaMs === 'number' ? ` · ${latenciaMs}ms` : ''}
    </Badge>
  )
}

/** Tarjeta estándar de motor: rol real, sonda real, configuración real. */
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
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold">{def.nombre}</CardTitle>
            <CardDescription className="mt-1 text-xs leading-relaxed">{def.rol}</CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            {sonda ? <EstadoPill estado={sonda.estado} latenciaMs={sonda.latenciaMs} /> : null}
            <span className="text-[10px] text-muted-foreground">:{def.puertoPorDefecto}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {sonda ? (
          <div className="rounded-md border border-border/60 bg-muted/30 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Sonda real:</span> {sonda.detalle}
            <span className="block text-[10px] opacity-70">verificado {fmtFecha(sonda.verificadoEn)}</span>
          </div>
        ) : null}

        {detalleExtra}

        <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
          <Badge variant="outline" className="text-[10px]">{def.stack}</Badge>
          {def.estadoNota ? <Badge variant="outline" className="text-[10px]">{def.estadoNota}</Badge> : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="mb-1 text-[11px] font-semibold">Capacidades reales implementadas</p>
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
        </div>

        <details className="rounded-md border border-border/60 bg-muted/20 p-2.5">
          <summary className="cursor-pointer text-[11px] font-medium">Notas de integración y variables que exige el motor</summary>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-[11px] font-medium">Env requeridas</p>
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
        </details>

        {children}

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
              config guardada {fmtFecha(estado.config.actualizadoEn)}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground">URL por defecto: <code className="text-[10px]">{def.urlPorDefecto}</code></span>
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
        <Label htmlFor={`url-${motor.id}`} className="text-xs">URL base del motor</Label>
        <Input id={`url-${motor.id}`} value={url} onChange={(e) => setUrl(e.target.value)} placeholder={motor.urlPorDefecto} className="h-8 text-xs" />
        <p className="text-[10px] text-muted-foreground">
          El motor corre en TU máquina con su propio arranque (ej. <code>start.sh</code> de YOUTUBE-AUTOMATION en el puerto {motor.puertoPorDefecto}).
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`key-${motor.id}`} className="text-xs">Credencial (si el contrato la exige)</Label>
        <Input id={`key-${motor.id}`} type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="albra_… / MASTER_API_KEY / secreto de webhooks" className="h-8 text-xs" />
        <p className="text-[10px] text-muted-foreground">Se guarda en la BD local del panel; nunca se sube a GitHub.</p>
      </div>
      {error ? <p className="text-[11px] text-rose-400">{error}</p> : null}
      <Button size="sm" onClick={guardar} disabled={guardarMut.isPending} className="w-full">
        {guardarMut.isPending ? 'Guardando…' : 'Guardar y sondear ahora'}
      </Button>
    </div>
  )
}

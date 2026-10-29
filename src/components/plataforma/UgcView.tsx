"use client"
// MÓDULO 5 — CONTENIDO UGC Y COMERCIAL.
// Preparado para gestionar briefs, avatares y campañas. Las capacidades que
// dependen de integraciones (campañas reales vía ULTRA, TikTok Shop) se
// muestran con su estado honesto: NO_CONFIGURADO hasta que existan permisos.
// Acción-primero: lo que hoy funciona de verdad (calendario exportable) arriba.
import { useMotores, useMotorDetalle } from './api'
import { TarjetaMotor } from './bits'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CalendarArrowDown, CircleCheck, CircleDashed, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function UgcView() {
  const { data: motores } = useMotores()
  const ultraDetalle = useMotorDetalle('ultra')
  const def = motores?.motores.find((m) => m.id === 'ultra')

  return (
    <div className="space-y-5">
      {/* Acción real de verdad: el calendario sale de tus Sets publicados */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Planear tu feed</CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            Descarga un calendario real construido desde tus Sets del Estudio: los publicados usan su fecha; el resto recibe una fecha propuesta a las 19:00. Con etiqueta IA y precio por pieza — listo para Google Calendar, Metricool o una hoja de cálculo.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <a href="/api/publicacion/calendario?formato=ics" download>
            <Button size="sm" className="h-8 gap-1.5 text-[11px]">
              <CalendarArrowDown className="h-3.5 w-3.5" aria-hidden />
              Descargar .ics (Google Calendar / Metricool)
            </Button>
          </a>
          <a href="/api/publicacion/calendario?formato=csv" download>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-[11px]">
              <CalendarArrowDown className="h-3.5 w-3.5" aria-hidden />
              Descargar .csv (hoja de cálculo)
            </Button>
          </a>
        </CardContent>
      </Card>

      {/* El recorrido, con su estado honesto por paso */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">El recorrido de una campaña</CardTitle>
          <CardDescription className="text-xs">Cuatro pasos; hoy dos están listos y dos esperan integración.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-4">
            <Paso n="1" titulo="Brief de contenido" estado="estructura por definir" ok={false} />
            <Paso n="2" titulo="Asignar avatar" estado="disponible vía el Estudio" ok />
            <Paso n="3" titulo="Producir el video" estado="vía el motor de YouTube" ok />
            <Paso n="4" titulo="Publicar campaña" estado="requiere integración autorizada" ok={false} />
          </div>
        </CardContent>
      </Card>

      {def ? <TarjetaMotor def={def} estado={ultraDetalle.data?.estado} /> : null}

      {/* Honestidad compacta: TikTok Shop no se presenta como si existiera */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">TikTok Shop</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1 text-[11px] bg-zinc-500/15 text-zinc-400 border-zinc-500/30">
            <CircleDashed className="h-3 w-3" aria-hidden />
            pendiente de implementación
          </Badge>
          <p className="text-[11px] text-muted-foreground">
            Publicar video no equivale a vender en TikTok Shop: exigirá sus propios permisos y credenciales de vendedor. Cuando exista, aparecerá aquí con su estado de conexión real.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function Paso({ n, titulo, estado, ok }: { n: string; titulo: string; estado: string; ok?: boolean }) {
  return (
    <div className={cn('rounded-lg border p-3', ok ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border bg-card')}>
      <p className="text-[10px] text-muted-foreground">paso {n}</p>
      <p className="flex items-center gap-1.5 text-xs font-semibold">
        {ok ? (
          <CircleCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden />
        ) : (
          <Wrench className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        )}
        {titulo}
      </p>
      <p className={cn('mt-0.5 text-[10px]', ok ? 'text-emerald-300' : 'text-muted-foreground')}>{estado}</p>
    </div>
  )
}

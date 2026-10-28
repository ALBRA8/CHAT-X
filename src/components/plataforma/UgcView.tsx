"use client"
// MÓDULO 5 — CONTENIDO UGC Y COMERCIAL.
// Preparado para gestionar briefs, avatares y campañas. Las capacidades que
// dependen de integraciones (campañas reales vía ULTRA, TikTok Shop) se
// muestran con su estado honesto: NO_CONFIGURADO hasta que existan permisos.
import { useMotores, useMotorDetalle } from './api'
import { TarjetaMotor } from './bits'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function UgcView() {
  const { data: motores } = useMotores()
  const ultraDetalle = useMotorDetalle('ultra')
  const def = motores?.motores.find((m) => m.id === 'ultra')

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Flujo UGC preparado</CardTitle>
          <CardDescription className="text-xs">
            Brief de contenido → asignación de avatar del Estudio (Módulo 4) → producción de video (Módulo 2) → publicación mediante integraciones autorizadas → seguimiento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-4">
            <Paso n="1" titulo="Brief" estado="estructura por definir" />
            <Paso n="2" titulo="Asignar avatar" estado="disponible vía Módulo 4" ok />
            <Paso n="3" titulo="Producción" estado="vía Módulo 2 (motor YT)" ok />
            <Paso n="4" titulo="Campaña/publicación" estado="requiere integración" />
          </div>
        </CardContent>
      </Card>

      {/* Calendario de publicación — paridad ClonaKit con "IA Influencer" (allí es gated por plan; aquí real y gratis) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Calendario de publicación (export real)</CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            Se genera desde tus Sets reales del Estudio: los publicados usan su fecha real; el resto recibe una fecha propuesta escalonada a las 19:00 e importable a Google Calendar o Metricool vía iCal/CSV. Con etiqueta IA y precio por pieza, listo para planificar el feed de Fanvue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <a href="/api/publicacion/calendario?formato=ics" download>
              <Button size="sm" className="h-8 text-[11px]">Descargar .ics (Google Calendar / Metricool)</Button>
            </a>
            <a href="/api/publicacion/calendario?formato=csv" download>
              <Button size="sm" variant="outline" className="h-8 text-[11px]">Descargar .csv (hoja de cálculo)</Button>
            </a>
          </div>
        </CardContent>
      </Card>

      {def ? <TarjetaMotor def={def} estado={ultraDetalle.data?.estado} /> : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">TikTok Shop — capacidad independiente</CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            Publicar video NO equivale a tener integración comercial completa. TikTok Shop requiere sus propias interfaces, permisos y credenciales de vendedor — no está implementada y no se presenta como si lo estuviera. Cuando exista, se registrará aquí con su propio estado de conexión.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="outline" className="text-[11px] bg-zinc-500/15 text-zinc-400 border-zinc-500/30">
            ○ pendiente de implementación (sin credenciales ni contrato aún)
          </Badge>
        </CardContent>
      </Card>
    </div>
  )
}

function Paso({ n, titulo, estado, ok }: { n: string; titulo: string; estado: string; ok?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${ok ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border bg-card'}`}>
      <p className="text-[10px] text-muted-foreground">paso {n}</p>
      <p className="text-xs font-semibold">{titulo}</p>
      <p className={`mt-0.5 text-[10px] ${ok ? 'text-emerald-300' : 'text-muted-foreground'}`}>{estado}</p>
    </div>
  )
}

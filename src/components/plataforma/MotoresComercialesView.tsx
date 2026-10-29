"use client"
// MÓDULO 3 — CRM Y AUTOMATIZACIÓN COMERCIAL.
// Tres motores con responsabilidades separadas: CRM-ALBRA (Capa 1, sistema de
// récord), WHATSPOWER (Capa 2A, conversacional), WHATSPOWER-ULTRA (Capa 2B,
// broadcast). CHAT-X los opera por sus contratos; no duplica datos ni reglas.
import { useMotores, useMotorDetalle, useAccionMotor } from './api'
import { TarjetaMotor } from './bits'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'

export default function MotoresComercialesView() {
  const { data: motores } = useMotores()
  const crmDetalle = useMotorDetalle('crm')
  const wpDetalle = useMotorDetalle('whatspower')
  const ultraDetalle = useMotorDetalle('ultra')
  const accionCrm = useAccionMotor('crm')
  const accionUltra = useAccionMotor('ultra')
  const [catalogoCrm, setCatalogoCrm] = useState<string | null>(null)
  const [campanas, setCampanas] = useState<string | null>(null)

  const defDe = (id: string) => motores?.motores.find((m) => m.id === id)

  const leerCatalogo = async () => {
    const r = await accionCrm.mutateAsync({ accion: 'catalogo' })
    setCatalogoCrm(JSON.stringify(r.datos ?? r, null, 2).slice(0, 4000))
  }
  const leerCampanas = async () => {
    const r = await accionUltra.mutateAsync({ accion: 'datos' })
    setCampanas(JSON.stringify(r.datos ?? r, null, 2).slice(0, 4000))
  }

  const crmDef = defDe('crm')
  const wpDef = defDe('whatspower')
  const ultraDef = defDe('ultra')
  if (!crmDef || !wpDef || !ultraDef) return <p className="text-xs text-muted-foreground">Cargando contratos…</p>

  return (
    <div className="space-y-5">
      <TarjetaMotor def={crmDef} estado={crmDetalle.data?.estado}>
        {crmDetalle.data?.estado.estado.estado === 'OPERATIVO' ? (
          <div className="flex items-center gap-2">
            <button onClick={leerCatalogo} disabled={accionCrm.isPending} className="h-7 rounded-md border border-border px-2.5 text-[11px] hover:bg-muted/40 disabled:opacity-50">
              {accionCrm.isPending ? 'Leyendo…' : 'Ver catálogo de acciones'}
            </button>
          </div>
        ) : null}
        {catalogoCrm ? (
          <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-border/60 bg-muted/20 p-2.5 text-[10px] leading-relaxed">{catalogoCrm}</pre>
        ) : null}
      </TarjetaMotor>

      <TarjetaMotor def={wpDef} estado={wpDetalle.data?.estado} />

      <TarjetaMotor def={ultraDef} estado={ultraDetalle.data?.estado}>
        {ultraDetalle.data?.estado.estado.estado === 'OPERATIVO' ? (
          <div className="flex items-center gap-2">
            <button onClick={leerCampanas} disabled={accionUltra.isPending} className="h-7 rounded-md border border-border px-2.5 text-[11px] hover:bg-muted/40 disabled:opacity-50">
              {accionUltra.isPending ? 'Leyendo…' : 'Ver campañas'}
            </button>
          </div>
        ) : null}
        {campanas ? (
          <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-border/60 bg-muted/20 p-2.5 text-[10px] leading-relaxed">{campanas}</pre>
        ) : null}
      </TarjetaMotor>

      <details className="rounded-lg border border-border/60 bg-card">
        <summary className="cursor-pointer select-none px-4 py-3 text-xs font-medium">
          Cómo se organiza la capa comercial (arquitectura y red)
        </summary>
        <div className="space-y-3 border-t border-border/60 px-4 py-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-[11px]">Capa 1 · CRM-ALBRA :3000 — récord comercial + wa-daemon :3002</Badge>
            <Badge variant="outline" className="text-[11px]">Capa 2A · WHATSPOWER :3003 — flujos conversacionales</Badge>
            <Badge variant="outline" className="text-[11px]">Capa 2B · ULTRA :3004 — broadcast anti-ban</Badge>
          </div>
          <ul className="space-y-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <li className="flex gap-1.5"><span aria-hidden className="text-primary">▪</span><span>El CRM es el sistema de récord; WHATSPOWER y ULTRA conservan sus motores y bases de datos propias. CHAT-X controla, no copia.</span></li>
            <li className="flex gap-1.5"><span aria-hidden className="text-primary">▪</span><span>Entrada real: WhatsApp → daemon :3002 → CRM → bridge HMAC → WHATSPOWER :3003 → locks/suppression consumidos por ULTRA :3004 (fail-closed).</span></li>
            <li className="flex gap-1.5"><span aria-hidden className="text-primary">▪</span><span>Para envíos reales falta cerrar el wiring de HttpAlbraTransportSender en el repo de WHATSPOWER (hoy Mock por defecto).</span></li>
            <li className="flex gap-1.5"><span aria-hidden className="text-primary">▪</span><span>Gestión de WHATSPOWER/ULTRA sin auth: solo localhost, nunca expuesto a red.</span></li>
          </ul>
        </div>
      </details>
    </div>
  )
}

export { EstadoPill } from './bits'

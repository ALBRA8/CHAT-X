"use client"
// MÓDULO 3 — CRM Y AUTOMATIZACIÓN COMERCIAL.
// Tres motores con responsabilidades separadas: CRM-ALBRA (Capa 1, sistema de
// récord), WHATSPOWER (Capa 2A, conversacional), WHATSPOWER-ULTRA (Capa 2B,
// broadcast). CHAT-X los opera por sus contratos; no duplica datos ni reglas.
import { useMotores, useMotorDetalle, useAccionMotor } from './api'
import { TarjetaMotor, EstadoPill } from './bits'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Separación de responsabilidades (sin duplicar)</CardTitle>
          <CardDescription className="text-xs">
            El CRM sigue siendo el sistema de récord. WHATSPOWER y ULTRA conservan sus motores especializados con sus propias BD. CHAT-X es el punto de control, no una copia de los datos.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-[11px]">Capa 1 · CRM-ALBRA :3000 — récord comercial + wa-daemon :3002</Badge>
          <Badge variant="outline" className="text-[11px]">Capa 2A · WHATSPOWER :3003 — flujos conversacionales</Badge>
          <Badge variant="outline" className="text-[11px]">Capa 2B · ULTRA :3004 — broadcast anti-ban</Badge>
        </CardContent>
      </Card>

      <TarjetaMotor def={crmDef} estado={crmDetalle.data?.estado}>
        {crmDetalle.data?.estado.estado.estado === 'OPERATIVO' ? (
          <div className="flex items-center gap-2">
            <button onClick={leerCatalogo} disabled={accionCrm.isPending} className="h-7 rounded-md border border-border px-2.5 text-[11px] hover:bg-muted/40 disabled:opacity-50">
              {accionCrm.isPending ? 'Leyendo…' : 'Leer catálogo real de acciones'}
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
              {accionUltra.isPending ? 'Leyendo…' : 'Leer campañas reales'}
            </button>
          </div>
        ) : null}
        {campanas ? (
          <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-border/60 bg-muted/20 p-2.5 text-[10px] leading-relaxed">{campanas}</pre>
        ) : null}
      </TarjetaMotor>

      <EstadoDeRed notas={[
        'El inbound fluye: WhatsApp → daemon :3002 → CRM → bridge HMAC → WHATSPOWER :3003 → locks/suppression consumidos por ULTRA :3004 (fail-closed).',
        'Para que WHATSPOWER envíe de verdad falta cerrar el wiring de HttpAlbraTransportSender en su repo (hoy Mock por defecto).',
        'Los endpoints de gestión de WHATSPOWER/ULTRA no tienen auth: corren en localhost, nunca expuestos a red.',
      ]} />
    </div>
  )
}

export function EstadoDeRed({ notas }: { notas: string[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Red del ecosistema (contratos verificados en los repos)</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5 text-[11px] leading-relaxed text-muted-foreground">
          {notas.map((n) => (
            <li key={n} className="flex gap-1.5">
              <span aria-hidden className="text-primary">▪</span>
              <span>{n}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export { EstadoPill }

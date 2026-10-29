"use client"
// MÓDULO 6 — INVESTIGACIÓN Y ESTRATEGIA.
// NEX-SCOPE (nichos) + AGENTE-LEADS (prospección B2B). Los eventos de leads
// que llegan al receptor de CHAT-X se muestran tal como llegaron.
import { useMotores, useMotorDetalle, useEventosIntegracion } from './api'
import { TarjetaMotor } from './bits'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { fmtFecha } from '@/components/estudio/ui-bits'
import { useSettings } from '@/components/estudio/api'

export default function InvestigacionView() {
  const { data: motores } = useMotores()
  const nexDetalle = useMotorDetalle('nexscope')
  const leadsDetalle = useMotorDetalle('leads')
  const { data: eventos } = useEventosIntegracion(true)
  const { data: settings } = useSettings()

  const nexDef = motores?.motores.find((m) => m.id === 'nexscope')
  const leadsDef = motores?.motores.find((m) => m.id === 'leads')

  return (
    <div className="space-y-5">
      {nexDef ? <TarjetaMotor def={nexDef} estado={nexDetalle.data?.estado} /> : null}

      {leadsDef ? (
        <TarjetaMotor def={leadsDef} estado={leadsDetalle.data?.estado}>
          {/* Receptor de webhooks — contrato real del repo de AGENTE-LEADS */}
          <div className="rounded-md border border-border/60 bg-muted/20 p-3">
            <p className="text-[11px] font-semibold">CHAT-X como receptor de eventos (contrato ya definido en su repo)</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Apunta <code>CRM_ALBRA_WEBHOOK_URL</code> del agente a:
            </p>
            <code className="mt-1 block break-all rounded bg-background px-2 py-1 text-[10px]">
              POST /api/motores/agent-leads/webhook — header X-AGENTE-LEADS-Event: lead.created | lead.scored | lead.intelligenced | lead.outreach_sent | execution.completed
            </code>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Si guardas una credencial en «Conectar motor», el receptor la exige como Bearer (fail-closed). CRM-ALBRA aún no tiene receptor para este contrato; CHAT-X es el receptor natural del ecosistema.
            </p>
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-semibold">Eventos recibidos de verdad ({eventos?.length ?? 0})</p>
            {(eventos ?? []).length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                Aún no ha llegado ningún evento — normal hasta que el bot de prospección corra en tu máquina y apunte su webhook aquí.
              </p>
            ) : (
              <div className="space-y-1.5">
                {(eventos ?? []).slice(0, 10).map((e) => (
                  <div key={e.id} className="rounded-md border border-border/50 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-[10px]">{e.event}</Badge>
                      <span className="text-[10px] text-muted-foreground">{fmtFecha(e.createdAt)}</span>
                    </div>
                    <pre className="mt-1 max-h-20 overflow-y-auto whitespace-pre-wrap break-words text-[10px] text-muted-foreground">{e.detail}</pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TarjetaMotor>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Para qué sirve investigar</CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            Lo que se descubre aquí alimenta al resto del ecosistema: los nichos que encuentra NEX-SCOPE se convierten en planes para el motor de YouTube, y las tendencias que captura CAZADOR son las que la Fábrica recrea con nuestras modelos en el Estudio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <details className="rounded-md border border-border/60 bg-muted/20 p-2.5">
            <summary className="cursor-pointer select-none text-[11px] font-medium">Rutas y detalle técnico</summary>
            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
              NEX-SCOPE despacha planes directos al motor YOUTUBE-AUTOMATION vía <code>/api/automations/dispatch → :8000</code>. Proveedor actual del panel: <code>{settings?.provider ?? 'simulador'}</code>.
            </p>
          </details>
        </CardContent>
      </Card>
    </div>
  )
}

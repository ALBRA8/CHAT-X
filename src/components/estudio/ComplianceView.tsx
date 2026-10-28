'use client'
// Compliance — registro auditable y exportación de prueba de originalidad (ficha 4.6, flujo D)
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Download, ShieldCheck } from 'lucide-react'
import { useCompliance } from './api'
import { CarrilBadge, VeredictoBadge, Vacio, fmtFecha } from './ui-bits'

const TIPO_LABEL: Record<string, string> = {
  creacion: 'creación',
  filtro_edad: 'FILTRO DE EDAD',
  rechazo_qa: 'rechazo QA',
  etiqueta_ia: 'etiqueta IA',
  acceso_privado: 'acceso privado',
  publicacion: 'publicación',
}

export default function ComplianceView() {
  const { data } = useCompliance()
  const eventos = data?.eventos ?? []
  const piezas = data?.piezas ?? []

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden /> Registro append-only
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {eventos.length} eventos · {piezas.length} piezas auditables. Nunca se borra. Responde a una solicitud de prueba de originalidad.
            </p>
          </div>
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" onClick={() => window.open('/api/compliance/export?formato=json', '_blank')}>
              <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden /> JSON
            </Button>
            <Button size="sm" variant="ghost" onClick={() => window.open('/api/compliance/export?formato=csv', '_blank')}>
              <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden /> CSV
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Eventos recientes</CardTitle></CardHeader>
        <CardContent>
          {eventos.length === 0 ? (
            <Vacio icono="🛡️" titulo="Sin eventos todavía" texto="Cada creación, filtro, rechazo y publicación queda registrado aquí automáticamente." />
          ) : (
            <ul className="divide-y divide-border/60 max-h-80 overflow-y-auto">
              {eventos.map((e) => (
                <li key={e.id} className="py-2 text-xs flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      e.type === 'filtro_edad'
                        ? 'text-rose-300 border-rose-500/40'
                        : e.type === 'acceso_privado'
                          ? 'text-amber-300 border-amber-500/40'
                          : 'text-muted-foreground'
                    }
                  >
                    {TIPO_LABEL[e.type] ?? e.type}
                  </Badge>
                  <span className="text-muted-foreground">{fmtFecha(e.createdAt)}</span>
                  <span className="line-clamp-1 flex-1 min-w-40">{resumir(e.detail)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Auditoría de piezas</CardTitle></CardHeader>
        <CardContent>
          {piezas.length === 0 ? (
            <Vacio icono="🔍" titulo="Sin piezas" texto="Toda pieza generada aparece aquí con su cadena de procedencia completa." />
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card">
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="py-2 pr-3 font-medium">Pieza</th>
                    <th className="py-2 pr-3 font-medium">Carril</th>
                    <th className="py-2 pr-3 font-medium">QA</th>
                    <th className="py-2 pr-3 font-medium">Semilla</th>
                    <th className="py-2 pr-3 font-medium">Filtros</th>
                    <th className="py-2 pr-3 font-medium">Etiqueta IA</th>
                    <th className="py-2 pr-3 font-medium">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {piezas.map((p) => (
                    <tr key={p.id} className="border-b border-border/50">
                      <td className="py-2 pr-3 font-mono">{p.id.slice(-6)}</td>
                      <td className="py-2 pr-3"><CarrilBadge lane={p.lane} /></td>
                      <td className="py-2 pr-3"><VeredictoBadge veredicto={p.qualityVerdict} /></td>
                      <td className="py-2 pr-3 font-mono">{p.seed.slice(0, 18)}…</td>
                      <td className="py-2 pr-3">{p.filtersTriggered.length > 0 ? <span className="text-rose-300">{p.filtersTriggered.join(', ')}</span> : '—'}</td>
                      <td className="py-2 pr-3">{p.aiLabels.length > 0 ? '✓' : '—'}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{fmtFecha(p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function resumir(d: Record<string, unknown>): string {
  try {
    const s = JSON.stringify(d)
    return s.length > 140 ? s.slice(0, 140) + '…' : s
  } catch {
    return ''
  }
}

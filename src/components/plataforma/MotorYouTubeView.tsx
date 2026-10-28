"use client"
// MÓDULO 2 — YOUTUBE AUTOMATION.
// CHAT-X actúa como punto de acceso y control del motor reutilizando sus
// contratos reales (arnés m2m /api/harness/v1 y Production JSON). Nada se
// reconstruye: si el motor no corre en su máquina, el estado lo dice.
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useMotores, useMotorDetalle, useAccionMotor } from './api'
import { TarjetaMotor, EstadoPill } from './bits'

const EJEMPLO_PRODUCTION = {
  contract_version: '1.0',
  project: { title: 'Short de prueba', aspect: '9:16', language: 'es' },
  sequence: [
    {
      id: 'escena_01',
      duration_target: 8,
      image_prompt: 'primer plano cinematográfico, luz dorada de atardecer',
      narration: 'Bienvenido a este short de prueba.',
    },
  ],
}

export default function MotorYouTubeView() {
  const { data: motores } = useMotores()
  const { data: detalle } = useMotorDetalle('youtube')
  const accion = useAccionMotor('youtube')
  const { toast } = useToast()
  const [envelope, setEnvelope] = useState(JSON.stringify(EJEMPLO_PRODUCTION, null, 2))
  const [resultado, setResultado] = useState<string | null>(null)

  const def = motores?.motores.find((m) => m.id === 'youtube')
  const estado = detalle?.estado
  const sonda = estado?.estado.estado

  const validar = async () => {
    setResultado(null)
    try {
      const r = await accion.mutateAsync({ accion: 'validar_production', envelope })
      setResultado(`${r.detalle}\n\n${r.respuesta ?? JSON.stringify(r.datos ?? r, null, 2)}`)
      toast({ title: r.ok ? 'Validación enviada al motor' : 'El motor rechazó o no respondió', description: r.detalle })
    } catch (e) {
      setResultado(e instanceof Error ? e.message : 'Error desconocido')
    }
  }

  if (!def || !estado) return <p className="text-xs text-muted-foreground">Cargando contrato del motor…</p>

  return (
    <div className="space-y-5">
      <TarjetaMotor def={def} estado={estado}>
        {/* Datos reales del arnés cuando el motor está vivo */}
        {sonda === 'OPERATIVO' && detalle?.datos ? (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
            <p className="text-[11px] font-semibold text-emerald-300">Datos reales del motor ({def.datosReales?.ruta})</p>
            <pre className="mt-1.5 max-h-48 overflow-y-auto whitespace-pre-wrap break-words text-[10px] leading-relaxed text-muted-foreground">
              {JSON.stringify(detalle.datos.datos ?? detalle.datos.detalle, null, 2).slice(0, 3000)}
            </pre>
          </div>
        ) : null}
        {sonda === 'OPERATIVO' && detalle?.datos && !detalle.datos.ok ? (
          <p className="text-[11px] text-amber-300">{detalle.datos.detalle}</p>
        ) : null}
      </TarjetaMotor>

      {/* Control real: validación Production JSON vía contrato */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm">Control: validar Production JSON</CardTitle>
              <CardDescription className="mt-1 text-xs">
                Acción real vía <code className="text-[10px]">POST /api/production_json/validate</code> del motor — valida el envelope sin ejecutar nada (op LOW del arnés).
              </CardDescription>
            </div>
            <EstadoPill estado={sonda ?? 'NO_CONFIGURADO'} />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={envelope}
            onChange={(e) => setEnvelope(e.target.value)}
            className="min-h-40 font-mono text-[11px]"
            aria-label="Envelope Production JSON"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={validar} disabled={accion.isPending || sonda !== 'OPERATIVO'}>
              {accion.isPending ? 'Validando…' : 'Validar contra el motor'}
            </Button>
            {sonda !== 'OPERATIVO' ? (
              <p className="text-[11px] text-muted-foreground">Disponible cuando el motor esté operativo en su URL configurada.</p>
            ) : null}
          </div>
          {resultado ? (
            <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-border/60 bg-muted/20 p-2.5 text-[10px] leading-relaxed">{resultado}</pre>
          ) : null}
        </CardContent>
      </Card>

      {/* Ruta de datos y flags — información real del repo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Cómo corre este motor (respetando sus reglas)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-[11px] leading-relaxed text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">En tu máquina:</span> clona/entra al repo y lanza <code>start.sh</code> (Linux/Mac/WSL) o <code>INICIAR-ALBRA.vbs</code> (Windows). FastAPI queda en <code>127.0.0.1:8000</code>. Después define esa URL en «Conectar motor» y CHAT-X lo sondará y operará.
          </p>
          <p>
            <span className="font-medium text-foreground">Google Flow real:</span> requiere Chrome dedicado con sesión Google autenticada (CDP :9333) y activar <code>FLOW_MCP_ENABLED=1</code> + <code>FLOW_MCP_VIDEO_ENABLED=1</code> en el backend del motor. La vía validada E2E es GoogleFlowMCP (Gates A/C en LIVE PASS); el canal extensión no tiene E2E demostrado.
          </p>
          <p>
            <span className="font-medium text-foreground">Frontera del motor:</span> CHAT-X consume el arnés m2m y el contrato Production JSON; NUNCA reimplanta el pipeline (regla de frontera del propio repo).
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

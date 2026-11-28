"use client"
// D-015 · A1 — EL renderizador único de fichas. Recorre campos[] de una
// herramienta declarada en BD y pinta cada tipo. Ninguna pantalla de
// herramienta se programa a mano: cambiar un label o el coste en la BD se ve
// en pantalla sin recompilar (prueba obligatoria del patrón).
// El submit va contra el endpoint REAL de la herramienta, que sigue siendo la
// única verdad del coste, del compliance y del claim atómico.
import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Wand2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { api, useCharacters } from './api'
import { cn } from '@/lib/utils'
import { fmtDinero } from './ui-bits'
import {
  armaPayload,
  camposVisibles,
  costeEstimado,
  valoresIniciales,
  validarValores,
  type CampoDefEntrada,
  type HerramientaT,
  type Valores,
} from '@/lib/herramientas'

export default function FichaHerramienta({
  herramienta,
  privadoDesbloqueado,
  onLanzado,
}: {
  herramienta: HerramientaT
  privadoDesbloqueado: boolean
  onLanzado?: () => void
}) {
  const { toast } = useToast()
  const { data: characters } = useCharacters()
  const activos = useMemo(() => (characters ?? []).filter((c) => c.status === 'ACTIVO'), [characters])
  const [valores, setValores] = useState<Valores>(() => valoresIniciales(herramienta.campos))
  const [enCurso, setEnCurso] = useState(false)
  // Resultado síncrono (A7: herramientas de texto como mejorar_prompt responden
  // con el brief listo; las de lote responden con jobId y no muestran nada aquí).
  const [resultado, setResultado] = useState<{
    brief: { escena: string; outfit?: string; pose?: string; luz?: string }
    modelo: string
    provedor: string
    duracionMs: number
  } | null>(null)

  const visibles = camposVisibles(herramienta.campos, valores)
  const validacion = validarValores(herramienta.campos, valores)
  const coste = costeEstimado(herramienta, valores)

  const set = (name: string, v: string | number | boolean) => setValores((s) => ({ ...s, [name]: v }))

  const generar = async () => {
    const v = validarValores(herramienta.campos, valores)
    if (!v.ok) {
      toast({ title: 'Faltan campos por llenar', description: v.errores[0]?.mensaje, variant: 'destructive' })
      return
    }
    setEnCurso(true)
    try {
      const body = armaPayload(herramienta, valores)
      const r = await api<{ jobId?: string; batchId?: string; coste?: number; brief?: { escena: string; outfit?: string; pose?: string; luz?: string }; modelo?: string; provedor?: string; duracionMs?: number }>(herramienta.endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (r.brief) {
        setResultado({
          brief: r.brief,
          modelo: r.modelo ?? 'llm',
          provedor: r.provedor ?? 'proveedor',
          duracionMs: r.duracionMs ?? 0,
        })
        toast({
          title: `${herramienta.nombre}: brief mejorado`,
          description: r.coste !== undefined ? `coste ${fmtDinero(r.coste)} cr. (dice el servidor) · cópialo en la Fábrica de fotos` : 'cópialo en la Fábrica de fotos',
        })
      } else {
        setResultado(null)
        toast({
          title: `${herramienta.nombre}: trabajo en camino`,
          description: [
            r.coste !== undefined ? `coste ${fmtDinero(r.coste)} cr. (dice el servidor)` : null,
            r.batchId ? `batch ${r.batchId.slice(-6)}` : null,
          ]
            .filter(Boolean)
            .join(' · '),
        })
      }
      onLanzado?.()
    } catch (e) {
      const err = e as Error & { status?: number }
      toast({
        title: err.status === 422 ? 'Bloqueo de compliance' : `No se pudo lanzar ${herramienta.nombre}`,
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setEnCurso(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <span aria-hidden>{herramienta.icono}</span> {herramienta.nombre}
            {herramienta.chapas.map((ch) => (
              <Badge key={ch} variant="outline" className="text-[10px]">
                {ch}
              </Badge>
            ))}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{herramienta.descripcion}</p>
        </div>
        <Badge variant="secondary" className="text-[10px] shrink-0">
          {herramienta.grupo}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {visibles.map((c) => (
            <CampoHerramienta
              key={c.name}
              campo={c}
              valor={valores[c.name]}
              onChange={(v) => set(c.name, v)}
              personajes={activos.map((x) => ({ id: x.id, nombre: x.name }))}
              privadoDesbloqueado={privadoDesbloqueado}
            />
          ))}
        </div>

        <div className="rounded-lg border border-border p-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Coste estimado</span>
            <span className="font-semibold tabular-nums">{fmtDinero(coste)} cr.</span>
          </div>
          {herramienta.costeTexto && (
            <p className="text-[11px] text-muted-foreground">{herramienta.costeTexto} · el coste final lo confirma el servidor al lanzar.</p>
          )}
          {herramienta.limiteTexto && <p className="text-[11px] text-muted-foreground">Límite: {herramienta.limiteTexto}.</p>}
        </div>

        <Button className="w-full" onClick={generar} disabled={!validacion.ok || enCurso}>
          <Wand2 className="mr-1.5 h-4 w-4" aria-hidden /> {enCurso ? 'Lanzando…' : `Generar con ${herramienta.nombre}`}
        </Button>
        {!validacion.ok && (
          <p className="text-[11px] text-amber-300">Completa los campos obligatorios para habilitar el botón.</p>
        )}

        {resultado && (
          <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold">Escena mejorada</p>
              <div className="flex shrink-0 items-center gap-1.5">
                <Badge variant="outline" className="text-[9px] text-muted-foreground">{resultado.provedor} · {resultado.modelo}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-[10px]"
                  onClick={() => void navigator.clipboard.writeText(resultado.brief.escena)}
                >
                  Copiar escena
                </Button>
              </div>
            </div>
            <p className="text-xs leading-relaxed">{resultado.brief.escena}</p>
            <div className="grid gap-x-3 gap-y-1 text-[11px] text-muted-foreground sm:grid-cols-2">
              {resultado.brief.outfit ? <p><span className="font-medium text-foreground">outfit:</span> {resultado.brief.outfit}</p> : null}
              {resultado.brief.pose ? <p><span className="font-medium text-foreground">pose:</span> {resultado.brief.pose}</p> : null}
              {resultado.brief.luz ? <p><span className="font-medium text-foreground">luz:</span> {resultado.brief.luz}</p> : null}
              <p className="tabular-nums">{(resultado.duracionMs / 1000).toFixed(1)} s en casa · contabilizada como job</p>
            </div>
            <p className="text-[10px] text-muted-foreground">Pega la escena y estos campos en la Fábrica de fotos para producir la pieza real.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Un render por tipo de campo (registro del renderizador) ──

function CampoHerramienta({
  campo,
  valor,
  onChange,
  personajes,
  privadoDesbloqueado,
}: {
  campo: CampoDefEntrada
  valor: string | number | boolean | undefined
  onChange: (v: string | number | boolean) => void
  personajes: { id: string; nombre: string }[]
  privadoDesbloqueado: boolean
}) {
  const id = `h-${campo.name}`
  return (
    <div className={cn('space-y-1.5', campo.mediaFila ? '' : 'sm:col-span-2')}>
      <Label htmlFor={id}>
        {campo.label}
        {campo.required ? <span aria-hidden className="text-rose-400"> *</span> : null}
      </Label>

      {campo.type === 'text' && (
        <Input id={id} value={String(valor ?? '')} onChange={(e) => onChange(e.target.value)} placeholder={campo.placeholder} />
      )}

      {campo.type === 'textarea' && (
        <Textarea
          id={id}
          value={String(valor ?? '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={campo.placeholder}
          rows={2}
        />
      )}

      {campo.type === 'number' && (
        <Input
          id={id}
          type="number"
          value={valor === undefined ? '' : Number(valor)}
          min={campo.min}
          max={campo.max}
          step={campo.step ?? 1}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder={campo.placeholder}
        />
      )}

      {campo.type === 'slider' && (
        <div className="flex items-center gap-3">
          <Slider
            id={id}
            value={[Number(valor ?? campo.min ?? 1)]}
            min={campo.min}
            max={campo.max}
            step={campo.step ?? 1}
            onValueChange={([v]) => onChange(v)}
          />
          <span className="w-10 text-right text-sm tabular-nums">{String(valor ?? '')}</span>
        </div>
      )}

      {campo.type === 'switch' && (
        <div className="flex items-center gap-2 pt-1">
          <Switch id={id} checked={Boolean(valor)} onCheckedChange={onChange} />
          <span className="text-xs text-muted-foreground">{valor ? 'activo' : 'apagado'}</span>
        </div>
      )}

      {campo.type === 'select' && (
        <Select value={String(valor ?? '')} onValueChange={onChange}>
          <SelectTrigger id={id}>
            <SelectValue placeholder="elegir…" />
          </SelectTrigger>
          <SelectContent>
            {(campo.options ?? []).map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
                {o.badge ? ` · ${o.badge}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {campo.type === 'character' && (
        <Select value={String(valor ?? '')} onValueChange={onChange}>
          <SelectTrigger id={id} aria-label="Elegir personaje activo">
            <SelectValue placeholder="elegir personaje…" />
          </SelectTrigger>
          <SelectContent>
            {personajes.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {campo.type === 'carril' && (
        <div className="flex items-center gap-2" role="group" aria-label="Carril del trabajo">
          <Button
            type="button"
            variant={valor === 'PUBLICO' ? 'secondary' : 'outline'}
            size="sm"
            aria-pressed={valor === 'PUBLICO'}
            onClick={() => onChange('PUBLICO')}
          >
            público SFW
          </Button>
          <Button
            type="button"
            variant={valor === 'PRIVADO' ? 'destructive' : 'outline'}
            size="sm"
            aria-pressed={valor === 'PRIVADO'}
            disabled={!privadoDesbloqueado}
            title={privadoDesbloqueado ? undefined : 'Abre el carril privado en la cabecera del Estudio'}
            onClick={() => onChange('PRIVADO')}
          >
            privado 18+
          </Button>
        </div>
      )}

      {campo.helpText && <p className="text-[11px] text-muted-foreground">{campo.helpText}</p>}
    </div>
  )
}

'use client'
// Biblioteca — piezas con pipeline, sets y KPIs (ficha 4.5, flujos B y D)
import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Download, Package, Trash2, Upload } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  api,
  useAccion,
  useCharacters,
  useKpi,
  useMedia,
  useSetDetalle,
  useSets,
  type MediaT,
} from './api'
import { CarrilBadge, MediaImg, PipelineBadge, Vacio, VeredictoBadge, fmtDinero, fmtFecha } from './ui-bits'

type Pestana = 'piezas' | 'sets' | 'kpis'

export default function BibliotecaView() {
  const [pestana, setPestana] = useState<Pestana>('piezas')
  return (
    <div className="space-y-4">
      <div className="flex gap-1.5" role="tablist" aria-label="Secciones de la biblioteca">
        {(['piezas', 'sets', 'kpis'] as Pestana[]).map((p) => (
          <Button key={p} role="tab" aria-selected={pestana === p} variant={pestana === p ? 'secondary' : 'ghost'} size="sm" onClick={() => setPestana(p)}>
            {p}
          </Button>
        ))}
      </div>
      {pestana === 'piezas' && <Piezas />}
      {pestana === 'sets' && <Sets />}
      {pestana === 'kpis' && <Kpis />}
    </div>
  )
}

/* ───────────────────────── PIEZAS ───────────────────────── */

function Piezas() {
  const { toast } = useToast()
  const { data: characters } = useCharacters()
  const [fCharacter, setFCharacter] = useState('todas')
  const [fLane, setFLane] = useState('todos')
  const [fPipeline, setFPipeline] = useState('todos')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [armarAbierto, setArmarAbierto] = useState(false)
  const [nombreSet, setNombreSet] = useState('')
  const [caption, setCaption] = useState('')
  const [precio, setPrecio] = useState('')

  const filtros = useMemo(() => {
    const f: Record<string, string> = { limit: '120' }
    if (fCharacter !== 'todas') f.characterId = fCharacter
    if (fLane !== 'todos') f.lane = fLane
    if (fPipeline !== 'todos') f.pipelineStatus = fPipeline
    return f
  }, [fCharacter, fLane, fPipeline])
  const { data: media } = useMedia(filtros)

  const accion = useAccion(
    (v: { id: string; accion: string }) =>
      api(`/api/media/${v.id}`, { method: 'PATCH', body: JSON.stringify({ accion: v.accion, forzar: true }) }),
    ['media', 'compliance', 'settings', 'kpi'],
  )
  const borrar = useAccion(
    (v: { id: string }) => api(`/api/media/${v.id}`, { method: 'PATCH', body: JSON.stringify({ accion: 'borrar' }) }),
    ['media', 'compliance'],
  )
  const crearSet = useAccion(
    () =>
      api('/api/sets', {
        method: 'POST',
        body: JSON.stringify({
          characterId: [...sel].length ? media?.media.find((m) => sel.has(m.id))?.characterId : undefined,
          mediaIds: [...sel],
          name: nombreSet,
          caption,
          suggestedPrice: Number(precio) || undefined,
        }),
      }),
    ['sets', 'media'],
  )

  const piezasSel = (media?.media ?? []).filter((m) => sel.has(m.id))
  const mezclaCarriles = new Set(piezasSel.map((p) => p.lane)).size > 1
  const todasCifradas = piezasSel.every((p) => p.lane === 'PUBLICO' || p.pipelineStatus === 'cifrado')
  const todasAprobadas = piezasSel.every((p) => p.lane === 'PRIVADO' ? p.pipelineStatus === 'cifrado' : p.qualityVerdict === 'APROBADO')

  const armar = async () => {
    if (!nombreSet.trim() || piezasSel.length === 0) return
    try {
      await api('/api/sets', {
        method: 'POST',
        body: JSON.stringify({
          characterId: piezasSel[0].characterId,
          mediaIds: [...sel],
          name: nombreSet.trim(),
          caption,
          suggestedPrice: Number(precio) || undefined,
        }),
      })
      toast({ title: `Set "${nombreSet}" creado.`, description: 'Revísalo en la pestaña sets.' })
      setArmarAbierto(false); setNombreSet(''); setCaption(''); setPrecio(''); setSel(new Set())
    } catch (e) {
      toast({ title: 'No se pudo crear el set', description: (e as Error).message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Select value={fCharacter} onValueChange={setFCharacter}>
          <SelectTrigger aria-label="Filtrar por personaje"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">todos los personajes</SelectItem>
            {(characters ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fLane} onValueChange={setFLane}>
          <SelectTrigger aria-label="Filtrar por carril"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">ambos carriles</SelectItem>
            <SelectItem value="PUBLICO">público SFW</SelectItem>
            <SelectItem value="PRIVADO">privado 18+</SelectItem>
          </SelectContent>
        </Select>
        <Select value={fPipeline} onValueChange={setFPipeline}>
          <SelectTrigger aria-label="Filtrar por estado"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">todos los estados</SelectItem>
            <SelectItem value="borrador">borrador</SelectItem>
            <SelectItem value="qa">qa</SelectItem>
            <SelectItem value="aprobado">aprobado</SelectItem>
            <SelectItem value="cifrado">cifrado</SelectItem>
            <SelectItem value="publicado">publicado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-muted-foreground">{sel.size} seleccionadas</p>
        <Button size="sm" variant="secondary" onClick={() => setArmarAbierto(true)} disabled={sel.size === 0 || mezclaCarriles}>
          <Package className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Armar set con {sel.size}
        </Button>
        {sel.size > 0 && <Button size="sm" variant="ghost" onClick={() => setSel(new Set())}>limpiar selección</Button>}
        {mezclaCarriles && <p className="text-xs text-rose-300">Regla dura: no se pueden mezclar carriles en un set.</p>}
      </div>

      {(media?.media ?? []).length === 0 ? (
        <Vacio icono="🗃️" titulo="Sin piezas con esos filtros" texto="Genera lotes en el Estudio; las piezas aparecen aquí con su pipeline completo." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {(media?.media ?? []).map((m) => (
            <PiezaCard key={m.id} m={m} sel={sel.has(m.id)} onToggle={() => setSel((s) => { const n = new Set(s); if (n.has(m.id)) n.delete(m.id); else n.add(m.id); return n })} onAccion={accion.mutate} onBorrar={() => borrar.mutate({ id: m.id })} />
          ))}
        </div>
      )}

      <Dialog open={armarAbierto} onOpenChange={setArmarAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Armar set con {piezasSel.length} piezas</DialogTitle>
            <DialogDescription>
              Carril: {piezasSel[0]?.lane === 'PRIVADO' ? 'privado 18+ (requiere piezas cifradas)' : 'público SFW (requiere QA aprobado)'} ·
              {' '}{todasCifradas && todasAprobadas ? 'requisitos cumplidos ✓' : '⚠️ faltan requisitos (QA/cifrado)'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="s-nombre">Nombre del set</Label>
              <Input id="s-nombre" value={nombreSet} onChange={(e) => setNombreSet(e.target.value)} placeholder="p. ej. balcón-atardecer-01" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-caption">Caption (leyenda)</Label>
              <Textarea id="s-caption" value={caption} onChange={(e) => setCaption(e.target.value)} rows={2} placeholder="p. ej. atardeceres como este me calman ✨" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-precio">Precio PPV sugerido (USD)</Label>
              <Input id="s-precio" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder={`p. ej. ${(piezasSel.length * 1.5).toFixed(1)}`} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setArmarAbierto(false)}>Cancelar</Button>
            <Button onClick={armar} disabled={!nombreSet.trim()}>Crear set</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PiezaCard({
  m,
  sel,
  onToggle,
  onAccion,
  onBorrar,
}: {
  m: MediaT
  sel: boolean
  onToggle: () => void
  onAccion: (v: { id: string; accion: string }) => void
  onBorrar: () => void
}) {
  const [abierta, setAbierta] = useState(false)
  return (
    <div className={`rounded-lg border p-1.5 space-y-1.5 ${sel ? 'border-primary ring-2 ring-primary/40' : 'border-border'}`}>
      <button onClick={onToggle} className="relative block w-full" aria-pressed={sel} aria-label={`Seleccionar pieza ${m.id.slice(-5)}`}>
        <MediaImg media={m} size="thumb" />
        <span className="absolute top-1 left-1 flex flex-col gap-1 items-start">
          <VeredictoBadge veredicto={m.qualityVerdict} />
          <PipelineBadge estado={m.pipelineStatus} />
        </span>
      </button>
      <Button size="sm" variant="ghost" className="h-6 w-full text-[10px]" onClick={() => setAbierta(true)}>detalle</Button>
      <Dialog open={abierta} onOpenChange={setAbierta}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              Pieza {m.id.slice(-5)} <CarrilBadge lane={m.lane} /> <PipelineBadge estado={m.pipelineStatus} />
            </DialogTitle>
            <DialogDescription>Procedencia completa (flujo D: auditoría)</DialogDescription>
          </DialogHeader>
          <MediaImg media={m} size="full" className="max-h-64" />
          <dl className="text-xs space-y-1">
            <div><dt className="inline text-muted-foreground">prompt: </dt><dd className="inline">{m.prompt}</dd></div>
            <div><dt className="inline text-muted-foreground">semilla: </dt><dd className="inline font-mono">{m.seed}</dd></div>
            <div><dt className="inline text-muted-foreground">checkpoint: </dt><dd className="inline font-mono">{m.checkpoint}</dd></div>
            <div><dt className="inline text-muted-foreground">LoRA: </dt><dd className="inline font-mono">{m.loraHash ?? '—'}</dd></div>
            <div><dt className="inline text-muted-foreground">QA: </dt><dd className="inline">{m.qualityVerdict}{m.qualityReason ? ` — ${m.qualityReason}` : ''}</dd></div>
            <div><dt className="inline text-muted-foreground">etiquetas IA: </dt><dd className="inline">{m.aiLabels.join(', ') || '—'}</dd></div>
            <div><dt className="inline text-muted-foreground">filtros disparados: </dt><dd className="inline">{m.filtersTriggered.join(', ') || 'ninguno'}</dd></div>
            <div><dt className="inline text-muted-foreground">set: </dt><dd className="inline">{m.set?.name ?? '—'}</dd></div>
            <div><dt className="inline text-muted-foreground">creada: </dt><dd className="inline">{fmtFecha(m.createdAt)}</dd></div>
          </dl>
          <DialogFooter className="flex flex-wrap gap-2">
            {m.qualityVerdict !== 'APROBADO' && <Button size="sm" variant="outline" onClick={() => { onAccion({ id: m.id, accion: 'aprobar' }); setAbierta(false) }}>Aprobar (forzar)</Button>}
            {m.lane === 'PRIVADO' && m.pipelineStatus !== 'cifrado' && <Button size="sm" variant="destructive" onClick={() => { onAccion({ id: m.id, accion: 'cifrar' }); setAbierta(false) }}>Cifrar</Button>}
            <Button size="sm" variant="ghost" onClick={() => { if (window.confirm('¿Borrar la pieza? Se registra en compliance.')) { onBorrar(); setAbierta(false) } }}>
              <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden /> Borrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ───────────────────────── SETS ───────────────────────── */

function Sets() {
  const { toast } = useToast()
  const { data: sets } = useSets()
  const [detalleId, setDetalleId] = useState<string | null>(null)
  const { data: detalle } = useSetDetalle(detalleId)
  const [precioReal, setPrecioReal] = useState('')

  const publicar = useAccion(
    (v: { id: string; precio: number }) =>
      api(`/api/sets/${v.id}`, { method: 'PATCH', body: JSON.stringify({ accion: 'publicar', realPrice: v.precio }) }),
    ['sets', 'media', 'kpi'],
  )

  return (
    <div className="space-y-3">
      {(sets ?? []).length === 0 ? (
        <Vacio icono="📦" titulo="Sin sets todavía" texto="Selecciona piezas aprobadas en la pestaña piezas y ármalas en un set." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(sets ?? []).map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{s.name}</h3>
                  <CarrilBadge lane={s.lane} />
                </div>
                <p className="text-xs text-muted-foreground">{s.characterName} · {s.piecesCount ?? 0} piezas · creado {fmtFecha(s.createdAt)}</p>
                <p className="text-xs line-clamp-2">{s.caption || 'sin caption'}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">PPV sugerido: <span className="font-medium text-foreground">{fmtDinero(s.suggestedPrice)}</span></span>
                  <Badge variant="outline" className={s.publishStatus === 'publicado' ? 'text-teal-300 border-teal-500/40' : ''}>{s.publishStatus}</Badge>
                </div>
                <div className="flex gap-1.5 pt-1">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setDetalleId(s.id)}>Abrir</Button>
                  <Button size="sm" variant="ghost" onClick={async () => {
                    const r = await fetch(`/api/sets/${s.id}/export`)
                    const blob = await r.blob()
                    const a = document.createElement('a')
                    a.href = URL.createObjectURL(blob)
                    a.download = `set-${s.name}.json`
                    a.click()
                    URL.revokeObjectURL(a.href)
                    toast({ title: 'Manifest de exportación descargado.' })
                  }} aria-label={`Exportar set ${s.name}`}>
                    <Download className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={Boolean(detalleId)} onOpenChange={(v) => !v && setDetalleId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Set: {detalle?.set.name ?? '…'}</DialogTitle>
            <DialogDescription>
              {detalle?.set.characterName} · {detalle?.piezas.length ?? 0} piezas · etiqueta IA incluida: «{detalle?.set.aiLabel ?? 'Contenido generado con IA'}»
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 max-h-52 overflow-y-auto">
            {(detalle?.piezas ?? []).map((p) => <MediaImg key={p.id} media={p} size="thumb" />)}
          </div>
          {detalle && detalle.set.publishStatus !== 'publicado' ? (
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1.5 flex-1 min-w-40">
                <Label htmlFor="set-precio">Precio real al publicar (USD)</Label>
                <Input id="set-precio" value={precioReal} onChange={(e) => setPrecioReal(e.target.value)} placeholder={String(detalle.set.suggestedPrice)} />
              </div>
              <Button onClick={() => publicar.mutate({ id: detalle.set.id, precio: Number(precioReal) || detalle.set.suggestedPrice })}>
                Registrar publicación en Fanvue
              </Button>
            </div>
          ) : (
            <p className="text-xs text-emerald-300">Publicado {fmtFecha(detalle?.set.publishedAt ?? null)} · ingresos registrados: {fmtDinero(detalle?.set.revenue ?? 0)}</p>
          )}
          <DialogFooter>
            <p className="text-[11px] text-muted-foreground mr-auto">La subida es guiada/manual en la plataforma; el sistema registra qué, dónde, cuándo y a qué precio.</p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ───────────────────────── KPIs ───────────────────────── */

function Kpis() {
  const { toast } = useToast()
  const { data: kpi } = useKpi()
  const [csv, setCsv] = useState('')
  const [abierto, setAbierto] = useState(false)

  const importar = useAccion<void>(
    () => api('/api/kpi/importar', { method: 'POST', body: JSON.stringify({ csv }) }),
    ['kpi'],
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Mes actual: {kpi?.mesActual ?? '—'} · ingresos pegados desde la plataforma (F1)</p>
        <Button size="sm" variant="secondary" onClick={() => setAbierto(true)}>
          <Upload className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Pegar CSV
        </Button>
      </div>
      {(kpi?.entries ?? []).length === 0 ? (
        <Vacio icono="📊" titulo="Sin KPIs importados" texto="Pega el CSV que descargas de la plataforma: personaje; mes; ingresos; subs; mensajes; ppv" />
      ) : (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Ingresos por personaje y mes</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3 font-medium">Personaje</th>
                  <th className="py-2 pr-3 font-medium">Mes</th>
                  <th className="py-2 pr-3 font-medium text-right">Ingresos</th>
                  <th className="py-2 pr-3 font-medium text-right">Subs</th>
                  <th className="py-2 pr-3 font-medium text-right">Mensajes pagados</th>
                  <th className="py-2 pr-3 font-medium text-right">PPV</th>
                </tr>
              </thead>
              <tbody>
                {(kpi?.entries ?? []).map((e) => (
                  <tr key={e.id} className="border-b border-border/50">
                    <td className="py-2 pr-3">{e.characterName}</td>
                    <td className="py-2 pr-3">{e.month}</td>
                    <td className="py-2 pr-3 text-right font-medium text-emerald-300">{fmtDinero(e.revenue)}</td>
                    <td className="py-2 pr-3 text-right">{fmtDinero(e.subs)}</td>
                    <td className="py-2 pr-3 text-right">{fmtDinero(e.paidMessages)}</td>
                    <td className="py-2 pr-3 text-right">{fmtDinero(e.ppv)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pegar CSV de ingresos</DialogTitle>
            <DialogDescription>
              Una línea por registro: <code className="text-[10px]">personaje; mes(YYYY-MM); ingresos; subs; mensajes_pagados; ppv</code>. El mes es opcional (usa el actual).
            </DialogDescription>
          </DialogHeader>
          <Textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={5} placeholder="Valentina; 2026-10; 4120; 900; 2400; 820" aria-label="CSV de ingresos" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button onClick={async () => {
              try {
                const r = await importar.mutateAsync()
                const res = r as { importadas: number; errores: string[] }
                toast({ title: `${res.importadas} línea(s) importadas.`, description: res.errores?.slice(0, 3).join(' · ') || undefined })
                setAbierto(false); setCsv('')
              } catch (e) {
                toast({ title: 'No se pudo importar', description: (e as Error).message, variant: 'destructive' })
              }
            }} disabled={!csv.trim()}>Importar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

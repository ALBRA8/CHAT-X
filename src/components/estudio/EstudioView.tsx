'use client'
// Estudio — fábrica de fotos con vista previa barata → render elegido (ficha 4.3/4.4, flujos B y C)
import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Lock, LockOpen, Save, Wand2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  api,
  useAccion,
  useCharacters,
  useJobs,
  useMedia,
  usePrivado,
  useSettings,
  type CharacterT,
  type MediaT,
  type PresetT,
} from './api'
import { MediaImg, Vacio, VeredictoBadge, fmtDinero, fmtFecha } from './ui-bits'
import VozCard from './VozCard'
import { COSTOS } from '@/lib/constants'

const ENCUADRES = ['primer_plano', 'plano_medio', 'cuerpo_entero'] as const

export default function EstudioView({ inicial }: { inicial: CharacterT | null }) {
  const { toast } = useToast()
  const { data: characters } = useCharacters()
  const { data: settings } = useSettings()
  const { data: privado, refetch: refetchPrivado } = usePrivado()
  const activos = (characters ?? []).filter((c) => c.status === 'ACTIVO')
  const [characterId, setCharacterId] = useState<string>(inicial?.id ?? '')
  const c = activos.find((x) => x.id === characterId)

  const [modoPrivado, setModoPrivado] = useState(false)
  const [gateAbierto, setGateAbierto] = useState(false)
  const [contrasena, setContrasena] = useState('')

  const [escena, setEscena] = useState('')
  const [outfit, setOutfit] = useState('')
  const [pose, setPose] = useState('')
  const [encuadre, setEncuadre] = useState<string>('plano_medio')
  const [luz, setLuz] = useState('')
  const [count, setCount] = useState(8)
  const [loteId, setLoteId] = useState<string | null>(null)
  const [renderId, setRenderId] = useState<string | null>(null)
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())

  const lane = modoPrivado ? 'PRIVADO' : 'PUBLICO'
  const { data: jobs } = useJobs(false)
  const { data: previews } = useMedia(loteId ? { batchId: loteId } : { batchId: '___' })
  const { data: finales } = useMedia(renderId ? { batchId: renderId, kind: 'final' } : { batchId: '___' })

  const loteJob = (jobs ?? []).find((j) => j.type === 'lote_fotos' && j.status !== 'listo' && j.status !== 'fallido')
  const renderJob = (jobs ?? []).find((j) => j.type === 'render_final' && j.status !== 'listo' && j.status !== 'fallido')

  const costePreviews = Math.round(COSTOS.PREVIEW * count * 10) / 10
  const costeRenders = Math.round(COSTOS.RENDER_FINAL * seleccion.size * 10) / 10
  const saldo = settings?.credits ?? 0

  const presetActual = (): PresetT => ({ nombre: '', escena, outfit, pose, encuadre, luz })

  const guardarPreset = async () => {
    const nombre = window.prompt('Nombre del preset:')
    if (!nombre) return
    const nuevos = [...(settings?.presets ?? []), { ...presetActual(), nombre }]
    try {
      await api('/api/settings', { method: 'PATCH', body: JSON.stringify({ presets: nuevos }) })
      toast({ title: `Preset "${nombre}" guardado.` })
    } catch (e) {
      toast({ title: 'No se pudo guardar el preset', description: (e as Error).message, variant: 'destructive' })
    }
  }

  const aplicarPreset = (p: PresetT) => {
    setEscena(p.escena); setOutfit(p.outfit); setPose(p.pose); setEncuadre(p.encuadre); setLuz(p.luz)
  }

  const abrirCarrilPrivado = () => {
    if (!privado?.desbloqueado) {
      setGateAbierto(true)
      return
    }
    setModoPrivado(true)
  }

  const desbloquear = async () => {
    try {
      const body = privado?.privadaDefinida ? { contrasena } : { nuevaContrasena: contrasena }
      await api('/api/private/session', { method: 'POST', body: JSON.stringify(body) })
      setContrasena('')
      setGateAbierto(false)
      setModoPrivado(true)
      refetchPrivado()
      toast({ title: 'Modo privado desbloqueado', description: 'La sesión expira sola en minutos.' })
    } catch (e) {
      toast({ title: 'No se pudo desbloquear', description: (e as Error).message, variant: 'destructive' })
    }
  }

  const bloquear = async () => {
    await api('/api/private/session', { method: 'DELETE' })
    setModoPrivado(false)
    refetchPrivado()
    toast({ title: 'Candado puesto. El carril privado quedó cifrado.' })
  }

  const generarLote = async () => {
    if (!c) return
    if (!escena.trim()) {
      toast({ title: 'Escribe al menos la escena del brief.', variant: 'destructive' })
      return
    }
    try {
      const r = await api<{ jobId: string; batchId: string; coste: number }>('/api/studio/lote', {
        method: 'POST',
        body: JSON.stringify({
          characterId: c.id,
          lane,
          count,
          brief: { escena, outfit, pose, encuadre, luz },
        }),
      })
      setLoteId(r.batchId)
      setRenderId(null)
      setSeleccion(new Set())
      toast({ title: `Lanzando ${count} vistas previas…`, description: `coste ${fmtDinero(r.coste)} cr. · batch ${r.batchId.slice(-6)}` })
    } catch (e) {
      const err = e as Error & { status?: number }
      toast({
        title: err.status === 422 ? 'Bloqueo de compliance' : 'No se pudo lanzar el lote',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  const toggleSel = (m: MediaT) => {
    if (m.qualityVerdict === 'RECHAZADO') return
    setSeleccion((s) => {
      const n = new Set(s)
      if (n.has(m.id)) n.delete(m.id)
      else n.add(m.id)
      return n
    })
  }

  const renderFinal = async () => {
    if (!c || seleccion.size === 0) return
    try {
      const r = await api<{ batchId: string; coste: number }>('/api/studio/render', {
        method: 'POST',
        body: JSON.stringify({
          characterId: c.id,
          lane,
          mediaIds: [...seleccion],
          brief: { escena, outfit, pose, encuadre, luz },
        }),
      })
      setRenderId(r.batchId)
      toast({ title: `Render final de ${seleccion.size} piezas…`, description: `coste ${fmtDinero(r.coste)} cr.` })
    } catch (e) {
      toast({ title: 'No se pudo lanzar el render', description: (e as Error).message, variant: 'destructive' })
    }
  }

  const accionMedia = useAccion(
    (v: { mediaId: string; accion: string }) =>
      api(`/api/media/${v.mediaId}`, { method: 'PATCH', body: JSON.stringify({ accion: v.accion, forzar: true }) }),
    ['media', 'compliance', 'settings'],
  )

  return (
    <div className="space-y-4">
      {/* Cabecera: personaje + carril */}
      <Card>
        <CardContent className="p-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Personaje (solo ACTIVOS)</Label>
            <Select value={characterId} onValueChange={setCharacterId}>
              <SelectTrigger aria-label="Elegir personaje activo"><SelectValue placeholder="elegir personaje…" /></SelectTrigger>
              <SelectContent>
                {activos.map((x) => (
                  <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={modoPrivado ? 'outline' : 'secondary'} size="sm" onClick={() => setModoPrivado(false)} aria-pressed={!modoPrivado}>
              público SFW
            </Button>
            {privado?.desbloqueado ? (
              <>
                <Button variant={modoPrivado ? 'destructive' : 'outline'} size="sm" onClick={() => setModoPrivado(true)} aria-pressed={modoPrivado}>
                  <Lock className="mr-1 h-3.5 w-3.5" aria-hidden /> privado 18+
                </Button>
                <Button variant="ghost" size="sm" onClick={bloquear} aria-label="Volver a cifrar y cerrar sesión privada">cerrar sesión</Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={abrirCarrilPrivado}>
                <LockOpen className="mr-1 h-3.5 w-3.5" aria-hidden /> abrir privado 18+
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Voz — identidad clonada (capa 3, local y $0) */}
      {c && <VozCard characterId={c.id} desbloqueado={modoPrivado} />}

      {/* Brief + costes */}
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Brief</CardTitle>
            <div className="flex gap-1.5">
              <Button variant="ghost" size="sm" onClick={guardarPreset} aria-label="Guardar preset"><Save className="h-3.5 w-3.5" aria-hidden /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {settings && settings.presets.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {settings.presets.map((p, i) => (
                  <Badge key={i} variant="outline" className="cursor-pointer text-[11px]" onClick={() => aplicarPreset(p)}>
                    {p.nombre}
                  </Badge>
                ))}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="e-escena">Escena</Label>
              <Input id="e-escena" value={escena} onChange={(e) => setEscena(e.target.value)} placeholder="p. ej. balcón con vista a la ciudad al atardecer" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="e-outfit">Outfit</Label>
                <Input id="e-outfit" value={outfit} onChange={(e) => setOutfit(e.target.value)} placeholder="p. ej. vestido negro" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-pose">Pose</Label>
                <Input id="e-pose" value={pose} onChange={(e) => setPose(e.target.value)} placeholder="p. ej. apoyada en la baranda" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-encuadre">Encuadre</Label>
                <Select value={encuadre} onValueChange={setEncuadre}>
                  <SelectTrigger id="e-encuadre"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ENCUADRES.map((x) => <SelectItem key={x} value={x}>{x.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-luz">Luz</Label>
                <Input id="e-luz" value={luz} onChange={(e) => setLuz(e.target.value)} placeholder="p. ej. dorado de atardecer" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-count">Vistas previas del lote: {count} (máx. 32)</Label>
              <Slider id="e-count" value={[count]} min={1} max={32} step={1} onValueChange={([v]) => setCount(v)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Coste y economía</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-lg border border-border p-3 space-y-1.5">
              <div className="flex justify-between"><span className="text-muted-foreground">Saldo</span><span className="font-semibold tabular-nums">{fmtDinero(saldo)} cr.</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Lote de previews ({count} × {COSTOS.PREVIEW})</span><span className="tabular-nums">{fmtDinero(costePreviews)} cr.</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Render final ({seleccion.size} × {COSTOS.RENDER_FINAL})</span><span className="tabular-nums">{fmtDinero(costeRenders)} cr.</span></div>
              <p className="text-[11px] text-muted-foreground pt-1">El coste se muestra SIEMPRE antes de generar y se descuenta al confirmar.</p>
            </div>
            <Button className="w-full" onClick={generarLote} disabled={!c || Boolean(loteJob)}>
              <Wand2 className="mr-1.5 h-4 w-4" aria-hidden /> Generar lote de previews
            </Button>
            {loteJob && <p className="text-xs text-amber-300">Lote en curso: {loteJob.status.replace('_', ' ')}…</p>}
            {renderJob && <p className="text-xs text-amber-300">Render en curso: {renderJob.status.replace('_', ' ')}…</p>}
            {modoPrivado && (
              <p className="text-[11px] text-rose-300">
                CARRIL PRIVADO: las piezas aprobadas se cifran al instante; solo se ven aquí y con sesión abierta.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Previews */}
      {loteId && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Vistas previas · lote {loteId.slice(-6)}</CardTitle>
              <p className="text-xs text-muted-foreground">Elige las que merecen render final. Rechazadas por QA no se pueden elegir.</p>
            </div>
            <Button size="sm" onClick={renderFinal} disabled={seleccion.size === 0 || Boolean(renderJob)}>
              Render final ({seleccion.size}) · {fmtDinero(costeRenders)} cr.
            </Button>
          </CardHeader>
          <CardContent>
            {(previews?.media ?? []).length === 0 ? (
              <Vacio icono="⏳" titulo="Generando vistas previas…" texto="Aparecen aquí conforme la cola las procesa." />
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-8">
                {(previews?.media ?? []).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => toggleSel(m)}
                    aria-pressed={seleccion.has(m.id)}
                    aria-label={`Preview ${m.id.slice(-5)} ${m.qualityVerdict}`}
                    className={`relative rounded-md border-2 overflow-hidden transition-all ${
                      seleccion.has(m.id) ? 'border-primary ring-2 ring-primary/40' : m.qualityVerdict === 'RECHAZADO' ? 'border-rose-500/40 opacity-50 cursor-not-allowed' : 'border-transparent hover:border-border'
                    }`}
                  >
                    <MediaImg media={m} size="thumb" mostrarPrivado={modoPrivado} />
                    <span className="absolute top-1 left-1"><VeredictoBadge veredicto={m.qualityVerdict} /></span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Finales */}
      {renderId && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Renders finales · lote {renderId.slice(-6)}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {modoPrivado ? 'Aprueba y cifra cada pieza; luego ármalas en un set desde la Biblioteca.' : 'Aprueba las piezas; luego ármalas en un set desde la Biblioteca.'}
            </p>
          </CardHeader>
          <CardContent>
            {(finales?.media ?? []).length === 0 ? (
              <Vacio icono="⏳" titulo="Renderizando…" texto="El render final es el caro: solo de las elegidas." />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {(finales?.media ?? []).map((m) => (
                  <div key={m.id} className="space-y-1.5">
                    <div className="relative">
                      <MediaImg media={m} size="thumb" mostrarPrivado={modoPrivado} />
                      <span className="absolute top-1 left-1"><VeredictoBadge veredicto={m.qualityVerdict} /></span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{fmtFecha(m.createdAt)}</p>
                    <div className="flex gap-1">
                      {m.qualityVerdict !== 'APROBADO' && (
                        <Button size="sm" variant="outline" className="h-7 flex-1 text-[10px]" onClick={() => accionMedia.mutate({ mediaId: m.id, accion: 'aprobar' })}>Aprobar</Button>
                      )}
                      {modoPrivado && m.lane === 'PRIVADO' && m.pipelineStatus !== 'cifrado' && (
                        <Button size="sm" variant="destructive" className="h-7 flex-1 text-[10px]" onClick={() => accionMedia.mutate({ mediaId: m.id, accion: 'cifrar' })}>Cifrar</Button>
                      )}
                      {m.pipelineStatus === 'cifrado' && <Badge variant="outline" className="text-[10px] border-rose-500/40 text-rose-300">🔒 cifrada</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!c && (
        <Vacio icono="🎬" titulo="Elige un personaje ACTIVO" texto="Los personajes se activan en el Genoma cuando aprueban el examen de identidad de 5 escenas." />
      )}

      {/* Gate del modo privado */}
      <Dialog open={gateAbierto} onOpenChange={setGateAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modo privado 18+ · control de acceso real</DialogTitle>
            <DialogDescription>
              {privado?.privadaDefinida
                ? 'Introduce la contraseña del carril privado. La sesión expira sola en minutos.'
                : 'Primera vez: define la contraseña del carril privado. Se guarda con hash y nunca en claro.'}
            </DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            placeholder="contraseña…"
            aria-label="Contraseña del modo privado"
            onKeyDown={(e) => e.key === 'Enter' && contrasena && desbloquear()}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setGateAbierto(false)}>Cancelar</Button>
            <Button onClick={desbloquear} disabled={!contrasena}>Desbloquear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

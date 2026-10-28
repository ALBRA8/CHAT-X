'use client'
// Genoma — asistente de 7 pasos para nacer una modelo virtual (ficha 4.2 y flujo A)
import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ArrowRight, Check, Dices, Lock, RefreshCw, Sparkles } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  api,
  useAccion,
  useCharacter,
  useCharacters,
  useJobs,
  useMedia,
  type CharacterT,
  type MediaT,
  type PresetT,
  type RasgoFirmante,
} from './api'
import { CaraCanonica, EstadoBadge, VeredictoBadge, Vacio, fmtDinero } from './ui-bits'

const PASOS = [
  'Audiencia y estilo',
  'Rasgo ancla',
  'Atributos y cara',
  'Aficiones y lore',
  'Kit firmante',
  'Dataset y LoRA',
  'Examen de identidad',
] as const

const OPCIONES = {
  pelo: ['negro', 'castaño', 'rubio', 'rosado', 'rojo', 'azul oscuro'],
  ojos: ['café', 'verdes', 'azules', 'miel', 'grises'],
  piel: ['clara', 'morena clara', 'morena', 'oscura'],
  complexion: ['delgada', 'atlética', 'curvilínea'],
  estilo: ['urbano', 'fitness', 'gamer', 'elegante', 'alternativo'],
} as const

type Atributos = { pelo: string; ojos: string; piel: string; complexion: string; estilo: string }
const ATRIB_VACIO: Atributos = { pelo: '', ojos: '', piel: '', complexion: '', estilo: '' }

// Mismas 5 escenas del examen (definidas con la ficha, paso 7)
const ESCENAS_EXAMEN: { nombre: string; escena: string; outfit: string; pose: string; encuadre: string; luz: string }[] = [
  { nombre: 'cafeteria_diurna', escena: 'tomando café en una cafetería luminosa', outfit: 'suéter holgado y jeans', pose: 'sentada mirando a cámara', encuadre: 'plano_medio', luz: 'natural de ventana' },
  { nombre: 'gimnasio', escena: 'entrenando en el gimnasio', outfit: 'top deportivo y leggings', pose: 'apoyada en barra', encuadre: 'plano_medio', luz: 'cálida interior' },
  { nombre: 'calle_nocturna', escena: 'caminando por una calle con luces de neón', outfit: 'chaqueta de cuero', pose: 'de pie, tres cuartos', encuadre: 'plano_medio', luz: 'neón nocturno' },
  { nombre: 'parque_atardecer', escena: 'sentada en el pasto de un parque', outfit: 'vestido ligero', pose: 'sonriendo al atardecer', encuadre: 'cuerpo_entero', luz: 'dorado de atardecer' },
  { nombre: 'estudio_estricto', escena: 'fondo liso de estudio fotográfico', outfit: 'camisa blanca', pose: 'retrato frontal serio', encuadre: 'primer_plano', luz: 'estudio' },
]

export default function GenomaView({ onActivada }: { onActivada: (c: CharacterT) => void }) {
  const { toast } = useToast()
  const { data: characters } = useCharacters()
  const [paso, setPaso] = useState(0)
  const [id, setId] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)
  const { data: detalle } = useCharacter(id)
  const c: CharacterT | undefined = detalle?.character

  // Campos del asistente
  const [name, setName] = useState('')
  const [audience, setAudience] = useState('')
  const [style, setStyle] = useState('')
  const [anchorTrait, setAnchorTrait] = useState('')
  const [attrs, setAttrs] = useState<Atributos>(ATRIB_VACIO)
  const [seed, setSeed] = useState('')
  const [variant, setVariant] = useState(0)
  const [aficiones, setAficiones] = useState('')
  const [lore, setLore] = useState('')
  const [tono, setTono] = useState('')
  const [kit, setKit] = useState<RasgoFirmante[]>([])
  const [objetivo, setObjetivo] = useState(40)

  const { data: jobs } = useJobs(false)
  const { data: examen } = useMedia(c ? { characterId: c.id, kind: 'examen' } : {})
  const jobsDeC = useMemo(() => (jobs ?? []).filter((j) => j.characterId === id), [jobs, id])
  const jobActivo = jobsDeC.find((j) => j.status === 'en_cola' || j.status === 'procesando')
  const jobDataset = jobsDeC.find((j) => j.type === 'dataset')
  const jobLora = jobsDeC.find((j) => j.type === 'entrenamiento')
  const examenes = examen?.media ?? []
  const aprobadas = examenes.filter((m) => m.qualityVerdict === 'APROBADO').length

  // Cargar un personaje existente para continuar
  useEffect(() => {
    if (!c) return
    setName((v) => v || c.name)
    setAudience(c.audience || '')
    setStyle(c.style || '')
    setAnchorTrait(c.anchorTrait || '')
    setSeed(c.seed || '')
    setAficiones(c.genome.aficiones || '')
    setLore(c.genome.lore || '')
    setTono(c.genome.tono || '')
    setKit(c.signKit ?? [])
    const a = c.genome.atributos ?? {}
    setAttrs((prev) => ({
      pelo: a.pelo || prev.pelo,
      ojos: a.ojos || prev.ojos,
      piel: a.piel || prev.piel,
      complexion: a.complexion || prev.complexion,
      estilo: a.estilo || prev.estilo,
    }))
  }, [c?.id])

  const patch = useAccion(
    (v: Record<string, unknown>) => api(`/api/characters/${id}`, { method: 'PATCH', body: JSON.stringify(v) }),
    ['characters', 'character'],
  )
  const lanzar = useAccion(
    (v: Record<string, unknown>) => api(`/api/characters/${id}/lanzamientos`, { method: 'POST', body: JSON.stringify(v) }),
    ['characters', 'character', 'jobs', 'media', 'kpi'],
  )
  const accionMedia = useAccion(
    (v: { mediaId: string; accion: string; motivo?: string }) =>
      api(`/api/media/${v.mediaId}`, { method: 'PATCH', body: JSON.stringify({ accion: v.accion, motivo: v.motivo }) }),
    ['media', 'compliance'],
  )
  const fijarCara = useAccion<void>(
    () => api(`/api/characters/${id}/canonical`, { method: 'POST', body: JSON.stringify({ variant }) }),
    ['characters', 'character'],
  )

  const crear = async () => {
    if (!name.trim()) {
      toast({ title: 'Falta el nombre de la modelo.', variant: 'destructive' })
      return
    }
    setCreando(true)
    try {
      const r = await api<{ character: CharacterT }>('/api/characters', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          audience,
          style,
          anchorTrait,
          seed: seed || undefined,
        }),
      })
      setId(r.character.id)
      setSeed(r.character.seed)
      toast({ title: `Personaje "${r.character.name}" creado (borrador).` })
      setPaso(1)
    } catch (e) {
      toast({ title: 'No se pudo crear', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setCreando(false)
    }
  }

  const guardarPaso = async (siguiente: number) => {
    if (!id) return
    try {
      await patch.mutateAsync({
        anchorTrait,
        atributos: attrs,
        aficiones,
        lore,
        tono,
        signKit: kit,
        seed: seed || undefined,
      })
      setPaso(siguiente)
    } catch (e) {
      toast({ title: 'No se pudo guardar', description: (e as Error).message, variant: 'destructive' })
    }
  }

  const continuarDesde1 = async () => {
    if (id) return guardarPaso(1)
    await crear()
  }

  const previewUrl = useMemo(() => {
    if (!id) return null
    const sp = new URLSearchParams({
      seed: seed || 'semilla',
      variant: String(variant),
      nombre: name || 'Personaje',
      attrs: JSON.stringify(attrs),
    })
    return `/api/render/cara?${sp.toString()}`
  }, [id, seed, variant, name, attrs])

  const regenerarExamen = async (escena: (typeof ESCENAS_EXAMEN)[number]) => {
    try {
      const r = await api<{ coste: number }>(`/api/characters/${id}/lanzamientos`, {
        method: 'POST',
        body: JSON.stringify({
          accion: 'examen',
          varianteBase: Math.floor(Math.random() * 9999),
          escenas: [{ nombre: escena.nombre, brief: { escena: escena.escena, outfit: escena.outfit, pose: escena.pose, encuadre: escena.encuadre, luz: escena.luz } }],
        }),
      })
      toast({ title: `Regenerando "${escena.nombre}"…`, description: `coste ${fmtDinero(r.coste)} cr.` })
    } catch (e) {
      toast({ title: 'No se pudo regenerar', description: (e as Error).message, variant: 'destructive' })
    }
  }

  const activar = async () => {
    try {
      await api(`/api/characters/${id}/lanzamientos`, { method: 'POST', body: JSON.stringify({ accion: 'activar' }) })
      toast({ title: '¡Personaje ACTIVO!', description: 'Ya puede producir en el Estudio.' })
      if (c) onActivada(c)
    } catch (e) {
      toast({ title: 'No se pudo activar', description: (e as Error).message, variant: 'destructive' })
    }
  }

  const continuarExistente = (val: string) => {
    const sel = characters?.find((x) => x.id === val)
    if (!sel) return
    setId(sel.id)
    setName('')
    setPaso(sel.status === 'ACTIVO' ? 6 : sel.status === 'ENTRENANDO' ? 6 : 1)
  }

  return (
    <div className="space-y-4">
      {/* Selector de continuación */}
      {characters && characters.length > 0 && (
        <Card>
          <CardContent className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Label className="text-xs text-muted-foreground sm:w-56 shrink-0">
              Continuar con un personaje existente
            </Label>
            <Select onValueChange={continuarExistente} value="">
              <SelectTrigger className="w-full sm:flex-1" aria-label="Elegir personaje para continuar">
                <SelectValue placeholder="— o crea una nueva con el asistente —" />
              </SelectTrigger>
              <SelectContent>
                {characters.map((x) => (
                  <SelectItem key={x.id} value={x.id}>
                    {x.name} · {x.status.toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Stepper */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Pasos del asistente">
        {PASOS.map((p, i) => {
          const activo = i === paso
          const hecho = i < paso
          return (
            <button
              key={p}
              role="tab"
              aria-selected={activo}
              disabled={!id && i > 0}
              onClick={() => id && setPaso(i)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] whitespace-nowrap transition-colors ${
                activo
                  ? 'border-primary/60 bg-primary/10 font-medium'
                  : hecho
                    ? 'border-emerald-500/40 text-emerald-300'
                    : 'border-border text-muted-foreground'
              } ${!id && i > 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              {hecho ? <Check className="h-3 w-3" aria-hidden /> : <span>{i + 1}</span>}
              {p}
            </button>
          )
        })}
      </div>

      {id && c && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CaraCanonica character={c} className="w-8 h-8" />
          <span className="font-medium text-foreground">{c.name}</span>
          <EstadoBadge estado={c.status} />
          {jobActivo ? <Badge variant="outline" className="text-[10px]">trabajo en curso…</Badge> : null}
        </div>
      )}

      {/* PASO 1 — audiencia y estilo */}
      {paso === 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Paso 1 · Audiencia y estilo</CardTitle>
            <p className="text-xs text-muted-foreground">
              La identidad se diseña hacia atrás: primero el público y su estética, después la persona.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="g-nombre">Nombre de la modelo</Label>
              <Input id="g-nombre" value={name} onChange={(e) => setName(e.target.value)} placeholder="p. ej. Valentina" disabled={Boolean(id)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-audiencia">Audiencia deseada</Label>
              <Textarea id="g-audiencia" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="p. ej. hombres 21–34 de LATAM que siguen fitness y anime" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-estilo">Estilo estético</Label>
              <Input id="g-estilo" value={style} onChange={(e) => setStyle(e.target.value)} placeholder="p. ej. lifestyle cálido, fotos tipo iPhone, luz natural" />
            </div>
            <Button onClick={continuarDesde1} disabled={creando || patch.isPending || (jobDataset?.status === 'procesando')}>
              {id ? 'Guardar y continuar' : 'Crear personaje y continuar'}
              <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* PASO 2 — rasgo ancla */}
      {paso === 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Paso 2 · Rasgo ancla visual</CardTitle>
            <p className="text-xs text-muted-foreground">
              UNA característica memorable que la gente reconozca al instante (p. ej. pelo rosado + pecas).
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={anchorTrait} onChange={(e) => setAnchorTrait(e.target.value)} placeholder="p. ej. pelo rosado con pecas" aria-label="Rasgo ancla visual" />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPaso(0)}>
                <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden /> Atrás
              </Button>
              <Button onClick={() => guardarPaso(2)}>Guardar y continuar <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PASO 3 — atributos y cara canónica */}
      {paso === 2 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Paso 3 · Atributos, semilla y cara canónica</CardTitle>
            <p className="text-xs text-muted-foreground">
              Cara generada por atributos con semilla propia — nunca rostros de personas reales. Regenera hasta que te guste y fíjala.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(Object.keys(OPCIONES) as (keyof typeof OPCIONES)[]).map((k) => (
                <div key={k} className="space-y-1.5">
                  <Label htmlFor={`g-${k}`} className="capitalize">{k}</Label>
                  <Select value={attrs[k]} onValueChange={(v) => setAttrs((a) => ({ ...a, [k]: v }))}>
                    <SelectTrigger id={`g-${k}`} aria-label={`Atributo ${k}`}>
                      <SelectValue placeholder="elegir…" />
                    </SelectTrigger>
                    <SelectContent>
                      {OPCIONES[k].map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
              <div className="space-y-1.5">
                <Label htmlFor="g-seed">Semilla (identidad)</Label>
                <div className="flex gap-1.5">
                  <Input id="g-seed" value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="seed_…" />
                  <Button variant="outline" size="icon" aria-label="Aleatorizar semilla" onClick={() => setSeed(`seed_${Date.now().toString(36)}`)}>
                    <Dices className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="w-40 shrink-0">
                {previewUrl ? (

                  <img src={previewUrl} alt={`Vista previa de cara, variante ${variant}`} className="rounded-md border border-border aspect-square w-full object-cover" />
                ) : (
                  <CaraCanonica character={c!} className="aspect-square w-full" />
                )}
                <div className="mt-2 flex gap-1.5">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setVariant((v) => v + 1)} aria-label="Regenerar variante">
                    <RefreshCw className="mr-1 h-3.5 w-3.5" aria-hidden /> Variante {variant}
                  </Button>
                </div>
              </div>
              <div className="flex-1 space-y-2 text-xs text-muted-foreground">
                <p>La vista previa es en vivo (no gasta créditos). Al fijarla, la cara queda guardada como canónica con su registro de procedencia.</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={async () => { await guardarPaso(2); fijarCara.mutate() }} disabled={fijarCara.isPending}>
                    <Lock className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Fijar cara canónica
                  </Button>
                  {c?.tieneCaraCanonica ? <Badge variant="outline" className="text-[11px] border-emerald-500/40 text-emerald-300">cara fijada (v{c.canonicalVariant})</Badge> : null}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setPaso(1)}><ArrowLeft className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Atrás</Button>
                  <Button size="sm" onClick={() => guardarPaso(3)}>Continuar <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden /></Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PASO 4 — aficiones y lore */}
      {paso === 3 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Paso 4 · Aficiones y lore</CardTitle>
            <p className="text-xs text-muted-foreground">
              Escríbelo con tus palabras: esto alimentará su personalidad (y el chat de la fase 2). 70% cotidianidad, 20% aspiracional, 10% drama.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="g-aficiones">2–3 aficiones concretas</Label>
              <Input id="g-aficiones" value={aficiones} onChange={(e) => setAficiones(e.target.value)} placeholder="p. ej. powerlifting, anime de los 90, café de especialidad" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-lore">Lore (historia del personaje)</Label>
              <Textarea id="g-lore" value={lore} onChange={(e) => setLore(e.target.value)} rows={4} placeholder="De dónde es, cómo vive, qué la mueve… con tus palabras." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-tono">Tono de personalidad</Label>
              <Input id="g-tono" value={tono} onChange={(e) => setTono(e.target.value)} placeholder="p. ej. cálida, juguetona, con humor seco; emojis moderados" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPaso(2)}><ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden /> Atrás</Button>
              <Button onClick={() => guardarPaso(4)}>Guardar y continuar <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PASO 5 — kit firmante */}
      {paso === 4 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Paso 5 · Kit de rasgos firmantes</CardTitle>
            <p className="text-xs text-muted-foreground">Tatuajes, piercings, lunares o pecas con ubicación exacta — se validan en cada QA de identidad.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {kit.map((r, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1.4fr_1fr_auto]">
                <Input aria-label="Tipo de rasgo" value={r.tipo} placeholder="tipo (tatuaje…)" onChange={(e) => setKit((k) => k.map((x, j) => (j === i ? { ...x, tipo: e.target.value } : x)))} />
                <Input aria-label="Descripción" value={r.descripcion} placeholder="descripción" onChange={(e) => setKit((k) => k.map((x, j) => (j === i ? { ...x, descripcion: e.target.value } : x)))} />
                <Input aria-label="Ubicación" value={r.ubicacion} placeholder="ubicación (antebrazo izq…)" onChange={(e) => setKit((k) => k.map((x, j) => (j === i ? { ...x, ubicacion: e.target.value } : x)))} />
                <Button variant="ghost" size="icon" aria-label={`Quitar rasgo ${i + 1}`} onClick={() => setKit((k) => k.filter((_, j) => j !== i))}>✕</Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setKit((k) => [...k, { tipo: '', descripcion: '', ubicacion: '' }])}>
              <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Añadir rasgo
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPaso(3)}><ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden /> Atrás</Button>
              <Button onClick={() => guardarPaso(5)}>Guardar y continuar <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PASO 6 — dataset y LoRA */}
      {paso === 5 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Paso 6 · Dataset y entrenamiento LoRA</CardTitle>
            <p className="text-xs text-muted-foreground">
              30–50 fotos del personaje (identidad desde varios ángulos). Después se entrena su LoRA: la identidad se garantiza con entrenamiento, no con semillas fijas.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="g-objetivo">Fotos del dataset</Label>
                <Input id="g-objetivo" type="number" min={30} max={50} value={objetivo} onChange={(e) => setObjetivo(Number(e.target.value))} className="w-28" />
              </div>
              <Button
                onClick={() => lanzar.mutate({ accion: 'dataset', objetivo })}
                disabled={Boolean(jobActivo)}
              >
                Generar dataset · {fmtDinero(objetivo * 1.5)} cr.
              </Button>
              <Button
                variant="secondary"
                onClick={() => lanzar.mutate({ accion: 'entrenamiento', nota: 'entrenamiento inicial desde el asistente Genoma' })}
                disabled={Boolean(jobActivo) || (c?.datasetCount ?? 0) < 30 || Boolean(c?.loraHash)}
              >
                Entrenar LoRA · 240 cr.
              </Button>
            </div>
            {jobDataset && <JobLine label="dataset" jobId={jobDataset.id} />}
            {jobLora && <JobLine label="entrenamiento LoRA" jobId={jobLora.id} />}
            <p className="text-xs">
              Dataset actual: <span className="font-medium">{c?.datasetCount ?? 0}/{objetivo}</span> · LoRA: {c?.loraHash ? <span className="text-emerald-300">{c.loraHash.slice(0, 16)}…</span> : 'sin entrenar'}
            </p>
            {detalle && detalle.loraVersions.length > 0 && (
              <div className="text-[11px] text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Historial de versiones</p>
                {detalle.loraVersions.map((l) => (
                  <p key={l.id}>· {l.hash.slice(0, 18)}… — {l.note}</p>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPaso(4)}><ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden /> Atrás</Button>
              <Button disabled={!c?.loraHash} onClick={() => guardarPaso(6)}>Ir al examen <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PASO 7 — examen de identidad */}
      {paso === 6 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Paso 7 · Examen de identidad (5 escenas)</CardTitle>
            <p className="text-xs text-muted-foreground">
              Nada sale al mundo sin este examen: 5 escenas distintas. Aprueba o reprueba cada una; con 5 aprobadas el personaje se vuelve ACTIVO.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => lanzar.mutate({ accion: 'examen' })} disabled={Boolean(jobActivo) || !c?.loraHash}>
              Lanzar examen · 75 cr.
            </Button>
            {examenes.length === 0 ? (
              <Vacio icono="🧪" titulo="Sin examen lanzado" texto="Lanza el examen para generar las 5 escenas de identidad." />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {ESCENAS_EXAMEN.map((esc) => {
                  const piezas = examenes.filter((m) => m.sceneName === esc.nombre)
                  const ultima = piezas[0]
                  return (
                    <div key={esc.nombre} className="space-y-1.5">
                      {ultima ? <PiezaExamen m={ultima} onAprobar={() => accionMedia.mutate({ mediaId: ultima.id, accion: 'aprobar_examen' })} onReprobar={() => accionMedia.mutate({ mediaId: ultima.id, accion: 'rechazar_examen', motivo: 'Reprobada por el operador' })} onRegenerar={() => regenerarExamen(esc)} /> : (
                        <div className="aspect-square rounded-md border border-dashed border-border" />
                      )}
                      <p className="text-[10px] text-muted-foreground text-center">{esc.nombre.replace(/_/g, ' ')}</p>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm">Aprobadas: <span className="font-semibold">{aprobadas}/5</span></p>
              <Progress value={(aprobadas / 5) * 100} className="h-1.5 w-32" />
              <Button variant="ghost" onClick={() => setPaso(5)}><ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden /> Atrás</Button>
              <Button className="ml-auto" disabled={aprobadas < 5 || c?.status === 'ACTIVO'} onClick={activar}>
                Activar personaje
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function JobLine({ label, jobId }: { label: string; jobId: string }) {
  const { data: jobs } = useJobs(false)
  const j = (jobs ?? []).find((x) => x.id === jobId)
  if (!j) return null
  return (
    <div className="rounded-lg border border-border p-3 text-xs">
      <div className="flex items-center gap-2">
        <span className="font-medium capitalize">{label}</span>
        <span className="text-muted-foreground">{j.status.replace('_', ' ')} · {Math.round(j.costReal || j.costEstimate)} cr.</span>
      </div>
      {(j.status === 'procesando' || j.status === 'en_cola') && <Progress value={j.progress} className="mt-2 h-1.5" />}
      {j.error ? <p className="mt-1 text-rose-300">{j.error}</p> : null}
    </div>
  )
}

function PiezaExamen({
  m,
  onAprobar,
  onReprobar,
  onRegenerar,
}: {
  m: MediaT
  onAprobar: () => void
  onReprobar: () => void
  onRegenerar: () => void
}) {
  return (
    <div className="rounded-md border border-border overflow-hidden">
      { }
      <img src={`/api/media/${m.id}/archivo?tipo=thumb`} alt={`Examen ${m.sceneName}`} className="aspect-square w-full object-cover" loading="lazy" />
      <div className="p-2 space-y-1.5">
        <VeredictoBadge veredicto={m.qualityVerdict} />
        <div className="flex gap-1">
          {m.qualityVerdict !== 'APROBADO' && (
            <Button size="sm" variant="outline" className="h-7 flex-1 text-[10px]" onClick={onAprobar}>Aprobar</Button>
          )}
          {m.qualityVerdict !== 'RECHAZADO' && (
            <Button size="sm" variant="ghost" className="h-7 flex-1 text-[10px]" onClick={onReprobar}>Reprobar</Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={onRegenerar} aria-label="Regenerar escena">↻</Button>
        </div>
      </div>
    </div>
  )
}

'use client'
// Panel de Configuración — el lugar ÚNICO para conectar APIs y parámetros con un click.
// Principios (constitución): estado HONESTO (sondas reales, nunca promesas de landing),
// secretos nunca se muestran completos ni salen de la BD local (db/ fuera de git), la
// fuente de cada valor se declara (panel > .env > defecto) y todo cambio queda en el
// log de compliance. Guardar = verificar al tiro: tras cada guardado se re-sondea.
import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  CircleDashed,
  CircleSlash,
  Clapperboard,
  Image as ImageIcon,
  KeyRound,
  Plug,
  RefreshCw,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Volume2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtFecha } from '@/components/estudio/ui-bits'
import {
  useConfiguracion,
  useGuardarConfiguracion,
  useMotores,
  useRestaurarConfiguracion,
  useSondasConfiguracion,
  type EntradaConfigT,
  type FuenteConfigT,
} from './api'
import { FormularioConexion, EstadoPill } from './bits'

type CategoriaId = 'llm' | 'voz' | 'media' | 'general'

const CATEGORIAS: { id: CategoriaId; titulo: string; desc: string; Icono: typeof Bot }[] = [
  {
    id: 'llm',
    titulo: 'Cerebro del chat (LLM)',
    desc: 'La API OpenAI-compatible que piensa los mensajes del Modo Novia: NIM, Groq, OpenRouter… cambia de proveedor sin tocar código.',
    Icono: Bot,
  },
  {
    id: 'voz',
    titulo: 'Voz local (TTS $0)',
    desc: 'espeak-ng (robótico) y piper (natural) corren en esta máquina. Aquí van sus rutas; la sonda verifica binario Y modelo.',
    Icono: Volume2,
  },
  {
    id: 'media',
    titulo: 'Imagen y vídeo (proveedor del Estudio)',
    desc: 'Simulador de desarrollo, difusión real en CPU o ComfyUI con GPU. Cambiar el proveedor aplica al instante para los próximos trabajos.',
    Icono: ImageIcon,
  },
  {
    id: 'general',
    titulo: 'General',
    desc: 'Marca blanca de la superficie y feeds RSS del radar de tendencias (sindicación declarada, sin scraping).',
    Icono: SlidersHorizontal,
  },
]

const CHIP_FUENTE: Record<FuenteConfigT, { texto: string; clase: string }> = {
  bd: { texto: 'panel', clase: 'border-violet-500/40 text-violet-300' },
  env: { texto: '.env', clase: 'border-amber-500/40 text-amber-300' },
  defecto: { texto: 'defecto', clase: 'border-zinc-500/40 text-zinc-400' },
}

const CHIP_ESTADO: Record<string, { texto: string; clase: string; Icono: typeof CheckCircle2 }> = {
  OPERATIVO: { texto: 'Operativo', Icono: CheckCircle2, clase: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  NO_CONFIGURADO: { texto: 'Sin configurar', Icono: CircleDashed, clase: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' },
  NO_DISPONIBLE: { texto: 'No disponible', Icono: CircleSlash, clase: 'bg-rose-500/10 text-rose-300/90 border-rose-500/25' },
  NO_AUTORIZADO: { texto: 'Requiere atención', Icono: AlertTriangle, clase: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  ERROR: { texto: 'Error', Icono: AlertTriangle, clase: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
}

function ChipEstado({ estado }: { estado: string }) {
  const p = CHIP_ESTADO[estado] ?? CHIP_ESTADO.ERROR
  return (
    <Badge variant="outline" className={cn('gap-1 text-[11px]', p.clase)}>
      <p.Icono className="h-3 w-3 shrink-0" aria-hidden />
      {p.texto}
    </Badge>
  )
}

function ChipFuente({ fuente }: { fuente: FuenteConfigT }) {
  const p = CHIP_FUENTE[fuente]
  return (
    <Badge variant="outline" className={cn('h-4.5 px-1.5 text-[9px]', p.clase)} title={fuente === 'bd' ? 'guardado desde este panel' : fuente === 'env' ? 'viene del .env del operador' : 'valor por defecto del código'}>
      {p.texto}
    </Badge>
  )
}

function CampoConfig({
  entrada,
  valor,
  alCambiar,
  alRestaurar,
  restaurando,
}: {
  entrada: EntradaConfigT
  valor: string
  alCambiar: (v: string) => void
  alRestaurar: () => void
  restaurando: boolean
}) {
  const esSecreto = entrada.tipo === 'secreto'
  return (
    <div className="space-y-1.5">
      <div className="flex min-h-6 items-center justify-between gap-2">
        <Label htmlFor={`cfg-${entrada.clave}`} className="text-xs font-medium">
          {entrada.etiqueta}
        </Label>
        <div className="flex shrink-0 items-center gap-1">
          <ChipFuente fuente={entrada.fuente} />
          {entrada.fuente === 'bd' ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-1.5 text-[10px] text-muted-foreground"
              onClick={alRestaurar}
              disabled={restaurando}
              title="Borra el valor guardado en el panel: vuelve a mandar la variable de entorno o el defecto"
            >
              <RotateCcw className="h-3 w-3" aria-hidden />
              Restaurar
            </Button>
          ) : null}
        </div>
      </div>
      <Input
        id={`cfg-${entrada.clave}`}
        type={esSecreto ? 'password' : 'text'}
        inputMode={entrada.tipo === 'numero' ? 'numeric' : undefined}
        autoComplete="off"
        value={valor}
        onChange={(e) => alCambiar(e.target.value)}
        placeholder={esSecreto ? (entrada.definido ? `guardada (${entrada.valor})` : 'sin definir') : entrada.valor || 'sin definir'}
        className="h-8 text-xs"
      />
      <p className="text-[10px] leading-relaxed text-muted-foreground">{entrada.descripcion}</p>
      <p className="text-[10px] text-muted-foreground/70">
        respaldo: <code className="text-[10px]">{entrada.envVar}</code>
        {esSecreto && entrada.definido ? ' · déjalo vacío para conservar la actual' : ''}
        {entrada.actualizadoEn ? ` · guardado ${fmtFecha(entrada.actualizadoEn)}` : ''}
      </p>
    </div>
  )
}

function FilaSonda({
  titulo,
  detalle,
  estado,
  extra,
}: {
  titulo: string
  detalle?: string
  estado?: string
  extra?: string
}) {
  return (
    <div className="rounded-md border border-border/60 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium">{titulo}</p>
        {estado ? <ChipEstado estado={estado} /> : <Badge variant="outline" className="gap-1 text-[11px]"><CircleDashed className="h-3 w-3" aria-hidden />sondeando…</Badge>}
      </div>
      {detalle ? <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{detalle}</p> : null}
      {extra ? <p className="mt-0.5 text-[10px] text-muted-foreground/70">{extra}</p> : null}
    </div>
  )
}

export default function ConfiguracionView() {
  const { toast } = useToast()
  const config = useConfiguracion()
  const motores = useMotores()
  const sondas = useSondasConfiguracion()
  const guardarMut = useGuardarConfiguracion()
  const restaurarMut = useRestaurarConfiguracion()

  // borrador: solo las claves que el operador tocó (vacío = sin cambio; en secretos
  // vacío significa «conservar la actual» — el borrado es explícito con Restaurar).
  const [borrador, setBorrador] = useState<Record<string, string>>({})

  const porCategoria = useMemo(() => {
    const mapa = new Map<CategoriaId, EntradaConfigT[]>()
    for (const c of CATEGORIAS) mapa.set(c.id, [])
    for (const e of config.data?.entradas ?? []) {
      mapa.get(e.categoria)?.push(e)
    }
    return mapa
  }, [config.data])

  const guardar = async (categoria: CategoriaId) => {
    const claves = (porCategoria.get(categoria) ?? []).filter((e) => borrador[e.clave] !== undefined)
    if (!claves.length) {
      toast({ title: 'Sin cambios en esta sección' })
      return
    }
    try {
      const r = await guardarMut.mutateAsync(claves.map((e) => ({ clave: e.clave, valor: borrador[e.clave] ?? '' })))
      setBorrador((b) => {
        const nb = { ...b }
        for (const c of r.claves) delete nb[c]
        return nb
      })
      toast({ title: `Guardado: ${r.claves.length} valor(es)`, description: 'Aplicado al instante; verificando sondas…' })
      void sondas.refetch()
    } catch (e) {
      toast({ title: 'No se pudo guardar', description: e instanceof Error ? e.message : 'Error desconocido', variant: 'destructive' })
    }
  }

  const restaurar = async (entrada: EntradaConfigT) => {
    try {
      await restaurarMut.mutateAsync(entrada.clave)
      toast({ title: `${entrada.etiqueta}: restaurada`, description: 'Vuelve a mandar la variable de entorno o el defecto del código.' })
    } catch (e) {
      toast({ title: 'No se pudo restaurar', description: e instanceof Error ? e.message : 'Error desconocido', variant: 'destructive' })
    }
  }

  const resumen = config.data?.resumen
  const setBorradorValor = (clave: string, valor: string) => setBorrador((b) => ({ ...b, [clave]: valor }))

  return (
    <div className="space-y-5">
      {/* Estado honesto de todas las APIs — sondeado de verdad, no decorativo */}
      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Plug className="h-4 w-4" aria-hidden />
                Estado de las APIs — comprobado ahora
              </CardTitle>
              <CardDescription className="mt-1 text-xs leading-relaxed">
                Sondeos reales contra cada proveedor con la configuración vigente (panel → .env → defecto).
                {resumen ? ` ${resumen.desdePanel} valor(es) guardados desde este panel · ${resumen.desdeEnv} vienen del .env.` : ''}
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-[11px]" onClick={() => void sondas.refetch()} disabled={sondas.isFetching}>
              {sondas.isFetching ? <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden />}
              Probar todo ahora
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          <FilaSonda
            titulo="Cerebro LLM (chat Modo Novia)"
            estado={sondas.data?.llm?.estado}
            detalle={sondas.data?.llm?.detalle}
            extra={sondas.data?.llm ? `${sondas.data.llm.provedor} · ${sondas.data.llm.modelo} · ${sondas.data.llm.base}` : undefined}
          />
          <FilaSonda
            titulo="Voz local (TTS)"
            estado={sondas.data?.voz ? (sondas.data.voz.some((v) => v.estado === 'OPERATIVO') ? 'OPERATIVO' : 'NO_DISPONIBLE') : undefined}
            detalle={sondas.data?.voz?.map((v) => `${v.provedor}: ${v.estado} — ${v.detalle}`).join(' · ')}
          />
          <FilaSonda
            titulo={`Imagen del Estudio (${sondas.data?.imagen?.provedor ?? 'proveedor'})`}
            estado={sondas.data?.imagen?.estado}
            detalle={sondas.data?.imagen?.detalle}
          />
          <FilaSonda titulo="Vídeo (GPU/motor)" estado={sondas.data?.video?.estado} detalle={sondas.data?.video?.detalle} extra={sondas.data?.video?.comoActivar} />
        </CardContent>
      </Card>

      {/* Secciones de configuración por categoría */}
      {CATEGORIAS.map((cat) => {
        const entradas = porCategoria.get(cat.id) ?? []
        if (!entradas.length) return null
        const tocadas = entradas.filter((e) => borrador[e.clave] !== undefined).length
        return (
          <Card key={cat.id} className="border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <cat.Icono className="h-4 w-4" aria-hidden />
                {cat.titulo}
              </CardTitle>
              <CardDescription className="text-xs leading-relaxed">{cat.desc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {entradas.map((e) => {
                  if (e.clave === 'media.proveedor') {
                    // El proveedor de imagen es un selector cerrado: las opciones son
                    // exactamente las tres implementadas (nada de valores fantasma).
                    const actual = borrador[e.clave] ?? (e.valor || 'simulador')
                    return (
                      <div key={e.clave} className="space-y-1.5">
                        <div className="flex min-h-6 items-center justify-between gap-2">
                          <Label htmlFor="cfg-media.proveedor" className="text-xs font-medium">{e.etiqueta}</Label>
                          <div className="flex items-center gap-1">
                            <ChipFuente fuente={e.fuente} />
                            {e.fuente === 'bd' ? (
                              <Button variant="ghost" size="sm" className="h-6 gap-1 px-1.5 text-[10px] text-muted-foreground" onClick={() => void restaurar(e)} disabled={restaurarMut.isPending}>
                                <RotateCcw className="h-3 w-3" aria-hidden /> Restaurar
                              </Button>
                            ) : null}
                          </div>
                        </div>
                        <select
                          id="cfg-media.proveedor"
                          value={actual}
                          onChange={(ev) => setBorradorValor(e.clave, ev.target.value)}
                          className="h-8 w-full rounded-md border border-border bg-transparent px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="simulador">simulador — desarrollo, $0 (SVG determinista)</option>
                          <option value="local-cpu">local-cpu — difusión real en CPU (86 s/imagen)</option>
                          <option value="comfyui">comfyui — GPU real vía HTTP</option>
                        </select>
                        <p className="text-[10px] leading-relaxed text-muted-foreground">{e.descripcion}</p>
                        <p className="text-[10px] text-muted-foreground/70">respaldo: <code className="text-[10px]">{e.envVar}</code></p>
                      </div>
                    )
                  }
                  return (
                    <CampoConfig
                      key={e.clave}
                      entrada={e}
                      valor={borrador[e.clave] ?? ''}
                      alCambiar={(v) => setBorradorValor(e.clave, v)}
                      alRestaurar={() => void restaurar(e)}
                      restaurando={restaurarMut.isPending}
                    />
                  )
                })}
              </div>
              <div className="flex items-center gap-3 border-t border-border/60 pt-3">
                <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => void guardar(cat.id)} disabled={guardarMut.isPending}>
                  <Save className="h-3.5 w-3.5" aria-hidden />
                  {guardarMut.isPending ? 'Guardando…' : `Guardar${tocadas ? ` (${tocadas} cambio${tocadas === 1 ? '' : 's'})` : ''}`}
                </Button>
                <p className="text-[10px] text-muted-foreground">
                  Un click guarda y verifica al tiro. Cada cambio queda registrado en el log de compliance.
                </p>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Motores del ecosistema: conexión URL + credencial en un click (misma BD que Ops) */}
      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <KeyRound className="h-4 w-4" aria-hidden />
            Motores del ecosistema
          </CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            CHAT-X los opera como host central: apunta dónde corre cada uno (URL + credencial si la pide). Es la misma configuración que ves en Operaciones.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {(motores.data?.motores ?? []).map((m) => {
            const est = motores.data?.estados.find((x) => x.motor === m.id)
            return (
              <div key={m.id} className="flex flex-col gap-2 rounded-md border border-border/60 p-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium">{m.nombre}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {est?.config.configurada ? `configurado ${fmtFecha(est.config.actualizadoEn)} · ${est.config.url}` : `por defecto: ${m.urlPorDefecto}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {est ? <EstadoPill estado={est.estado.estado} latenciaMs={est.estado.latenciaMs} /> : null}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 text-[11px]">
                        Conectar
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="text-sm">Conectar {m.nombre}</DialogTitle>
                      </DialogHeader>
                      <FormularioConexion motor={m} estado={est} onGuardado={() => void motores.refetch()} />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            )
          })}
          {motores.isLoading ? <p className="text-[11px] text-muted-foreground">comprobando motores…</p> : null}
        </CardContent>
      </Card>

      {/* Nota honesta de seguridad */}
      <Card className="border-border/70 bg-card/50">
        <CardContent className="flex items-start gap-2 p-3 text-[11px] leading-relaxed text-muted-foreground">
          <Clapperboard className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <p>
            Las credenciales viven solo en la base de datos local (<code>db/</code>, fuera de git) o en tu <code>.env</code>; el panel las muestra enmascaradas y jamás las devuelve completas. Para el video con GPU real y canales de cobro externos, los bloqueos siguen declarados en Operaciones — este panel no los inventa.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

'use client'
// Vista Mesa Meta — F4 (CASA PROPIA): FB/IG MANUAL-FIRST. La automatización en
// Meta es ToS-violadora y no se construye: el operador pega a mano el mensaje
// que llegó por Facebook/Instagram, el CEREBRO escribe el borrador (mismos
// filtros de edad que /api/chat) y el operador lo envía MANUALMENTE desde la
// propia app de Meta. Cada paso queda en compliance append-only.
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle2, CircleDashed, Copy, Hand, RefreshCw, Send, ShieldAlert, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtFecha } from '@/components/estudio/ui-bits'
import { useCharacters } from '@/components/estudio/api'
import { useAccionMesaMeta, useMesaMeta } from './api'

const ESTADO_BORRADOR: Record<string, { texto: string; clase: string }> = {
  borrador: { texto: 'borrador listo', clase: 'text-amber-300 border-amber-500/30 bg-amber-500/10' },
  usado: { texto: 'usado (envío manual)', clase: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' },
  descartado: { texto: 'descartado', clase: 'text-zinc-300 border-zinc-500/30 bg-zinc-500/10' },
}

export default function MesaMetaView() {
  const { data: mesa, isLoading, refetch } = useMesaMeta()
  const { data: personajes } = useCharacters()
  const { toast } = useToast()
  const accion = useAccionMesaMeta()

  const [red, setRed] = useState<string>('facebook')
  const [contacto, setContacto] = useState('')
  const [texto, setTexto] = useState('')
  const [personajeId, setPersonajeId] = useState('')

  const pedirBorrador = () => {
    if (!texto.trim()) {
      toast({ title: 'Falta el mensaje', description: 'Pega a mano el texto que llegó por FB/IG.', variant: 'destructive' })
      return
    }
    if (!personajeId) {
      toast({ title: 'Falta el personaje', description: 'El borrador lo escribe el cerebro de UN personaje concreto.', variant: 'destructive' })
      return
    }
    accion.mutate(
      { accion: 'borrar', red, contacto: contacto.trim() || undefined, texto: texto.trim(), personajeId },
      {
        onSuccess: (r) => {
          if (r.estado === 'bloqueado_filtro') {
            toast({ title: 'Entrada bloqueada por el filtro de edad', description: r.motivo, variant: 'destructive' })
          } else {
            toast({ title: 'Borrador listo', description: r.motivo })
            setTexto('')
          }
        },
        onError: (e) => toast({ title: 'No se pudo', description: e instanceof Error ? e.message : 'Error desconocido', variant: 'destructive' }),
      },
    )
  }

  const marcar = (id: string, accionTipo: 'usar' | 'descartar') => {
    accion.mutate(
      { accion: accionTipo, id },
      {
        onSuccess: (r) => toast({ title: accionTipo === 'usar' ? 'Registrado como usado' : 'Descartado', description: r.motivo }),
        onError: (e) => toast({ title: 'No se pudo', description: e instanceof Error ? e.message : 'Error desconocido', variant: 'destructive' }),
      },
    )
  }

  const copiar = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto)
      toast({ title: 'Copiado', description: 'Pégalo y envíalo A MANO desde la app de Meta.' })
    } catch {
      toast({ title: 'No se pudo copiar', description: 'Copia el texto a mano de la tarjeta.', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      {/* Aviso constitucional del cuarto */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1 border-amber-500/40 text-[11px] text-amber-300">
              <Hand className="h-3 w-3 shrink-0" aria-hidden />
              manual-first
            </Badge>
            <Button variant="ghost" size="sm" className="ml-auto h-7 px-2" onClick={() => void refetch()}>
              <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} aria-hidden />
              <span className="sr-only">Refrescar</span>
            </Button>
          </div>
          <CardTitle className="text-base">Mesa Meta — Facebook e Instagram</CardTitle>
          <CardDescription>{mesa?.honesto ?? 'CHAT-X NO se conecta a Meta y NO envía nada: pegar → borrador del cerebro → envío manual por ti.'}</CardDescription>
        </CardHeader>
      </Card>

      {/* Nueva entrada pegada a mano */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Mensaje que llegó (pegar a mano)</CardTitle>
          <CardDescription>El contacto es una etiqueta tuya (manual-first, sin scraping ni sincronización de cuentas). Máx {mesa?.topes.textoEntrada ?? 600} caracteres.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-[auto_1fr_1fr] sm:items-end">
            <div className="space-y-1">
              <Label htmlFor="mesa-red" className="text-xs">Red</Label>
              <Select value={red} onValueChange={setRed}>
                <SelectTrigger id="mesa-red" className="h-8 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(mesa?.topes.redes ?? ['facebook', 'instagram']).map((r) => (
                    <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="mesa-contacto" className="text-xs">Etiqueta del contacto (opcional)</Label>
              <Input id="mesa-contacto" placeholder="ej. María G. (anuncio L3)" value={contacto} onChange={(e) => setContacto(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mesa-personaje" className="text-xs">Personaje que responde</Label>
              <Select value={personajeId} onValueChange={setPersonajeId}>
                <SelectTrigger id="mesa-personaje" className="h-8 text-xs">
                  <SelectValue placeholder="elige el genoma" />
                </SelectTrigger>
                <SelectContent>
                  {(personajes ?? []).map((p: { id: string; name: string; status: string }) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.name} {p.status !== 'ACTIVO' ? `(${p.status})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="mesa-texto" className="text-xs">Texto del mensaje entrante</Label>
            <Textarea id="mesa-texto" placeholder="Pega aquí el mensaje que te llegó por Facebook/Instagram…" value={texto} onChange={(e) => setTexto(e.target.value)} className="min-h-20 text-xs" />
          </div>
          <Button size="sm" disabled={accion.isPending} onClick={pedirBorrador}>
            <Send className="h-3.5 w-3.5" aria-hidden /> Pedir borrador al cerebro
          </Button>
        </CardContent>
      </Card>

      {/* Borradores */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Borradores ({mesa?.pendientes ?? 0} pendientes)</CardTitle>
          <CardDescription>El QUÉ lo escribió el cerebro (plantilla del genoma o LLM declarado). Lo usado/descartado es historia: no se re-estructura.</CardDescription>
        </CardHeader>
        <CardContent>
          {mesa?.borradores.length ? (
            <div className="space-y-2.5">
              {mesa.borradores.map((b) => {
                const em = ESTADO_BORRADOR[b.estado]
                return (
                  <div key={b.id} className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={cn('shrink-0 text-[10px]', em?.clase)}>{em?.texto ?? b.estado}</Badge>
                      <Badge variant="outline" className="shrink-0 text-[10px]">{b.red}</Badge>
                      {b.bloqueadoFiltro ? (
                        <Badge variant="outline" className="gap-1 border-rose-500/40 text-[10px] text-rose-300">
                          <ShieldAlert className="h-3 w-3" aria-hidden /> filtro de edad
                        </Badge>
                      ) : null}
                      <span className="font-medium">{b.contacto}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">{fmtFecha(b.createdAt)}</span>
                    </div>
                    <p className="mt-1.5 text-muted-foreground">
                      <span className="text-[10px] uppercase">entró:</span> {b.textoEntrada || '(vacío)'}
                    </p>
                    {b.borrador ? (
                      <div className="mt-1.5 rounded-md border border-border bg-background/60 px-2.5 py-2">
                        <p className="whitespace-pre-wrap">{b.borrador}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">modo: {b.modo}{b.llmEstado ? ` · llm: ${b.llmEstado}` : ''}</p>
                      </div>
                    ) : b.bloqueadoFiltro ? (
                      <p className="mt-1.5 text-rose-300">Sin borrador: la entrada activó el filtro de edad — solo cabe descartarla (revisión humana).</p>
                    ) : (
                      <p className="mt-1.5 text-muted-foreground">({b.llmEstado ? `cerebro: ${b.llmEstado}` : 'sin borrador'})</p>
                    )}
                    {b.estado === 'borrador' && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {b.borrador && !b.bloqueadoFiltro && (
                          <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => void copiar(b.borrador)}>
                            <Copy className="h-3 w-3" aria-hidden /> Copiar y enviar a mano
                          </Button>
                        )}
                        {b.borrador && !b.bloqueadoFiltro && (
                          <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] text-emerald-300" disabled={accion.isPending} onClick={() => marcar(b.id, 'usar')}>
                            <CheckCircle2 className="h-3 w-3" aria-hidden /> Ya lo envié (usar)
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] text-rose-300" disabled={accion.isPending} onClick={() => marcar(b.id, 'descartar')}>
                          <Trash2 className="h-3 w-3" aria-hidden /> Descartar
                        </Button>
                      </div>
                    )}
                    {b.resueltoEn && <p className="mt-1.5 text-[10px] text-muted-foreground">resuelto: {fmtFecha(b.resueltoEn)}</p>}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-[11px] text-muted-foreground">
              Sin borradores todavía: pega el primer mensaje que llegó por FB/IG y el cerebro redacta la respuesta SFW.
            </p>
          )}
          <p className="mt-3 flex items-start gap-1 text-[10px] text-muted-foreground">
            <X className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
            Meta banea adulto Y automatización ToS-violadora: esta mesa calienta SFW con borradores humanos — jamás bots, jamás envíos automáticos, jamás scraping.
          </p>
          {!mesa?.pendientes && !mesa?.borradores.length && (
            <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
              <CircleDashed className="h-3 w-3" aria-hidden /> la mesa está limpia y esperando la primera entrada
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

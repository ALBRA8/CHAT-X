'use client'
// Vista Cuarto Telegram — F3 (CASA PROPIA): el canal Telegram PROPIO del
// negocio visto desde el panel. Honestidad ante todo: el estado del bot es el
// REAL (CONECTADA solo tras la identidad pública presentada por el daemon
// firmado en tu máquina — el TOKEN jamás viaja a CHAT-X), el pulso es una
// señal viva (tibio = el daemon puede estar caído) y los chatId SIEMPRE
// enmascarados. Mismo cerebro, pacing y filtro de edad que WhatsApp.
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  Flame,
  Link2,
  RefreshCw,
  Send,
  Thermometer,
  Unplug,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtFecha } from '@/components/estudio/ui-bits'
import {
  useAccionSesionTelegram,
  useCanalTelegram,
  useCancelarIniciativaTelegram,
  useIniciativasTelegram,
  useProgramarIniciativaTelegram,
  useSesionTelegram,
} from './api'

const ESTADO_SESION: Record<string, { texto: string; clase: string; Icono: typeof CheckCircle2 }> = {
  CONECTADA: { texto: 'Bot conectado', Icono: CheckCircle2, clase: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  DESCONECTADA: { texto: 'Desconectado', Icono: Unplug, clase: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' },
  NO_CONFIGURADO: { texto: 'Sin configurar', Icono: CircleDashed, clase: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' },
}

const PULSO: Record<string, { texto: string; clase: string; Icono: typeof Activity }> = {
  vivo: { texto: 'pulso vivo', Icono: Activity, clase: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' },
  tibio: { texto: 'pulso tibio (¿daemon caído?)', Icono: AlertTriangle, clase: 'text-amber-300 border-amber-500/30 bg-amber-500/10' },
  sin_pulso: { texto: 'sin pulso registrado', Icono: Activity, clase: 'text-muted-foreground border-border bg-muted/40' },
}

const ESTADO_MSG: Record<string, { texto: string; clase: string }> = {
  programada: { texto: 'programada', clase: 'text-sky-300 border-sky-500/30 bg-sky-500/10' },
  en_cola: { texto: 'en cola', clase: 'text-amber-300 border-amber-500/30 bg-amber-500/10' },
  enviado: { texto: 'enviado', clase: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' },
  fallado: { texto: 'fallado', clase: 'text-rose-300 border-rose-500/30 bg-rose-500/10' },
  bloqueado_pacing: { texto: 'pacing', clase: 'text-zinc-300 border-zinc-500/30 bg-zinc-500/10' },
  recibido: { texto: 'recibido', clase: 'text-muted-foreground border-border bg-muted/40' },
}

function Counter({ etiqueta, valor, tono }: { etiqueta: string; valor: number; tono?: string }) {
  return (
    <div className={cn('rounded-lg border border-border bg-muted/30 px-3 py-2 text-center', tono)}>
      <p className={cn('text-lg font-bold tabular-nums', tono)}>{valor}</p>
      <p className="text-[10px] leading-tight text-muted-foreground">{etiqueta}</p>
    </div>
  )
}

export default function CanalTelegramView() {
  const { data: canal, isLoading, refetch } = useCanalTelegram()
  const { data: sesion } = useSesionTelegram()
  const { data: iniciativas } = useIniciativasTelegram()
  const { toast } = useToast()
  const accionSesion = useAccionSesionTelegram()
  const programar = useProgramarIniciativaTelegram()
  const cancelar = useCancelarIniciativaTelegram()

  const [chatId, setChatId] = useState('')
  const [cuando, setCuando] = useState('')
  const [brief, setBrief] = useState('')

  const estadoSesion = canal?.sesion.estado ?? 'NO_CONFIGURADO'
  const pill = ESTADO_SESION[estadoSesion] ?? ESTADO_SESION.NO_CONFIGURADO
  const conectada = estadoSesion === 'CONECTADA'
  const enfriando = canal?.pacing.temperatura === 'enfriando'
  const pulso = canal?.sesion.pulso ?? 'sin_pulso'

  const desconectar = () => {
    accionSesion.mutate(
      { accion: 'desconectar' },
      {
        onSuccess: (r) => toast({ title: 'Bot desconectado', description: r.detalle || r.estado }),
        onError: (e) => toast({ title: 'No se pudo', description: e instanceof Error ? e.message : 'Error desconocido', variant: 'destructive' }),
      },
    )
  }

  const programarAhora = () => {
    if (!chatId.trim()) {
      toast({ title: 'Falta el chat', description: 'El chatId NUMÉRICO del contacto consentido (ej. 573001234567 o -1001234567890). Los @handles no son chatIds.', variant: 'destructive' })
      return
    }
    programar.mutate(
      { chatId: chatId.trim(), programadaEn: cuando ? new Date(cuando).toISOString() : undefined, texto: brief.trim() || undefined },
      {
        onSuccess: (r) => {
          toast({ title: 'Iniciativa programada', description: `${r.chat}: ${r.motivo}` })
          setChatId('')
          setCuando('')
          setBrief('')
        },
        onError: (e) => toast({ title: 'No se pudo programar', description: e instanceof Error ? e.message : 'Error desconocido', variant: 'destructive' }),
      },
    )
  }

  const cancelarAhora = (id: string) => {
    cancelar.mutate(id, {
      onSuccess: (r) => toast({ title: 'Cancelada', description: r.motivo }),
      onError: (e) => toast({ title: 'No se pudo cancelar', description: e instanceof Error ? e.message : 'Error desconocido', variant: 'destructive' }),
    })
  }

  return (
    <div className="space-y-4">
      {/* Estado del cuarto */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn('gap-1 text-[11px]', pill.clase)}>
              <pill.Icono className="h-3 w-3 shrink-0" aria-hidden />
              {pill.texto}
            </Badge>
            {(() => {
              const infoPulso = PULSO[pulso]
              if (!conectada || !infoPulso) return null
              return (
                <Badge variant="outline" className={cn('gap-1 text-[11px]', infoPulso.clase)}>
                  <infoPulso.Icono className="h-3 w-3 shrink-0" aria-hidden />
                  {infoPulso.texto}
                </Badge>
              )
            })()}
            {enfriando && (
              <Badge variant="outline" className="gap-1 border-orange-500/40 bg-orange-500/10 text-[11px] text-orange-300">
                <Thermometer className="h-3 w-3 shrink-0" aria-hidden />
                enfriando {canal?.pacing.temperaturaHasta ? `· hasta ${fmtFecha(canal.pacing.temperaturaHasta)}` : ''}
              </Badge>
            )}
            <Button variant="ghost" size="sm" className="ml-auto h-7 px-2" onClick={() => void refetch()}>
              <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} aria-hidden />
              <span className="sr-only">Refrescar</span>
            </Button>
          </div>
          <CardTitle className="text-base">Cuarto Telegram propio</CardTitle>
          <CardDescription>{canal?.honesto ?? 'Estado honesto del cuarto: nada se finge, nada envía sin bot real en tu máquina.'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 text-xs sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
              <p className="text-muted-foreground">Bot del cuarto</p>
              <p className="font-medium">
                {canal?.sesion.botUsuario ?? '— (sin conectar)'}
                {canal?.sesion.botId ? <span className="ml-1 text-[10px] text-muted-foreground">· id {canal.sesion.botId}</span> : null}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
              <p className="text-muted-foreground">Personaje del cuarto</p>
              <p className="font-medium">
                {canal?.personaje.nombre ?? 'sin asignar'}
                {canal?.personaje.nombre && !canal.personaje.activo ? <span className="ml-1 text-amber-300">(no ACTIVO)</span> : ''}
                <span className="ml-1 text-[10px] text-muted-foreground">· fuente: {canal?.personaje.fuente ?? '—'}</span>
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
              <p className="text-muted-foreground">Webhook del daemon</p>
              <p className="font-medium">
                {canal?.webhook.secretoPresente ? (
                  <span className="inline-flex items-center gap-1 text-emerald-300"><Link2 className="h-3 w-3" aria-hidden /> secreto presente</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-300"><AlertTriangle className="h-3 w-3" aria-hidden /> sin secreto (receptor apagado)</span>
                )}
                <span className="ml-1 text-[10px] text-muted-foreground">· fuente: {canal?.webhook.fuente ?? '—'}</span>
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
              <p className="text-muted-foreground">Pacing efectivo</p>
              <p className="font-medium">
                silencio {canal?.pacing.silencio ?? '—'} · {canal?.pacing.maxRespuestasPorDia ?? '—'} resp/día · {canal?.pacing.maxIniciativasPorDia ?? '—'} inici/día
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={!conectada || accionSesion.isPending} onClick={desconectar}>
              <Unplug className="h-3.5 w-3.5" aria-hidden /> Desconectar bot
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            La CONEXIÓN se presenta desde el daemon real en tu máquina (confirmar_conexion firmado con el @usuario público del bot — el token vive SOLO allí). Detalle: {sesion?.detalle || canal?.sesion.ultimoPulsoEn ? ' ' : ''}
            {sesion?.detalle ? sesion.detalle : 'sin movimientos recientes.'}
          </p>
        </CardContent>
      </Card>

      {/* Envíos de hoy */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Envíos de hoy (día local)</CardTitle>
          <CardDescription>Contado desde la BD propia del cuarto — las marcas bloqueadas jamás tocaron la red.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            <Counter etiqueta="respuestas" valor={canal?.hoy.respuestasEnviadas ?? 0} />
            <Counter etiqueta="iniciativas" valor={canal?.hoy.iniciativasEnviadas ?? 0} />
            <Counter etiqueta="programadas" valor={canal?.hoy.iniciativasProgramadas ?? 0} />
            <Counter etiqueta="en cola" valor={canal?.hoy.enCola ?? 0} />
            <Counter etiqueta="bloq. pacing" valor={canal?.hoy.bloqueadosPacing ?? 0} />
            <Counter etiqueta="fallos riesgo" valor={canal?.hoy.fallosRiesgo ?? 0} tono={cn((canal?.hoy.fallosRiesgo ?? 0) > 0 && 'text-orange-300')} />
          </div>
          {enfriando && (
            <p className="mt-3 flex items-start gap-1.5 text-[11px] text-orange-300">
              <Flame className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              Disyuntor activo: 3 fallos con señal de riesgo abrieron el circuito — las INICIATIVAS quedan en pausa; las respuestas al contacto siguen.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Iniciativas programadas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Iniciativas programadas</CardTitle>
          <CardDescription>
            {iniciativas?.honesto ?? 'Escribe primero, 1:1 y con consentimiento: el QUÉ lo escribe el cerebro al entregar; el CUÁNDO lo decide el pacing.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <div className="space-y-1">
              <Label htmlFor="tg-chat" className="text-xs">ChatId numérico del contacto consentido</Label>
              <Input id="tg-chat" placeholder="573001234567 · grupos: -1001234567890" value={chatId} onChange={(e) => setChatId(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tg-cuando" className="text-xs">Cuándo (opcional)</Label>
              <Input id="tg-cuando" type="datetime-local" value={cuando} onChange={(e) => setCuando(e.target.value)} className="h-8 text-xs" />
            </div>
            <Button size="sm" disabled={!conectada || programar.isPending} onClick={programarAhora}>
              <CalendarClock className="h-3.5 w-3.5" aria-hidden /> Programar
            </Button>
          </div>
          <div className="space-y-1">
            <Label htmlFor="tg-brief" className="text-xs">Breve para el cerebro (opcional, máx 300)</Label>
            <Input id="tg-brief" placeholder="Ej: recordarle que mañana sale el capítulo" value={brief} onChange={(e) => setBrief(e.target.value)} className="h-8 text-xs" />
          </div>
          {!conectada && (
            <p className="text-[11px] text-amber-300">
              Sin bot CONECTADA no se programan iniciativas (409 honesto): primero conecta el daemon real con su token.
            </p>
          )}

          {iniciativas?.programadas.length ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Programadas ({iniciativas.programadas.length})</p>
              {iniciativas.programadas.map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
                  <Badge variant="outline" className="shrink-0 gap-1 border-sky-500/30 bg-sky-500/10 text-[10px] text-sky-300">
                    <CalendarClock className="h-3 w-3" aria-hidden />
                    {p.vencida ? 'vencida' : fmtFecha(p.programadaEn ?? p.createdAt)}
                  </Badge>
                  <span className="font-medium">{p.chat}</span>
                  {p.brief ? <span className="truncate text-muted-foreground">· {p.brief}</span> : null}
                  {p.pacingMotivo && p.pacingMotivo !== 'ok' ? (
                    <span className="shrink-0 text-[10px] text-orange-300">pacing: {p.pacingMotivo}</span>
                  ) : null}
                  <Button variant="ghost" size="sm" className="ml-auto h-6 px-2 text-rose-300" disabled={cancelar.isPending} onClick={() => cancelarAhora(p.id)}>
                    <X className="h-3 w-3" aria-hidden />
                    <span className="sr-only">Cancelar</span>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-[11px] text-muted-foreground">
              Sin iniciativas programadas: el cuarto responde, no acosa. Agenda 1:1 solo a contactos que ya conversaron.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Últimos mensajes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Últimos mensajes del cuarto</CardTitle>
          <CardDescription>Memoria por chat (jamás mezclada con el GFE ni con el cuarto WhatsApp); los chatId van enmascarados.</CardDescription>
        </CardHeader>
        <CardContent>
          {canal?.ultimos.length ? (
            <div className="space-y-1.5">
              {canal.ultimos.map((m) => {
                const em = ESTADO_MSG[m.estado]
                return (
                  <div key={m.id} className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs">
                    <Badge variant="outline" className={cn('shrink-0 text-[10px]', em?.clase)}>{em?.texto ?? m.estado}</Badge>
                    <span className="shrink-0 font-medium">{m.chat}</span>
                    <span className="shrink-0 text-[10px] uppercase text-muted-foreground">{m.direccion === 'entrada' ? '← entra' : m.tipo === 'iniciativa' ? '→ inicia' : '→ responde'}</span>
                    <span className="truncate text-muted-foreground">{m.texto || (m.pacingMotivo && m.pacingMotivo !== 'ok' ? `pacing: ${m.pacingMotivo}` : '(sin texto)')}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-[11px] text-muted-foreground">
              Aún no circula nada por el cuarto: falta el daemon real en tu máquina (bot con su token, $0).
            </p>
          )}
          <p className="mt-3 flex items-start gap-1 text-[10px] text-muted-foreground">
            <Send className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
            Actualizado: {canal ? fmtFecha(canal.actualizadoEn) : '—'} · El cuarto Telegram es SFW por ahora (mismo filtro de edad que WhatsApp); el cobro 18+ espera verificación de términos y procesador — ningún canal se habilita por suposición.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

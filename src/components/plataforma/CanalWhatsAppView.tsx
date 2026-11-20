'use client'
// Vista Canal — F1 (W2+W4): el canal WhatsApp PROPIO del negocio visto desde el
// panel. Honestidad ante todo: el estado de la sesión es el REAL (CONECTADA solo
// tras el emparejamiento del daemon en la máquina del fundador), la temperatura
// es la del disyuntor vivo, los envíos del día son filas de la BD de la casa y
// los chatId SIEMPRE viajan enmascarados. Las iniciativas se programan 1:1 por
// contacto consentido; el texto final lo escribe el cerebro al entregar.
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  Flame,
  Link2,
  MessageSquareOff,
  QrCode,
  RefreshCw,
  Thermometer,
  Unplug,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtFecha } from '@/components/estudio/ui-bits'
import {
  useAccionSesionWhatsApp,
  useCanal,
  useCancelarIniciativa,
  useIniciativas,
  useProgramarIniciativa,
} from './api'

const ESTADO_SESION: Record<string, { texto: string; clase: string; Icono: typeof CheckCircle2 }> = {
  CONECTADA: { texto: 'Conectada', Icono: CheckCircle2, clase: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  ESPERANDO_QR: { texto: 'Esperando QR', Icono: QrCode, clase: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  DESCONECTADA: { texto: 'Desconectada', Icono: Unplug, clase: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' },
  NO_CONFIGURADO: { texto: 'Sin configurar', Icono: CircleDashed, clase: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' },
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

export default function CanalWhatsAppView() {
  const { data: canal, isLoading, refetch } = useCanal()
  const { data: iniciativas } = useIniciativas()
  const { toast } = useToast()
  const accionSesion = useAccionSesionWhatsApp()
  const programar = useProgramarIniciativa()
  const cancelar = useCancelarIniciativa()

  const [chatId, setChatId] = useState('')
  const [cuando, setCuando] = useState('')
  const [brief, setBrief] = useState('')

  const sesion = canal?.sesion
  const estadoSesion = sesion?.estado ?? 'NO_CONFIGURADO'
  const pill = ESTADO_SESION[estadoSesion] ?? ESTADO_SESION.NO_CONFIGURADO
  const conectada = estadoSesion === 'CONECTADA'
  const enfriando = canal?.pacing.temperatura === 'enfriando'

  const pedir = (accion: string, ok: string) => {
    accionSesion.mutate(
      { accion },
      {
        onSuccess: (r) => toast({ title: ok, description: r.detalle || r.estado }),
        onError: (e) => toast({ title: 'No se pudo', description: e instanceof Error ? e.message : 'Error desconocido', variant: 'destructive' }),
      },
    )
  }

  const programarAhora = () => {
    if (!chatId.trim()) {
      toast({ title: 'Falta el chat', description: 'El chatId del contacto consentido (ej. 573001234567@s.whatsapp.net).', variant: 'destructive' })
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
      {/* Estado del canal */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn('gap-1 text-[11px]', pill.clase)}>
              <pill.Icono className="h-3 w-3 shrink-0" aria-hidden />
              {pill.texto}
            </Badge>
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
          <CardTitle className="text-base">Canal WhatsApp propio</CardTitle>
          <CardDescription>{canal?.honesto ?? 'Estado honesto del canal: nada se finge, nada envía sin sesión real.'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 text-xs sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
              <p className="text-muted-foreground">Número del negocio</p>
              <p className="font-medium">{sesion?.numeroMascarado ?? '— (sin emparejar)'}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
              <p className="text-muted-foreground">Personaje del canal</p>
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
            <Button size="sm" variant="outline" disabled={conectada || accionSesion.isPending} onClick={() => pedir('iniciar_espera_qr', 'Espera de QR iniciada')}>
              <QrCode className="h-3.5 w-3.5" aria-hidden /> Esperar QR
            </Button>
            <Button size="sm" variant="outline" disabled={!conectada || accionSesion.isPending} onClick={() => pedir('rotar', 'Sesión rotada')}>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Rotar (logout)
            </Button>
            <Button size="sm" variant="outline" disabled={estadoSesion === 'NO_CONFIGURADO' || accionSesion.isPending} onClick={() => pedir('desconectar', 'Sesión desconectada')}>
              <Unplug className="h-3.5 w-3.5" aria-hidden /> Desconectar
            </Button>
            {estadoSesion === 'ESPERANDO_QR' && (
              <Button size="sm" variant="outline" disabled={accionSesion.isPending} onClick={() => pedir('caducar_qr', 'Reto QR caducado')}>
                <MessageSquareOff className="h-3.5 w-3.5" aria-hidden /> Caducar QR
              </Button>
            )}
          </div>
          {estadoSesion === 'ESPERANDO_QR' && (
            <p className="text-[11px] text-muted-foreground">
              El reto QR vence en ~1 minuto: confírmalo desde el daemon real en tu máquina (confirmar_conexion con número + secreto de sesión).
            </p>
          )}
        </CardContent>
      </Card>

      {/* Envíos de hoy */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Envíos de hoy (día local)</CardTitle>
          <CardDescription>Contado desde la BD propia del canal — las marcas bloqueadas jamás tocaron la red.</CardDescription>
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
              Disyuntor activo: 3 fallos con señal de riesgo abrieron el circuito — las INICIATIVAS quedan en pausa hasta el fin del enfriamiento; las respuestas al contacto siguen (señal más humana y de menor riesgo).
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
              <Label htmlFor="canal-chat" className="text-xs">ChatId del contacto consentido</Label>
              <Input id="canal-chat" placeholder="573001234567@s.whatsapp.net" value={chatId} onChange={(e) => setChatId(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="canal-cuando" className="text-xs">Cuándo (opcional)</Label>
              <Input id="canal-cuando" type="datetime-local" value={cuando} onChange={(e) => setCuando(e.target.value)} className="h-8 text-xs" />
            </div>
            <Button size="sm" disabled={!conectada || programar.isPending} onClick={programarAhora}>
              <CalendarClock className="h-3.5 w-3.5" aria-hidden /> Programar
            </Button>
          </div>
          <div className="space-y-1">
            <Label htmlFor="canal-brief" className="text-xs">Breve para el cerebro (opcional, máx 300)</Label>
            <Input id="canal-brief" placeholder="Ej: recordarle el estreno del jueves" value={brief} onChange={(e) => setBrief(e.target.value)} className="h-8 text-xs" />
          </div>
          {!conectada && (
            <p className="text-[11px] text-amber-300">
              Sin sesión CONECTADA no se programan iniciativas (409 honesto): primero empareja el número con el daemon real.
            </p>
          )}

          {iniciativas?.programadas.length ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Programadas ({iniciativas.programadas.length})</p>
              {iniciativas.programadas.map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
                  <Badge variant="outline" className={cn('shrink-0 gap-1 text-[10px]', ESTADO_MSG.programada.clase)}>
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
              Sin iniciativas programadas: el canal responde, no acosa. Agenda 1:1 solo a contactos que ya conversaron.
            </p>
          )}

          {iniciativas?.historial.length ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Historial reciente de iniciativas</p>
              {iniciativas.historial.map((h) => {
                const em = ESTADO_MSG[h.estado]
                return (
                  <div key={h.id} className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs">
                    <Badge variant="outline" className={cn('shrink-0 gap-1 text-[10px]', em?.clase)}>{em?.texto ?? h.estado}</Badge>
                    <span className="font-medium">{h.chat}</span>
                    <span className="truncate text-muted-foreground">{h.texto || '(sin texto)'}</span>
                    {h.modo ? <span className="shrink-0 text-[10px] text-muted-foreground">{h.modo}</span> : null}
                  </div>
                )
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Últimos mensajes del canal */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Últimos mensajes del canal</CardTitle>
          <CardDescription>Memoria por chat (jamás mezclada con el GFE del operador); los chatId van enmascarados.</CardDescription>
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
              Aún no circula nada por el canal: falta el daemon real en tu máquina (librería open-source) y el QR del número del negocio.
            </p>
          )}
          <p className="mt-3 text-[10px] text-muted-foreground">
            Actualizado: {canal ? fmtFecha(canal.actualizadoEn) : '—'} · Send/WhatsApp es canal SFW del embudo; el filtro de edad aplica en entrada y salida.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

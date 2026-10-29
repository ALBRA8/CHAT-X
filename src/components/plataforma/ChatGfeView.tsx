"use client"
// MÓDULO CHAT GFE — "Modo Novia" (P1.1): conversación con media en contexto.
// Honestidad visible: el cerebro es plantilla del genoma (sin LLM configurado),
// las piezas van por el pipeline real (job → QA → compliance) y la voz usa el
// contrato por personaje (espeak $0 / piper cuando se instale).
import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MessageCircle, Image as ImageIcon, AudioLines, Bot, User } from 'lucide-react'
import { useCharacters } from '@/components/estudio/api'

interface MensajeChat {
  id: string
  rol: 'operador' | 'personaje'
  tipo: 'texto' | 'imagen' | 'voz'
  texto: string
  estado: 'generando' | 'entregado' | 'fallido'
  media: { id: string; kind: string; qualityVerdict: string; aiLabels: string } | null
  meta: Record<string, unknown>
  createdAt: string
}

export default function ChatGfeView() {
  const { data: chars } = useCharacters()
  const activos = (chars ?? []).filter((c) => c.status === 'ACTIVO')
  const [characterId, setCharacterId] = useState('')
  const [mensajes, setMensajes] = useState<MensajeChat[]>([])
  const [texto, setTexto] = useState('')
  const [aviso, setAviso] = useState('')
  const [enviando, setEnviando] = useState(false)
  const finRef = useRef<HTMLDivElement>(null)

  const elegirPrimero = !characterId && activos.length > 0 ? activos[0].id : characterId
  const cid = elegirPrimero

  const cargar = useCallback(async () => {
    if (!cid) return
    try {
      const r = await fetch(`/api/chat?characterId=${cid}`, { cache: 'no-store' })
      if (r.ok) {
        const d = await r.json()
        setMensajes(d.mensajes ?? [])
      }
    } catch {
      /* servidor no listo: se reintenta con el poll */
    }
  }, [cid])

  useEffect(() => {
    cargar()
    const hayGenerando = mensajes.some((m) => m.estado === 'generando')
    const t = setInterval(cargar, hayGenerando ? 1500 : 6000)
    return () => clearInterval(t)
  }, [cargar, mensajes.some((m) => m.estado === 'generando')])

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes.length])

  async function enviar() {
    if (!cid || !texto.trim() || enviando) return
    setEnviando(true)
    setAviso('')
    const t = texto
    setTexto('')
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: cid, texto: t }),
      })
      const d = await r.json()
      if (!r.ok) setAviso(d.error ?? `HTTP ${r.status}`)
    } catch {
      setAviso('Fallo de red al enviar')
    } finally {
      setEnviando(false)
      cargar()
    }
  }

  if (activos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><MessageCircle className="size-4" /> Chat GFE — Modo Novia</CardTitle>
          <CardDescription>
            Sin personajes ACTIVOS: crea y activa uno en el Estudio (Valentina demo incluida) para abrir el chat.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><MessageCircle className="size-4" /> Chat GFE — Modo Novia</CardTitle>
          <CardDescription>
            Pide fotos (entran al pipeline real con QA + compliance), notas de voz (contrato por personaje, TTS $0) o conversa.
            Cerebro honesto: LLM real si la sonda da OPERATIVO (meta.modo=llm_*); si no, plantillas del genoma declaradas (meta.modo=plantilla_genoma + llmEstado).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {activos.map((c) => (
              <Button key={c.id} size="sm" variant={cid === c.id ? 'default' : 'outline'} onClick={() => setCharacterId(c.id)}>
                {c.name}
              </Button>
            ))}
          </div>

          <div className="max-h-[420px] space-y-2.5 overflow-y-auto rounded-md border border-border/60 bg-muted/10 p-3">
            {mensajes.length === 0 ? (
              <p className="py-6 text-center text-[11px] text-muted-foreground">
                Sin mensajes aún — prueba «hola», «mándame una foto» o «mándame una nota de voz».
              </p>
            ) : (
              mensajes.map((m) => (
                <div key={m.id} className={m.rol === 'operador' ? 'flex justify-end' : 'flex justify-start'}>
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-[12px] leading-relaxed ${
                      m.rol === 'operador' ? 'bg-primary text-primary-foreground' : 'border border-border/60 bg-background'
                    }`}
                  >
                    <p className="mb-1 flex items-center gap-1 text-[10px] opacity-70">
                      {m.rol === 'personaje' ? <Bot className="size-3" /> : <User className="size-3" />}
                      {m.rol === 'personaje' ? 'personaje' : 'tú'}
                    </p>
                    {m.tipo === 'imagen' && m.media ? (
                      <div className="mt-1">
                        <img
                          src={`/api/media/${m.media.id}/archivo`}
                          alt="pieza del chat"
                          className="max-h-56 rounded border border-border/40"
                        />
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {JSON.parse(m.media.aiLabels || '[]')[0]} · QA {m.media.qualityVerdict}
                        </p>
                      </div>
                    ) : null}
                    {m.tipo === 'voz' && m.media ? (
                      <div className="mt-1 flex items-center gap-2">
                        <AudioLines className="size-4" />
                        <audio controls src={`/api/media/${m.media.id}/archivo`} className="h-8 max-w-[220px]" />
                      </div>
                    ) : null}
                    {m.tipo === 'imagen' && !m.media && m.estado === 'generando' ? (
                      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <ImageIcon className="size-3.5 animate-pulse" /> generando la pieza en el Estudio…
                      </p>
                    ) : null}
                    {m.texto ? <p>{m.texto}</p> : null}
                    {m.estado === 'fallido' ? (
                      <Badge variant="destructive" className="mt-1">fallido · créditos reembolsados</Badge>
                    ) : null}
                  </div>
                </div>
              ))
            )}
            <div ref={finRef} />
          </div>

          {aviso ? <p className="text-[11px] text-destructive">{aviso}</p> : null}

          <div className="flex gap-2">
            <Input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && enviar()}
              placeholder={`Escribe a ${activos.find((c) => c.id === cid)?.name ?? 'la modelo'}…`}
            />
            <Button size="sm" onClick={enviar} disabled={enviando || !texto.trim()}>Enviar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

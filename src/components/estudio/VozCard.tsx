"use client"
// VozCard — gestión de la identidad de voz del personaje (capa 3: clonación local).
// Estados honestos siempre: si falta el extractor o el modelo de síntesis, se
// dice exactamente qué falta. La muestra es material privado (subida exige
// modo privado desbloqueado; se guarda cifrada AES-256-GCM).
import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { AudioLines, Lock, Trash2, Upload } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { api } from './api'
import { fmtFecha } from './ui-bits'

interface SondaClon {
  estado: 'OPERATIVO' | 'NO_CONFIGURADO' | 'ERROR'
  detalle: string
  extractor: string | null
  sintetizadorOk: boolean
}

interface PerfilVoz {
  id: string
  estado: string
  detalle: string
  dim: number
  extractor: string
  duracionMuestrasS: number
  consentimiento: string
  consentimientoNota: string
  createdAt: string
}

const COLOR_ESTADO: Record<string, string> = {
  OPERATIVO: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  NO_CONFIGURADO: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  ERROR: 'bg-red-500/15 text-red-600 dark:text-red-400',
}

export default function VozCard({ characterId, desbloqueado }: { characterId: string; desbloqueado: boolean }) {
  const { toast } = useToast()
  const [sonda, setSonda] = useState<SondaClon | null>(null)
  const [perfil, setPerfil] = useState<PerfilVoz | null>(null)
  const [consentimiento, setConsentimiento] = useState('PROPIO')
  const [nota, setNota] = useState('')
  const [archivoNombre, setArchivoNombre] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const cargar = useCallback(async () => {
    try {
      const r = await api<{ perfil: PerfilVoz | null; sonda: SondaClon }>(`/api/characters/${characterId}/voz`)
      setPerfil(r.perfil)
      setSonda(r.sonda)
    } catch {
      setSonda({ estado: 'ERROR', detalle: 'no se pudo consultar el subsistema de voz', extractor: null, sintetizadorOk: false })
    }
  }, [characterId])

  useEffect(() => {
    if (characterId) void cargar()
  }, [characterId, cargar])

  const subir = async () => {
    const archivo = inputRef.current?.files?.[0]
    if (!archivo) {
      toast({ title: 'Elige primero un archivo de audio', description: 'wav, mp3, m4a, ogg, webm, flac u opus (mínimo 3 s de voz).', variant: 'destructive' })
      return
    }
    setSubiendo(true)
    try {
      const fd = new FormData()
      fd.append('archivo', archivo)
      fd.append('consentimiento', consentimiento)
      fd.append('nota', nota)
      const res = await fetch(`/api/characters/${characterId}/voz/muestra`, { method: 'POST', body: fd, cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error || `Error ${res.status}`)
      toast({
        title: (data as { perfil?: PerfilVoz }).perfil?.estado === 'OPERATIVO' ? 'Identidad de voz extraída' : 'Muestra guardada (identidad pendiente)',
        description: (data as { perfil?: PerfilVoz }).perfil?.detalle,
      })
      setArchivoNombre('')
      setNota('')
      if (inputRef.current) inputRef.current.value = ''
      await cargar()
    } catch (e) {
      toast({ title: 'No se pudo registrar la muestra', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setSubiendo(false)
    }
  }

  const eliminar = async () => {
    if (!window.confirm('¿Eliminar la identidad de voz y su muestra cifrada?')) return
    try {
      await api(`/api/characters/${characterId}/voz/muestra`, { method: 'DELETE' })
      toast({ title: 'Identidad de voz eliminada.' })
      await cargar()
    } catch (e) {
      toast({ title: 'No se pudo eliminar', description: (e as Error).message, variant: 'destructive' })
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <AudioLines className="h-4 w-4 text-muted-foreground" aria-hidden />
          <CardTitle className="text-base">Voz · identidad clonada (local, $0)</CardTitle>
        </div>
        {sonda && (
          <Badge className={COLOR_ESTADO[sonda.estado] ?? ''} variant="secondary">
            capa 3: {sonda.estado}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {/* Estado honesto del subsistema */}
        {sonda && (
          <p className="text-xs text-muted-foreground leading-relaxed">{sonda.detalle}</p>
        )}

        {/* Perfil existente */}
        {perfil ? (
          <div className="rounded-md border p-3 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={COLOR_ESTADO[perfil.estado] ?? ''} variant="secondary">{perfil.estado}</Badge>
              <Badge variant="outline">consentimiento: {perfil.consentimiento}</Badge>
              {perfil.dim > 0 && <Badge variant="outline">vector {perfil.dim} dims (~{Math.max(1, Math.round((perfil.dim * 4) / 1024 * 10) / 10)} KB)</Badge>}
              {perfil.extractor && <Badge variant="outline">{perfil.extractor}</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">{perfil.detalle}</p>
            <p className="text-xs text-muted-foreground">
              {perfil.duracionMuestrasS > 0 && <>audio usado: {perfil.duracionMuestrasS}s · </>}
              registrado: {fmtFecha(perfil.createdAt)}
              {perfil.consentimientoNota && <> · nota: {perfil.consentimientoNota}</>}
            </p>
            <div className="flex gap-2 pt-1">
              {desbloqueado && (
                <audio controls preload="none" src={`/api/characters/${characterId}/voz/muestra`} className="h-8 max-w-full" />
              )}
              <Button size="sm" variant="ghost" onClick={eliminar} className="text-red-600 hover:text-red-700 h-8">
                <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden /> Eliminar identidad
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Sin identidad registrada todavía para este personaje.</p>
        )}

        {/* Subida de muestra */}
        {desbloqueado ? (
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-xs text-muted-foreground">
              Sube una muestra de 10–30 s de voz limpia (sin música de fondo). La identidad pesa KB, la muestra
              se guarda cifrada y jamás sale del carril privado.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="voz-archivo" className="text-xs">Archivo de audio</Label>
                <Input
                  id="voz-archivo"
                  ref={inputRef}
                  type="file"
                  accept="audio/*,.wav,.mp3,.m4a,.ogg,.webm,.flac,.opus"
                  onChange={(e) => setArchivoNombre(e.target.files?.[0]?.name ?? '')}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Consentimiento (obligatorio)</Label>
                <Select value={consentimiento} onValueChange={setConsentimiento}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PROPIO">PROPIO — voz del equipo / producida</SelectItem>
                    <SelectItem value="AUTORIZADO">AUTORIZADO — tercero con permiso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {consentimiento === 'AUTORIZADO' && (
              <Input
                placeholder="Quién autorizó y cuándo (obligatorio para trazabilidad)"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                className="h-8 text-xs"
              />
            )}
            <Button size="sm" onClick={subir} disabled={subiendo || !archivoNombre}>
              <Upload className="mr-1.5 h-3.5 w-3.5" aria-hidden /> {subiendo ? 'Procesando muestra…' : 'Subir muestra y extraer identidad'}
            </Button>
          </div>
        ) : (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" aria-hidden /> Desbloquea el modo privado para subir o escuchar muestras (material cifrado).
          </p>
        )}
      </CardContent>
    </Card>
  )
}

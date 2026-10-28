'use client'
// CHAT-X — PLATAFORMA CENTRAL DEL ECOSISTEMA ALBRA8.
// Una plataforma. Una interfaz central. Múltiples motores independientes.
// Los módulos 2/3/5/6 operan motores existentes por sus contratos reales;
// el módulo 4 es el Estudio construido en sala limpia, intacto.
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Gauge,
  Clapperboard,
  Briefcase,
  Users,
  Megaphone,
  Telescope,
  Workflow,
} from 'lucide-react'
import Providers from '@/components/estudio/providers'
import OperacionesView from '@/components/plataforma/OperacionesView'
import MotorYouTubeView from '@/components/plataforma/MotorYouTubeView'
import MotoresComercialesView from '@/components/plataforma/MotoresComercialesView'
import UgcView from '@/components/plataforma/UgcView'
import InvestigacionView from '@/components/plataforma/InvestigacionView'
import AutomatizacionView from '@/components/plataforma/AutomatizacionView'
import EstudioModulo from '@/components/estudio/EstudioModulo'
import { useSettings, usePrivado } from '@/components/estudio/api'
import { fmtDinero } from '@/components/estudio/ui-bits'
import { useMotores } from '@/components/plataforma/api'
import { cn } from '@/lib/utils'

type Modulo = 'operaciones' | 'youtube' | 'comercial' | 'estudio' | 'ugc' | 'investigacion' | 'automatizacion'

const MODULOS: { id: Modulo; label: string; corto: string; icono: typeof Gauge; desc: string }[] = [
  { id: 'operaciones', label: 'Centro de Operaciones', corto: 'Ops', icono: Gauge, desc: 'Estado del ecosistema, GPU, trabajos y compliance' },
  { id: 'youtube', label: 'YouTube Automation', corto: 'Video', icono: Clapperboard, desc: 'Motor de producción audiovisual y Google Flow' },
  { id: 'comercial', label: 'CRM y Comercial', corto: 'CRM', icono: Briefcase, desc: 'CRM-ALBRA · WHATSPOWER · ULTRA' },
  { id: 'estudio', label: 'Estudio de Avatares', corto: 'Estudio', icono: Users, desc: 'Genoma · Fábrica · Privado · Biblioteca' },
  { id: 'ugc', label: 'UGC y Campañas', corto: 'UGC', icono: Megaphone, desc: 'Briefs, avatares, calendario y campañas' },
  { id: 'investigacion', label: 'Investigación', corto: 'Nicho', icono: Telescope, desc: 'NEX-SCOPE · AGENTE-LEADS · AGENTE-GENERAL' },
  { id: 'automatizacion', label: 'Automatización', corto: 'Flujos', icono: Workflow, desc: 'Orquestador de flujos extremo a extremo' },
]

function Shell() {
  const [modulo, setModulo] = useState<Modulo>('operaciones')
  const { data: settings } = useSettings()
  const { data: privado } = usePrivado()
  const { data: motores } = useMotores()
  const actual = MODULOS.find((m) => m.id === modulo)!

  const nav = (id: Modulo) => (
    <button
      key={id}
      onClick={() => setModulo(id)}
      aria-current={modulo === id ? 'page' : undefined}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs transition-colors',
        modulo === id ? 'bg-muted font-semibold text-foreground' : 'text-muted-foreground hover:bg-muted/50',
      )}
    >
      {(() => {
        const Icono = MODULOS.find((m) => m.id === id)!.icono
        return <Icono className="h-4 w-4 shrink-0" aria-hidden />
      })()}
      {MODULOS.find((m) => m.id === id)!.label}
    </button>
  )

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1">
        {/* Sidebar (desktop) */}
        <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-card/40 md:flex">
          <div className="px-4 py-4">
            <p className="text-sm font-bold tracking-tight">CHAT-X</p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
              plataforma central · ecosistema ALBRA8
            </p>
          </div>
          <nav className="flex-1 space-y-0.5 px-2" aria-label="Módulos de la plataforma">
            {MODULOS.map((m) => nav(m.id))}
          </nav>
          <div className="space-y-1 px-4 py-4 text-[10px] text-muted-foreground">
            <p>{motores ? `${motores.resumen.operativos}/${motores.motores.length} motores operativos` : 'sondeando motores…'}</p>
            <p>proveedor estudio: {settings?.provider ?? 'simulador'}</p>
          </div>
        </aside>

        {/* Contenido */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold tracking-tight">{actual.label}</h1>
                <p className="truncate text-[10px] text-muted-foreground">{actual.desc}</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <Badge variant="outline" className="text-[11px] tabular-nums">
                  🪙 {fmtDinero(settings?.credits ?? 0)} cr.
                </Badge>
                <Badge variant="outline" className={`text-[11px] ${privado?.desbloqueado ? 'text-rose-300 border-rose-500/40' : 'text-muted-foreground'}`}>
                  {privado?.desbloqueado ? '🔓 privado' : '🔒 privado'}
                </Badge>
              </div>
            </div>
            {/* Tabs horizontales (móvil/tablet) */}
            <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:hidden" aria-label="Módulos (móvil)">
              {MODULOS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setModulo(m.id)}
                  aria-current={modulo === m.id ? 'page' : undefined}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px]',
                    modulo === m.id ? 'border-border bg-muted font-semibold' : 'border-transparent text-muted-foreground',
                  )}
                >
                  <m.icono className="h-3.5 w-3.5" aria-hidden />
                  {m.corto}
                </button>
              ))}
            </nav>
          </header>

          <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-5">
            {modulo === 'operaciones' && <OperacionesView onAbrirModulo={(m) => setModulo(m as Modulo)} />}
            {modulo === 'youtube' && <MotorYouTubeView />}
            {modulo === 'comercial' && <MotoresComercialesView />}
            {modulo === 'estudio' && <EstudioModulo />}
            {modulo === 'ugc' && <UgcView />}
            {modulo === 'investigacion' && <InvestigacionView />}
            {modulo === 'automatizacion' && <AutomatizacionView />}
          </main>
        </div>
      </div>

      <footer className="mt-auto border-t border-border bg-card/60">
        <div className="flex max-w-5xl flex-col gap-1 px-4 py-3 text-[11px] text-muted-foreground md:mx-auto md:flex-row md:items-center md:justify-between">
          <p>CHAT-X · plataforma central del ecosistema ALBRA8 — motores independientes, contratos reales, cero reconstrucciones.</p>
          <p>una plataforma · una interfaz · múltiples motores</p>
        </div>
      </footer>
    </div>
  )
}

export default function Home() {
  return (
    <Providers>
      <Shell />
    </Providers>
  )
}

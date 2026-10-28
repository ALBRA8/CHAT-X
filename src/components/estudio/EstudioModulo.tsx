"use client"
// MÓDULO 4 — ESTUDIO DE AVATARES.
// Es EL ESTUDIO v1 exactamente como fue construido en sala limpia (Genoma,
// Fábrica, Biblioteca, Panel, Compliance): solo se re-organiza dentro de la
// plataforma central. Cero reconstrucción, identidad visual conservada.
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, Users, Camera, FolderOpen, ShieldCheck } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import PanelView from './PanelView'
import GenomaView from './GenomaView'
import EstudioView from './EstudioView'
import BibliotecaView from './BibliotecaView'
import ComplianceView from './ComplianceView'
import type { CharacterT } from './api'

type Vista = 'panel' | 'genoma' | 'estudio' | 'biblioteca' | 'compliance'

const VISTAS: { id: Vista; label: string; icono: typeof LayoutDashboard }[] = [
  { id: 'panel', label: 'Panel', icono: LayoutDashboard },
  { id: 'genoma', label: 'Genoma', icono: Users },
  { id: 'estudio', label: 'Estudio', icono: Camera },
  { id: 'biblioteca', label: 'Biblioteca', icono: FolderOpen },
  { id: 'compliance', label: 'Compliance', icono: ShieldCheck },
]

export default function EstudioModulo() {
  const { toast } = useToast()
  const [vista, setVista] = useState<Vista>('panel')
  const [charEstudio, setCharEstudio] = useState<CharacterT | null>(null)

  const abrirEnEstudio = (c: CharacterT) => {
    setCharEstudio(c)
    setVista('estudio')
  }

  return (
    <div className="space-y-4">
      {/* Sub-navegación del módulo */}
      <nav className="flex flex-wrap items-center gap-1" aria-label="Sub-vistas del Estudio">
        {VISTAS.map((v) => (
          <Button
            key={v.id}
            variant={vista === v.id ? 'secondary' : 'ghost'}
            size="sm"
            aria-current={vista === v.id ? 'page' : undefined}
            onClick={() => setVista(v.id)}
          >
            <v.icono className="mr-1.5 h-3.5 w-3.5" aria-hidden /> {v.label}
          </Button>
        ))}
      </nav>

      {vista === 'panel' && <PanelView onAbrirEstudio={abrirEnEstudio} />}
      {vista === 'genoma' && (
        <GenomaView
          onActivada={(c) => {
            toast({ title: `${c.name} quedó ACTIVA`, description: 'Ábrela en el Estudio para producir.' })
            setVista('panel')
          }}
        />
      )}
      {vista === 'estudio' && <EstudioView key={charEstudio?.id ?? 'ninguno'} inicial={charEstudio} />}
      {vista === 'biblioteca' && <BibliotecaView />}
      {vista === 'compliance' && <ComplianceView />}
    </div>
  )
}

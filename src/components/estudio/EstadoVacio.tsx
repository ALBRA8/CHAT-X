"use client"
// D-015 · A4 — "Estados vacíos que enseñan" (patrón UI oficial del panel del
// operador, adaptado del destripe §17.8): cada pantalla vacía ENSEÑA a llenarse
// con 2-3 pasos numerados con ejemplos concretos, un botón que arranca el paso
// 1, y el límite declarado cuando aplica ("hasta 20 imágenes").
// Un Vacio informativo simple (ui-bits) sigue siendo válido para vacíos donde
// no hay acción posible; si el operador puede salir del vacío, aquí es donde
// se le enseña cómo.
import { Button } from '@/components/ui/button'

export interface PasoVacio {
  titulo: string
  detalle?: string
}

export function EstadoVacio({
  icono,
  titulo,
  pasos,
  cta,
  limite,
  nota,
}: {
  icono: string
  titulo: string
  pasos: PasoVacio[]
  cta?: { etiqueta: string; onClick: () => void }
  limite?: string
  nota?: string
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border px-6 py-8">
      <div className="flex items-center gap-2.5">
        <span className="text-3xl" aria-hidden>
          {icono}
        </span>
        <p className="font-medium text-sm">{titulo}</p>
      </div>
      <ol className="space-y-2">
        {pasos.map((p, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm">
            <span
              aria-hidden
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-[11px] font-semibold text-muted-foreground"
            >
              {i + 1}
            </span>
            <span className="text-xs leading-relaxed">
              {p.titulo}
              {p.detalle ? <span className="block text-[11px] text-muted-foreground">{p.detalle}</span> : null}
            </span>
          </li>
        ))}
      </ol>
      {cta && (
        <Button size="sm" onClick={cta.onClick}>
          {cta.etiqueta}
        </Button>
      )}
      {limite && <p className="text-[11px] text-muted-foreground">Límite declarado: {limite}</p>}
      {nota && <p className="text-[11px] text-muted-foreground">{nota}</p>}
    </div>
  )
}

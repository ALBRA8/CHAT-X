"use client"
// D-015 · A1 — el Catálogo del Estudio: se pinta DESDE LA BD (una fila = una
// herramienta). Estructura de 4 niveles adaptada del destripe §17.9:
// grupo con frase → subgrupo en mayúsculas → tarjeta (nombre + frase + coste)
// → chapas. Textos y frases propios de MUSE, nunca los del referente.
// Estados cubiertos de forma honesta: BD sin sembrar (enseña cómo), fila
// corrupta (se lista aparte, no se oculta), y carril privado cerrado.
import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import { useHerramientas, usePrivado, type HerramientaT } from './api'
import { EstadoVacio } from './EstadoVacio'
import FichaHerramienta from './FichaHerramienta'
import { fmtDinero } from './ui-bits'

export default function CatalogoView() {
  const { data, isLoading } = useHerramientas()
  const { data: privado } = usePrivado()
  const [seleccionada, setSeleccionada] = useState<string | null>(null)

  const herramientas = data?.herramientas ?? []

  // Agrupación por los DOS niveles declarados en cada fila (grupo → subgrupo).
  const grupos = useMemo(() => {
    const g = new Map<string, Map<string, HerramientaT[]>>()
    for (const h of herramientas) {
      if (!g.has(h.grupo)) g.set(h.grupo, new Map())
      const subs = g.get(h.grupo)!
      const clave = h.subgrupo || '—'
      if (!subs.has(clave)) subs.set(clave, [])
      subs.get(clave)!.push(h)
    }
    return g
  }, [herramientas])

  const elegida = herramientas.find((h) => h.clave === seleccionada) ?? null

  if (elegida) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSeleccionada(null)}>
          <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden /> volver al catálogo
        </Button>
        <FichaHerramienta
          herramienta={elegida}
          privadoDesbloqueado={Boolean(privado?.desbloqueado)}
          onLanzado={() => setSeleccionada(null)}
        />
      </div>
    )
  }

  if (isLoading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Leyendo el catálogo de la BD…</p>
  }

  // Estado vacío que enseña (A4): el catálogo vive en la BD; si está vacío,
  // el paso 1 es sembrarlo.
  if (herramientas.length === 0) {
    return (
      <EstadoVacio
        icono="🧰"
        titulo="El catálogo está vacío: las herramientas viven en la base de datos"
        pasos={[
          { titulo: 'Corre el seed del catálogo', detalle: 'bun scripts/seed_herramientas.ts — inserta una fila por herramienta' },
          { titulo: 'Recarga esta vista', detalle: 'el renderizador único pinta cada fila sin recompilar' },
          {
            titulo: '¿Herramienta nueva? Agrega una fila, no una pantalla',
            detalle: 'src/lib/herramientas-catalogo.ts define el contrato; el endpoint real sigue siendo la única verdad del coste',
          },
        ]}
        nota="Contrato de campos: src/lib/herramientas.ts (D-015 · A1)"
      />
    )
  }

  return (
    <div className="space-y-6">
      {(data?.errores ?? []).length > 0 && (
        <Card className="border-amber-500/40">
          <CardContent className="p-3 text-xs text-amber-300">
            {data!.errores.length} fila(s) del catálogo no pasan el contrato zod y NO se muestran:{' '}
            {data!.errores.map((e) => `${e.clave} (${e.detalle})`).join(' · ')} — corrige la fila en la BD o el seed.
          </CardContent>
        </Card>
      )}

      {[...grupos.entries()].map(([grupo, subs]) => {
        const frase = subs.values().next().value?.[0]?.fraseGrupo ?? ''
        return (
          <section key={grupo} aria-labelledby={`cat-${grupo}`}>
            <h2 id={`cat-${grupo}`} className="text-lg font-semibold">
              {grupo}
            </h2>
            {frase && <p className="text-xs text-muted-foreground mb-3">{frase}</p>}
            {[...subs.entries()].map(([subgrupo, lista]) => (
              <div key={subgrupo} className="mb-4">
                {subgrupo !== '—' && (
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">{subgrupo}</p>
                )}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {lista.map((h) => (
                    <button
                      key={h.clave}
                      onClick={() => setSeleccionada(h.clave)}
                      className="text-left rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50"
                      aria-label={`Abrir ${h.nombre}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl" aria-hidden>
                          {h.icono}
                        </span>
                        <h3 className="font-medium text-sm">{h.nombre}</h3>
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{h.descripcion}</p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        {h.chapas.map((ch) => (
                          <Badge key={ch} variant="outline" className="text-[10px]">
                            {ch}
                          </Badge>
                        ))}
                        {h.costeTexto && (
                          <Badge variant="secondary" className="text-[10px] tabular-nums">
                            {h.costeTexto}
                          </Badge>
                        )}
                        {h.campos.some((c) => c.type === 'carril') && (
                          <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-300">
                            carril elegible
                          </Badge>
                        )}
                      </div>
                      {h.limiteTexto && <p className="mt-1.5 text-[10px] text-muted-foreground">{h.limiteTexto}</p>}
                      {h.salida.tipo !== 'imagen' && (
                        <p className="mt-0.5 text-[10px] text-muted-foreground">salida: {h.salida.tipo}</p>
                      )}
                      <p className="mt-1.5 text-[10px] text-muted-foreground tabular-nums">
                        coste base {fmtDinero(h.costeBase)} cr.
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}

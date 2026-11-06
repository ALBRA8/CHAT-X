// Panel de Configuración — API de la configuración en caliente.
//  GET    → catálogo completo con valor (secretos ENMASCARADOS) y fuente declarada
//           (bd = guardado desde el panel · env = .env del operador · defecto = código).
//  PUT    → guardar valores con un click (validación por definición; un secreto vacío
//           NUNCA borra el valor actual; texto vacío revierte a env/defecto).
//  DELETE → restaurar una clave (borra la fila: vuelve a mandar env o defecto).
// Todo cambio queda en el log de compliance (append-only).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { registrarEvento } from '@/lib/compliance'
import {
  DEFINICIONES_CONFIG,
  defConfig,
  recargarConfig,
  invalidarConfig,
  valorConfig,
  enmascararSecreto,
} from '@/lib/configuracion'
import { resetearProveedor } from '@/lib/provider/index'

export const dynamic = 'force-dynamic'

export async function GET() {
  await recargarConfig(true)
  const filas = await db.configuracion.findMany()
  const bdEn = new Map(filas.map((f) => [f.clave, f.updatedAt.toISOString()]))
  const entradas = DEFINICIONES_CONFIG.map((d) => {
    const v = valorConfig(d.clave)
    const secreto = d.tipo === 'secreto'
    return {
      clave: d.clave,
      etiqueta: d.etiqueta,
      descripcion: d.descripcion,
      categoria: d.categoria,
      tipo: d.tipo,
      envVar: d.envVar,
      valor: secreto ? enmascararSecreto(v.valor) : v.valor,
      definido: Boolean(v.valor),
      fuente: v.fuente,
      actualizadoEn: bdEn.get(d.clave) ?? null,
    }
  })
  return NextResponse.json({
    entradas,
    resumen: {
      total: entradas.length,
      desdePanel: entradas.filter((e) => e.fuente === 'bd').length,
      desdeEnv: entradas.filter((e) => e.fuente === 'env').length,
    },
  })
}

interface EntradaEntrante {
  clave?: unknown
  valor?: unknown
}

export async function PUT(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { entradas?: EntradaEntrante[] }
  const entradas = Array.isArray(body.entradas) ? body.entradas : []
  if (!entradas.length) return NextResponse.json({ error: 'Sin entradas que guardar.' }, { status: 400 })
  if (entradas.length > 30) return NextResponse.json({ error: 'Demasiadas entradas de una vez (máx 30).' }, { status: 400 })

  const tocadas: string[] = []
  for (const e of entradas) {
    const def = defConfig(String(e.clave ?? ''))
    if (!def) return NextResponse.json({ error: `Clave desconocida: ${String(e.clave)}` }, { status: 400 })
    const valor = typeof e.valor === 'string' ? e.valor.trim() : ''
    // Un secreto vacío = conservar el actual (borrarlo es explícito, con Restaurar).
    if (def.tipo === 'secreto' && !valor) continue
    if (valor.length > 500) return NextResponse.json({ error: `${def.etiqueta}: demasiado largo (máx 500).` }, { status: 400 })
    if (def.validar) {
      const err = def.validar(valor)
      if (err) return NextResponse.json({ error: `${def.etiqueta}: ${err}` }, { status: 400 })
    }
    if (!valor) {
      // texto/número vacío desde el panel = revertir a env/defecto.
      await db.configuracion.deleteMany({ where: { clave: def.clave } })
    } else {
      await db.configuracion.upsert({
        where: { clave: def.clave },
        create: { clave: def.clave, valor },
        update: { valor },
      })
    }
    tocadas.push(def.clave)
  }

  invalidarConfig()
  await recargarConfig(true)
  if (tocadas.includes('media.proveedor')) resetearProveedor()
  await registrarEvento('creacion', { tipo: 'config_actualizada', claves: tocadas, via: 'panel_configuracion' })
  return NextResponse.json({ ok: true, claves: tocadas })
}

export async function DELETE(req: NextRequest) {
  const clave = new URL(req.url).searchParams.get('clave') ?? ''
  const def = defConfig(clave)
  if (!def) return NextResponse.json({ error: `Clave desconocida: ${clave}` }, { status: 400 })
  await db.configuracion.deleteMany({ where: { clave: def.clave } })
  invalidarConfig()
  await recargarConfig(true)
  if (def.clave === 'media.proveedor') resetearProveedor()
  await registrarEvento('creacion', { tipo: 'config_restaurada', claves: [def.clave], via: 'panel_configuracion' })
  return NextResponse.json({ ok: true, clave: def.clave })
}

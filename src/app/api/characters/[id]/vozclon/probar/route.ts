// Prueba de una voz clonada: genera una nota corta con el perfil pedido y
// devuelve el WAV DIRECTO (sin fila Media — es una escucha de verificación, no
// una pieza). El texto pasa el filtro de edad igual que cualquier nota.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { detectarTerminosProhibidos } from '@/lib/constants'
import { generarVoz, validarContratoVoz } from '@/lib/provider/voz'
import { registrarEvento } from '@/lib/compliance'
import { recargarConfig } from '@/lib/configuracion'

const MAX_TEXTO = 300

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await recargarConfig()
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const c = await db.character.findUnique({ where: { id } })
  if (!c) return NextResponse.json({ error: 'Personaje no encontrado' }, { status: 404 })

  const perfilId = typeof body.perfilId === 'string' ? body.perfilId.trim() : ''
  const texto = typeof body.texto === 'string' ? body.texto.trim() : ''
  if (!perfilId) return NextResponse.json({ error: 'perfilId requerido' }, { status: 422 })
  if (!texto) return NextResponse.json({ error: 'texto requerido (1–300 caracteres)' }, { status: 422 })
  if (texto.length > MAX_TEXTO) return NextResponse.json({ error: `texto demasiado largo (máx ${MAX_TEXTO})` }, { status: 422 })

  const prohibidos = detectarTerminosProhibidos(texto)
  if (prohibidos.length) {
    await registrarEvento(
      'rechazo_qa',
      { modulo: 'voz_clon', moduloDetalle: 'Filtro de edad en prueba de voz', terminos: prohibidos },
      { characterId: id },
    )
    return NextResponse.json({ error: 'Filtro de edad aparente', terminos: prohibidos, estado: 'RECHAZADO' }, { status: 422 })
  }

  const perfil = await db.voiceProfile.findUnique({ where: { id: perfilId } })
  if (!perfil || perfil.characterId !== id) {
    return NextResponse.json({ error: 'Perfil no encontrado para este personaje' }, { status: 404 })
  }
  if (perfil.estado !== 'LISTO' || !perfil.embeddingB64) {
    return NextResponse.json(
      { error: 'El perfil no está LISTO o no tiene embedding — re-extraer la muestra', estado: perfil.estado },
      { status: 409 },
    )
  }

  const contrato = validarContratoVoz({
    provedor: 'clon-local',
    voz: perfil.id,
    velocidad: typeof body.velocidad === 'number' ? body.velocidad : 170,
    tono: 50,
  })
  if (!contrato.ok) return NextResponse.json({ error: 'Contrato inválido', errores: contrato.errores }, { status: 422 })

  const r = await generarVoz(texto, contrato.contrato, { embeddingB64: perfil.embeddingB64 })
  if (!r.ok) {
    return NextResponse.json({ error: 'Generación de voz no disponible', estado: r.estado, detalle: r.detalle, provedor: r.provedor }, { status: 503 })
  }

  await registrarEvento(
    'voz_clon_probada',
    { perfilId: perfil.id, duracionS: Number(r.duracionS.toFixed(2)), bytes: r.bytes },
    { characterId: id },
  )
  return new NextResponse(new Uint8Array(r.wav), {
    headers: {
      'Content-Type': 'audio/wav',
      'Content-Length': String(r.bytes),
      'X-Nota-Voz': encodeURIComponent((r.nota ?? '').slice(0, 300)),
      'X-Duracion-S': String(Number(r.duracionS.toFixed(2))),
    },
  })
}

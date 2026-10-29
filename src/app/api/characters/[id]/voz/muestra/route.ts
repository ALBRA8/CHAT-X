// Muestra de voz del personaje — capa 3 de clonación local (identidad por speaker
// embedding). Reglas duras:
//   · Las muestras son material PRIVADO: requieren sesión privada desbloqueada
//     (cookie httpOnly) y se guardan cifradas AES-256-GCM en Media (kind="voz").
//   · Consentimiento obligatorio: PROPIO (voz del equipo/producida) o
//     AUTORIZADO (tercero con permiso registrado). Sin consentimiento no hay
//     identidad — PENDIENTE se rechaza.
//   · Honestidad: sin extractor/modelo instalado, la muestra queda guardada y
//     el perfil queda NO_CONFIGURADO con el detalle exacto de qué falta.
// GET sirve la muestra descifrada en memoria (nunca cacheada, nunca pública).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { COOKIE_PRIVADA, sesionValida } from '@/lib/privado'
import { registrarEvento } from '@/lib/compliance'
import { dirDePieza, guardarBinarioCifrado, borrarBinario, leerBinarioCifrado } from '@/lib/media'
import {
  consentimientoValido,
  extraerEmbedding,
  sondaClonLocal,
  validarMuestra,
} from '@/lib/voz'
import path from 'path'

export const dynamic = 'force-dynamic'

function noAutorizado() {
  return NextResponse.json(
    { error: 'Las muestras de voz son material privado: desbloquea el modo privado para gestionarlas.' },
    { status: 401 },
  )
}

function sesionDe(req: NextRequest) {
  return sesionValida(req.cookies.get(COOKIE_PRIVADA)?.value)
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const sesion = sesionDe(req)
  if (!sesion) {
    return NextResponse.json({ error: 'muestra privada: desbloquea el modo privado' }, { status: 401 })
  }
  const perfil = await db.voiceProfile.findFirst({ where: { characterId: id } })
  if (!perfil?.sampleMediaId) return NextResponse.json({ error: 'sin muestra' }, { status: 404 })

  const media = await db.media.findUnique({ where: { id: perfil.sampleMediaId } })
  if (!media?.filePath) return NextResponse.json({ error: 'muestra no encontrada' }, { status: 404 })

  const datos = leerBinarioCifrado(media.filePath.replace(/\.enc$/, ''), sesion.masterKey)
  if (!datos) return NextResponse.json({ error: 'no se pudo descifrar la muestra' }, { status: 500 })

  return new NextResponse(new Uint8Array(datos), {
    headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store' },
  })
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const sesion = sesionDe(req)
  if (!sesion) return noAutorizado()

  const character = await db.character.findUnique({ where: { id } })
  if (!character) return NextResponse.json({ error: 'personaje no encontrado' }, { status: 404 })

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'se espera multipart/form-data con el archivo de audio' }, { status: 400 })
  }

  const archivo = form.get('archivo')
  const consentimiento = String(form.get('consentimiento') ?? '')
  const nota = String(form.get('nota') ?? '').slice(0, 500)
  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: 'falta el archivo de audio (campo "archivo")' }, { status: 400 })
  }
  if (!consentimientoValido(consentimiento)) {
    return NextResponse.json(
      { error: 'consentimiento inválido: declara PROPIO (voz del equipo) o AUTORIZADO (permiso de tercero registrado)' },
      { status: 400 },
    )
  }
  if (consentimiento === 'AUTORIZADO' && !nota.trim()) {
    return NextResponse.json(
      { error: 'voz AUTORIZADA requiere nota con quién autorizó y cuándo (trazabilidad)' },
      { status: 400 },
    )
  }

  const validacion = validarMuestra(archivo.name, archivo.type, archivo.size)
  if (!validacion.ok) {
    return NextResponse.json({ error: validacion.motivo }, { status: 400 })
  }

  const bytes = Buffer.from(await archivo.arrayBuffer())
  const mediaId = `voz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const base = path.join(dirDePieza(id), mediaId)
  const enc = guardarBinarioCifrado(base, bytes, sesion.masterKey)

  // Media de la muestra: PRIVADO, cifrada, con procedencia completa.
  const media = await db.media.create({
    data: {
      characterId: id,
      kind: 'voz',
      lane: 'PRIVADO',
      seed: mediaId,
      prompt: `muestra de voz para identidad (${consentimiento})`,
      filePath: `${base}.enc`,
      encIv: enc.iv,
      encTag: enc.tag,
      provenance: JSON.stringify({
        origen: 'muestra_voz',
        archivoOriginal: archivo.name,
        bytes: archivo.size,
        tipo: archivo.type,
        consentimiento,
        consentimientoNota: nota,
        registradoEn: new Date().toISOString(),
      }),
      aiLabels: JSON.stringify(['Muestra de voz — material privado']),
    },
  })

  await registrarEvento(
    'cifrado',
    { tipo: 'muestra_voz', consentimiento, bytes: archivo.size, archivoOriginal: archivo.name },
    { mediaId: media.id, characterId: id },
  )

  // Extracción de identidad. Si el extractor no está instalado, la identidad
  // queda pendiente con el bloqueo exacto — la muestra ya está segura.
  const resultado = await extraerEmbedding(`${base}.enc`)
  const perfilAnterior = await db.voiceProfile.findFirst({ where: { characterId: id } })

  const datos = {
    characterId: id,
    sampleMediaId: media.id,
    duracionMuestrasS: resultado.duracionS ?? perfilAnterior?.duracionMuestrasS ?? 0,
    consentimiento,
    consentimientoNota: nota,
    ...(resultado.ok
      ? {
          embeddingB64: resultado.embeddingB64!,
          dim: resultado.dim!,
          extractor: resultado.extractor!,
          estado: 'OPERATIVO',
          detalle: `identidad extraída de ${resultado.duracionS ?? '?'}s de audio con ${resultado.extractor}`,
        }
      : {
          estado: resultado.bloqueo?.includes('demasiado corta') || resultado.bloqueo?.includes('ausente o vacío') ? 'ERROR' : 'NO_CONFIGURADO',
          detalle: `muestra guardada y cifrada; identidad pendiente: ${resultado.bloqueo ?? 'motivo desconocido'}`,
        }),
  }

  const perfil = perfilAnterior
    ? await db.voiceProfile.update({ where: { id: perfilAnterior.id }, data: datos })
    : await db.voiceProfile.create({ data: datos })

  const sonda = await sondaClonLocal()
  return NextResponse.json({ ok: true, perfil, sonda })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const sesion = sesionDe(req)
  if (!sesion) return noAutorizado()

  const perfil = await db.voiceProfile.findFirst({ where: { characterId: id } })
  if (!perfil) return NextResponse.json({ error: 'sin perfil de voz' }, { status: 404 })

  if (perfil.sampleMediaId) {
    const media = await db.media.findUnique({ where: { id: perfil.sampleMediaId } })
    if (media?.filePath) borrarBinario(media.filePath.replace(/\.(enc|svg)$/, ''))
    if (media) await db.media.delete({ where: { id: media.id } })
  }
  await db.voiceProfile.delete({ where: { id: perfil.id } })
  await registrarEvento('acceso_privado', { tipo: 'voz_eliminada', characterId: id }, { characterId: id })

  return NextResponse.json({ ok: true })
}

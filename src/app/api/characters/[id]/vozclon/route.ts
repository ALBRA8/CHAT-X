// Clon de voz por personaje (P1.3 fase 3): perfiles de identidad vocal REAL
// (OpenVoice v2 + MeloTTS-es, MIT, $0 local). La voz vive como VECTOR SE (~KB)
// en la BD — nunca en terceros. La muestra original se guarda como Media
// kind="voz" lane PRIVADO (AES-256-GCM). Consentimiento OBLIGATORIO: sin
// declaración del operador no hay perfil (compliance).
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { db } from '@/lib/db'
import { LANE, ETIQUETA_IA, detectarTerminosProhibidos } from '@/lib/constants'
import { rutaPieza, guardarBinarioCifrado, guardarIvTag } from '@/lib/media'
import { registrarEvento } from '@/lib/compliance'
import { claveMaestraServidor } from '@/lib/clave-privada'
import { extraerEmbeddingClon, sondearProveedoresVoz, parsearContratoGuardado } from '@/lib/provider/voz'
import { recargarConfig } from '@/lib/configuracion'

const MAX_MUESTRA_BYTES = 30 * 1024 * 1024 // 30 MB — una muestra limpia cabe de sobra
const EXTENSIONES_OK = ['.wav', '.wave', '.ogg', '.flac', '.mp3']

/** GET: perfiles del personaje + estado honesto del proveedor clon-local. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const c = await db.character.findUnique({
    where: { id },
    select: { id: true, name: true, voiceContract: true },
  })
  if (!c) return NextResponse.json({ error: 'Personaje no encontrado' }, { status: 404 })

  const perfiles = await db.voiceProfile.findMany({
    where: { characterId: id },
    orderBy: { createdAt: 'desc' },
  })
  const contrato = parsearContratoGuardado(c.voiceContract)
  const sondaClon = sondearProveedoresVoz().find((s) => s.provedor === 'clon-local')!
  return NextResponse.json({
    sonda: sondaClon,
    contrato,
    perfiles: perfiles.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      modelo: p.modelo,
      estado: p.estado,
      duracionS: p.duracionS,
      nota: p.nota,
      consentimiento: p.consentimiento,
      tieneMuestra: Boolean(p.sampleMediaId),
      enUso: contrato?.provedor === 'clon-local' && contrato.voz === p.id,
      createdAt: p.createdAt,
    })),
  })
}

/** POST: crea un perfil de voz clonada desde una muestra de audio + consentimiento. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await recargarConfig()
  const { id } = await ctx.params
  const c = await db.character.findUnique({ where: { id } })
  if (!c) return NextResponse.json({ error: 'Personaje no encontrado' }, { status: 404 })

  // El proveedor debe estar REAL en esta máquina antes de aceptar muestras.
  const sondaClon = sondearProveedoresVoz().find((s) => s.provedor === 'clon-local')!
  if (sondaClon.estado !== 'OPERATIVO') {
    return NextResponse.json(
      { error: 'Clon de voz no disponible en esta máquina', estado: sondaClon.estado, detalle: sondaClon.detalle },
      { status: 503 },
    )
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'se espera multipart/form-data con el campo muestra' }, { status: 400 })
  }

  const nombre = String(form.get('nombre') ?? '').trim()
  const consentimiento = String(form.get('consentimiento') ?? '').trim()
  if (!nombre || nombre.length > 80) {
    return NextResponse.json({ error: 'nombre requerido (1–80 caracteres)' }, { status: 422 })
  }
  if (consentimiento.length < 20) {
    return NextResponse.json(
      { error: 'consentimiento obligatorio: declara la fuente de la voz y el permiso de uso (mínimo 20 caracteres)' },
      { status: 422 },
    )
  }
  // La identidad vocal también pasa el filtro de edad: la declaración no puede
  // contener términos prohibidos (mismo estándar que el resto de contenido).
  const prohibidos = detectarTerminosProhibidos(`${nombre} ${consentimiento}`)
  if (prohibidos.length) {
    await registrarEvento(
      'rechazo_qa',
      { modulo: 'voz_clon', moduloDetalle: 'Filtro de edad en consentimiento', terminos: prohibidos },
      { characterId: id },
    )
    return NextResponse.json({ error: 'Filtro de edad aparente', terminos: prohibidos, estado: 'RECHAZADO' }, { status: 422 })
  }

  const muestra = form.get('muestra')
  if (!(muestra instanceof File) || muestra.size === 0) {
    return NextResponse.json({ error: 'muestra de audio requerida (wav/ogg/flac/mp3)' }, { status: 422 })
  }
  if (muestra.size > MAX_MUESTRA_BYTES) {
    return NextResponse.json({ error: `muestra demasiado grande (máx ${Math.round(MAX_MUESTRA_BYTES / 1024 / 1024)} MB)` }, { status: 422 })
  }
  const ext = path.extname(muestra.name || '').toLowerCase()
  if (!EXTENSIONES_OK.includes(ext)) {
    return NextResponse.json({ error: `formato no soportado "${ext || 'desconocido'}" — usa wav, ogg, flac o mp3` }, { status: 422 })
  }

  // Muestra a archivo temporal PLANO (el script necesita leer bytes reales).
  const tmp = path.join(os.tmpdir(), `chatx-clon-muestra-${process.pid}-${Date.now()}${ext}`)
  fs.writeFileSync(tmp, Buffer.from(await muestra.arrayBuffer()))
  let extraccion: Awaited<ReturnType<typeof extraerEmbeddingClon>>
  try {
    extraccion = await extraerEmbeddingClon(tmp)
  } finally {
    try {
      fs.unlinkSync(tmp)
    } catch {
      /* ya no existía */
    }
  }
  if (!extraccion.ok) {
    return NextResponse.json(
      { error: 'No se pudo extraer la identidad de la voz', detalle: extraccion.detalle, estado: 'ERROR' },
      { status: 503 },
    )
  }

  // La muestra original queda cifrada como Media PRIVADO (material sensible).
  const masterKey = await claveMaestraServidor()
  const mediaId = randomUUID()
  const fecha = new Date()
  const base = rutaPieza(id, mediaId, 'full', fecha)
  let filePath: string | null = null
  let encIv: string | null = null
  let encTag: string | null = null
  if (masterKey) {
    const enc = guardarBinarioCifrado(base, Buffer.from(await muestra.arrayBuffer()), masterKey)
    guardarIvTag(base, enc)
    filePath = `${base}.enc`
    encIv = enc.iv
    encTag = enc.tag
  } else {
    // Sin contraseña privada NO se guarda la muestra: el perfil igual sirve
    // (el embedding ya está extraído), se registra honesto en la nota.
    filePath = null
  }

  const perfil = await db.voiceProfile.create({
    data: {
      characterId: id,
      nombre,
      modelo: 'openvoice-v2',
      embeddingB64: extraccion.embeddingB64,
      sampleMediaId: filePath ? mediaId : null,
      consentimiento,
      duracionS: extraccion.duracionS,
      estado: 'LISTO',
      nota: masterKey
        ? `muestra ${muestra.name} cifrada (PRIVADO) · ${extraccion.trozos} trozo(s) · extracción ${extraccion.generacionS}s`
        : `sin contraseña privada: la muestra NO se retuvo (solo el embedding) · ${extraccion.trozos} trozo(s)`,
    },
  })

  if (filePath) {
    await db.media.create({
      data: {
        id: mediaId,
        characterId: id,
        kind: 'voz',
        lane: LANE.PRIVADO,
        prompt: `muestra de voz para clon "${nombre}"`,
        seed: `vozclon-muestra-${mediaId}`,
        checkpoint: 'openvoice-v2',
        qualityVerdict: 'APROBADO',
        filtersTriggered: JSON.stringify([]),
        aiLabels: JSON.stringify([ETIQUETA_IA]),
        pipelineStatus: 'cifrado',
        filePath,
        encIv,
        encTag,
        provenance: JSON.stringify({
          personaje: c.name,
          characterId: id,
          modulo: 'voz_clon_muestra',
          perfilId: perfil.id,
          consentimiento,
          duracionS: extraccion.duracionS,
          bytes: muestra.size,
          carril: LANE.PRIVADO,
          coste: 0,
          generadoEn: fecha.toISOString(),
        }),
      },
    })
  }

  await registrarEvento(
    'voz_clon_creada',
    {
      perfilId: perfil.id,
      nombre,
      modelo: 'openvoice-v2',
      duracionS: extraccion.duracionS,
      trozos: extraccion.trozos,
      muestraRetenida: Boolean(filePath),
      consentimientoLen: consentimiento.length,
    },
    { characterId: id },
  )

  return NextResponse.json(
    {
      perfil: {
        id: perfil.id,
        nombre: perfil.nombre,
        modelo: perfil.modelo,
        estado: perfil.estado,
        duracionS: perfil.duracionS,
        nota: perfil.nota,
      },
      estado: 'OPERATIVO',
    },
    { status: 201 },
  )
}

/** DELETE: borra un perfil (?perfilId=) y resetea el contrato si lo apuntaba. */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const perfilId = req.nextUrl.searchParams.get('perfilId') ?? ''
  const c = await db.character.findUnique({ where: { id }, select: { id: true, voiceContract: true } })
  if (!c) return NextResponse.json({ error: 'Personaje no encontrado' }, { status: 404 })
  const perfil = await db.voiceProfile.findUnique({ where: { id: perfilId } })
  if (!perfil || perfil.characterId !== id) {
    return NextResponse.json({ error: 'Perfil no encontrado para este personaje' }, { status: 404 })
  }

  await db.voiceProfile.delete({ where: { id: perfilId } })

  // Honestidad: si el contrato apuntaba al perfil borrado, se resetea (no se
  // deja un contrato zombi que fallaría en cada nota de voz).
  const contrato = parsearContratoGuardado(c.voiceContract)
  if (contrato?.provedor === 'clon-local' && contrato.voz === perfilId) {
    await db.character.update({ where: { id }, data: { voiceContract: '{}' } })
  }

  await registrarEvento('voz_clon_borrada', { perfilId, nombre: perfil.nombre }, { characterId: id })
  return NextResponse.json({ ok: true, borrado: perfilId })
}

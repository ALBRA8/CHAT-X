// Clon de voz por personaje (P1.3 fase 3): perfiles de identidad vocal REAL
// (speaker embedding local, $0). La voz vive como VECTOR (KB) en la BD —
// nunca en terceros. La muestra original se guarda como Media kind="voz"
// lane PRIVADO (AES-256-GCM). Consentimiento OBLIGATORIO (regla dura):
// PROPIO o AUTORIZADO con declaración ≥20 caracteres — sin eso no hay perfil.
//
// REPARACIÓN (S-010): esta ruta quedó A MEDIAS en f91a606 (sesión sin
// registro): importaba `extraerEmbeddingClon` y una sonda 'clon-local' que
// nunca existieron — el build llevaba roto desde ese commit. Hoy se conectó
// a la capa REAL que sí existe: src/lib/voz.ts (sondaClonLocal +
// extraerEmbedding vía scripts/voz_clon_{sonda,extraer}.py). Sin los scripts
// ni paquetes instalados, el estado es honesto: NO_CONFIGURADO/ERROR con el
// detalle exacto — jamás OPERATIVO falso.
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
import { parsearContratoGuardado } from '@/lib/provider/voz'
import { extraerEmbedding, sondaClonLocal, validarMuestra, consentimientoValido } from '@/lib/voz'
import { recargarConfig } from '@/lib/configuracion'

/** GET: perfiles del personaje + estado honesto del subsistema clon-local. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const c = await db.character.findUnique({
    where: { id },
    select: { id: true, name: true, voiceContract: true },
  })
  if (!c) return NextResponse.json({ error: 'Personaje no encontrado' }, { status: 404 })

  const [perfiles, sonda] = await Promise.all([db.voiceProfile.findMany({
    where: { characterId: id },
    orderBy: { createdAt: 'desc' },
  }), sondaClonLocal()])
  const contrato = parsearContratoGuardado(c.voiceContract)
  return NextResponse.json({
    sonda,
    contrato,
    perfiles: perfiles.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      extractor: p.extractor,
      estado: p.estado,
      duracionMuestrasS: p.duracionMuestrasS,
      detalle: p.detalle,
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

  // El subsistema debe estar REAL en esta máquina antes de aceptar muestras.
  // Sin extractor/modelos instalados: NO_CONFIGURADO honesto, 503, cero simulación.
  const sonda = await sondaClonLocal()
  if (sonda.estado !== 'OPERATIVO') {
    return NextResponse.json(
      { error: 'Clon de voz no disponible en esta máquina', estado: sonda.estado, detalle: sonda.detalle },
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
  const consentimientoNota = String(form.get('consentimientoNota') ?? '').trim()
  if (!nombre || nombre.length > 80) {
    return NextResponse.json({ error: 'nombre requerido (1–80 caracteres)' }, { status: 422 })
  }
  if (!consentimientoValido(consentimiento)) {
    return NextResponse.json(
      { error: 'consentimiento debe ser PROPIO o AUTORIZADO (regla dura: solo voces propias o con permiso registrado)' },
      { status: 422 },
    )
  }
  if (consentimientoNota.length < 20) {
    return NextResponse.json(
      { error: 'declaración de consentimiento obligatoria: fuente de la voz y permiso de uso (mínimo 20 caracteres)' },
      { status: 422 },
    )
  }
  // La identidad vocal también pasa el filtro de edad: la declaración no puede
  // contener términos prohibidos (mismo estándar que el resto de contenido).
  const prohibidos = detectarTerminosProhibidos(`${nombre} ${consentimientoNota}`)
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
    return NextResponse.json({ error: 'muestra de audio requerida (wav/mp3/m4a/ogg/webm/flac/opus)' }, { status: 422 })
  }
  const validez = validarMuestra(muestra.name, muestra.type, muestra.size)
  if (!validez.ok) {
    return NextResponse.json({ error: validez.motivo ?? 'muestra inválida' }, { status: 422 })
  }

  // Muestra a archivo temporal PLANO (el script necesita leer bytes reales).
  const ext = path.extname(muestra.name || '') || '.wav'
  const tmp = path.join(os.tmpdir(), `chatx-clon-muestra-${process.pid}-${Date.now()}${ext}`)
  fs.writeFileSync(tmp, Buffer.from(await muestra.arrayBuffer()))
  const extraccion = await (async () => {
    try {
      return await extraerEmbedding(tmp)
    } finally {
      try {
        fs.unlinkSync(tmp)
      } catch {
        /* ya no existía */
      }
    }
  })()
  if (!extraccion.ok || !extraccion.embeddingB64) {
    return NextResponse.json(
      { error: 'No se pudo extraer la identidad de la voz', detalle: extraccion.bloqueo ?? 'motivo desconocido', estado: 'ERROR' },
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
    // (el embedding ya está extraído), se registra honesto en el detalle.
    filePath = null
  }

  const perfil = await db.voiceProfile.create({
    data: {
      characterId: id,
      nombre,
      embeddingB64: extraccion.embeddingB64,
      dim: extraccion.dim ?? 0,
      extractor: extraccion.extractor ?? 'desconocido',
      duracionMuestrasS: extraccion.duracionS ?? 0,
      sampleMediaId: filePath ? mediaId : null,
      consentimiento,
      consentimientoNota,
      estado: 'OPERATIVO',
      detalle: masterKey
        ? `muestra ${muestra.name} cifrada (PRIVADO) · extracción ${extraccion.duracionS ?? 0}s`
        : `sin contraseña privada: la muestra NO se retuvo (solo el embedding)`,
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
        checkpoint: perfil.extractor,
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
          duracionMuestrasS: perfil.duracionMuestrasS,
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
      extractor: perfil.extractor,
      dim: perfil.dim,
      duracionMuestrasS: perfil.duracionMuestrasS,
      muestraRetenida: Boolean(filePath),
      consentimiento,
      consentimientoLen: consentimientoNota.length,
    },
    { characterId: id },
  )

  return NextResponse.json(
    {
      perfil: {
        id: perfil.id,
        nombre: perfil.nombre,
        extractor: perfil.extractor,
        estado: perfil.estado,
        duracionMuestrasS: perfil.duracionMuestrasS,
        detalle: perfil.detalle,
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

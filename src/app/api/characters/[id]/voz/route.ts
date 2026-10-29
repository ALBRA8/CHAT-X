// Voz del personaje — PILAR COMPLETO (integración de las dos líneas de trabajo, 2026-10-30):
//   · Capa 2 — contrato de voz por personaje + generación de notas de voz (P1.3,
//     TTS local $0: espeak/piper). GET devuelve proveedores sondeados + contrato
//     guardado; PUT guarda el contrato; POST genera la nota de voz.
//   · Capa 3 — clonación local (identidad por speaker embedding): la gestión de
//     muestras (subida cifrada + extracción + borrado) vive en voz/muestra/.
// Reglas duras compartidas:
//   · Material PRIVADO se cifra AES-256-GCM; las muestras exigen consentimiento
//     PROPIO/AUTORIZADO (PENDIENTE rechazado) con sesión privada abierta.
//   · Filtro de edad duro también para el texto hablado (misma lista que el brief).
//   · Honestidad: 503 con estado real del proveedor; 409 NO_CONFIGURADO con detalle.
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { db } from '@/lib/db'
import { LANE, ETIQUETA_IA, detectarTerminosProhibidos } from '@/lib/constants'
import { rutaPieza, guardarBinarioClaro, guardarBinarioCifrado, guardarIvTag } from '@/lib/media'
import { registrarEvento } from '@/lib/compliance'
import { claveMaestraServidor } from '@/lib/clave-privada'
import { sondaClonLocal } from '@/lib/voz'
import {
  parsearContratoGuardado,
  sondearProveedoresVoz,
  validarContratoVoz,
  generarVoz,
} from '@/lib/provider/voz'

export const dynamic = 'force-dynamic'

const MAX_TEXTO = 600 // ~60 s de nota de voz a velocidad normal

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const c = await db.character.findUnique({ where: { id } })
  if (!c) return NextResponse.json({ error: 'Personaje no encontrado' }, { status: 404 })

  // GET unión: capa 2 (proveedores + contrato) y capa 3 (perfil clon + sonda honesta).
  const [perfil, sonda] = await Promise.all([
    db.voiceProfile.findFirst({ where: { characterId: id }, orderBy: { createdAt: 'desc' } }),
    sondaClonLocal(),
  ])
  return NextResponse.json({
    proveedores: sondearProveedoresVoz(),
    contrato: parsearContratoGuardado(c.voiceContract),
    perfil,
    sonda,
  })
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const c = await db.character.findUnique({ where: { id }, select: { id: true } })
  if (!c) return NextResponse.json({ error: 'Personaje no encontrado' }, { status: 404 })

  const v = validarContratoVoz(body)
  if (!v.ok) return NextResponse.json({ error: 'Contrato de voz inválido', errores: v.errores }, { status: 422 })

  await db.character.update({ where: { id }, data: { voiceContract: JSON.stringify(v.contrato) } })
  return NextResponse.json({ contrato: v.contrato })
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const c = await db.character.findUnique({ where: { id } })
  if (!c) return NextResponse.json({ error: 'Personaje no encontrado' }, { status: 404 })

  // Contrato: el guardado por personaje es la única fuente (honesto: sin override
  // ad-hoc por petición — el contrato se define y se audita en el Panel).
  const contrato = parsearContratoGuardado(c.voiceContract)
  if (!contrato) {
    return NextResponse.json(
      { error: 'Este personaje no tiene contrato de voz. Define uno con PUT en esta ruta.', estado: 'NO_CONFIGURADO' },
      { status: 409 },
    )
  }

  const texto = typeof body.texto === 'string' ? body.texto.trim() : ''
  if (!texto) return NextResponse.json({ error: 'texto requerido (1–600 caracteres)' }, { status: 422 })
  if (texto.length > MAX_TEXTO) return NextResponse.json({ error: `texto demasiado largo (máx ${MAX_TEXTO})` }, { status: 422 })

  // Filtro de edad duro — la voz no es excepción: mismos términos prohibidos que el brief visual.
  const prohibidos = detectarTerminosProhibidos(texto)
  if (prohibidos.length) {
    await registrarEvento(
      'rechazo_qa',
      { modulo: 'voz', moduloDetalle: 'Filtro de edad aparente', terminos: prohibidos, textoLen: texto.length },
      { characterId: id },
    )
    return NextResponse.json(
      { error: 'Filtro de edad aparente', terminos: prohibidos, estado: 'RECHAZADO' },
      { status: 422 },
    )
  }

  const lane = body.lane === LANE.PUBLICO ? LANE.PUBLICO : LANE.PRIVADO

  // Carril privado: exige contraseña privada definida (clave envuelta con secreto de servidor).
  let masterKey: Buffer | null = null
  if (lane === LANE.PRIVADO) {
    masterKey = await claveMaestraServidor()
    if (!masterKey) {
      return NextResponse.json(
        { error: 'Carril privado bloqueado: define la contraseña privada antes de cifrar notas de voz.', estado: 'NO_CONFIGURADO' },
        { status: 409 },
      )
    }
  }

  const r = await generarVoz(texto, contrato)
  if (!r.ok) {
    return NextResponse.json({ error: 'Generación de voz no disponible', estado: r.estado, detalle: r.detalle, provedor: r.provedor }, { status: 503 })
  }

  // Pieza de voz: Media kind="voz" con procedencia completa (Anexo A regla 5).
  const mediaId = randomUUID()
  const fecha = new Date()
  const base = rutaPieza(id, mediaId, 'full', fecha)
  let filePath: string
  let encIv: string | null = null
  let encTag: string | null = null

  if (lane === LANE.PRIVADO && masterKey) {
    const enc = guardarBinarioCifrado(base, r.wav, masterKey)
    guardarIvTag(base, enc)
    filePath = base + '.enc'
    encIv = enc.iv // ya es hex string (convención EncryptedBlob de crypto.ts)
    encTag = enc.tag
  } else {
    guardarBinarioClaro(base, r.wav)
    filePath = base + '.wav'
  }

  const provenance = {
    personaje: c.name,
    characterId: id,
    modulo: 'voz',
    provedor: r.provedor,
    contrato,
    texto,
    textoLen: texto.length,
    duracionS: Number(r.duracionS.toFixed(2)),
    bytes: r.bytes,
    carril: lane,
    coste: 0, // TTS local, $0 — sin cobro (la vía de cobro es asegurarSaldo y no aplica)
    generadoEn: fecha.toISOString(),
  }

  const media = await db.media.create({
    data: {
      id: mediaId,
      characterId: id,
      kind: 'voz',
      lane,
      prompt: texto, // procedencia: el texto exacto hablado
      seed: `voz-${mediaId}`,
      checkpoint: contrato.provedor, // marcador de proveedor real (espeak-local | piper-local)
      qualityVerdict: 'APROBADO', // sin QA visual aplicable; el filtro de edad ya pasó
      filtersTriggered: JSON.stringify([]),
      aiLabels: JSON.stringify([ETIQUETA_IA]),
      pipelineStatus: lane === LANE.PRIVADO ? 'cifrado' : 'aprobado',
      filePath,
      encIv,
      encTag,
      provenance: JSON.stringify(provenance),
    },
  })

  await registrarEvento(
    'voz_generada',
    { provedor: r.provedor, voz: contrato.voz, duracionS: Number(r.duracionS.toFixed(2)), bytes: r.bytes, carril: lane },
    { mediaId: media.id, characterId: id },
  )

  return NextResponse.json({
    media: {
      id: media.id,
      characterId: media.characterId,
      kind: media.kind,
      lane: media.lane,
      prompt: media.prompt,
      seed: media.seed,
      checkpoint: media.checkpoint,
      filePath: media.filePath,
      pipelineStatus: media.pipelineStatus,
      aiLabels: media.aiLabels,
    },
    duracionS: Number(r.duracionS.toFixed(2)),
    bytes: r.bytes,
    provedor: r.provedor,
    nota: r.nota ?? null, // honestidad: piper declara tono fijo / voz sustituta
    estado: 'OPERATIVO',
  })
}

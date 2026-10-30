// Motor GFE "Modo Novia" — chat con media en contexto (P1.1 CLONAKIT_BRECHAS).
//
// POST /api/chat {characterId, texto} → detecta intención:
//   - foto  → job lote_fotos REAL (1 pieza, carril PÚBLICO, QA + compliance del
//             worker) + mensaje personaje estado="generando" con jobId; el GET
//             resuelve la media cuando el job termina (o marca fallido + nota;
//             el reembolso de créditos por fallo ya es del worker).
//   - voz   → nota de voz del contrato del personaje (P1.3) generada al vuelo
//             ($0 local) + Media kind=voz; 409 honesto si no hay contrato.
//   - texto → LLM real (sonda OPERATIVA: Groq u otro OpenAI-compatible) con el system
//             prompt del companion; la salida pasa por el filtro de edad igual que la
//             entrada. Si el LLM no está operativo, plantilla del genoma DECLARADA
//             (meta.modo='plantilla_genoma' + llmEstado/llmFallo) — nunca se finge LLM.
//
// GET /api/chat?characterId=&limit= → historial con resolución de estados y
// datos de la pieza adjunta (kind, lane, etiqueta IA, procedencia).
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { db } from '@/lib/db'
import { LANE, ETIQUETA_IA, detectarTerminosProhibidos } from '@/lib/constants'
import { COSTOS } from '@/lib/constants'
import { asegurarSaldo } from '@/lib/api-utils'
import { registrarEvento } from '@/lib/compliance'
import { rutaPieza, guardarBinarioClaro } from '@/lib/media'
import { parsearContratoGuardado, estadoProveedor, generarVoz } from '@/lib/provider/voz'
import { sondearLLM, generarRespuestaLLM, historialDesdeMensajes, salidaLLMSegura } from '@/lib/provider/llm'
import { detectarIntencion, briefDesdeGenoma, respuestaPlantilla, fraseEntregaFoto, parseGenoma } from '@/lib/chat'

const MAX_TEXTO = 600

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const characterId = sp.get('characterId')
  if (!characterId) return NextResponse.json({ error: 'characterId requerido' }, { status: 400 })
  const limit = Math.min(200, Number(sp.get('limit')) || 100)

  const c = await db.character.findUnique({ where: { id: characterId }, select: { id: true } })
  if (!c) return NextResponse.json({ error: 'Personaje no encontrado' }, { status: 404 })

  const msgs = await db.chatMessage.findMany({
    where: { characterId },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })

  // Resolución de estados: mensaje "generando" → consultar su job (lectura con
  // write-back; el worker NO se acopla al chat).
  const resueltas = await Promise.all(
    msgs.map(async (m) => {
      if (m.estado !== 'generando' || !m.jobId) return m
      const job = await db.job.findUnique({ where: { id: m.jobId } })
      if (!job) return m
      if (job.status === 'listo') {
        let mediaId: string | null = null
        try {
          mediaId = (JSON.parse(job.result || '{}') as { mediaIds?: string[] }).mediaIds?.[0] ?? null
        } catch {
          mediaId = null
        }
        if (mediaId) {
          return db.chatMessage.update({
            where: { id: m.id },
            data: { estado: 'entregado', mediaId, texto: m.texto || 'Pieza lista (batch del chat).' },
          })
        }
      }
      if (job.status === 'fallido') {
        return db.chatMessage.update({
          where: { id: m.id },
          data: {
            estado: 'fallido',
            texto: 'La generación falló y tus créditos fueron reembolsados — política de reembolso por fallo.',
            meta: JSON.stringify({ ...(JSON.parse(m.meta || '{}')), fallo: job.error ?? 'sin detalle' }),
          },
        })
      }
      return m
    }),
  )

  // Adjuntos: una sola consulta para las piezas referenciadas
  const mediaIds = resueltas.map((m) => m.mediaId).filter((x): x is string => !!x)
  const medias = mediaIds.length
    ? await db.media.findMany({ where: { id: { in: mediaIds } } })
    : []
  const mediaPorId = new Map(medias.map((m) => [m.id, m]))

  return NextResponse.json({
    mensajes: resueltas.map((m) => ({
      id: m.id,
      rol: m.rol,
      tipo: m.tipo,
      texto: m.texto,
      estado: m.estado,
      media: m.mediaId ? mediaPorId.get(m.mediaId) : null,
      meta: JSON.parse(m.meta || '{}'),
      createdAt: m.createdAt,
    })),
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const characterId = typeof body.characterId === 'string' ? body.characterId : ''
  const texto = typeof body.texto === 'string' ? body.texto.trim() : ''
  if (!characterId || !texto) return NextResponse.json({ error: 'characterId y texto requeridos' }, { status: 400 })
  if (texto.length > MAX_TEXTO) return NextResponse.json({ error: `texto demasiado largo (máx ${MAX_TEXTO})` }, { status: 422 })

  const c = await db.character.findUnique({ where: { id: characterId } })
  if (!c) return NextResponse.json({ error: 'Personaje no encontrado' }, { status: 404 })
  if (c.status !== 'ACTIVO') {
    return NextResponse.json(
      { error: `El chat GFE es para personajes ACTIVOS (este está ${c.status}).`, estado: 'NO_CONFIGURADO' },
      { status: 409 },
    )
  }

  // Mensaje del operador (auditado, con el filtro de edad duro de la plataforma)
  const prohibidos = detectarTerminosProhibidos(texto)
  if (prohibidos.length) {
    await registrarEvento('rechazo_qa', { modulo: 'chat_gfe', motivo: 'Filtro de edad aparente', terminos: prohibidos }, { characterId })
    return NextResponse.json({ error: 'Filtro de edad aparente', terminos: prohibidos, estado: 'RECHAZADO' }, { status: 422 })
  }
  const msgOperador = await db.chatMessage.create({ data: { characterId, rol: 'operador', tipo: 'texto', texto } })

  const intencion = detectarIntencion(texto)

  // ── Intención FOTO: pieza real por el pipeline del Estudio ──
  if (intencion === 'foto') {
    const brief = briefDesdeGenoma(c)
    const coste = COSTOS.PREVIEW // 1 pieza
    const saldo = await asegurarSaldo(coste)
    if (!saldo.ok) {
      return NextResponse.json({ error: saldo.error!, estado: 'SIN_SALDO' }, { status: 402 })
    }
    const batchId = `chat_${Date.now()}_${Math.floor(Math.random() * 1e4)}`
    const job = await db.job.create({
      data: {
        type: 'lote_fotos',
        characterId,
        priority: 3, // el chat espera: prioridad alta sin ser crítica
        costEstimate: coste,
        payload: JSON.stringify({ modo: 'preview', lane: LANE.PUBLICO, brief, count: 1, batchId, varianteBase: 0 }),
      },
    })
    await registrarEvento('creacion', { tipo: 'lote_previews', origen: 'chat_gfe', count: 1, coste, brief }, { characterId })
    const g = parseGenoma(c)
    const msg = await db.chatMessage.create({
      data: {
        characterId,
        rol: 'personaje',
        tipo: 'imagen',
        texto: fraseEntregaFoto(c),
        jobId: job.id,
        estado: 'generando',
        meta: JSON.stringify({ intencion: 'foto', modo: 'plantilla_genoma', batchId, brief, tono: g.tono ?? '' }),
      },
    })
    return NextResponse.json({ mensaje: { id: msg.id, rol: msg.rol, tipo: msg.tipo, estado: msg.estado, jobId: job.id, coste }, estado: 'GENERANDO' }, { status: 202 })
  }

  // ── Intención VOZ: nota de voz del contrato del personaje (P1.3) ──
  if (intencion === 'voz') {
    const contrato = parsearContratoGuardado(c.voiceContract)
    if (!contrato) {
      const r = respuestaPlantilla(c, texto)
      const msg = await db.chatMessage.create({
        data: {
          characterId, rol: 'personaje', tipo: 'texto', texto: r,
          meta: JSON.stringify({ intencion: 'voz', modo: 'plantilla_genoma', nota: 'sin contrato de voz: define uno en /api/characters/[id]/voz' }),
        },
      })
      return NextResponse.json({ mensaje: { id: msg.id, tipo: msg.tipo, estado: msg.estado }, estado: 'NO_CONFIGURADO' }, { status: 409 })
    }
    const sonda = estadoProveedor(contrato.provedor)
    if (sonda.estado !== 'OPERATIVO') {
      return NextResponse.json({ error: 'Proveedor de voz no disponible en esta máquina', estado: sonda.estado, detalle: sonda.detalle }, { status: 503 })
    }
    const r = await generarVoz(texto.length > 40 ? `Hola, soy ${c.name}. Te mando esta nota de voz.` : texto, contrato)
    if (!r.ok) {
      return NextResponse.json({ error: 'Generación de voz no disponible', estado: r.estado, detalle: r.detalle }, { status: 503 })
    }
    const mediaId = randomUUID()
    const base = rutaPieza(characterId, mediaId, 'full')
    guardarBinarioClaro(base, r.wav) // notas de voz del chat: carril público (el privado ya soporta cifrado en /voz)
    const media = await db.media.create({
      data: {
        id: mediaId,
        characterId,
        kind: 'voz',
        lane: LANE.PUBLICO,
        prompt: texto,
        seed: `voz-chat-${mediaId}`,
        checkpoint: contrato.provedor,
        qualityVerdict: 'APROBADO',
        filtersTriggered: JSON.stringify([]),
        aiLabels: JSON.stringify([ETIQUETA_IA]),
        pipelineStatus: 'aprobado',
        filePath: base + '.wav',
        provenance: JSON.stringify({ modulo: 'chat_gfe', provedor: r.provedor, contrato, texto, coste: 0, generadoEn: new Date().toISOString() }),
      },
    })
    await registrarEvento('voz_generada', { origen: 'chat_gfe', provedor: r.provedor, duracionS: Number(r.duracionS.toFixed(2)), bytes: r.bytes }, { mediaId: media.id, characterId })
    const g = parseGenoma(c)
    const msg = await db.chatMessage.create({
      data: {
        characterId, rol: 'personaje', tipo: 'voz', texto: 'Te mando una nota de voz.', mediaId: media.id,
        estado: 'entregado', meta: JSON.stringify({ intencion: 'voz', modo: 'plantilla_genoma', duracionS: Number(r.duracionS.toFixed(2)), tono: g.tono ?? '' }),
      },
    })
    return NextResponse.json({ mensaje: { id: msg.id, tipo: msg.tipo, estado: msg.estado, mediaId: media.id, duracionS: Number(r.duracionS.toFixed(2)) }, estado: 'OPERATIVO' })
  }

  // ── Texto: LLM real si la sonda da OPERATIVO; si no, plantilla del genoma DECLARADA ──
  const sondaLLM = await sondearLLM()
  let textoRespuesta = respuestaPlantilla(c, texto)
  let modo = 'plantilla_genoma'
  const meta: Record<string, unknown> = { intencion: 'texto', modo }

  if (sondaLLM.estado === 'OPERATIVO') {
    // Historial de texto ANTERIOR al mensaje recién guardado (últimos 12, en orden)
    const filas = await db.chatMessage.findMany({
      where: { characterId, tipo: 'texto', id: { not: msgOperador.id } },
      orderBy: { createdAt: 'desc' },
      take: 12,
    })
    const r = await generarRespuestaLLM(c, historialDesdeMensajes(filas.reverse()), texto)
    if (r.ok) {
      const salida = salidaLLMSegura(r.texto)
      if (salida.ok) {
        textoRespuesta = salida.texto
        modo = `llm_${r.provedor}`
        meta.modo = modo
        meta.modelo = r.modelo
        meta.uso = r.uso
        await registrarEvento('llm_chat', { origen: 'chat_gfe', provedor: r.provedor, modelo: r.modelo, caracteres: salida.texto.length, uso: r.uso }, { characterId })
      } else {
        // El LLM violó el filtro de edad en su SALIDA → plantilla + rechazo auditado
        meta.llmEstado = 'RECHAZADO_FILTRO'
        meta.llmMotivo = 'la salida del LLM activó el filtro de edad de la plataforma'
        await registrarEvento('rechazo_qa', { modulo: 'chat_gfe', motivo: 'Filtro de edad en la salida del LLM', terminosRechazados: salida.terminos.length, provedor: r.provedor }, { characterId })
      }
    } else {
      meta.llmEstado = r.estado
      meta.llmFallo = r.detalle.slice(0, 200)
    }
  } else {
    meta.llmEstado = sondaLLM.estado
    meta.llmDetalle = sondaLLM.detalle.slice(0, 200)
  }

  const msg = await db.chatMessage.create({
    data: { characterId, rol: 'personaje', tipo: 'texto', texto: textoRespuesta, meta: JSON.stringify(meta) },
  })
  return NextResponse.json({ mensaje: { id: msg.id, rol: msg.rol, tipo: msg.tipo, texto: msg.texto, estado: msg.estado, modo }, estado: 'OPERATIVO' })
}

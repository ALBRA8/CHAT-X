// F3 — iniciativas programadas del cuarto Telegram PROPIO: superficie del
// OPERADOR (panel). El daemon no entra aquí: su puerta es el webhook firmado
// de /api/telegram/conversacion (accion 'iniciativas_vencidas'). Mismas reglas
// duras que WhatsApp W4: consentimiento 1:1 (tope 3 pendientes por chat),
// horizonte de 30 días, cancelación solo en programada (en_cola ya fue
// instruida: no hay des-instruir honesto), compliance append-only.
//
//  GET → programadas pendientes + historial (chatId SIEMPRE enmascarado).
//  POST accion 'programar' {chatId, programadaEn?, texto?}  (chatId numérico
//        de Telegram — los @handles NO son chatIds)
//  POST accion 'cancelar' {id}
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { registrarEvento } from '@/lib/compliance'
import { recargarConfig, valorConfig } from '@/lib/configuracion'
import { mascararChatIdTelegram, validarProgramacionTelegram, fueraDeHorizonte } from '@/lib/telegram/telegram'
import { MAX_HORIZONTE_DIAS, MAX_PROGRAMADAS_POR_CHAT, transicionCancelacion } from '@/lib/whatsapp/iniciativas'

export const dynamic = 'force-dynamic'

const ID_SESION = 'unica'

async function guardiaCanal(): Promise<{ error: string; status: number } | { personajeId: string }> {
  const sesion = await db.telegramSesion.findUnique({ where: { id: ID_SESION } })
  if (!sesion || sesion.estado !== 'CONECTADA') {
    return {
      error: `El cuarto Telegram no está CONECTADA (estado: ${sesion?.estado ?? 'NO_CONFIGURADO'}): sin bot real no se programan iniciativas — primero conecta el daemon.`,
      status: 409,
    }
  }
  const pid = valorConfig('telegram.personaje_id').valor.trim()
  if (!pid) return { error: 'Cuarto sin personaje: asigna telegram.personaje_id en Configuración (el cerebro necesita su genoma).', status: 503 }
  return { personajeId: pid }
}

export async function GET() {
  await recargarConfig()
  const ahora = new Date()
  const pid = valorConfig('telegram.personaje_id').valor.trim()
  const personaje = pid
    ? await db.character.findUnique({ where: { id: pid }, select: { id: true, name: true, status: true } })
    : null

  const programadas = await db.telegramMensaje.findMany({
    where: { direccion: 'salida', tipo: 'iniciativa', estado: 'programada' },
    orderBy: { programadaEn: 'asc' },
    take: 20,
  })
  const historial = await db.telegramMensaje.findMany({
    where: { direccion: 'salida', tipo: 'iniciativa', estado: { not: 'programada' } },
    orderBy: { updatedAt: 'desc' },
    take: 10,
  })

  return NextResponse.json({
    honesto: 'Las iniciativas del cuarto Telegram se programan por contacto consentido y salen SOLO cuando el daemon real las recoge, el pacing las deja pasar y el bot sigue CONECTADA. El texto final lo escribe el cerebro al momento de la entrega.',
    personaje: personaje
      ? { id: personaje.id, nombre: personaje.name, activo: personaje.status === 'ACTIVO' }
      : { id: pid || null, nombre: null, activo: false },
    topes: { programadasPorChat: MAX_PROGRAMADAS_POR_CHAT },
    programadas: programadas.map((m) => {
      const meta = JSON.parse(m.meta || '{}') as Record<string, unknown>
      return {
        id: m.id,
        chat: mascararChatIdTelegram(m.chatId),
        programadaEn: m.programadaEn,
        brief: typeof meta.brief === 'string' ? meta.brief : '',
        vencida: m.programadaEn ? m.programadaEn.getTime() <= ahora.getTime() : true,
        pacingMotivo: m.pacingMotivo,
        pacingReintentarEn: m.pacingReintentarEn,
        createdAt: m.createdAt,
      }
    }),
    historial: historial.map((m) => {
      const meta = JSON.parse(m.meta || '{}') as Record<string, unknown>
      return {
        id: m.id,
        chat: mascararChatIdTelegram(m.chatId),
        estado: m.estado,
        texto: m.texto.slice(0, 120),
        modo: typeof meta.modo === 'string' ? meta.modo : null,
        programadaPor: m.programadaPor,
        errorRiesgo: m.errorRiesgo,
        updatedAt: m.updatedAt,
      }
    }),
    actualizadoEn: ahora,
  })
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const accion = String(body.accion ?? '')

  if (accion === 'programar') {
    await recargarConfig()
    const validacion = validarProgramacionTelegram(body)
    if (!validacion.ok) return NextResponse.json({ error: validacion.error }, { status: 400 })
    const { chatId, programadaEn, brief } = validacion.datos

    const guard = await guardiaCanal()
    if ('error' in guard) return NextResponse.json({ error: guard.error }, { status: guard.status })

    const ahora = new Date()
    if (programadaEn && fueraDeHorizonte(programadaEn, ahora)) {
      return NextResponse.json(
        { error: `La programación excede el horizonte de ${MAX_HORIZONTE_DIAS} días: acumular iniciativas lejanas no es conversación 1:1.` },
        { status: 400 },
      )
    }

    const pendientes = await db.telegramMensaje.count({
      where: { chatId, direccion: 'salida', tipo: 'iniciativa', estado: 'programada' },
    })
    if (pendientes >= MAX_PROGRAMADAS_POR_CHAT) {
      return NextResponse.json(
        { error: `Este chat ya tiene ${pendientes} iniciativas programadas pendientes (tope ${MAX_PROGRAMADAS_POR_CHAT}): espera a que salgan o cancela una antes de agendar otra.` },
        { status: 409 },
      )
    }

    const fila = await db.telegramMensaje.create({
      data: {
        chatId,
        direccion: 'salida',
        tipo: 'iniciativa',
        estado: 'programada',
        texto: '',
        programadaEn: programadaEn ?? ahora,
        programadaPor: 'operador',
        meta: JSON.stringify({ brief, programadaPor: 'operador', via: 'panel_canal_telegram' }),
      },
    })
    await registrarEvento('mensajes_telegram', {
      accion: 'programar_iniciativa',
      mensajeId: fila.id,
      chat: mascararChatIdTelegram(chatId),
      programadaEn: (programadaEn ?? ahora).toISOString(),
      conBrief: Boolean(brief),
      via: 'panel_canal_telegram',
    })
    return NextResponse.json({
      ok: true,
      id: fila.id,
      estado: fila.estado,
      programadaEn: fila.programadaEn,
      chat: mascararChatIdTelegram(chatId),
      motivo: 'Iniciativa programada: saldrá cuando el daemon la recoja, el pacing la deje pasar y el bot siga CONECTADA.',
    })
  }

  if (accion === 'cancelar') {
    const id = typeof body.id === 'string' ? body.id.trim() : ''
    if (!id) return NextResponse.json({ error: 'Falta el id de la iniciativa a cancelar.' }, { status: 400 })
    const fila = await db.telegramMensaje.findUnique({ where: { id } })
    if (!fila) return NextResponse.json({ error: 'Iniciativa no encontrada.' }, { status: 404 })
    if (fila.direccion !== 'salida' || fila.tipo !== 'iniciativa') {
      return NextResponse.json({ error: 'Esa fila no es una iniciativa saliente.' }, { status: 409 })
    }
    const cancelacion = transicionCancelacion(fila.estado)
    if (!cancelacion.ok) return NextResponse.json({ error: cancelacion.error }, { status: 409 })

    await db.telegramMensaje.delete({ where: { id } })
    await registrarEvento('mensajes_telegram', {
      accion: 'cancelar_iniciativa',
      mensajeId: id,
      chat: mascararChatIdTelegram(fila.chatId),
      estadoPrevio: fila.estado,
      via: 'panel_canal_telegram',
    })
    return NextResponse.json({ ok: true, cancelada: id, motivo: 'Iniciativa cancelada (borrado explícito, registrado en compliance): nada se envió.' })
  }

  return NextResponse.json({ error: `Acción desconocida: ${accion}. Válidas: programar, cancelar.` }, { status: 400 })
}

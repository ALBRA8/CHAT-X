// F3 · cuarto Telegram PROPIO del negocio (CASA PROPIA, EMBUDO §7).
// Una fila (id "unica") en BD propia. El estado es HONESTO: CONECTADA solo
// llega cuando el daemon real (máquina del fundador) presenta la identidad
// PÚBLICA del bot (getMe) por el webhook FIRMADO — jamás se inventa conexión.
// El TOKEN del bot JAMÁS viaja a CHAT-X: descansa solo en la máquina del
// fundador (aquí no hay secretos de Telegram y no se fingen).
//
//  GET → estado para el panel: estado, bot público, pulso del daemon (señal
//        viva), metadatos. Nada secreto sale jamás (aquí nada secreto entra).
//  POST accion:
//    confirmar_conexion → {botId, botUsuario} presentados por el daemon con
//                         webhook FIRMADO (la ruta exige secreto + firma
//                         válida: identidad sin credencial no se acepta)
//    desconectar        → baja el bot (explícita, con compliance)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { registrarEvento } from '@/lib/compliance'
import { recargarConfig, valorConfig } from '@/lib/configuracion'
import { verificarFirmaWebhook } from '@/lib/canales'
import {
  AccionSesionTelegram,
  EstadoSesionTelegram,
  estadoPulso,
  transicionSesionTelegram,
  validarConfirmacionBot,
} from '@/lib/telegram/telegram'

export const dynamic = 'force-dynamic'

const ID_SESION = 'unica'

const ACCIONES_VALIDAS: AccionSesionTelegram[] = ['confirmar_conexion', 'desconectar']

async function leerSesion() {
  let fila = await db.telegramSesion.findUnique({ where: { id: ID_SESION } })
  if (!fila) {
    fila = await db.telegramSesion.create({ data: { id: ID_SESION } })
  }
  return fila
}

export async function GET() {
  const fila = await leerSesion()
  const ahora = new Date()
  return NextResponse.json({
    estado: fila.estado,
    honesto:
      fila.estado === 'CONECTADA'
        ? `Bot ${fila.botUsuario ?? ''} conectado: el daemon real presentó su identidad pública por el webhook firmado. El token vive SOLO en tu máquina.`
        : fila.estado === 'DESCONECTADA'
          ? 'Bot desconectado: puedes reconectarlo confirmando la identidad desde el daemon.'
          : 'NO_CONFIGURADO: sin daemon real con su token, el cuarto Telegram no existe todavía — y nada envía nada.',
    botId: fila.botId,
    botUsuario: fila.botUsuario,
    pulso: estadoPulso(fila.ultimoPulsoEn, ahora),
    ultimoPulsoEn: fila.ultimoPulsoEn,
    conectadaEn: fila.conectadaEn,
    desconectadaEn: fila.desconectadaEn,
    detalle: fila.detalle,
    actualizadoEn: fila.updatedAt,
  })
}

export async function POST(req: NextRequest) {
  const cuerpo = await req.text()

  // El canal se AUTENTICA primero (fail-closed): la identidad del bot viaja
  // por el webhook FIRMADO — sin secreto configurado el receptor está APAGADO.
  await recargarConfig()
  const secreto = valorConfig('telegram.webhook_secreto')

  const body = (JSON.parse(cuerpo || '{}') || {}) as { accion?: unknown; botId?: unknown; botUsuario?: unknown }
  const accion = String(body.accion ?? '')
  if (!ACCIONES_VALIDAS.includes(accion as AccionSesionTelegram)) {
    return NextResponse.json({ error: `Acción desconocida: ${accion}. Válidas: ${ACCIONES_VALIDAS.join(', ')}.` }, { status: 400 })
  }

  const fila = await leerSesion()

  if (accion === 'confirmar_conexion') {
    // Identidad del bot = por el canal firmado. Sin firma válida no hay
    // conexión (cualquiera podría declarar un bot por una llamada abierta).
    if (!secreto.valor) {
      await registrarEvento('sesion_telegram', { accion, resultado: 'rechazado', motivo: 'sin secreto del webhook (fail-closed)' })
      return NextResponse.json(
        { error: 'Receptor sin secreto: configura telegram.webhook_secreto (panel) o TELEGRAM_WEBHOOK_SECRETO (.env). La identidad del bot viaja SOLO por el canal firmado.' },
        { status: 503 },
      )
    }
    const verificacion = verificarFirmaWebhook(cuerpo, req.headers.get('x-chatx-firma'), req.headers.get('x-chatx-ts'), secreto.valor, new Date())
    if (!verificacion.ok) {
      await registrarEvento('sesion_telegram', { accion, resultado: 'rechazado', motivo: verificacion.motivo })
      return NextResponse.json({ error: `Firma del webhook inválida (${verificacion.motivo}): la identidad del bot se presenta firmada, no por teléfono.` }, { status: 401 })
    }

    const validacion = validarConfirmacionBot(body.botId, body.botUsuario)
    if (!validacion.ok) return NextResponse.json({ error: validacion.error }, { status: 400 })

    const estadoActual = fila.estado as EstadoSesionTelegram
    const transicion = transicionSesionTelegram(estadoActual, accion)
    if (!transicion.ok || !transicion.estado) return NextResponse.json({ error: transicion.error }, { status: 409 })

    const ahora = new Date()
    const actualizada = await db.telegramSesion.update({
      where: { id: ID_SESION },
      data: {
        estado: transicion.estado,
        botId: validacion.datos.botId,
        botUsuario: validacion.datos.botUsuario,
        conectadaEn: ahora,
        desconectadaEn: null,
        ultimoPulsoEn: ahora,
        detalle: `Bot ${validacion.datos.botUsuario} (id ${validacion.datos.botId}) presentó su identidad pública por el webhook firmado a las ${ahora.toISOString()}. El token sigue solo en la máquina del daemon.`,
      },
    })
    await registrarEvento('sesion_telegram', {
      accion,
      estadoResultante: actualizada.estado,
      botId: actualizada.botId,
      botUsuario: actualizada.botUsuario,
      via: 'webhook_daemon_firmado',
    })
    return NextResponse.json({ ok: true, estado: actualizada.estado, botUsuario: actualizada.botUsuario, detalle: actualizada.detalle })
  }

  // desconectar: acción del OPERADOR (sin firma — baja explícita, no identidad)
  const estadoActual = fila.estado as EstadoSesionTelegram
  const transicion = transicionSesionTelegram(estadoActual, accion as AccionSesionTelegram)
  if (!transicion.ok || !transicion.estado) return NextResponse.json({ error: transicion.error }, { status: 409 })

  const ahora = new Date()
  const actualizada = await db.telegramSesion.update({
    where: { id: ID_SESION },
    data: {
      estado: transicion.estado,
      desconectadaEn: ahora,
      detalle: `Bot desconectado a las ${ahora.toISOString()} — baja explícita del cuarto Telegram (los datos públicos del bot se conservan para el historial).`,
    },
  })
  await registrarEvento('sesion_telegram', { accion, estadoResultante: actualizada.estado, botUsuario: actualizada.botUsuario, via: 'api_telegram_sesion' })
  return NextResponse.json({ ok: true, estado: actualizada.estado, detalle: actualizada.detalle })
}

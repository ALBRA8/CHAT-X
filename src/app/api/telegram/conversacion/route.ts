// F3 — bucle de conversación del cuarto Telegram PROPIO (CASA PROPIA, EMBUDO §7).
// Igual que WhatsApp (W3/W4): el daemon real (máquina del fundador) trae los
// mensajes por webhook FIRMADO; CHAT-X los guarda en casa, le habla al cerebro
// modo novia (los MISMOS filtros de edad), aplica el pacing W1 (disyuntor en
// vivo) y devuelve la instrucción de envío. El daemon es el ÚNICO que toca la
// red de Telegram — aquí no hay token ni red de Telegram y no se finge.
//
//  POST /api/telegram/conversacion  {accion: 'entrante' | 'marcar_envio' | 'iniciativas_vencidas' | 'pulso', ...}
//    Firma: headers x-chatx-ts + x-chatx-firma (cerrojo compartido de la casa,
//    src/lib/canales.ts) con el secreto de telegram.webhook_secreto.
//    Fail-closed: sin secreto → 503; firma ausente/mala/vencida → 401.
//      accion 'entrante'    {id, chatId, texto, recibidoEn?}
//        → sesión CONECTADA o nada → personaje del canal → filtro de edad en
//          entrada → pacing W1 (si bloquea, el LLM no se gasta — regla $0) →
//          cerebro (plantilla del genoma o LLM con salida segura; los pedidos
//          de media NO crean jobs ni tocan créditos) → fila TelegramMensaje →
//          instrucción honesta al daemon.
//      accion 'marcar_envio' {id, resultado, errorRiesgo?, detalle?}
//        → transición honesta; los fallos CON señal de riesgo alimentan el
//          disyuntor (los rate-limits persistentes de Telegram son señal).
//      accion 'iniciativas_vencidas' {} (poll del daemon)
//        → goteo máx 5/poll, pacing con esIniciativa=true, el texto final lo
//          escribe el cerebro (el breve del operador es intención). El chatId
//          COMPLETO solo viaja al daemon firmado.
//      accion 'pulso' {} (heartbeat del daemon — señal viva, no un estado).
//  GET → panel honesto del cuarto para el shell: sesión/bot, pulso, webhook
//        presente/fuente, personaje, pacing efectivo, temperatura, envíos del
//        día y últimos mensajes (chatId SIEMPRE enmascarado).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { registrarEvento } from '@/lib/compliance'
import { recargarConfig, valorConfig } from '@/lib/configuracion'
import { detectarTerminosProhibidos } from '@/lib/constants'
import { detectarIntencion, respuestaPlantilla } from '@/lib/chat'
import { generarRespuestaLLM, historialDesdeMensajes, salidaLLMSegura, sondearLLM } from '@/lib/provider/llm'
import { PACING_DEFECTO, decidirEnvio, temperatura, type MarcaEnvio } from '@/lib/whatsapp/pacing'
import { verificarFirmaWebhook } from '@/lib/canales'
import { iniciativaPlantilla, resolverIniciativa, MAX_POR_POLL } from '@/lib/whatsapp/iniciativas'
import {
  EstadoMensaje,
  mascararChatIdTelegram,
  parsearPacingConfig,
  resolverSalida,
  transicionEnvio,
  validarEntranteTelegram,
  validarProgramacionTelegram,
  validarMarcaEnvio,
  marcasDesdeFilas,
  fueraDeHorizonte,
  estadoPulso,
  type CerebroResuelto,
} from '@/lib/telegram/telegram'

export const dynamic = 'force-dynamic'

const ID_SESION = 'unica'
const VENTANA_MARCAS_MS = 48 * 60 * 60 * 1000

// ── Configuración en caliente del cuarto ──────────────────────────────────

function pacingEfectivo() {
  return parsearPacingConfig(
    {
      silencioDesde: valorConfig('telegram.pacing.silencio_desde').valor,
      silencioHasta: valorConfig('telegram.pacing.silencio_hasta').valor,
      maxRespuestas: valorConfig('telegram.pacing.max_respuestas_dia').valor,
      maxIniciativas: valorConfig('telegram.pacing.max_iniciativas_dia').valor,
    },
    PACING_DEFECTO,
  )
}

async function marcasRecientes(): Promise<MarcaEnvio[]> {
  const desde = new Date(Date.now() - VENTANA_MARCAS_MS)
  const filas = await db.telegramMensaje.findMany({
    where: { direccion: 'salida', estado: { in: ['enviado', 'fallado'] }, updatedAt: { gte: desde } },
    select: { chatId: true, estado: true, tipo: true, errorRiesgo: true, enviadoEn: true, updatedAt: true },
  })
  return marcasDesdeFilas(filas)
}

// ── GET: panel honesto del cuarto ─────────────────────────────────────────

export async function GET() {
  await recargarConfig()
  const ahora = new Date()
  const fila = await db.telegramSesion.findUnique({ where: { id: ID_SESION } })
  const pid = valorConfig('telegram.personaje_id')
  const personaje = pid.valor
    ? await db.character.findUnique({ where: { id: pid.valor }, select: { id: true, name: true, status: true } })
    : null

  const cfg = pacingEfectivo()
  const marcas = await marcasRecientes()
  const temp = temperatura(marcas, cfg, ahora)

  const inicioDia = new Date(ahora)
  inicioDia.setHours(0, 0, 0, 0)
  const salidasHoy = await db.telegramMensaje.findMany({
    where: { direccion: 'salida', createdAt: { gte: inicioDia } },
    select: { estado: true, tipo: true, errorRiesgo: true },
  })
  const programadasPendientes = await db.telegramMensaje.count({
    where: { direccion: 'salida', tipo: 'iniciativa', estado: 'programada' },
  })
  const ultimos = await db.telegramMensaje.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, chatId: true, direccion: true, tipo: true, estado: true, texto: true, pacingMotivo: true, pacingReintentarEn: true, errorRiesgo: true, createdAt: true },
  })

  return NextResponse.json({
    honesto:
      fila?.estado === 'CONECTADA'
        ? 'Cuarto Telegram listo para conversar: el webhook firmado del bot entra, el cerebro responde y el pacing decide CUÁNDO.'
        : 'Sin bot CONECTADA el cuarto no conversa: el webhook responde 409 y nada envía (honesto, sin fingir).',
    sesion: {
      estado: fila?.estado ?? 'NO_CONFIGURADO',
      botId: fila?.botId ?? null,
      botUsuario: fila?.botUsuario ?? null,
      pulso: estadoPulso(fila?.ultimoPulsoEn ?? null, ahora),
      ultimoPulsoEn: fila?.ultimoPulsoEn ?? null,
      conectadaEn: fila?.conectadaEn ?? null,
    },
    webhook: {
      secretoPresente: Boolean(valorConfig('telegram.webhook_secreto').valor),
      fuente: valorConfig('telegram.webhook_secreto').fuente,
    },
    personaje: personaje
      ? { id: personaje.id, nombre: personaje.name, activo: personaje.status === 'ACTIVO', fuente: pid.fuente }
      : { id: pid.valor || null, nombre: null, activo: false, fuente: pid.fuente },
    pacing: {
      silencio: `${cfg.desdeHoraSilencio}:00–${cfg.hastaHoraSilencio}:00`,
      maxRespuestasPorDia: cfg.maxRespuestasPorDia,
      maxIniciativasPorDia: cfg.maxIniciativasPorDia,
      temperatura: temp.estado,
      temperaturaHasta: temp.hasta,
    },
    hoy: {
      respuestasEnviadas: salidasHoy.filter((m) => m.estado === 'enviado' && m.tipo === 'respuesta').length,
      iniciativasEnviadas: salidasHoy.filter((m) => m.estado === 'enviado' && m.tipo === 'iniciativa').length,
      iniciativasProgramadas: programadasPendientes,
      fallosRiesgo: salidasHoy.filter((m) => m.estado === 'fallado' && m.errorRiesgo).length,
      enCola: salidasHoy.filter((m) => m.estado === 'en_cola').length,
      bloqueadosPacing: salidasHoy.filter((m) => m.estado === 'bloqueado_pacing').length,
    },
    ultimos: ultimos.map((m) => ({
      id: m.id,
      chat: mascararChatIdTelegram(m.chatId),
      direccion: m.direccion,
      tipo: m.tipo,
      estado: m.estado,
      texto: m.texto.slice(0, 120),
      pacingMotivo: m.pacingMotivo,
      pacingReintentarEn: m.pacingReintentarEn,
      errorRiesgo: m.errorRiesgo,
      createdAt: m.createdAt,
    })),
    actualizadoEn: ahora,
  })
}

// ── POST: webhook firmado del daemon ──────────────────────────────────────

export async function POST(req: NextRequest) {
  const cuerpo = await req.text()

  // FAIL-CLOSED: la autenticación va PRIMERO (misma regla que WhatsApp).
  await recargarConfig()
  const secreto = valorConfig('telegram.webhook_secreto')
  if (!secreto.valor) {
    await registrarEvento('mensajes_telegram', { accion: 'webhook', resultado: 'rechazado', motivo: 'sin secreto configurado (fail-closed)', via: 'webhook_daemon' })
    return NextResponse.json(
      { error: 'Receptor sin secreto: configura telegram.webhook_secreto (panel) o TELEGRAM_WEBHOOK_SECRETO (.env). Fail-closed: sin firma verificable no hay canal.' },
      { status: 503 },
    )
  }
  const verificacion = verificarFirmaWebhook(cuerpo, req.headers.get('x-chatx-firma'), req.headers.get('x-chatx-ts'), secreto.valor, new Date())
  if (!verificacion.ok) {
    await registrarEvento('mensajes_telegram', { accion: 'webhook', resultado: 'rechazado', motivo: verificacion.motivo, via: 'webhook_daemon' })
    return NextResponse.json({ error: `Firma del webhook inválida (${verificacion.motivo}).` }, { status: 401 })
  }

  const body = JSON.parse(cuerpo || '{}') as Record<string, unknown>
  const accion = String(body.accion ?? '')

  if (accion === 'entrante') return procesarEntrante(body)
  if (accion === 'marcar_envio') return procesarMarcaEnvio(body)
  if (accion === 'iniciativas_vencidas') return procesarIniciativasVencidas()
  if (accion === 'pulso') return procesarPulso()
  return NextResponse.json({ error: `Acción desconocida: ${accion}. Válidas: entrante, marcar_envio, iniciativas_vencidas, pulso.` }, { status: 400 })
}

// ── accion 'pulso': heartbeat del daemon (señal viva, jamás un estado) ────

async function procesarPulso() {
  const ahora = new Date()
  const fila = await db.telegramSesion.findUnique({ where: { id: ID_SESION } })
  if (!fila) return NextResponse.json({ ok: false, error: 'Sesión del cuarto ausente.' }, { status: 404 })
  await db.telegramSesion.update({ where: { id: ID_SESION }, data: { ultimoPulsoEn: ahora } })
  return NextResponse.json({ ok: true, pulso: 'recibido', sesion: fila.estado, vivo: estadoPulso(ahora, ahora) === 'vivo' })
}

// ── Sesion CONECTADA o nada (compartido por entrante y poll) ──────────────

async function sesionViva() {
  const fila = await db.telegramSesion.findUnique({ where: { id: ID_SESION } })
  if (!fila || fila.estado !== 'CONECTADA') {
    return { ok: false as const, respuesta: NextResponse.json({ error: `El cuarto Telegram no está CONECTADA (estado: ${fila?.estado ?? 'NO_CONFIGURADO'}): sin bot real no hay conversación.`, estado: fila?.estado ?? 'NO_CONFIGURADO' }, { status: 409 }) }
  }
  return { ok: true as const, sesion: fila }
}

async function personajeDelCanal() {
  const pid = valorConfig('telegram.personaje_id')
  if (!pid.valor) {
    return { ok: false as const, respuesta: NextResponse.json({ error: 'Cuarto sin personaje: asigna telegram.personaje_id en el panel (el cerebro necesita su genoma).', estado: 'NO_CONFIGURADO' }, { status: 503 }) }
  }
  const personaje = await db.character.findUnique({ where: { id: pid.valor } })
  if (!personaje) {
    return { ok: false as const, respuesta: NextResponse.json({ error: 'El personaje asignado al cuarto no existe: revisa telegram.personaje_id.' }, { status: 404 }) }
  }
  if (personaje.status !== 'ACTIVO') {
    return { ok: false as const, respuesta: NextResponse.json({ error: `El chat del cuarto es para personajes ACTIVOS (este está ${personaje.status}).` }, { status: 409 }) }
  }
  return { ok: true as const, personaje }
}

// ── accion 'entrante': el contacto escribió al bot ────────────────────────

async function procesarEntrante(body: Record<string, unknown>) {
  const validacion = validarEntranteTelegram(body)
  if (!validacion.ok) return NextResponse.json({ error: validacion.error }, { status: 400 })
  const { idEntrada, chatId, texto, recibidoEn } = validacion.datos
  const chat = mascararChatIdTelegram(chatId)

  const sesion = await sesionViva()
  if (!sesion.ok) return sesion.respuesta
  const pj = await personajeDelCanal()
  if (!pj.ok) return pj.respuesta
  const personaje = pj.personaje

  const ahora = new Date()

  // IDEMPOTENCIA de la casa: un reenvío del daemon jamás duplica filas ni
  // vuelve a gastar el cerebro en la misma entrada.
  const previa = await db.telegramMensaje.findUnique({
    where: { chatId_direccion_idEntrada: { chatId, direccion: 'salida', idEntrada } },
  })
  if (previa && (previa.estado === 'enviado' || previa.estado === 'fallado')) {
    await registrarEvento('mensajes_telegram', { accion: 'entrante', chat, resultado: previa.estado, idempotente: true, via: 'webhook_daemon' })
    return NextResponse.json({
      ok: true, idempotente: true, responder: false, estado: previa.estado, mensajeId: previa.id,
      motivo: `Esta entrada ya fue respondida (estado ${previa.estado}): el daemon reintenta el ENVÍO con marcar_envio, no re-procesa el mensaje.`,
    })
  }
  if (previa && previa.estado === 'en_cola' && previa.texto) {
    await registrarEvento('mensajes_telegram', { accion: 'entrante', chat, resultado: 'en_cola', idempotente: true, via: 'webhook_daemon' })
    return NextResponse.json({
      ok: true, idempotente: true, responder: true, texto: previa.texto, mensajeId: previa.id, estado: 'en_cola',
      motivo: 'Instrucción re-entregada: la respuesta ya estaba en cola (no se vuelve a llamar al cerebro).',
    })
  }

  // Filtro de edad de la ENTRADA (mismo estándar duro que /api/chat).
  const prohibidos = detectarTerminosProhibidos(texto)
  const filtroTripo = prohibidos.length > 0

  // Pacing W1 (CUÁNDO) antes del cerebro: si bloquea, el LLM no se gasta.
  const cfg = pacingEfectivo()
  const decision = decidirEnvio(await marcasRecientes(), chatId, false, cfg, ahora)
  const veredicto = resolverSalida({ filtroEntradaTripo: filtroTripo, decisionPacing: decision })

  if (veredicto.estadoSalida === 'bloqueado_filtro') {
    await db.telegramMensaje.upsert({
      where: { chatId_direccion_idEntrada: { chatId, direccion: 'entrada', idEntrada } },
      update: { meta: JSON.stringify({ filtro: 'entrada', terminos: prohibidos.length, via: 'webhook_daemon' }) },
      create: { chatId, direccion: 'entrada', tipo: 'respuesta', estado: 'recibido', texto, idEntrada, meta: JSON.stringify({ filtro: 'entrada', terminos: prohibidos.length, via: 'webhook_daemon' }) },
    })
    await registrarEvento('rechazo_qa', { modulo: 'telegram_daemon', motivo: 'Filtro de edad aparente en la entrada del cuarto', terminos: prohibidos, chat }, { characterId: personaje.id })
    await registrarEvento('mensajes_telegram', { accion: 'entrante', chat, resultado: 'bloqueado_filtro', responder: false, via: 'webhook_daemon' }, { characterId: personaje.id })
    return NextResponse.json({ ok: true, responder: false, estado: 'bloqueado_filtro', motivo: veredicto.motivo, chat })
  }

  if (!decision.permitido) {
    await db.telegramMensaje.upsert({
      where: { chatId_direccion_idEntrada: { chatId, direccion: 'entrada', idEntrada } },
      update: { meta: JSON.stringify({ via: 'webhook_daemon', recibidoEn: recibidoEn?.toISOString() ?? null }) },
      create: { chatId, direccion: 'entrada', tipo: 'respuesta', estado: 'recibido', texto, idEntrada, meta: JSON.stringify({ via: 'webhook_daemon', recibidoEn: recibidoEn?.toISOString() ?? null }) },
    })
    const salida = await db.telegramMensaje.upsert({
      where: { chatId_direccion_idEntrada: { chatId, direccion: 'salida', idEntrada } },
      update: { estado: 'bloqueado_pacing', texto: '', pacingMotivo: decision.motivo, pacingReintentarEn: decision.reintentarEn ? new Date(decision.reintentarEn) : null, errorRiesgo: false, enviadoEn: null, meta: JSON.stringify({ ...veredicto.meta, via: 'webhook_daemon' }) },
      create: { chatId, direccion: 'salida', tipo: 'respuesta', estado: 'bloqueado_pacing', texto: '', idEntrada, pacingMotivo: decision.motivo, pacingReintentarEn: decision.reintentarEn ? new Date(decision.reintentarEn) : null, meta: JSON.stringify({ ...veredicto.meta, via: 'webhook_daemon' }) },
    })
    await registrarEvento('mensajes_telegram', { accion: 'entrante', chat, resultado: 'bloqueado_pacing', responder: false, pacing: decision.motivo, reintentarEn: decision.reintentarEn, via: 'webhook_daemon' }, { characterId: personaje.id })
    return NextResponse.json({ ok: true, responder: false, estado: 'bloqueado_pacing', mensajeId: salida.id, motivo: veredicto.motivo, pacing: { motivo: decision.motivo, reintentarEn: decision.reintentarEn }, chat })
  }

  // ── Camino del cerebro: QUÉ responde (plantilla del genoma o LLM seguro) ──
  const metaCerebro: Record<string, unknown> = {}
  let textoCerebro = respuestaPlantilla(personaje, texto)
  let modo = 'plantilla_genoma'
  const intencion = detectarIntencion(texto)

  if (intencion !== 'texto') {
    metaCerebro.intencion = intencion
    metaCerebro.nota = 'Pedido de media por Telegram: responde la plantilla del genoma; la producción vive en el Estudio, no en el canal.'
  } else {
    const sonda = await sondearLLM()
    if (sonda.estado === 'OPERATIVO') {
      // Memoria POR CHAT: el contexto del LLM son las filas de ESTE chatId.
      const ctx = await db.telegramMensaje.findMany({ where: { chatId }, orderBy: { createdAt: 'desc' }, take: 14 })
      const historial = historialDesdeMensajes(
        ctx
          .map((f) => ({
            rol: f.direccion === 'entrada' ? ('operador' as const) : ('personaje' as const),
            tipo: 'texto',
            texto: f.texto,
            estado: f.estado === 'enviado' ? 'entregado' : f.estado === 'recibido' ? undefined : f.estado,
          }))
          .reverse(),
      )
      const r = await generarRespuestaLLM(personaje, historial, texto)
      if (r.ok) {
        const salida = salidaLLMSegura(r.texto)
        if (salida.ok) {
          textoCerebro = salida.texto
          modo = `llm_${r.provedor}`
          metaCerebro.llm = { provedor: r.provedor, modelo: r.modelo, uso: r.uso }
          await registrarEvento('llm_chat', { origen: 'telegram_daemon', provedor: r.provedor, modelo: r.modelo, caracteres: salida.texto.length, chat }, { characterId: personaje.id })
        } else {
          metaCerebro.llmEstado = 'RECHAZADO_FILTRO'
          metaCerebro.llmMotivo = 'la salida del LLM activó el filtro de edad de la plataforma'
          await registrarEvento('rechazo_qa', { modulo: 'telegram_daemon', motivo: 'Filtro de edad en la salida del LLM del cuarto', terminosRechazados: salida.terminos.length, provedor: r.provedor, chat }, { characterId: personaje.id })
        }
      } else {
        metaCerebro.llmEstado = r.estado
        metaCerebro.llmFallo = r.detalle.slice(0, 200)
      }
    } else {
      metaCerebro.llmEstado = sonda.estado
      metaCerebro.llmDetalle = sonda.detalle.slice(0, 200)
    }
  }

  const cerebro: CerebroResuelto = { texto: textoCerebro, modo, meta: metaCerebro }
  const final = resolverSalida({ filtroEntradaTripo: false, decisionPacing: decision, cerebro })

  await db.telegramMensaje.upsert({
    where: { chatId_direccion_idEntrada: { chatId, direccion: 'entrada', idEntrada } },
    update: { meta: JSON.stringify({ via: 'webhook_daemon', recibidoEn: recibidoEn?.toISOString() ?? null }) },
    create: { chatId, direccion: 'entrada', tipo: 'respuesta', estado: 'recibido', texto, idEntrada, meta: JSON.stringify({ via: 'webhook_daemon', recibidoEn: recibidoEn?.toISOString() ?? null }) },
  })
  const salida = await db.telegramMensaje.upsert({
    where: { chatId_direccion_idEntrada: { chatId, direccion: 'salida', idEntrada } },
    update: {
      estado: final.estadoSalida,
      texto: final.textoSalida ?? '',
      pacingMotivo: decision.motivo,
      pacingReintentarEn: decision.reintentarEn ? new Date(decision.reintentarEn) : null,
      errorRiesgo: false,
      enviadoEn: null,
      meta: JSON.stringify({ ...cerebro.meta, ...final.meta, via: 'webhook_daemon' }),
    },
    create: {
      chatId, direccion: 'salida', tipo: 'respuesta', estado: final.estadoSalida, texto: final.textoSalida ?? '', idEntrada,
      pacingMotivo: decision.motivo,
      pacingReintentarEn: decision.reintentarEn ? new Date(decision.reintentarEn) : null,
      meta: JSON.stringify({ ...cerebro.meta, ...final.meta, via: 'webhook_daemon' }),
    },
  })
  await registrarEvento('mensajes_telegram', { accion: 'entrante', chat, resultado: final.estadoSalida, responder: final.responder, modo, pacing: decision.motivo, via: 'webhook_daemon' }, { characterId: personaje.id })

  return NextResponse.json({
    ok: true,
    responder: final.responder,
    texto: final.responder ? final.textoSalida : null,
    mensajeId: salida.id,
    estado: final.estadoSalida,
    motivo: final.motivo,
    pacing: { motivo: decision.motivo, reintentarEn: decision.reintentarEn },
    modo,
    chat,
  })
}

// ── accion 'marcar_envio': el daemon reporta el resultado real ────────────

async function procesarMarcaEnvio(body: Record<string, unknown>) {
  const validacion = validarMarcaEnvio(body)
  if (!validacion.ok) return NextResponse.json({ error: validacion.error }, { status: 400 })
  const { id, resultado, errorRiesgo, detalle } = validacion.datos

  const fila = await db.telegramMensaje.findUnique({ where: { id } })
  if (!fila) return NextResponse.json({ error: 'Fila de mensaje no encontrada.' }, { status: 404 })
  if (fila.direccion !== 'salida') {
    return NextResponse.json({ error: 'Esa fila no es un envío saliente (dirección ' + fila.direccion + ').' }, { status: 409 })
  }

  const t = transicionEnvio(fila.estado as EstadoMensaje, resultado)
  if (!t.ok || !t.estado) {
    await registrarEvento('mensajes_telegram', { accion: 'marcar_envio', mensajeId: id, resultado, rechazado: t.error, via: 'webhook_daemon' })
    return NextResponse.json({ error: t.error }, { status: 409 })
  }

  const ahora = new Date()
  const metaPrev = JSON.parse(fila.meta || '{}') as Record<string, unknown>
  const actualizada = await db.telegramMensaje.update({
    where: { id },
    data: {
      estado: t.estado,
      errorRiesgo: t.estado === 'fallado' ? errorRiesgo : false,
      enviadoEn: t.estado === 'enviado' && !t.idempotente ? ahora : fila.enviadoEn,
      meta: JSON.stringify({ ...metaPrev, ultimaMarca: { resultado, errorRiesgo, detalle: detalle || null, cuando: ahora.toISOString() } }),
    },
  })
  await registrarEvento('mensajes_telegram', {
    accion: 'marcar_envio', mensajeId: id, chat: mascararChatIdTelegram(fila.chatId), resultado: t.estado,
    errorRiesgo: actualizada.errorRiesgo, idempotente: Boolean(t.idempotente), via: 'webhook_daemon',
  })
  return NextResponse.json({ ok: true, estado: actualizada.estado, idempotente: Boolean(t.idempotente), errorRiesgo: actualizada.errorRiesgo })
}

// ── accion 'iniciativas_vencidas': el daemon recoge lo programado ─────────

const DIRECTIVA_INICIATIVA = 'Inicia tú una conversación breve y natural con este contacto (primer mensaje o reavivo ligero): una o dos frases, sin pedir nada.'

async function procesarIniciativasVencidas() {
  const ahora = new Date()

  const sesion = await sesionViva()
  if (!sesion.ok) return sesion.respuesta
  const pj = await personajeDelCanal()
  if (!pj.ok) return pj.respuesta
  const personaje = pj.personaje

  const vencidas = await db.telegramMensaje.findMany({
    where: { direccion: 'salida', tipo: 'iniciativa', estado: 'programada', programadaEn: { lte: ahora } },
    orderBy: { programadaEn: 'asc' },
    take: MAX_POR_POLL, // goteo conservador: pocas por tick, cada una con su gate
  })

  const cfg = pacingEfectivo()
  const marcas: MarcaEnvio[] = await marcasRecientes()
  const instrucciones: Record<string, unknown>[] = []

  for (const fila of vencidas) {
    // Pacing W1 con esIniciativa=true — disyuntor EN VIVO (frena iniciativas,
    // jamás respuestas). Las marcas incluyen lo entregado en ESTE poll.
    const decision = decidirEnvio(marcas, fila.chatId, true, cfg, ahora)
    const metaFila = JSON.parse(fila.meta || '{}') as Record<string, unknown>
    const chat = mascararChatIdTelegram(fila.chatId)

    if (!decision.permitido) {
      await db.telegramMensaje.update({
        where: { id: fila.id },
        data: {
          pacingMotivo: decision.motivo,
          pacingReintentarEn: decision.reintentarEn ? new Date(decision.reintentarEn) : null,
          meta: JSON.stringify({ ...metaFila, ultimoVeredicto: { cuando: ahora.toISOString(), motivo: decision.motivo, reintentarEn: decision.reintentarEn } }),
        },
      })
      await registrarEvento('mensajes_telegram', { accion: 'iniciativa', resultado: 'sigue_programada', chat, pacing: decision.motivo, reintentarEn: decision.reintentarEn, via: 'webhook_daemon' }, { characterId: personaje.id })
      instrucciones.push({ id: fila.id, chatId: fila.chatId, estado: 'sigue_programada', motivo: decision.detalle, reintentarEn: decision.reintentarEn })
      continue
    }

    // Pacing pasa → el cerebro escribe el QUÉ (el breve del operador es intención).
    const brief = typeof metaFila.brief === 'string' ? metaFila.brief.slice(0, 300) : ''
    const metaCerebro: Record<string, unknown> = {}
    let textoIniciativa = iniciativaPlantilla(personaje)
    let modo = 'plantilla_genoma'

    const sonda = await sondearLLM()
    if (sonda.estado === 'OPERATIVO') {
      const ctx = await db.telegramMensaje.findMany({ where: { chatId: fila.chatId }, orderBy: { createdAt: 'desc' }, take: 14 })
      const historial = historialDesdeMensajes(
        ctx
          .map((f) => ({
            rol: f.direccion === 'entrada' ? ('operador' as const) : ('personaje' as const),
            tipo: 'texto',
            texto: f.texto,
            estado: f.estado === 'enviado' ? 'entregado' : f.estado === 'recibido' ? undefined : f.estado,
          }))
          .reverse(),
      )
      const r = await generarRespuestaLLM(personaje, historial, brief || DIRECTIVA_INICIATIVA)
      if (r.ok) {
        const salida = salidaLLMSegura(r.texto)
        if (salida.ok) {
          textoIniciativa = salida.texto
          modo = `llm_${r.provedor}`
          metaCerebro.llm = { provedor: r.provedor, modelo: r.modelo }
          await registrarEvento('llm_chat', { origen: 'telegram_daemon_iniciativa', provedor: r.provedor, modelo: r.modelo, caracteres: salida.texto.length, chat }, { characterId: personaje.id })
        } else {
          metaCerebro.llmEstado = 'RECHAZADO_FILTRO'
          await registrarEvento('rechazo_qa', { modulo: 'telegram_daemon', motivo: 'Filtro de edad en la iniciativa del cuarto', terminosRechazados: salida.terminos.length, provedor: r.provedor, chat }, { characterId: personaje.id })
        }
      } else {
        metaCerebro.llmEstado = r.estado
        metaCerebro.llmFallo = r.detalle.slice(0, 200)
      }
    } else {
      metaCerebro.llmEstado = sonda.estado
      metaCerebro.llmDetalle = sonda.detalle.slice(0, 200)
    }

    const veredicto = resolverIniciativa(decision, { texto: textoIniciativa, modo, meta: metaCerebro })
    if (!veredicto.entregar || veredicto.estado !== 'en_cola' || !veredicto.textoSalida) {
      await db.telegramMensaje.update({
        where: { id: fila.id },
        data: { pacingMotivo: decision.motivo, meta: JSON.stringify({ ...metaFila, ...veredicto.meta, ultimoVeredicto: { cuando: ahora.toISOString(), motivo: veredicto.motivo } }) },
      })
      await registrarEvento('mensajes_telegram', { accion: 'iniciativa', resultado: 'sigue_programada', chat, bug: (veredicto.meta as Record<string, unknown>).bug ?? null, via: 'webhook_daemon' }, { characterId: personaje.id })
      instrucciones.push({ id: fila.id, chatId: fila.chatId, estado: 'sigue_programada', motivo: veredicto.motivo, reintentarEn: decision.reintentarEn })
      continue
    }

    await db.telegramMensaje.update({
      where: { id: fila.id },
      data: {
        estado: 'en_cola',
        texto: veredicto.textoSalida,
        pacingMotivo: 'ok',
        pacingReintentarEn: null,
        meta: JSON.stringify({ ...metaFila, ...metaCerebro, modo, programadaPor: typeof metaFila.programadaPor === 'string' ? metaFila.programadaPor : 'operador' }),
      },
    })
    marcas.push({ chatId: fila.chatId, t: ahora, tipo: 'iniciativa', error: false })
    await registrarEvento('mensajes_telegram', { accion: 'iniciativa', resultado: 'en_cola', chat, modo, brief: brief ? true : false, via: 'webhook_daemon' }, { characterId: personaje.id })
    instrucciones.push({ id: fila.id, chatId: fila.chatId, estado: 'en_cola', texto: veredicto.textoSalida })
  }

  return NextResponse.json({ ok: true, recogidas: vencidas.length, instrucciones })
}

// (validarProgramacionTelegram y fueraDeHorizonte se usan en /api/telegram/iniciativas —
//  exportados aquí vía el módulo puro; el import explicita el contrato del cuarto.)
void validarProgramacionTelegram
void fueraDeHorizonte

// F1 · W3 — bucle de conversación del canal WhatsApp PROPIO (CASA PROPIA, EMBUDO §7).
// Mitad CHAT-X del bucle: el daemon (máquina del fundador) trae los mensajes
// entrantes por webhook FIRMADO; CHAT-X los guarda en casa, le habla al cerebro
// modo novia (los MISMOS filtros de edad que /api/chat), aplica el pacing W1 y
// le devuelve la instrucción de envío. El daemon es el ÚNICO que toca la red de
// WhatsApp — aquí no hay sesión real y no se finge.
//
//  POST /api/whatsapp/conversacion  {accion: 'entrante' | 'marcar_envio', ...}
//    Firma: headers x-chatx-ts (ms) + x-chatx-firma (hex) = HMAC-SHA256 de
//    `${ts}.${cuerpo}` con el secreto de whatsapp.webhook_secreto.
//    Fail-closed: sin secreto configurado el receptor está APAGADO (503);
//    firma ausente/mala/vencida (401). Nada entra sin credencial verificable.
//      accion 'entrante'    {id, chatId, texto, recibidoEn?}
//        → valida → sesión CONECTADA o nada → personaje del canal → gate de
//          entrada (filtro de edad) → pacing W1 → cerebro (plantilla del
//          genoma o LLM con salidaLLMSegura; los pedidos de media NO crean
//          jobs ni tocan créditos del operador) → fila WhatsAppMensaje con
//          marca de pacing → instrucción honesta al daemon.
//      accion 'marcar_envio' {id, resultado: 'enviado'|'fallado', errorRiesgo?, detalle?}
//        → transición honesta del envío; los fallos CON señal de riesgo
//          alimentan el disyuntor del pacing.
//  GET → vista honesta del canal para el panel: sesión, personaje, secreto
//        presente/fuente, pacing efectivo, temperatura, envíos de hoy y
//        últimos mensajes (chatId SIEMPRE enmascarado).
// Todo queda en compliance append-only (mensajes_whatsapp / rechazo_qa / llm_chat).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { registrarEvento } from '@/lib/compliance'
import { recargarConfig, valorConfig } from '@/lib/configuracion'
import { detectarTerminosProhibidos } from '@/lib/constants'
import { detectarIntencion, respuestaPlantilla } from '@/lib/chat'
import { generarRespuestaLLM, historialDesdeMensajes, salidaLLMSegura, sondearLLM } from '@/lib/provider/llm'
import { PACING_DEFECTO, decidirEnvio, temperatura } from '@/lib/whatsapp/pacing'
import {
  EstadoMensaje,
  mascararChatId,
  marcasDesdeFilas,
  parsearPacingConfig,
  resolverSalida,
  transicionEnvio,
  validarEntrante,
  validarMarcaEnvio,
  verificarFirmaWebhook,
  type CerebroResuelto,
} from '@/lib/whatsapp/conversacion'

export const dynamic = 'force-dynamic'

const ID_SESION = 'unica'
/** Ventana de marcas para el pacing: cubre techos del día local, calentamiento
 *  (24 h) y disyuntor (30 min) con margen. W4 (iniciativas) podrá alargarla. */
const VENTANA_MARCAS_MS = 48 * 60 * 60 * 1000

// ── Configuración en caliente del canal ───────────────────────────────────

function secretoWebhook(): { valor: string; fuente: string } {
  const v = valorConfig('whatsapp.webhook_secreto')
  return { valor: v.valor, fuente: v.fuente }
}

function personajeId(): { valor: string; fuente: string } {
  const v = valorConfig('whatsapp.personaje_id')
  return { valor: v.valor.trim(), fuente: v.fuente }
}

function pacingEfectivo() {
  return parsearPacingConfig(
    {
      silencioDesde: valorConfig('whatsapp.pacing.silencio_desde').valor,
      silencioHasta: valorConfig('whatsapp.pacing.silencio_hasta').valor,
      maxRespuestas: valorConfig('whatsapp.pacing.max_respuestas_dia').valor,
      maxIniciativas: valorConfig('whatsapp.pacing.max_iniciativas_dia').valor,
    },
    PACING_DEFECTO,
  )
}

async function marcasRecientes(): Promise<ReturnType<typeof marcasDesdeFilas>> {
  const desde = new Date(Date.now() - VENTANA_MARCAS_MS)
  const filas = await db.whatsAppMensaje.findMany({
    where: { direccion: 'salida', estado: { in: ['enviado', 'fallado'] }, updatedAt: { gte: desde } },
    select: { chatId: true, estado: true, tipo: true, errorRiesgo: true, enviadoEn: true, updatedAt: true },
  })
  return marcasDesdeFilas(filas)
}

// ── GET: panel honesto del canal ──────────────────────────────────────────

export async function GET() {
  await recargarConfig()
  const ahora = new Date()
  const fila = await db.whatsAppSesion.findUnique({ where: { id: ID_SESION } })
  const pid = personajeId()
  const personaje = pid.valor
    ? await db.character.findUnique({ where: { id: pid.valor }, select: { id: true, name: true, status: true } })
    : null

  const cfg = pacingEfectivo()
  const marcas = await marcasRecientes()
  const temp = temperatura(marcas, cfg, ahora)

  const inicioDia = new Date(ahora)
  inicioDia.setHours(0, 0, 0, 0)
  const salidasHoy = await db.whatsAppMensaje.findMany({
    where: { direccion: 'salida', createdAt: { gte: inicioDia } },
    select: { estado: true, tipo: true, errorRiesgo: true },
  })

  const ultimos = await db.whatsAppMensaje.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true, chatId: true, direccion: true, tipo: true, estado: true,
      texto: true, pacingMotivo: true, pacingReintentarEn: true, errorRiesgo: true, createdAt: true,
    },
  })

  return NextResponse.json({
    honesto:
      fila?.estado === 'CONECTADA'
        ? 'Canal listo para conversar: el webhook firmado del daemon entra, el cerebro responde y el pacing decide CUÁNDO.'
        : 'Sin sesión CONECTADA el canal no conversa: el webhook responde 409 y nada envía (honesto, sin fingir).',
    sesion: {
      estado: fila?.estado ?? 'NO_CONFIGURADO',
      numeroMascarado: fila?.numeroMascarado ?? null,
      secretoPresente: Boolean(fila?.secretoWrap),
      conectadaEn: fila?.conectadaEn ?? null,
    },
    webhook: {
      secretoPresente: Boolean(secretoWebhook().valor),
      fuente: secretoWebhook().fuente,
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
      fallosRiesgo: salidasHoy.filter((m) => m.estado === 'fallado' && m.errorRiesgo).length,
      enCola: salidasHoy.filter((m) => m.estado === 'en_cola').length,
      bloqueadosPacing: salidasHoy.filter((m) => m.estado === 'bloqueado_pacing').length,
    },
    ultimos: ultimos.map((m) => ({
      id: m.id,
      chat: mascararChatId(m.chatId),
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

  // FAIL-CLOSED: la autenticación va PRIMERO. Sin secreto configurado el
  // receptor rechaza (503): no se aceptan webhooks sin credencial verificable.
  await recargarConfig()
  const secreto = secretoWebhook()
  if (!secreto.valor) {
    await registrarEvento('mensajes_whatsapp', { accion: 'webhook', resultado: 'rechazado', motivo: 'sin secreto configurado (fail-closed)', via: 'webhook_daemon' })
    return NextResponse.json(
      { error: 'Receptor sin secreto: configura whatsapp.webhook_secreto (panel) o WHATSAPP_WEBHOOK_SECRETO (.env). Fail-closed: sin firma verificable no hay canal.' },
      { status: 503 },
    )
  }
  const verificacion = verificarFirmaWebhook(cuerpo, req.headers.get('x-chatx-firma'), req.headers.get('x-chatx-ts'), secreto.valor, new Date())
  if (!verificacion.ok) {
    await registrarEvento('mensajes_whatsapp', { accion: 'webhook', resultado: 'rechazado', motivo: verificacion.motivo, via: 'webhook_daemon' })
    return NextResponse.json({ error: `Firma del webhook inválida (${verificacion.motivo}).` }, { status: 401 })
  }

  const body = JSON.parse(cuerpo || '{}') as Record<string, unknown>
  const accion = String(body.accion ?? '')

  if (accion === 'entrante') return procesarEntrante(body)
  if (accion === 'marcar_envio') return procesarMarcaEnvio(body)
  return NextResponse.json({ error: `Acción desconocida: ${accion}. Válidas: entrante, marcar_envio.` }, { status: 400 })
}

// ── accion 'entrante': el contacto escribió ───────────────────────────────

async function procesarEntrante(body: Record<string, unknown>) {
  const validacion = validarEntrante(body)
  if (!validacion.ok) return NextResponse.json({ error: validacion.error }, { status: 400 })
  const { idEntrada, chatId, texto, recibidoEn } = validacion.datos
  const chat = mascararChatId(chatId)

  // Sesión real o nada: sin CONECTADA no hay conversación (y no se finge).
  const sesion = await db.whatsAppSesion.findUnique({ where: { id: ID_SESION } })
  if (!sesion || sesion.estado !== 'CONECTADA') {
    return NextResponse.json(
      { error: `El canal WhatsApp no está CONECTADA (estado: ${sesion?.estado ?? 'NO_CONFIGURADO'}): sin sesión real del daemon no hay conversación.`, estado: sesion?.estado ?? 'NO_CONFIGURADO' },
      { status: 409 },
    )
  }

  // Personaje del canal: sin genoma no hay cerebro (honesto, NO_CONFIGURADO).
  const pid = personajeId()
  if (!pid.valor) {
    return NextResponse.json(
      { error: 'Canal sin personaje: asigna whatsapp.personaje_id en el panel (el cerebro necesita su genoma).', estado: 'NO_CONFIGURADO' },
      { status: 503 },
    )
  }
  const personaje = await db.character.findUnique({ where: { id: pid.valor } })
  if (!personaje) return NextResponse.json({ error: 'El personaje asignado al canal no existe: revisa whatsapp.personaje_id.' }, { status: 404 })
  if (personaje.status !== 'ACTIVO') {
    return NextResponse.json({ error: `El chat del canal es para personajes ACTIVOS (este está ${personaje.status}).` }, { status: 409 })
  }

  const ahora = new Date()

  // IDEMPOTENCIA (id de la casa, como Media con su semilla): un reenvío del
  // daemon jamás duplica filas ni vuelve a gastar el cerebro en la misma entrada.
  const previa = await db.whatsAppMensaje.findUnique({
    where: { chatId_direccion_idEntrada: { chatId, direccion: 'salida', idEntrada } },
  })
  if (previa && (previa.estado === 'enviado' || previa.estado === 'fallado')) {
    await registrarEvento('mensajes_whatsapp', { accion: 'entrante', chat, resultado: previa.estado, idempotente: true, via: 'webhook_daemon' })
    return NextResponse.json({
      ok: true,
      idempotente: true,
      responder: false,
      estado: previa.estado,
      mensajeId: previa.id,
      motivo: `Esta entrada ya fue respondida (estado ${previa.estado}): el daemon reintenta el ENVÍO con marcar_envio, no re-procesa el mensaje.`,
    })
  }
  if (previa && previa.estado === 'en_cola' && previa.texto) {
    await registrarEvento('mensajes_whatsapp', { accion: 'entrante', chat, resultado: 'en_cola', idempotente: true, via: 'webhook_daemon' })
    return NextResponse.json({
      ok: true,
      idempotente: true,
      responder: true,
      texto: previa.texto,
      mensajeId: previa.id,
      estado: 'en_cola',
      motivo: 'Instrucción re-entregada: la respuesta ya estaba en cola (no se vuelve a llamar al cerebro).',
    })
  }

  // Filtro de edad de la ENTRADA (mismo estándar duro que /api/chat).
  const prohibidos = detectarTerminosProhibidos(texto)
  const filtroTripo = prohibidos.length > 0

  // Pacing W1 (CUÁNDO) — se calcula antes del cerebro: si bloquea, el LLM no se gasta (regla $0).
  const cfg = pacingEfectivo()
  const decision = decidirEnvio(await marcasRecientes(), chatId, false, cfg, ahora)

  const veredicto = resolverSalida({ filtroEntradaTripo: filtroTripo, decisionPacing: decision })

  // ── Camino bloqueado por filtro: sin cerebro, sin salida, auditado ──
  if (veredicto.estadoSalida === 'bloqueado_filtro') {
    await db.whatsAppMensaje.upsert({
      where: { chatId_direccion_idEntrada: { chatId, direccion: 'entrada', idEntrada } },
      update: { meta: JSON.stringify({ filtro: 'entrada', terminos: prohibidos.length, via: 'webhook_daemon' }) },
      create: {
        chatId, direccion: 'entrada', tipo: 'respuesta', estado: 'recibido', texto, idEntrada,
        meta: JSON.stringify({ filtro: 'entrada', terminos: prohibidos.length, via: 'webhook_daemon' }),
      },
    })
    await registrarEvento('rechazo_qa', { modulo: 'whatsapp_daemon', motivo: 'Filtro de edad aparente en la entrada del canal', terminos: prohibidos, chat }, { characterId: personaje.id })
    await registrarEvento('mensajes_whatsapp', { accion: 'entrante', chat, resultado: 'bloqueado_filtro', responder: false, via: 'webhook_daemon' }, { characterId: personaje.id })
    return NextResponse.json({ ok: true, responder: false, estado: 'bloqueado_filtro', motivo: veredicto.motivo, chat })
  }

  // ── Camino bloqueado por pacing: cola fría, sin gastar el cerebro ──
  // Condición explícita sobre el pacing (no sobre el veredicto): si el pacing
  // pasa, el cerebro corre y resolverSalida decide de nuevo CON su resultado.
  if (!decision.permitido) {
    await db.whatsAppMensaje.upsert({
      where: { chatId_direccion_idEntrada: { chatId, direccion: 'entrada', idEntrada } },
      update: { meta: JSON.stringify({ via: 'webhook_daemon', recibidoEn: recibidoEn?.toISOString() ?? null }) },
      create: {
        chatId, direccion: 'entrada', tipo: 'respuesta', estado: 'recibido', texto, idEntrada,
        meta: JSON.stringify({ via: 'webhook_daemon', recibidoEn: recibidoEn?.toISOString() ?? null }),
      },
    })
    const salida = await db.whatsAppMensaje.upsert({
      where: { chatId_direccion_idEntrada: { chatId, direccion: 'salida', idEntrada } },
      update: {
        estado: 'bloqueado_pacing',
        texto: '',
        pacingMotivo: decision.motivo,
        pacingReintentarEn: decision.reintentarEn ? new Date(decision.reintentarEn) : null,
        errorRiesgo: false,
        enviadoEn: null,
        meta: JSON.stringify({ ...veredicto.meta, via: 'webhook_daemon' }),
      },
      create: {
        chatId, direccion: 'salida', tipo: 'respuesta', estado: 'bloqueado_pacing', texto: '', idEntrada,
        pacingMotivo: decision.motivo,
        pacingReintentarEn: decision.reintentarEn ? new Date(decision.reintentarEn) : null,
        meta: JSON.stringify({ ...veredicto.meta, via: 'webhook_daemon' }),
      },
    })
    await registrarEvento('mensajes_whatsapp', { accion: 'entrante', chat, resultado: 'bloqueado_pacing', responder: false, pacing: decision.motivo, reintentarEn: decision.reintentarEn, via: 'webhook_daemon' }, { characterId: personaje.id })
    return NextResponse.json({
      ok: true,
      responder: false,
      estado: 'bloqueado_pacing',
      mensajeId: salida.id,
      motivo: veredicto.motivo,
      pacing: { motivo: decision.motivo, reintentarEn: decision.reintentarEn },
      chat,
    })
  }

  // ── Camino del cerebro: QUÉ responde (plantilla del genoma o LLM seguro) ──
  const metaCerebro: Record<string, unknown> = {}
  let textoCerebro = respuestaPlantilla(personaje, texto)
  let modo = 'plantilla_genoma'
  const intencion = detectarIntencion(texto)

  if (intencion !== 'texto') {
    // El canal WhatsApp no dispara jobs ni consumo del operador: la media y lo
    // 18+ viven en el Estudio/Fanvue. La plantilla del genoma responde y DECLARA.
    metaCerebro.intencion = intencion
    metaCerebro.nota = 'Pedido de media por WhatsApp: responde la plantilla del genoma; la producción vive en el Estudio, no en el canal.'
  } else {
    const sonda = await sondearLLM()
    if (sonda.estado === 'OPERATIVO') {
      // Memoria POR CHAT: el contexto del LLM son las filas de ESTE chatId
      // (jamás el GFE del operador ni el de otro contacto).
      const ctx = await db.whatsAppMensaje.findMany({
        where: { chatId, tipo: 'texto' },
        orderBy: { createdAt: 'desc' },
        take: 14,
      })
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
          await registrarEvento('llm_chat', { origen: 'whatsapp_daemon', provedor: r.provedor, modelo: r.modelo, caracteres: salida.texto.length, chat }, { characterId: personaje.id })
        } else {
          // El LLM violó el filtro en su SALIDA → plantilla segura + rechazo auditado.
          metaCerebro.llmEstado = 'RECHAZADO_FILTRO'
          metaCerebro.llmMotivo = 'la salida del LLM activó el filtro de edad de la plataforma'
          await registrarEvento('rechazo_qa', { modulo: 'whatsapp_daemon', motivo: 'Filtro de edad en la salida del LLM del canal', terminosRechazados: salida.terminos.length, provedor: r.provedor, chat }, { characterId: personaje.id })
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

  // Persistencia honesta: entrada siempre; salida en cola con su marca de pacing.
  await db.whatsAppMensaje.upsert({
    where: { chatId_direccion_idEntrada: { chatId, direccion: 'entrada', idEntrada } },
    update: { meta: JSON.stringify({ via: 'webhook_daemon', recibidoEn: recibidoEn?.toISOString() ?? null }) },
    create: {
      chatId, direccion: 'entrada', tipo: 'respuesta', estado: 'recibido', texto, idEntrada,
      meta: JSON.stringify({ via: 'webhook_daemon', recibidoEn: recibidoEn?.toISOString() ?? null }),
    },
  })
  const salida = await db.whatsAppMensaje.upsert({
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

  await registrarEvento('mensajes_whatsapp', { accion: 'entrante', chat, resultado: final.estadoSalida, responder: final.responder, modo, pacing: decision.motivo, via: 'webhook_daemon' }, { characterId: personaje.id })

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

  const fila = await db.whatsAppMensaje.findUnique({ where: { id } })
  if (!fila) return NextResponse.json({ error: 'Fila de mensaje no encontrada.' }, { status: 404 })
  if (fila.direccion !== 'salida') {
    return NextResponse.json({ error: 'Esa fila no es un envío saliente (dirección ' + fila.direccion + ').' }, { status: 409 })
  }

  const t = transicionEnvio(fila.estado as EstadoMensaje, resultado)
  if (!t.ok || !t.estado) {
    await registrarEvento('mensajes_whatsapp', { accion: 'marcar_envio', mensajeId: id, resultado, rechazado: t.error, via: 'webhook_daemon' })
    return NextResponse.json({ error: t.error }, { status: 409 })
  }

  const ahora = new Date()
  const metaPrev = JSON.parse(fila.meta || '{}') as Record<string, unknown>
  const actualizada = await db.whatsAppMensaje.update({
    where: { id },
    data: {
      estado: t.estado,
      errorRiesgo: t.estado === 'fallado' ? errorRiesgo : false,
      enviadoEn: t.estado === 'enviado' && !t.idempotente ? ahora : fila.enviadoEn,
      meta: JSON.stringify({ ...metaPrev, ultimaMarca: { resultado, errorRiesgo, detalle: detalle || null, cuando: ahora.toISOString() } }),
    },
  })

  await registrarEvento('mensajes_whatsapp', {
    accion: 'marcar_envio',
    mensajeId: id,
    chat: mascararChatId(fila.chatId),
    resultado: t.estado,
    errorRiesgo: actualizada.errorRiesgo,
    idempotente: Boolean(t.idempotente),
    via: 'webhook_daemon',
  })

  return NextResponse.json({
    ok: true,
    estado: actualizada.estado,
    idempotente: Boolean(t.idempotente),
    errorRiesgo: actualizada.errorRiesgo,
  })
}

// F1 · W2 — sesión WhatsApp PROPIA del negocio (CASA PROPIA, EMBUDO §7).
// Una fila (id "unica") en BD propia. El estado es HONESTO: CONECTADA solo
// llega cuando el daemon real (máquina del fundador) presenta número + secreto
// tras el emparejamiento verdadero — jamás se inventa una conexión.
//
//  GET → estado de la sesión para el panel: estado, máscara del número, reto
//        QR vigente/caducado y metadatos. El secreto JAMÁS sale (solo "presente").
//  POST accion:
//    iniciar_espera_qr  → crea reto QR con caducidad (NO_CONFIGURADO/DESCONECTADA → ESPERANDO_QR)
//    confirmar_conexion → daemon presenta {numero, secretoSesion}; el secreto
//                         queda SOLO cifrado en reposo (AES-256-GCM, clave
//                         dedicada derivada del secreto del servidor) y el
//                         número como huella SHA-256 + máscara
//    rotar              → logout explícito: nuevo reto QR, secreto anterior invalidado
//    desconectar        → baja la sesión y BORRA el secreto (explícito, nunca en silencio)
//    caducar_qr         → el reto venció → DESCONECTADA
// Todo movimiento queda en el log de compliance (append-only, tipo sesion_whatsapp).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { registrarEvento } from '@/lib/compliance'
import { secretoServidor } from '@/lib/clave-privada'
import {
  AccionSesion,
  EstadoSesion,
  cifrarSecretoSesion,
  derivarClaveSesion,
  estadoQr,
  huellaNumero,
  mascararNumero,
  nuevoDesafioQr,
  transicionSesion,
  validarConfirmacion,
} from '@/lib/whatsapp/sesion'

export const dynamic = 'force-dynamic'

const ID_SESION = 'unica'

const ACCIONES_VALIDAS: AccionSesion[] = ['iniciar_espera_qr', 'confirmar_conexion', 'rotar', 'desconectar', 'caducar_qr']

async function leerSesion() {
  let fila = await db.whatsAppSesion.findUnique({ where: { id: ID_SESION } })
  if (!fila) {
    fila = await db.whatsAppSesion.create({ data: { id: ID_SESION } })
  }
  return fila
}

export async function GET() {
  const fila = await leerSesion()
  const ahora = new Date()
  const estadoQrActual = estadoQr(fila.qrCaducaEn ? { caducaEn: fila.qrCaducaEn } : null, ahora)
  return NextResponse.json({
    estado: fila.estado,
    honesto:
      fila.estado === 'CONECTADA'
        ? 'Sesión conectada: el daemon presentó número y secreto tras el emparejamiento real.'
        : fila.estado === 'ESPERANDO_QR'
          ? 'Emparejamiento en espera: el reto QR vence en ~1 minuto; confírmalo desde el daemon de tu máquina.'
          : fila.estado === 'DESCONECTADA'
            ? 'Sesión bajada: puedes iniciar una nueva espera de QR.'
            : 'NO_CONFIGURADO: sin QR confirmado, el canal WhatsApp no existe todavía — y nada envía nada.',
    numeroMascarado: fila.numeroMascarado,
    huellaPresente: Boolean(fila.huellaNumero),
    secretoPresente: Boolean(fila.secretoWrap), // jamás el secreto, solo si existe
    qr: fila.estado === 'ESPERANDO_QR' ? { estado: estadoQrActual, creadoEn: fila.qrCreadoEn, caducaEn: fila.qrCaducaEn } : null,
    conectadaEn: fila.conectadaEn,
    desconectadaEn: fila.desconectadaEn,
    rotaciones: fila.rotaciones,
    detalle: fila.detalle,
    actualizadoEn: fila.updatedAt,
  })
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { accion?: unknown; numero?: unknown; secretoSesion?: unknown }
  const accion = String(body.accion ?? '')
  if (!ACCIONES_VALIDAS.includes(accion as AccionSesion)) {
    return NextResponse.json({ error: `Acción desconocida: ${accion}. Válidas: ${ACCIONES_VALIDAS.join(', ')}.` }, { status: 400 })
  }

  const fila = await leerSesion()
  const ahora = new Date()
  const estadoActual = fila.estado as EstadoSesion

  const transicion = transicionSesion(estadoActual, accion as AccionSesion)
  if (!transicion.ok || !transicion.estado) {
    return NextResponse.json({ error: transicion.error }, { status: 409 })
  }

  const clave = derivarClaveSesion(secretoServidor())
  const data: Record<string, unknown> = { estado: transicion.estado, detalle: '' }

  if (accion === 'iniciar_espera_qr' || accion === 'rotar') {
    // Espera nueva: reto fresco, secreto anterior invalidado (rotación = logout).
    const desafio = nuevoDesafioQr(ahora)
    data.desafioQr = desafio.codigo
    data.qrCreadoEn = desafio.creadoEn
    data.qrCaducaEn = desafio.caducaEn
    data.secretoWrap = null
    data.conectadaEn = null
    data.detalle =
      accion === 'rotar'
        ? `Rotación de sesión (logout explícito) a las ${ahora.toISOString()}: secreto anterior invalidado, reto QR nuevo en espera.`
        : `Espera de emparejamiento iniciada a las ${ahora.toISOString()} — el reto vence en ~1 minuto.`
  } else if (accion === 'confirmar_conexion') {
    const vigente = estadoQr(fila.qrCaducaEn ? { caducaEn: fila.qrCaducaEn } : null, ahora)
    if (vigente !== 'vigente') {
      return NextResponse.json(
        { error: vigente === 'caducado' ? 'El reto QR venció: inicia una espera nueva y confirma en menos de un minuto.' : 'No hay reto QR en espera.' },
        { status: 409 },
      )
    }
    const validacion = validarConfirmacion(body.numero, body.secretoSesion)
    if (!validacion.ok) return NextResponse.json({ error: validacion.error }, { status: 400 })
    // Cambio de número detectado por huella distinta (sin revelar nada).
    const huella = huellaNumero(validacion.e164)
    const cambioNumero = fila.huellaNumero !== null && fila.huellaNumero !== huella
    data.huellaNumero = huella
    data.numeroMascarado = mascararNumero(validacion.e164)
    data.secretoWrap = cifrarSecretoSesion(validacion.secreto, clave)
    data.conectadaEn = ahora
    data.desconectadaEn = null
    data.desafioQr = null
    data.qrCreadoEn = null
    data.qrCaducaEn = null
    data.detalle = `Conexión confirmada a las ${ahora.toISOString()}${cambioNumero ? ' — ATENCIÓN: la huella del número CAMBIÓ respecto a la sesión anterior.' : '.'}`
  } else if (accion === 'desconectar') {
    // Baja explícita: el secreto se BORRA (jamás queda en silencio).
    data.secretoWrap = null
    data.huellaNumero = null
    data.numeroMascarado = null
    data.desafioQr = null
    data.qrCreadoEn = null
    data.qrCaducaEn = null
    data.conectadaEn = null
    data.desconectadaEn = ahora
    data.detalle = `Sesión desconectada a las ${ahora.toISOString()} — secreto e identidad del número borrados de la BD.`
  } else if (accion === 'caducar_qr') {
    const vigente = estadoQr(fila.qrCaducaEn ? { caducaEn: fila.qrCaducaEn } : null, ahora)
    if (vigente === 'vigente') {
      return NextResponse.json(
        { error: 'El reto QR sigue vigente: usa desconectar para cancelar la espera antes de que venza.' },
        { status: 409 },
      )
    }
    data.secretoWrap = null
    data.desafioQr = null
    data.qrCreadoEn = null
    data.qrCaducaEn = null
    data.desconectadaEn = ahora
    data.detalle = `Reto QR vencido sin confirmación (${ahora.toISOString()}) — de vuelta a DESCONECTADA.`
  }

  const rotaciones = accion === 'rotar' ? fila.rotaciones + 1 : fila.rotaciones
  const actualizada = await db.whatsAppSesion.update({
    where: { id: ID_SESION },
    data: { ...data, rotaciones },
  })

  await registrarEvento('sesion_whatsapp', {
    accion,
    estadoResultante: actualizada.estado,
    huellaPresente: Boolean(actualizada.huellaNumero),
    secretoPresente: Boolean(actualizada.secretoWrap),
    rotaciones: actualizada.rotaciones,
    via: 'api_whatsapp_sesion',
  })

  return NextResponse.json({
    ok: true,
    estado: actualizada.estado,
    detalle: actualizada.detalle,
    numeroMascarado: actualizada.numeroMascarado,
    rotaciones: actualizada.rotaciones,
  })
}

// F4 — MESA META: superficie del OPERADOR para FB/IG MANUAL-FIRST (CASA PROPIA,
// EMBUDO §7). NO hay webhook ni automatización: Meta banea adulto y
// automatización ToS-violadora (EMBUDO §4). El operador pega el mensaje que
// llegó, el CEREBRO escribe el borrador (mismos filtros de edad que /api/chat)
// y el operador lo envía MANUALMENTE desde la app de Meta. Todo queda en
// compliance append-only (mensajes_meta).
//
//  GET → borradores recientes + honesto + topes (sin secretos: aquí nada secreto entra).
//  POST accion 'borrar' {red, contacto?, texto, personajeId}
//        → valida → personaje ACTIVO (el borrador es de UN genoma concreto) →
//          filtro de edad en ENTRADA (bloqueado queda auditado) → cerebro
//          (plantilla del genoma o LLM con salida segura) → fila MetaBorrador.
//  POST accion 'usar' {id} → el operador copió el borrador y lo envió A MANO
//        desde Meta: se registra el hecho (resueltoEn) — CHAT-X jamás envía.
//  POST accion 'descartar' {id} → baja explícita con compliance.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { registrarEvento } from '@/lib/compliance'
import { detectarTerminosProhibidos } from '@/lib/constants'
import { respuestaPlantilla } from '@/lib/chat'
import { generarRespuestaLLM, salidaLLMSegura, sondearLLM } from '@/lib/provider/llm'
import {
  EstadoBorradorMeta,
  MAX_TEXTO_ENTRADA,
  REDES,
  mostrarContacto,
  transicionBorradorMeta,
  validarEntradaMeta,
} from '@/lib/meta/mesa'

export const dynamic = 'force-dynamic'

export async function GET() {
  const filas = await db.metaBorrador.findMany({ orderBy: { updatedAt: 'desc' }, take: 30 })
  const pendientes = await db.metaBorrador.count({ where: { estado: 'borrador' } })
  return NextResponse.json({
    honesto:
      'Mesa manual-first: CHAT-X NO se conecta a Meta y NO envía nada. Pega el mensaje que llegó, el cerebro escribe el borrador y TÚ lo envías a mano desde la app de Meta — la automatización en Meta es ToS-violadora y no se construye.',
    topes: { textoEntrada: MAX_TEXTO_ENTRADA, redes: REDES },
    pendientes,
    borradores: filas.map((f) => {
      const meta = JSON.parse(f.meta || '{}') as Record<string, unknown>
      return {
        id: f.id,
        red: f.red,
        contacto: mostrarContacto(f.contacto),
        textoEntrada: f.textoEntrada.slice(0, 160),
        borrador: f.borrador.slice(0, 400),
        estado: f.estado as EstadoBorradorMeta,
        modo: f.modo,
        bloqueadoFiltro: f.modo === 'bloqueado_filtro',
        llmEstado: typeof meta.llmEstado === 'string' ? meta.llmEstado : null,
        createdAt: f.createdAt,
        resueltoEn: f.resueltoEn,
      }
    }),
    actualizadoEn: new Date(),
  })
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const accion = String(body.accion ?? '')

  if (accion === 'borrar') {
    const validacion = validarEntradaMeta(body)
    if (!validacion.ok) return NextResponse.json({ error: validacion.error }, { status: 400 })
    const { red, contacto, texto, personajeId } = validacion.datos

    const personaje = await db.character.findUnique({ where: { id: personajeId } })
    if (!personaje) return NextResponse.json({ error: 'El personaje del borrador no existe.' }, { status: 404 })
    if (personaje.status !== 'ACTIVO') {
      return NextResponse.json({ error: `Los borradores son de personajes ACTIVOS (este está ${personaje.status}).` }, { status: 409 })
    }

    const ahora = new Date()
    const prohibidos = detectarTerminosProhibidos(texto)

    if (prohibidos.length > 0) {
      // Filtro de edad en la ENTRADA: la fila queda auditada, sin borrador.
      const fila = await db.metaBorrador.create({
        data: {
          red,
          contacto: contacto.slice(0, 80),
          textoEntrada: texto,
          borrador: '',
          estado: 'borrador',
          modo: 'bloqueado_filtro',
          meta: JSON.stringify({ filtro: 'entrada', terminos: prohibidos.length, via: 'mesa_meta' }),
        },
      })
      await registrarEvento('rechazo_qa', { modulo: 'mesa_meta', motivo: 'Filtro de edad aparente en la entrada pegada a mano', terminos: prohibidos, red, contacto: mostrarContacto(contacto) }, { characterId: personaje.id })
      await registrarEvento('mensajes_meta', { accion: 'borrar', resultado: 'bloqueado_filtro', red, borradorId: fila.id }, { characterId: personaje.id })
      return NextResponse.json({
        ok: true,
        id: fila.id,
        estado: 'bloqueado_filtro',
        borrador: null,
        motivo: 'La entrada activó el filtro de edad de la plataforma: sin borrador; queda en el log de compliance para revisión humana.',
      })
    }

    // Cerebro: plantilla del genoma o LLM con salida segura (mismo espíritu
    // que los canales — el QUÉ lo escribe el cerebro, jamás texto libre).
    const metaBorrador: Record<string, unknown> = {}
    let textoBorrador = respuestaPlantilla(personaje, texto)
    let modo = 'plantilla_genoma'

    const sonda = await sondearLLM()
    if (sonda.estado === 'OPERATIVO') {
      const r = await generarRespuestaLLM(personaje, [], texto)
      if (r.ok) {
        const salida = salidaLLMSegura(r.texto)
        if (salida.ok) {
          textoBorrador = salida.texto
          modo = `llm_${r.provedor}`
          metaBorrador.llm = { provedor: r.provedor, modelo: r.modelo }
          await registrarEvento('llm_chat', { origen: 'mesa_meta', provedor: r.provedor, modelo: r.modelo, caracteres: salida.texto.length, red }, { characterId: personaje.id })
        } else {
          metaBorrador.llmEstado = 'RECHAZADO_FILTRO'
          await registrarEvento('rechazo_qa', { modulo: 'mesa_meta', motivo: 'Filtro de edad en la salida del LLM de la mesa', terminosRechazados: salida.terminos.length, provedor: r.provedor, red }, { characterId: personaje.id })
        }
      } else {
        metaBorrador.llmEstado = r.estado
        metaBorrador.llmFallo = r.detalle.slice(0, 200)
      }
    } else {
      metaBorrador.llmEstado = sonda.estado
      metaBorrador.llmDetalle = sonda.detalle.slice(0, 200)
    }

    const fila = await db.metaBorrador.create({
      data: {
        red,
        contacto: contacto.slice(0, 80),
        textoEntrada: texto,
        borrador: textoBorrador,
        estado: 'borrador',
        modo,
        meta: JSON.stringify({ ...metaBorrador, via: 'mesa_meta' }),
      },
    })
    await registrarEvento('mensajes_meta', { accion: 'borrar', resultado: 'borrador', red, modo, borradorId: fila.id, contacto: mostrarContacto(contacto) }, { characterId: personaje.id })
    return NextResponse.json({
      ok: true,
      id: fila.id,
      estado: fila.estado,
      borrador: textoBorrador,
      modo,
      motivo: 'Borrador listo: cópialo y envíalo TÚ a mano desde la app de Meta; luego márcalo como usado.',
    })
  }

  if (accion === 'usar' || accion === 'descartar') {
    const id = typeof body.id === 'string' ? body.id.trim() : ''
    if (!id) return NextResponse.json({ error: 'Falta el id del borrador.' }, { status: 400 })
    const fila = await db.metaBorrador.findUnique({ where: { id } })
    if (!fila) return NextResponse.json({ error: 'Borrador no encontrado.' }, { status: 404 })
    if (fila.modo === 'bloqueado_filtro') {
      // Un borrador bloqueado por filtro jamás se "usa" — solo se descarta.
      if (accion === 'usar') {
        return NextResponse.json({ error: 'Esa entrada activó el filtro de edad: no genera borrador ni se envía. Solo cabe descartarla (con revisión humana).' }, { status: 409 })
      }
    }
    const t = transicionBorradorMeta(fila.estado, accion)
    if (!t.ok || !t.estado) {
      await registrarEvento('mensajes_meta', { accion, borradorId: id, rechazado: t.error, via: 'mesa_meta' })
      return NextResponse.json({ error: t.error }, { status: 409 })
    }
    const ahora = new Date()
    await db.metaBorrador.update({
      where: { id },
      data: { estado: t.estado, resueltoEn: ahora, meta: JSON.stringify({ ...(JSON.parse(fila.meta || '{}') as Record<string, unknown>), resueltoComo: t.estado, cuando: ahora.toISOString() }) },
    })
    await registrarEvento('mensajes_meta', {
      accion,
      borradorId: id,
      resultado: t.estado,
      red: fila.red,
      contacto: mostrarContacto(fila.contacto),
      ...(accion === 'usar' ? { nota: 'envío MANUAL desde la app de Meta — fuera de CHAT-X' } : {}),
      via: 'mesa_meta',
    })
    return NextResponse.json({
      ok: true,
      id,
      estado: t.estado,
      motivo:
        accion === 'usar'
          ? 'Registrado como usado: el envío fue MANUAL desde la app de Meta (CHAT-X jamás envía a Meta).'
          : 'Borrador descartado (explícito, registrado en compliance).',
    })
  }

  return NextResponse.json({ error: `Acción desconocida: ${accion}. Válidas: borrar, usar, descartar.` }, { status: 400 })
}

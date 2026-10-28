// ORQUESTADOR DE FLUJOS — sección 8 y 9 del prompt maestro.
// Ejecuta flujos de extremo a extremo con acciones REALES sobre los motores
// (sondas HTTP, validación/submit de Production JSON, acciones del CRM, lotes
// del Estudio, eventos de integración) + aprobaciones humanas + reintentos
// controlados + trazabilidad completa. Nada de botones falsos: cada paso llama
// al contrato real del motor correspondiente y registra lo que pasó.
import { db } from '@/lib/db'
import { estadoMotor, configMotor, type MotorId } from '@/lib/motores'
import { registroEvento } from '@/lib/integracion-eventos'
import { COSTOS, JOB_STATUS, LANE } from '@/lib/constants'
import { hexSha256 } from '@/lib/rng'
import type { Brief } from '@/lib/provider/types'

/**
 * Brief por defecto derivado SOLO del genoma real del personaje (sin inventar
 * datos externos). Sirve cuando un flujo encola un lote sin brief explícito:
 * el job produce previews de verdad en lugar de completarse vacío.
 */
export function construirBriefPorDefecto(genome: string): Brief {
  let g: { atributos?: Record<string, string>; aficiones?: string; lore?: string; tono?: string } = {}
  try {
    g = JSON.parse(genome) as typeof g
  } catch {
    // genoma ausente o corrupto → valores neutros, nunca un fallo del flujo
  }
  const tema = String(g.aficiones || g.lore || 'sesión casual en interior').slice(0, 120)
  return {
    escena: `sesión fotográfica inspirada en: ${tema}`,
    outfit: 'vestuario casual elegante acorde al personaje',
    pose: 'natural, relajada, mirando a cámara',
    encuadre: 'plano_medio',
    luz: 'natural suave',
  }
}

/**
 * IDEMPOTENCIA — batchId determinista por (ejecución, paso): si el proceso muere
 * entre encolar el job y persistir las variables, o el operador re-lanza la
 * ejecución, el MISMO par (ejecución, paso) resuelve al MISMO batchId y el paso
 * reutiliza el job ya encolado en vez de duplicar el lote.
 */
export function batchIdFlujo(ejecucionId: string, pasoId: string): string {
  return `flujo_${hexSha256(`${ejecucionId}:${pasoId}`).slice(0, 16)}`
}

/**
 * ESTADO DE PROYECTO YT — contrato REAL del motor (GET /api/projects/{pid}):
 *   { …, status: 'pending'|<paso>|'ready'|'failed', job: {status:'running'|'done'|'failed'|'cancelled'} | null }
 * NOTA (hallazgo d131124): la ruta GET /api/jobs/{id} NO existe en el motor
 * (solo /events SSE y /cancel) — el sondeo de estado va contra /api/projects/{pid}.
 */
export function resuelveEstadoProyectoYT(
  payload: unknown,
): { termino: boolean; exito: boolean; detalle: string } {
  const p = (payload ?? {}) as { status?: string; job?: { status?: string } | null }
  const estadoProyecto = String(p.status ?? '')
  const estadoJob = String(p.job?.status ?? '')
  if (estadoProyecto === 'ready') return { termino: true, exito: true, detalle: `proyecto ready (job: ${estadoJob || 'ninguno'})` }
  if (estadoProyecto === 'failed') return { termino: true, exito: false, detalle: 'proyecto failed' }
  if (estadoJob === 'done') return { termino: true, exito: true, detalle: 'job activo done' }
  if (estadoJob === 'failed' || estadoJob === 'cancelled') return { termino: true, exito: false, detalle: `job activo ${estadoJob}` }
  return { termino: false, exito: false, detalle: `en curso (proyecto: ${estadoProyecto || '?'}${estadoJob ? `, job: ${estadoJob}` : ''})` }
}


/** Variante base determinista derivada del batchId (sin Math.random: re-ejecutar no cambia las semillas). */
export function varianteDeBatch(batchId: string): number {
  return parseInt(hexSha256(`variante:${batchId}`).slice(0, 8), 16) % 1000
}

/**
 * GATE HUMANO ESTRUCTURAL para WhatsApp: un paso ultra_step NO puede ejecutarse si
 * no hay una aprobación humana COMPLETADA antes de él en la misma ejecución (y no
 * ha sido ya autorizado su propio gate). Defensa en profundidad: aunque el operador
 * construya un flujo sin gate explícito, ningún contacto WhatsApp sale sin su sí.
 */
export function bloqueadoGateUltra(paso: PasoDef, st: EstadoPaso, idx: number, pasos: PasoDef[], pasosEstado: Record<string, EstadoPaso>): boolean {
  if (paso.tipo !== 'ultra_step') return false
  if (Boolean((st.resultado as { gateAutorizado?: boolean } | undefined)?.gateAutorizado)) return false
  return !pasos.slice(0, idx).some((p) => p.tipo === 'aprobacion_humana' && pasosEstado[p.id]?.estado === 'completado')
}

export interface PasoDef {
  id: string
  tipo: string
  nombre: string
  params: Record<string, unknown>
  requiereAprobacion?: boolean
  opcional?: boolean // si falla y es opcional → se marca omitido y el flujo sigue
  intentos?: number // reintentos (default 2, máx 4)
}

export interface EstadoPaso {
  estado: 'pendiente' | 'en_curso' | 'completado' | 'fallido' | 'omitido' | 'esperando_aprobacion'
  resultado?: unknown
  error?: string
  iniciadoEn?: string
  terminadoEn?: string
  intentos?: number
}

type Registro = { ts: string; paso: string; nivel: 'info' | 'ok' | 'warn' | 'error'; mensaje: string }
type Variables = Record<string, unknown>

const EJECUCIONES_EN_CURSO = new Set<string>()

async function log(ejecucionId: string, registro: Registro[], paso: string, nivel: Registro['nivel'], mensaje: string): Promise<void> {
  registro.push({ ts: new Date().toISOString(), paso, nivel, mensaje })
  await db.flujoEjecucion.update({
    where: { id: ejecucionId },
    data: { registro: JSON.stringify(registro.slice(-500)) },
  }).catch(() => undefined)
}

/** Sustituye {{variable.subruta}} en strings de params con las variables acumuladas. */
function interpolar(valor: unknown, vars: Variables): unknown {
  if (typeof valor === 'string') {
    return valor.replace(/\{\{([^}]+)\}\}/g, (_m, ruta: string) => {
      const val = ruta.trim().split('.').reduce<unknown>((acc, k) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[k] : undefined), vars)
      return val === undefined || val === null ? '' : typeof val === 'object' ? JSON.stringify(val) : String(val)
    })
  }
  if (Array.isArray(valor)) return valor.map((v) => interpolar(v, vars))
  if (valor && typeof valor === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(valor as Record<string, unknown>)) out[k] = interpolar(v, vars)
    return out
  }
  return valor
}

async function fetchJson(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<{ ok: boolean; status: number; json?: unknown; texto?: string; error?: string }> {
  const { timeoutMs = 6000, ...rest } = init
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...rest, signal: ctrl.signal, cache: 'no-store' })
    const texto = await res.text()
    try {
      return { ok: res.ok, status: res.status, json: JSON.parse(texto) }
    } catch {
      return { ok: res.ok, status: res.status, texto: texto.slice(0, 500) }
    }
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? (e.name === 'AbortError' ? `sin respuesta en ${timeoutMs}ms` : e.message) : 'error de red' }
  } finally {
    clearTimeout(t)
  }
}

/** Ejecuta UN paso y devuelve {ok, resultado, mensaje}. Sin excepciones: todo es resultado. */
async function accionPaso(paso: PasoDef, vars: Variables, ctx?: { ejecucionId: string }): Promise<{ ok: boolean; mensaje: string; resultado?: unknown }> {
  const params = interpolar(paso.params, vars) as Record<string, unknown>
  switch (paso.tipo) {
    // ── Salud y trazabilidad ──
    case 'sondear_motor': {
      const motor = String(params.motor || '') as MotorId
      const { url, apiKey } = await configMotor(motor)
      const estado = await estadoMotor(motor)
      void url
      void apiKey
      return { ok: estado.estado.estado === 'OPERATIVO', mensaje: `Sonda ${motor}: ${estado.estado.detalle}`, resultado: estado.estado }
    }
    case 'registrar_evento': {
      await registroEvento(
        String(params.source || 'sistema'),
        String(params.event || 'flujo.evento'),
        (params.detail as Record<string, unknown>) || {},
      )
      return { ok: true, mensaje: `Evento registrado: ${params.event || 'flujo.evento'}` }
    }

    // ── Motor de producción audiovisual (contrato real del arnés) ──
    case 'youtube_validar': {
      const { url, apiKey } = await configMotor('youtube')
      if (!url) return { ok: false, mensaje: 'YOUTUBE-AUTOMATION sin URL configurada.' }
      const res = await fetchJson(`${url.replace(/\/+$/, '')}/api/production_json/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
        body: JSON.stringify({ envelope: params.productionJson }),
      })
      if (res.ok) return { ok: true, mensaje: 'Production JSON validado por el motor.', resultado: res.json }
      return { ok: false, mensaje: `validate → HTTP ${res.status} ${res.error ?? res.texto ?? ''}` }
    }
    case 'youtube_submit': {
      const { url, apiKey } = await configMotor('youtube')
      if (!url) return { ok: false, mensaje: 'YOUTUBE-AUTOMATION sin URL configurada.' }
      const res = await fetchJson(`${url.replace(/\/+$/, '')}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
        body: JSON.stringify({ mode: 'production_json', production_json: params.productionJson }),
      })
      if (res.ok) {
        const data = res.json as { project_id?: string; job_id?: string; id?: string } | undefined
        const jobId = data?.job_id ?? data?.project_id ?? data?.id ?? null
        if (jobId) vars.youtubeJobId = jobId
        return { ok: true, mensaje: `Producción enviada al motor (id ${String(jobId)}).`, resultado: data }
      }
      return { ok: false, mensaje: `submit → HTTP ${res.status} ${res.error ?? res.texto ?? ''}` }
    }
    case 'youtube_estado': {
      const { url, apiKey } = await configMotor('youtube')
      if (!url) return { ok: false, mensaje: 'YOUTUBE-AUTOMATION sin URL configurada.' }
      const jobId = String(params.jobId || vars.youtubeJobId || '')
      if (!jobId) return { ok: false, mensaje: 'Sin jobId: ejecuta youtube_submit antes o pasa params.jobId.' }
      const maxMs = Math.min(Number(params.maxEsperaSeg) || 120, 600) * 1000
      const inicio = Date.now()
      // Contrato REAL del motor: el estado de un proyecto se lee en GET /api/projects/{pid}
      // (GET /api/jobs/{id} no existe: solo /events SSE y /cancel — verificado en el clon d131124).
      while (Date.now() - inicio < maxMs) {
        const res = await fetchJson(`${url.replace(/\/+$/, '')}/api/projects/${encodeURIComponent(jobId)}`, {
          headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
        })
        if (res.ok) {
          const r = resuelveEstadoProyectoYT(res.json)
          if (r.termino) {
            if (r.exito) return { ok: true, mensaje: `Proyecto ${jobId} terminó: ${r.detalle}`, resultado: res.json }
            return { ok: false, mensaje: `Proyecto ${jobId} falló en el motor: ${r.detalle}`, resultado: res.json }
          }
        } else if (res.status === 404) {
          return { ok: false, mensaje: `Proyecto ${jobId} no existe en el motor (404 de /api/projects).` }
        }
        await new Promise((r) => setTimeout(r, 4000))
      }
      return { ok: false, mensaje: `Proyecto ${jobId} sigue en curso tras ${maxMs / 1000}s (no es necesariamente un fallo: reintenta el paso).` }
    }

    // ── Estudio local (funciona con simulador y con ComfyUI real) ──
    case 'estudio_lote': {
      let characterId = String(params.characterId || 'auto')
      if (characterId === 'auto') {
        const activa = await db.character.findFirst({ where: { status: 'ACTIVO' }, orderBy: { updatedAt: 'desc' } })
        if (!activa) return { ok: false, mensaje: 'No hay ningún personaje ACTIVO en el Estudio: crea y activa uno primero.' }
        characterId = activa.id
      }
      const character = await db.character.findUnique({ where: { id: characterId } })
      if (!character) return { ok: false, mensaje: `Personaje ${characterId} no existe.` }
      const count = Math.max(1, Math.min(12, Number(params.count) || 4))
      const lane = params.lane === LANE.PRIVADO ? LANE.PRIVADO : LANE.PUBLICO
      // Brief explícito del flujo; si no viene, uno real derivado del genoma del personaje.
      const brief =
        params.brief && typeof params.brief === 'object'
          ? (params.brief as Brief)
          : construirBriefPorDefecto(character.genome)
      const coste = (COSTOS.PREVIEW + 0) * count
      const saldo = await db.settings.findUnique({ where: { id: 'main' } })
      if (!saldo || saldo.credits < coste) return { ok: false, mensaje: `Créditos insuficientes para lote de ${count} previews (necesita ${coste}).` }
      // IDEMPOTENCIA: batchId determinista por (ejecución, paso). Si este paso ya encoló
      // el lote (crash entre encolar y persistir, reintento, re-lanzamiento), se REUTILIZA
      // el job existente: nunca dos lotes por el mismo paso de la misma ejecución.
      const batchId = ctx ? batchIdFlujo(ctx.ejecucionId, paso.id) : `flujo_${Date.now()}`
      const previo = await db.job.findFirst({
        where: { type: 'lote_fotos', payload: { contains: batchId }, status: { not: JOB_STATUS.FALLIDO } },
        orderBy: { createdAt: 'desc' },
      })
      if (previo) {
        vars.estudioJobId = previo.id
        vars.estudioCharacterId = characterId
        return { ok: true, mensaje: `Lote de ${count} previews ya encolado antes para ${character.name} (job ${previo.id}, estado ${previo.status}): se reutiliza, no se duplica.`, resultado: previo.result }
      }
      const job = await db.job.create({
        data: {
          type: 'lote_fotos',
          characterId,
          priority: 2,
          costEstimate: coste,
          payload: JSON.stringify({ brief, count, lane, batchId, varianteBase: varianteDeBatch(batchId) }),
        },
      })
      vars.estudioJobId = job.id
      vars.estudioCharacterId = characterId
      return { ok: true, mensaje: `Lote de ${count} previews encolado para ${character.name} (job ${job.id}, ${lane}).` }
    }
    case 'estudio_esperar_job': {
      const jobId = String(params.jobId || vars.estudioJobId || '')
      if (!jobId) return { ok: false, mensaje: 'Sin jobId del Estudio: ejecuta estudio_lote antes.' }
      const maxMs = Math.min(Number(params.maxEsperaSeg) || 90, 300) * 1000
      const inicio = Date.now()
      while (Date.now() - inicio < maxMs) {
        const job = await db.job.findUnique({ where: { id: jobId } })
        if (job?.status === JOB_STATUS.LISTO) return { ok: true, mensaje: `Job ${jobId} listo: ${job.result}`, resultado: job.result }
        if (job?.status === JOB_STATUS.FALLIDO) return { ok: false, mensaje: `Job ${jobId} falló: ${job.error ?? 'sin detalle'}` }
        await new Promise((r) => setTimeout(r, 1500))
      }
      return { ok: false, mensaje: `Job ${jobId} sigue en cola tras ${maxMs / 1000}s.` }
    }

    // ── CRM (contrato chaleco real) ──
    case 'crm_accion': {
      const { url, apiKey } = await configMotor('crm')
      if (!url || !apiKey) return { ok: false, mensaje: 'CRM sin URL o API key configurada (guárdala en Módulo Comercial).' }
      const accion = String(params.accion || '')
      // El contrato crm-actions v0.2.1 NO deduplica servidor-side (sin X-Idempotency-Key).
      // Para acciones de ESCRITURA, un fallo ambiguo (sin respuesta HTTP) NO se reintenta:
      // el servidor pudo aplicarla y un reintento crearía un cliente/nota duplicada.
      const esEscritura = /^(create_|add_|schedule_)/i.test(accion)
      const res = await fetchJson(`${url.replace(/\/+$/, '')}/api/crm/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ action: accion, payload: params.payload ?? {} }),
      })
      if (res.ok) return { ok: true, mensaje: `Acción CRM ${accion} ejecutada.`, resultado: res.json }
      if (esEscritura && res.status === 0) {
        return { ok: false, mensaje: `${accion} falló de forma AMBIGUA (sin respuesta HTTP): no se reintenta automáticamente para no duplicar registros en el CRM. Verifica en el CRM si la acción se aplicó y re-lanza el flujo.` }
      }
      return { ok: false, mensaje: `crm/actions ${accion} → HTTP ${res.status} ${res.error ?? res.texto ?? ''}` }
    }

    // ── WhatsApp autorizado (contrato real de ULTRA; el guard anti-ban vive en el motor) ──
    case 'ultra_step': {
      const { url, apiKey } = await configMotor('ultra')
      if (!url) return { ok: false, mensaje: 'WHATSPOWER-ULTRA sin URL configurada.' }
      const campaignId = String(params.campaignId || vars.ultraCampaignId || '')
      if (!campaignId) return { ok: false, mensaje: 'Sin campaignId: crea la campaña en ULTRA o pasa params.campaignId.' }
      const res = await fetchJson(`${url.replace(/\/+$/, '')}/api/campaigns/${encodeURIComponent(campaignId)}/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
      })
      if (res.ok) return { ok: true, mensaje: `Paso de campaña ${campaignId} procesado por ULTRA (el motor aplica su guard anti-ban y horario comercial).`, resultado: res.json }
      return { ok: false, mensaje: `ultra step → HTTP ${res.status} ${res.error ?? res.texto ?? ''} (recuerda: el dispatch real exige el piloto confirmado del propio motor).` }
    }

    // ── Publicación programada (Set real → aparece en el calendario ICS/CSV) ──
    case 'programar_publicacion': {
      let setId = String(params.setId || '')
      if (!setId) {
        const characterId = String(params.characterId || vars.estudioCharacterId || 'auto')
        let cid = characterId
        if (cid === 'auto') {
          const activa = await db.character.findFirst({ where: { status: 'ACTIVO' }, orderBy: { updatedAt: 'desc' } })
          if (!activa) return { ok: false, mensaje: 'No hay personaje ACTIVO: no hay sets que programar.' }
          cid = activa.id
        }
        const ultimo = await db.set.findFirst({ where: { characterId: cid }, orderBy: { updatedAt: 'desc' } })
        if (!ultimo) return { ok: false, mensaje: 'El personaje no tiene sets todavía: genera contenido, apruébalo por QA y arma un Set en el Estudio (Biblioteca) antes de programar la publicación.' }
        setId = ultimo.id
      }
      const existe = await db.set.findUnique({ where: { id: setId } })
      if (!existe) return { ok: false, mensaje: `Set ${setId} no existe.` }
      const fecha = params.fecha ? new Date(String(params.fecha)) : new Date(Date.now() + (Number(params.dias) || 2) * 24 * 3600 * 1000)
      if (isNaN(fecha.getTime())) return { ok: false, mensaje: 'Fecha inválida: usa ISO (params.fecha) o params.dias (número).' }
      await db.set.update({
        where: { id: setId },
        data: { publishedAt: fecha, ...(existe.publishStatus === 'borrador' ? { publishStatus: 'empaquetado' } : {}) },
      })
      vars.setProgramadoId = setId
      return { ok: true, mensaje: `Set "${existe.name}" programado para ${fecha.toISOString().slice(0, 10)} (visible en el calendario ICS/CSV del módulo UGC).`, resultado: { setId, fecha: fecha.toISOString() } }
    }

    case 'aprobacion_humana':
      return { ok: false, mensaje: 'Paso de aprobación humana mal construido: el orquestador debe interceptarlo ANTES (requiereAprobacion: true).' }

    default:
      return { ok: false, mensaje: `Tipo de paso desconocido: "${paso.tipo}". Tipos válidos: sondear_motor, registrar_evento, youtube_validar, youtube_submit, youtube_estado, estudio_lote, estudio_esperar_job, crm_accion, ultra_step, programar_publicacion, aprobacion_humana.` }
  }
}

/** Ids de ejecuciones vivas EN ESTE PROCESO (para que la recuperación de zombis no toque las reales). */
export function ejecucionesVivas(): string[] {
  return Array.from(EJECUCIONES_EN_CURSO)
}

/** Arranca (o reanuda tras aprobación) la ejecución de un flujo. Fire-and-forget. */
export async function correrEjecucion(ejecucionId: string): Promise<void> {
  if (EJECUCIONES_EN_CURSO.has(ejecucionId)) return
  EJECUCIONES_EN_CURSO.add(ejecucionId)
  try {
    const ejecucion = await db.flujoEjecucion.findUnique({ where: { id: ejecucionId }, include: { flujo: true } })
    if (!ejecucion || ejecucion.estado === 'cancelada' || ejecucion.estado === 'completada') return
    const pasos = JSON.parse(ejecucion.flujo.definicion) as PasoDef[]
    const pasosEstado = JSON.parse(ejecucion.pasosEstado) as Record<string, EstadoPaso>
    const vars = JSON.parse(ejecucion.variables) as Variables
    const registro: Registro[] = JSON.parse(ejecucion.registro) as Registro[]

    await db.flujoEjecucion.update({ where: { id: ejecucionId }, data: { estado: 'en_curso' } })

    let fallo = false
    let esperando = false
    for (const [idx, paso] of pasos.entries()) {
      const st = pasosEstado[paso.id] ?? (pasosEstado[paso.id] = { estado: 'pendiente', intentos: 0 })
      if (st.estado === 'completado' || st.estado === 'omitido') continue
      if (st.estado === 'esperando_aprobacion') {
        esperando = true
        break // todavía no fue aprobado
      }

      // Aprobación humana ANTES de ejecutar (obligatoria para el tipo aprobacion_humana)
      if (paso.requiereAprobacion || paso.tipo === 'aprobacion_humana') {
        st.estado = 'esperando_aprobacion'
        await log(ejecucionId, registro, paso.nombre, 'warn', `Esperando aprobación humana: ${String(paso.params.mensaje || paso.nombre)}`)
        await persistir(ejecucionId, 'esperando_aprobacion', pasosEstado, vars, registro)
        esperando = true
        break
      }

      // GATE HUMANO ESTRUCTURAL (WhatsApp): ningún ultra_step ejecuta sin aprobación
      // humana previa en esta ejecución, aunque el flujo del operador no lo traiga.
      if (bloqueadoGateUltra(paso, st, idx, pasos, pasosEstado)) {
        st.estado = 'esperando_aprobacion'
        st.resultado = { gatePendiente: true, motivo: 'ultra_step exige autorización humana previa' }
        await log(ejecucionId, registro, paso.nombre, 'warn', 'Gate humano automático: el paso WhatsApp (ultra_step) exige una aprobación humana previa y este flujo no tiene ninguna antes de este punto. No se contactará a nadie sin tu sí.')
        await persistir(ejecucionId, 'esperando_aprobacion', pasosEstado, vars, registro)
        esperando = true
        break
      }

      st.estado = 'en_curso'
      st.iniciadoEn = new Date().toISOString()
      await persistir(ejecucionId, 'en_curso', pasosEstado, vars, registro)

      const maxIntentos = Math.max(1, Math.min(4, paso.intentos ?? 2))
      let ok = false
      let ultimo = ''
      for (let intento = 1; intento <= maxIntentos; intento++) {
        st.intentos = intento
        const r = await accionPaso(paso, vars, { ejecucionId })
        ultimo = r.mensaje
        if (r.ok) {
          ok = true
          st.resultado = r.resultado
          break
        }
        if (intento < maxIntentos) {
          await log(ejecucionId, registro, paso.nombre, 'warn', `Intento ${intento}/${maxIntentos} falló: ${r.mensaje}`)
          await new Promise((res) => setTimeout(res, 1200))
        }
      }

      st.terminadoEn = new Date().toISOString()
      if (ok) {
        st.estado = 'completado'
        st.error = undefined
        await log(ejecucionId, registro, paso.nombre, 'ok', ultimo)
        await persistir(ejecucionId, 'en_curso', pasosEstado, vars, registro)
      } else if (paso.opcional) {
        st.estado = 'omitido'
        st.error = ultimo
        await log(ejecucionId, registro, paso.nombre, 'warn', `Paso opcional omitido: ${ultimo}`)
        await persistir(ejecucionId, 'en_curso', pasosEstado, vars, registro)
      } else {
        st.estado = 'fallido'
        st.error = ultimo
        fallo = true
        await log(ejecucionId, registro, paso.nombre, 'error', `FALLIDO tras ${maxIntentos} intento(s): ${ultimo}`)
        await persistir(ejecucionId, 'fallida', pasosEstado, vars, registro, new Date())
        break
      }
    }

    if (!fallo && !esperando) {
      await log(ejecucionId, registro, 'flujo', 'ok', 'Flujo completado.')
      await persistir(ejecucionId, 'completada', pasosEstado, vars, registro, new Date())
    }
  } finally {
    EJECUCIONES_EN_CURSO.delete(ejecucionId)
  }
}

async function persistir(
  ejecucionId: string,
  estado: string,
  pasosEstado: Record<string, EstadoPaso>,
  vars: Variables,
  registro: Registro[],
  finishedAt?: Date,
): Promise<void> {
  await db.flujoEjecucion
    .update({
      where: { id: ejecucionId },
      data: {
        estado,
        pasosEstado: JSON.stringify(pasosEstado),
        variables: JSON.stringify(vars),
        registro: JSON.stringify(registro.slice(-500)),
        ...(finishedAt ? { finishedAt } : {}),
      },
    })
    .catch(() => undefined)
}

/** Resolución de una aprobación humana. */
export async function resolverAprobacion(ejecucionId: string, aprobado: boolean, nota: string): Promise<{ ok: boolean; mensaje: string }> {
  const ejecucion = await db.flujoEjecucion.findUnique({ where: { id: ejecucionId }, include: { flujo: true } })
  if (!ejecucion) return { ok: false, mensaje: 'Ejecución no encontrada.' }
  if (ejecucion.estado !== 'esperando_aprobacion') return { ok: false, mensaje: `La ejecución no está esperando aprobación (estado: ${ejecucion.estado}).` }
  const pasos = JSON.parse(ejecucion.flujo.definicion) as PasoDef[]
  const pasosEstado = JSON.parse(ejecucion.pasosEstado) as Record<string, EstadoPaso>
  const registro: Registro[] = JSON.parse(ejecucion.registro) as Registro[]
  const vars = JSON.parse(ejecucion.variables || '{}') as Variables
  const pendiente = pasos.find((p) => pasosEstado[p.id]?.estado === 'esperando_aprobacion')
  if (!pendiente) return { ok: false, mensaje: 'No hay paso pendiente de aprobación.' }

  // Gate estructural de WhatsApp (ultra_step): al aprobar, el paso NO se marca completado —
  // vuelve a pendiente con la autorización registrada y entonces SÍ ejecuta su acción real.
  const stPend = pasosEstado[pendiente.id]
  if (Boolean((stPend?.resultado as { gatePendiente?: boolean } | undefined)?.gatePendiente)) {
    if (!aprobado) {
      pasosEstado[pendiente.id] = { ...stPend, estado: 'fallido', error: `Gate WhatsApp rechazado por el operador${nota ? `: ${nota}` : ''}`, terminadoEn: new Date().toISOString() }
      await log(ejecucionId, registro, pendiente.nombre, 'error', `Gate WhatsApp rechazado: no se contactará a nadie${nota ? ` (${nota})` : ''}`)
      await persistir(ejecucionId, 'cancelada', pasosEstado, vars, registro, new Date())
      return { ok: true, mensaje: 'Gate WhatsApp rechazado: ejecución cancelada sin contactar a nadie.' }
    }
    pasosEstado[pendiente.id] = { ...stPend, estado: 'pendiente', resultado: { gateAutorizado: true, aprobadoPor: 'operador', nota }, error: undefined }
    await log(ejecucionId, registro, pendiente.nombre, 'ok', `Autorización registrada por el operador${nota ? `: ${nota}` : ''} — el paso WhatsApp continúa ahora sí.`)
    await db.flujoEjecucion.update({
      where: { id: ejecucionId },
      data: { pasosEstado: JSON.stringify(pasosEstado), registro: JSON.stringify(registro.slice(-500)) },
    })
    void correrEjecucion(ejecucionId) // continúa con el paso ya autorizado
    return { ok: true, mensaje: 'Autorización registrada: el paso WhatsApp continúa.' }
  }

  if (!aprobado) {
    pasosEstado[pendiente.id] = { ...pasosEstado[pendiente.id], estado: 'fallido', error: `Rechazado por el operador${nota ? `: ${nota}` : ''}`, terminadoEn: new Date().toISOString() }
    await log(ejecucionId, registro, pendiente.nombre, 'error', `Aprobación rechazada${nota ? `: ${nota}` : ''}`)
    await persistir(ejecucionId, 'cancelada', pasosEstado, {}, registro, new Date())
    return { ok: true, mensaje: 'Ejecución cancelada por rechazo del operador.' }
  }

  pasosEstado[pendiente.id] = { ...pasosEstado[pendiente.id], estado: 'completado', resultado: { aprobadoPor: 'operador', nota }, terminadoEn: new Date().toISOString() }
  await log(ejecucionId, registro, pendiente.nombre, 'ok', `Aprobado por el operador${nota ? `: ${nota}` : ''}`)
  await db.flujoEjecucion.update({
    where: { id: ejecucionId },
    data: { pasosEstado: JSON.stringify(pasosEstado), registro: JSON.stringify(registro.slice(-500)) },
  })
  void correrEjecucion(ejecucionId) // continúa el resto del flujo
  return { ok: true, mensaje: 'Aprobación registrada: el flujo continúa.' }
}

/** Flujo demo sembrado la primera vez que se abre el módulo (pasos 100% reales). */
export const FLUJO_DEMO: { nombre: string; descripcion: string; pasos: PasoDef[] } = {
  nombre: 'Detección → Producción → Revisión (demo real)',
  descripcion:
    'Flujo de extremo a extremo con pasos reales: registra el arranque, sondéa el motor de vídeo, pide aprobación humana, encola un lote del Estudio, espera el resultado y cierra con evento de trazabilidad. Los pasos ligados a motores externos se omiten con aviso si el motor no está corriendo (honestidad sobre inventos).',
  pasos: [
    { id: 'p1', tipo: 'registrar_evento', nombre: 'Arranque del flujo', params: { event: 'flujo.iniciado', detail: { demo: true } } },
    { id: 'p2', tipo: 'sondear_motor', nombre: 'Sonda del motor de vídeo', params: { motor: 'youtube' }, opcional: true, intentos: 1 },
    { id: 'p3', tipo: 'aprobacion_humana', nombre: 'Aprobación de producción', requiereAprobacion: true, params: { mensaje: '¿Encolar el lote de fotos del Estudio?' } },
    { id: 'p4', tipo: 'estudio_lote', nombre: 'Lote del Estudio (4 previews)', params: { characterId: 'auto', count: 4, lane: 'PUBLICO' } },
    { id: 'p5', tipo: 'estudio_esperar_job', nombre: 'Esperar resultado del Estudio', params: { maxEsperaSeg: 120 }, intentos: 1 },
    { id: 'p6', tipo: 'registrar_evento', nombre: 'Cierre con trazabilidad', params: { event: 'flujo.completado', detail: { demo: true } } },
  ],
}

/** Plantillas de flujos completos (secciones 5, 8 y 9 del prompt maestro). Se siembran si no existen. */
export const FLUJOS_PLANTILLAS: { nombre: string; descripcion: string; pasos: PasoDef[] }[] = [
  {
    nombre: 'Leads → CRM → WhatsApp autorizado (sección 5)',
    descripcion:
      'Recorrido de captura a contacto: registra el lead, lo crea en el CRM real, pide AUTORIZACIÓN humana explícita antes de cualquier contacto y solo entonces procesa un paso de campaña en ULTRA (el guard anti-ban del motor decide). CRM y ULTRA se omiten con aviso si no están corriendo — nada se inventa.',
    pasos: [
      { id: 'l1', tipo: 'registrar_evento', nombre: 'Lead registrado en el host', params: { source: 'agente-leads', event: 'lead.ingresado', detail: { origen: 'webhook' } } },
      { id: 'l2', tipo: 'crm_accion', nombre: 'Crear cliente en el CRM', params: { accion: 'create_client', payload: { name: '{{lead.nombre}}', source: 'AGENTE-LEADS' } }, opcional: true, intentos: 1 },
      { id: 'l3', tipo: 'aprobacion_humana', nombre: 'AUTORIZACIÓN de contacto (obligatoria)', requiereAprobacion: true, params: { mensaje: '¿Autorizas el seguimiento por WhatsApp de este lead? Sin tu sí no se contacta a nadie.' } },
      { id: 'l4', tipo: 'ultra_step', nombre: 'Paso de campaña ULTRA (guard anti-ban del motor)', params: {}, opcional: true, intentos: 1 },
      { id: 'l5', tipo: 'registrar_evento', nombre: 'Cierre con trazabilidad', params: { event: 'lead.seguimiento_procesado' } },
    ],
  },
  {
    nombre: 'Plan → Estudio → Calendario (publicación programada)',
    descripcion:
      'Investigación → contenido → revisión humana → publicación programada: sonda NEX-SCOPE (opcional), aprueba el plan, encola lote del Estudio, espera el resultado y programa el Set en el calendario real de publicación (ICS/CSV del módulo UGC).',
    pasos: [
      { id: 'c1', tipo: 'sondear_motor', nombre: 'Sonda de investigación (NEX-SCOPE)', params: { motor: 'nexscope' }, opcional: true, intentos: 1 },
      { id: 'c2', tipo: 'aprobacion_humana', nombre: 'Aprobación del plan de contenido', requiereAprobacion: true, params: { mensaje: '¿Generar el lote según el plan aprobado?' } },
      { id: 'c3', tipo: 'estudio_lote', nombre: 'Lote del Estudio (4 previews)', params: { characterId: 'auto', count: 4, lane: 'PUBLICO' } },
      { id: 'c4', tipo: 'estudio_esperar_job', nombre: 'Esperar resultado del Estudio', params: { maxEsperaSeg: 120 }, intentos: 1 },
      { id: 'c5', tipo: 'programar_publicacion', nombre: 'Programar publicación (+2 días)', params: { dias: 2 } },
      { id: 'c6', tipo: 'registrar_evento', nombre: 'Cierre con trazabilidad', params: { event: 'publicacion.programada' } },
    ],
  },
]

export function validarDefinicion(pasos: unknown): { ok: boolean; error?: string; pasos?: PasoDef[] } {
  if (!Array.isArray(pasos) || pasos.length === 0) return { ok: false, error: 'definicion debe ser un array con al menos un paso.' }
  if (pasos.length > 20) return { ok: false, error: 'Máximo 20 pasos por flujo.' }
  const TIPOS = ['sondear_motor', 'registrar_evento', 'youtube_validar', 'youtube_submit', 'youtube_estado', 'estudio_lote', 'estudio_esperar_job', 'crm_accion', 'aprobacion_humana', 'ultra_step', 'programar_publicacion']
  for (const p of pasos) {
    const paso = p as Record<string, unknown>
    if (typeof paso.id !== 'string' || typeof paso.tipo !== 'string' || typeof paso.nombre !== 'string') {
      return { ok: false, error: 'Cada paso necesita id, tipo y nombre (strings).' }
    }
    if (!TIPOS.includes(paso.tipo)) return { ok: false, error: `Tipo de paso no permitido: "${String(paso.tipo)}". Permitidos: ${TIPOS.join(', ')}` }
    if (paso.params && typeof paso.params !== 'object') return { ok: false, error: 'params debe ser un objeto.' }
  }
  return { ok: true, pasos: pasos as PasoDef[] }
}

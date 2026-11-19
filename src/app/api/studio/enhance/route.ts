// D-015 · A7 — "Mejorar prompt con IA": endpoint contabilizado (destripe §19.5
// adaptado). Un Job PROPIO por mejora, cobrada por el punto único de cobro
// (asegurarSaldo), reembolsada si falla, con duración medida en casa (A2) y
// compliance append-only. El LLM se resuelve con la configuración EN CALIENTE
// (panel > .env > defecto): primer consumidor cableado al panel de Configuración.
// Filtro de edad DURO en ambos sentidos: entrada bloqueada antes de gastar,
// salida validada en parsearMejora (salidaLLMSegura).
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { COSTOS, detectarTerminosProhibidos } from '@/lib/constants'
import { asegurarSaldo, jsonError, jsonOk } from '@/lib/api-utils'
import { registrarEvento } from '@/lib/compliance'
import { recargarConfig, valorConfig } from '@/lib/configuracion'
import {
  esEstiloValido,
  llamarLLMMejora,
  parsearMejora,
  promptSistemaMejora,
  promptUsuarioMejora,
  type ConfigLLMResuelta,
} from '@/lib/enhance'

const ESCENA_MIN = 4
const ESCENA_MAX = 600

/** Reembolso único (paridad con worker.ts: créditos de vuelta + costReal=0). */
async function reembolsarMejora(jobId: string, monto: number): Promise<void> {
  if (monto <= 0) return
  await db.settings.update({ where: { id: 'main' }, data: { credits: { increment: monto } } })
  await db.job.update({ where: { id: jobId }, data: { costReal: 0 } })
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    escena?: unknown
    estilo?: unknown
    characterId?: unknown
  }
  const escena = typeof body.escena === 'string' ? body.escena.trim() : ''
  const estilo = esEstiloValido(body.estilo) ? body.estilo : 'cinematografico'
  const characterId = typeof body.characterId === 'string' && body.characterId ? body.characterId : null

  if (escena.length < ESCENA_MIN) {
    return jsonError(`La escena es demasiado corta: descríbela con al menos ${ESCENA_MIN} caracteres.`)
  }
  if (escena.length > ESCENA_MAX) {
    return jsonError(`La escena es demasiado larga (máx ${ESCENA_MAX} caracteres; llegó ${escena.length}).`)
  }

  // Personaje OPCIONAL: solo aporta contexto del genoma (no exige ACTIVO — la
  // mejora de brief es planificación, no producción).
  let contexto: { aficiones?: string; lore?: string; tono?: string } | undefined
  if (characterId) {
    const c = await db.character.findUnique({ where: { id: characterId } })
    if (!c) return jsonError('Personaje no encontrado', 404)
    try {
      const g = JSON.parse(c.genome || '{}') as { aficiones?: string; lore?: string; tono?: string }
      contexto = { aficiones: g.aficiones, lore: g.lore, tono: g.tono }
    } catch {
      contexto = undefined
    }
  }

  // ── Filtro de edad de ENTRADA: bloqueo duro ANTES de gastar un crédito ──
  const terminos = detectarTerminosProhibidos(escena)
  if (terminos.length > 0) {
    const motivo = `Filtro de edad aparente: término prohibido "${terminos.join('", "')}" en la escena.`
    await registrarEvento('filtro_edad', { motivo, terminos, bloqueo: 'enhance_entrada', via: 'mejora_prompt' }, characterId ? { characterId } : undefined)
    return jsonError(motivo, 422, { filtro: 'edad_aparente' })
  }

  // ── Configuración en caliente (panel > .env > defecto) ──
  await recargarConfig()
  const apiKey = valorConfig('llm.api_key')
  const cfg: ConfigLLMResuelta = {
    clave: apiKey.valor.trim(),
    base: (valorConfig('llm.base_url').valor || 'https://api.groq.com/openai/v1').trim().replace(/\/+$/, ''),
    modelo: valorConfig('llm.modelo').valor || 'llama-3.3-70b-versatile',
    maxTokens: clampInt(valorConfig('llm.max_tokens').valor, 64, 4096, 1024),
    timeoutMs: clampInt(valorConfig('llm.timeout_ms').valor, 5000, 120000, 60000),
    provedor: (valorConfig('llm.proveedor').valor || 'groq').trim().toLowerCase(),
    fuente: apiKey.fuente,
  }
  if (!cfg.clave) {
    // Honesto y SIN cobro: sin LLM no hay mejora (nada simulado).
    return jsonError(
      'Mejora con IA NO_CONFIGURADA: falta la API key del LLM. Configúrala en el panel de Configuración (llm.api_key) o en .env (LLM_API_KEY).',
      503,
      { estado: 'NO_CONFIGURADO' },
    )
  }

  // ── Contabilización: punto único de cobro + Job propio ──
  const coste = COSTOS.ENHANCE
  const saldo = await asegurarSaldo(coste)
  if (!saldo.ok) return jsonError(saldo.error!, 402, { saldo: saldo.saldo })

  const job = await db.job.create({
    data: {
      type: 'mejora_prompt',
      characterId,
      priority: 3,
      costEstimate: coste,
      payload: JSON.stringify({ modo: 'mejora_prompt', escena, estilo, characterId }),
    },
  })

  // CLAIM ATÓMICO (misma disciplina del worker: UPDATE condicional al status).
  const claim = await db.job.updateMany({
    where: { id: job.id, status: 'en_cola' },
    data: { status: 'procesando', startedAt: new Date() },
  })
  if (claim.count === 0) {
    await reembolsarMejora(job.id, coste)
    return jsonError('El trabajo fue reclamado por otro proceso: no se cobró nada.', 409)
  }

  const t0 = Date.now()
  const r = await llamarLLMMejora(cfg, promptSistemaMejora(), promptUsuarioMejora(escena, estilo, contexto))
  const duracionMs = Date.now() - t0

  // ── Fallo del LLM: reembolso + job fallido + error honesto ──
  if (!r.ok) {
    await db.job.update({
      where: { id: job.id },
      data: { status: 'fallido', finishedAt: new Date(), error: `[llm_${r.estado}] ${r.detalle.slice(0, 260)}`, costReal: 0 },
    })
    await reembolsarMejora(job.id, coste)
    return jsonError(r.detalle, r.estado === 'NO_CONFIGURADO' ? 503 : 502, { jobId: job.id, estado: r.estado, reembolsado: true })
  }

  // ── Salida del LLM: filtro de edad DURO en la respuesta ──
  const p = parsearMejora(r.texto)
  if (!p.ok) {
    await db.job.update({
      where: { id: job.id },
      data: { status: 'fallido', finishedAt: new Date(), error: `[salida_llm_${p.motivo}] ${p.detalle.slice(0, 260)}`, costReal: 0 },
    })
    await reembolsarMejora(job.id, coste)
    if (p.motivo === 'filtro_edad') {
      await registrarEvento('filtro_edad', { motivo: p.detalle, terminos: p.terminos ?? [], bloqueo: 'enhance_salida', via: 'mejora_prompt' }, characterId ? { characterId } : undefined)
      return jsonError(`Bloqueo de compliance en la salida del LLM: ${p.detalle} Nada se cobró (reembolso aplicado).`, 422, { filtro: 'edad_aparente', jobId: job.id, reembolsado: true })
    }
    return jsonError(`El LLM no devolvió un brief usable: ${p.detalle} Nada se cobró (reembolso aplicado).`, 502, { jobId: job.id, reembolsado: true })
  }

  // ── Éxito: contabilidad final (costReal = coste; sin diff) + result auditable ──
  await db.job.update({
    where: { id: job.id },
    data: {
      status: 'listo',
      finishedAt: new Date(),
      progress: 100,
      costReal: coste,
      result: JSON.stringify({ brief: p.brief, modelo: r.modelo, provedor: r.provedor, uso: r.uso, duracionMs }),
    },
  })
  await registrarEvento(
    'creacion',
    { tipo: 'mejora_prompt', coste, estilo, modelo: r.modelo, provedor: r.provedor, fuenteKey: cfg.fuente, duracionMs, uso: r.uso },
    characterId ? { characterId } : undefined,
  )
  return jsonOk({ jobId: job.id, coste, brief: p.brief, modelo: r.modelo, provedor: r.provedor, duracionMs, escenaOriginal: escena })
}

function clampInt(v: string, min: number, max: number, defecto: number): number {
  const n = Number(v)
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : defecto
}

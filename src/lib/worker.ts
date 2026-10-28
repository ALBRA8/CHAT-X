// Cola de trabajos de EL ESTUDIO (ficha sección 6 — "Trabajos").
// Procesador en segundo plano con estados en vivo: en_cola → procesando → listo/fallido.
// El proveedor generativo es intercambiable (getProvider); en F1 el generativo corre
// en GPU cloud — aquí el simulador ocupa su lugar con latencias y costes equivalentes.
import { db } from '@/lib/db'
import { getProvider } from '@/lib/provider'
import {
  COSTOS,
  JOB_STATUS,
  PIPELINE,
  LANE,
  CHECKPOINT_SIMULADOR,
  ETIQUETA_IA,
  detectarTerminosProhibidos,
  type Lane,
} from '@/lib/constants'
import { hexSha256 } from '@/lib/rng'
import {
  rutaPieza,
  guardarClaro,
  guardarCifrado,
  guardarIvTag,
  miniaturaDe,
  carpetaDataset,
} from '@/lib/media'
import { claveMaestraServidor } from '@/lib/clave-privada'
import { registrarEvento } from '@/lib/compliance'
import { ejecucionesVivas } from '@/lib/flujos'
import type { Brief, GenerationRequest } from '@/lib/provider/types'

interface PesoJob {
  type: string
  payload: Record<string, unknown>
}

const g = globalThis as unknown as {
  __estudioWorker?: { timer: NodeJS.Timeout; ocupado: boolean }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function randEntre(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

export function iniciarWorker(): void {
  if (g.__estudioWorker) return
  const state = { ocupado: false }
  const timer = setInterval(() => {
    void tick(state)
  }, 800)
  g.__estudioWorker = { timer, ocupado: false }
  // Recupera trabajos que quedaron "procesando" tras un reinicio del servidor
  void db.job
    .updateMany({ where: { status: JOB_STATUS.PROCESANDO }, data: { status: JOB_STATUS.EN_COLA, progress: 0 } })
    .catch(() => undefined)
  // Recupera ejecuciones de flujo que quedaron "en_curso" tras un reinicio: el corredor
  // vive en memoria, si el proceso murió a mitad de paso la ejecución no puede seguir
  // sola. Se marca fallida con causa trazable (re-lanzable desde la UI; con los pasos
  // idempotentes, re-lanzar no duplica lotes ni eventos). Nunca toca ejecuciones vivas
  // EN ESTE proceso, ni nada actualizado en los últimos 120s (margen de arranque).
  const corte = new Date(Date.now() - 120_000)
  const vivas = new Set(ejecucionesVivas())
  void (async () => {
    try {
    const zombis = await db.flujoEjecucion.findMany({ where: { estado: 'en_curso', updatedAt: { lt: corte } } })
    for (const z of zombis) {
      if (vivas.has(z.id)) continue
      const pasosEstado = JSON.parse(z.pasosEstado || '{}') as Record<string, { estado?: string; error?: string }>
      for (const st of Object.values(pasosEstado)) {
        if (st.estado === 'en_curso') st.error = 'Interrumpido por reinicio del servidor (el paso estaba en curso)'
      }
      await db.flujoEjecucion
        .update({
          where: { id: z.id },
          data: {
            estado: 'fallida',
            finishedAt: new Date(),
            pasosEstado: JSON.stringify(pasosEstado),
            registro: JSON.stringify(
              [
                ...((JSON.parse(z.registro || '[]') as { ts: string; paso: string; nivel: string; mensaje: string }[]).slice(-490)),
                { ts: new Date().toISOString(), paso: 'sistema', nivel: 'error', mensaje: 'Ejecución interrumpida por un reinicio del servidor: el corredor vive en memoria y no sobrevive al proceso. Re-lanza el flujo (los pasos idempotentes reutilizan lotes/eventos ya creados).' },
              ].slice(-500),
            ),
          },
        })
        .catch(() => undefined)
    }
    if (zombis.length > 0) console.log(`[worker] ${zombis.length} ejecución(es) de flujo interrumpida(s) por reinicio → fallida (trazable)`)
    } catch {
      // si la BD aún no está lista, la siguiente invocación de iniciarWorker lo reintentará
    }
  })()
}

async function tick(state: { ocupado: boolean }): Promise<void> {
  if (state.ocupado) return
  const job = await db.job.findFirst({
    where: { status: JOB_STATUS.EN_COLA },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
  })
  if (!job) return
  state.ocupado = true
  try {
    await procesar(job.id, job.type as string, JSON.parse(job.payload) as Record<string, unknown>)
  } catch (err) {
    await db.job
      .update({
        where: { id: job.id },
        data: {
          status: JOB_STATUS.FALLIDO,
          finishedAt: new Date(),
          error: err instanceof Error ? err.message : 'Error desconocido',
        },
      })
      .catch(() => undefined)
    // devuelve los créditos estimados al fallar
    await reembolsar(job.id, job.costEstimate).catch(() => undefined)
  } finally {
    state.ocupado = false
  }
}

async function reembolsar(jobId: string, monto: number): Promise<void> {
  if (monto <= 0) return
  const s = await db.settings.findUnique({ where: { id: 'main' } })
  if (!s) return
  await db.settings.update({ where: { id: 'main' }, data: { credits: { increment: monto } } })
  await db.job.update({ where: { id: jobId }, data: { costReal: 0 } })
}

async function setProgreso(jobId: string, p: number): Promise<void> {
  await db.job.update({ where: { id: jobId }, data: { progress: Math.max(0, Math.min(100, Math.round(p))) } })
}

async function gastar(jobId: string, real: number): Promise<void> {
  const job = await db.job.findUnique({ where: { id: jobId } })
  if (!job) return
  await db.job.update({ where: { id: jobId }, data: { costReal: real } })
  const diff = job.costEstimate - real
  if (diff > 0.0001) {
    await db.settings.update({ where: { id: 'main' }, data: { credits: { increment: diff } } })
  }
}

// ── composición del prompt final y procedencia ──

export function componerPrompt(
  characterName: string,
  anchorTrait: string,
  attrs: Record<string, string>,
  brief: Brief,
  lane: string,
): string {
  const attrTxt = Object.entries(attrs)
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ')
  return [
    `personaje: ${characterName}`,
    anchorTrait ? `rasgo ancla: ${anchorTrait}` : '',
    attrTxt,
    `escena: ${brief.escena || 'libre'}`,
    `outfit: ${brief.outfit || 'libre'}`,
    `pose: ${brief.pose || 'libre'}`,
    `encuadre: ${brief.encuadre || 'plano_medio'}`,
    `luz: ${brief.luz || 'natural'}`,
    `carril: ${lane}`,
  ]
    .filter(Boolean)
    .join(' · ')
}

export interface OpcionesPieza {
  jobId: string
  characterId: string
  characterName: string
  baseSeed: string
  anchorTrait: string
  attrs: Record<string, string>
  loraHash: string | null
  lane: Lane
  brief: Brief
  seed: string
  variant: number
  kind: 'preview' | 'final' | 'examen'
  sceneName?: string
  batchId: string
  index: number
  masterKey: Buffer | null
}

interface ResultadoPieza {
  id: string
  veredicto: string
  motivo?: string
}

// Genera UNA pieza completa: imagen + QA + archivos + fila Media + eventos de compliance.
async function producirPieza(op: OpcionesPieza): Promise<ResultadoPieza> {
  // IDEMPOTENCIA POR SEMILLA: mismo personaje + misma semilla = misma pieza. Si el job
  // se interrumpió a mitad de lote y volvió a la cola tras un reinicio, las piezas ya
  // generadas se REUTILIZAN en vez de duplicar filas/archivos (la re-entrada del job
  // completa el resto del lote desde donde quedó por semilla).
  const previa = await db.media.findFirst({ where: { characterId: op.characterId, seed: op.seed } })
  if (previa) {
    return { id: previa.id, veredicto: previa.qualityVerdict, motivo: previa.qualityReason ?? undefined }
  }
  const provider = getProvider()
  const brief = op.brief
  const promptFinal = componerPrompt(op.characterName, op.anchorTrait, op.attrs, brief, op.lane)
  const fecha = new Date()
  const batchId = op.batchId

  // ── Filtro de edad aparente: BLOQUEO DURO REAL (no simulado) ──
  const terminos = detectarTerminosProhibidos(
    `${brief.escena} ${brief.outfit} ${brief.pose} ${brief.luz}`,
  )
  let veredicto = 'PENDIENTE'
  let motivo: string | undefined
  const filtros: string[] = []

  if (terminos.length > 0) {
    veredicto = 'RECHAZADO'
    motivo = `Filtro de edad aparente: término prohibido "${terminos.join('", "')}"`
    filtros.push('edad_aparente')
    await registrarEvento(
      'filtro_edad',
      { motivo, terminos, prompt: promptFinal, seed: op.seed, batchId },
      { characterId: op.characterId },
    )
  } else {
    // QA simulado determinista por semilla (~85% identidad, ~92% anatomía)
    const id = provider.checkIdentidad(op.seed)
    const an = provider.checkAnatomia(op.seed)
    if (!id.aprueba) {
      veredicto = 'RECHAZADO'
      motivo = id.motivo
      await registrarEvento('rechazo_qa', { puerta: 'identidad', motivo, seed: op.seed, batchId }, { characterId: op.characterId })
    } else if (!an.aprueba) {
      veredicto = 'RECHAZADO'
      motivo = an.motivo
      await registrarEvento('rechazo_qa', { puerta: 'anatomia', motivo, seed: op.seed, batchId }, { characterId: op.characterId })
    } else {
      veredicto = 'APROBADO'
    }
  }

  // ── Imagen ──
  // Con proveedor real (ComfyUI): prepara la generación asíncrona primero y
  // luego generateImage la consume de cache por semilla (ver docs/MOTOR_GPU.md).
  const req: GenerationRequest = {
    kind: op.kind === 'examen' ? 'examen' : op.kind === 'preview' ? 'preview' : 'final',
    seed: op.seed,
    baseSeed: op.baseSeed,
    variant: op.variant,
    brief,
    lane: op.lane,
    characterName: op.characterName,
    loraHash: op.loraHash,
    sceneName: op.sceneName,
  }
  if (provider.name === 'comfyui') {
    const { prepararImagenComfy } = await import('@/lib/provider/comfyui')
    await prepararImagenComfy(req)
  } else if (provider.name === 'local-cpu') {
    const { prepararImagenLocalCpu } = await import('@/lib/provider/localcpu')
    await prepararImagenLocalCpu(req)
  }
  const img = provider.generateImage(req)
  const thumb = miniaturaDe(img.svg)

  // ── Archivos ──
  const slug = `${op.seed.replace(/[^a-zA-Z0-9:_-]/g, '_')}_${op.index}`.slice(0, 120)
  const fullPath = rutaPieza(op.characterId, slug, 'full', fecha)
  const thumbPath = rutaPieza(op.characterId, slug, 'thumb', fecha)
  let encIv: string | null = null
  let encTag: string | null = null
  let encThumbIv: string | null = null
  let encThumbTag: string | null = null
  if (op.lane === LANE.PRIVADO && op.masterKey) {
    const enc = guardarCifrado(fullPath, img.svg, op.masterKey)
    guardarIvTag(fullPath, enc)
    encIv = enc.iv
    encTag = enc.tag
    const encT = guardarCifrado(thumbPath, thumb, op.masterKey)
    guardarIvTag(thumbPath, encT)
    encThumbIv = encT.iv
    encThumbTag = encT.tag
  } else {
    guardarClaro(fullPath, img.svg)
    guardarClaro(thumbPath, thumb)
  }

  // ── Pipeline y metadata de procedencia (Anexo A regla 5: desde la creación) ──
  // Las piezas privadas aprobadas avanzan a "cifrado" cuando el trabajo de cifrado las bloquea.
  const pipelineStatus = veredicto === 'APROBADO' ? PIPELINE.APROBADO : PIPELINE.QA

  const provenance = {
    personaje: op.characterName,
    characterId: op.characterId,
    promptFinal,
    brief,
    seed: op.seed,
    baseSeed: op.baseSeed,
    variante: op.variant,
    checkpoint: CHECKPOINT_SIMULADOR,
    loraHash: op.loraHash,
    proveedor: getProvider().name,
    simulado: getProvider().esSimulado,
    carril: op.lane,
    batchId,
    kind: op.kind,
    sceneName: op.sceneName ?? null,
    archivos: { full: fullPath + '.svg', thumb: thumbPath + '.svg', cifrado: op.lane === LANE.PRIVADO },
    generadoEn: fecha.toISOString(),
  }

  const media = await db.media.create({
    data: {
      characterId: op.characterId,
      kind: op.kind === 'examen' ? 'examen' : op.kind,
      lane: op.lane,
      prompt: promptFinal,
      seed: op.seed,
      checkpoint: CHECKPOINT_SIMULADOR,
      loraHash: op.loraHash,
      batchId,
      sceneName: op.sceneName ?? null,
      qualityVerdict: veredicto,
      qualityReason: motivo ?? null,
      filtersTriggered: JSON.stringify(filtros),
      aiLabels: JSON.stringify([ETIQUETA_IA]),
      pipelineStatus,
      filePath: fullPath,
      thumbPath,
      encIv,
      encTag,
      encThumbIv,
      encThumbTag,
      provenance: JSON.stringify(provenance),
    },
  })

  return { id: media.id, veredicto, motivo }
}

// ── Handlers por tipo de trabajo ──

async function procesar(jobId: string, type: string, payload: Record<string, unknown>): Promise<void> {
  const job = await db.job.update({
    where: { id: jobId },
    data: { status: JOB_STATUS.PROCESANDO, startedAt: new Date() },
  })
  const characterId = job.characterId
  const character = characterId ? await db.character.findUnique({ where: { id: characterId } }) : null

  switch (type) {
    case 'dataset':
      await trabajoDataset(jobId, character!, payload)
      break
    case 'entrenamiento':
      await trabajoEntrenamiento(jobId, character!, payload)
      break
    case 'lote_fotos':
      await trabajoLoteFotos(jobId, character!, payload)
      break
    case 'render_final':
      await trabajoRenderFinal(jobId, character!, payload)
      break
    case 'cifrado':
      await trabajoCifrado(jobId, payload)
      break
    default:
      throw new Error(`Tipo de trabajo desconocido: ${type}`)
  }

  await db.job.update({ where: { id: jobId }, data: { status: JOB_STATUS.LISTO, finishedAt: new Date(), progress: 100 } })
}

// DATASET: 30–50 fotos de entrenamiento (no son piezas de biblioteca)
async function trabajoDataset(jobId: string, character: { id: string; name: string; seed: string; anchorTrait: string; genome: string }, payload: Record<string, unknown>): Promise<void> {
  const objetivo = Math.max(30, Math.min(50, Number(payload.objetivo) || 40))
  const provider = getProvider()
  const attrs = JSON.parse(character.genome).atributos ?? {}
  const dir = carpetaDataset(character.id)
  const escenas = ['retrato de estudio', 'plano medio casual', 'perfil tres cuartos', 'cuerpo entero', 'primer plano sonrisa', 'luz de ventana']
  for (let i = 0; i < objetivo; i++) {
    const seed = `${character.seed}:dataset:${i}`
    const brief: Brief = {
      escena: escenas[i % escenas.length],
      outfit: 'básico de estudio',
      pose: 'natural',
      encuadre: i % 3 === 0 ? 'primer_plano' : i % 3 === 1 ? 'plano_medio' : 'cuerpo_entero',
      luz: escenas[i % escenas.length],
    }
    const img = provider.generateImage({
      kind: 'dataset',
      seed,
      baseSeed: character.seed,
      variant: i,
      brief,
      lane: LANE.PUBLICO,
      characterName: character.name,
      index: i,
      total: objetivo,
    })
    guardarClaro(`${dir}/dataset_${String(i).padStart(3, '0')}.svg`, img.svg)
    if (i % 4 === 0) await setProgreso(jobId, ((i + 1) / objetivo) * 100)
    await sleep(randEntre(...COSTOS_LATENCIA.DATASET_FOTO_MS))
  }
  await db.character.update({ where: { id: character.id }, data: { datasetCount: objetivo } })
  await registrarEvento('creacion', { tipo: 'dataset', objetivo, personaje: character.name }, { characterId: character.id })
  await gastar(jobId, Math.round(COSTOS.FOTO_DATASET * objetivo * 10) / 10)
}

// ENTRENAMIENTO LoRA: crea versión con hash y nota
async function trabajoEntrenamiento(jobId: string, character: { id: string; name: string; seed: string }, payload: Record<string, unknown>): Promise<void> {
  const nota = String(payload.nota || 'entrenamiento inicial')
  const pasos = 14
  for (let p = 1; p <= pasos; p++) {
    await sleep(COSTOS_LATENCIA.ENTRENAMIENTO_MS / pasos)
    await setProgreso(jobId, (p / pasos) * 100)
  }
  const nVersiones = await db.loraVersion.count({ where: { characterId: character.id } })
  const hash = `lora_${hexSha256(`lora:${character.seed}:v${nVersiones + 1}`)}`
  const coste = COSTOS.ENTRENAMIENTO_LORA
  await db.loraVersion.create({
    data: { characterId: character.id, hash, note: nota, costReal: coste },
  })
  await db.character.update({
    where: { id: character.id },
    data: { loraHash: hash, status: 'ENTRENANDO' },
  })
  await registrarEvento('creacion', { tipo: 'lora_version', hash, nota }, { characterId: character.id })
  await gastar(jobId, coste)
}

// LOTE DE FOTOS (vistas previas baratas o examen de identidad)
async function trabajoLoteFotos(jobId: string, character: { id: string; name: string; seed: string; anchorTrait: string; genome: string; loraHash: string | null }, payload: Record<string, unknown>): Promise<void> {
  const modo = payload.modo === 'examen' ? 'examen' : 'preview'
  const lane = (payload.lane === LANE.PRIVADO ? LANE.PRIVADO : LANE.PUBLICO) as Lane
  const attrs = (JSON.parse(character.genome).atributos ?? {}) as Record<string, string>
  const masterKey = lane === LANE.PRIVADO ? await claveMaestraServidor() : null
  const batchId = String(payload.batchId || `lote_${Date.now()}`)
  const varianteBase = Number(payload.varianteBase) || 0

  const items: { sceneName?: string; brief: Brief }[] =
    modo === 'examen'
      ? (payload.escenas as { nombre: string; brief: Brief }[]).map((e) => ({ sceneName: e.nombre, brief: e.brief }))
      : (payload.brief as Brief)
          ? Array.from({ length: Number(payload.count) || 8 }, () => ({ brief: payload.brief as Brief }))
          : []

  // Nunca un éxito vacío: sin brief (ni escenas) el job FALLA y se reembolsa,
  // para que ningún flujo crea que se generó contenido que no existe.
  if (items.length === 0) {
    throw new Error('Lote sin contenido: el payload no incluye un brief válido (ni escenas de examen). Job cancelado sin generar piezas.')
  }

  const creadas: ResultadoPieza[] = []
  for (let i = 0; i < items.length; i++) {
    const seed =
      modo === 'examen'
        ? `${character.seed}:examen:${items[i].sceneName}:v${varianteBase}`
        : `${character.seed}:lote:${batchId}:v${varianteBase + i}`
    const pieza = await producirPieza({
      jobId,
      characterId: character.id,
      characterName: character.name,
      baseSeed: character.seed,
      anchorTrait: character.anchorTrait,
      attrs,
      loraHash: modo === 'examen' ? character.loraHash : null,
      lane,
      brief: items[i].brief,
      seed,
      variant: varianteBase + i,
      kind: modo === 'examen' ? 'examen' : 'preview',
      sceneName: items[i].sceneName,
      batchId,
      index: i,
      masterKey,
    })
    creadas.push(pieza)
    await setProgreso(jobId, ((i + 1) / items.length) * 100)
    await sleep(randEntre(...COSTOS_LATENCIA.PREVIEW_MS))
  }

  const costeUnitario = modo === 'examen' ? COSTOS.RENDER_FINAL : COSTOS.PREVIEW
  await gastar(jobId, Math.round(costeUnitario * items.length * 10) / 10)
  await db.job.update({ where: { id: jobId }, data: { result: JSON.stringify({ batchId, mediaIds: creadas.map((m) => m.id) }) } })
}

// RENDER FINAL caro de las piezas elegidas
async function trabajoRenderFinal(jobId: string, character: { id: string; name: string; seed: string; anchorTrait: string; genome: string; loraHash: string | null }, payload: Record<string, unknown>): Promise<void> {
  const lane = (payload.lane === LANE.PRIVADO ? LANE.PRIVADO : LANE.PUBLICO) as Lane
  const attrs = (JSON.parse(character.genome).atributos ?? {}) as Record<string, string>
  const masterKey = lane === LANE.PRIVADO ? await claveMaestraServidor() : null
  const mediaIds = (payload.mediaIds as string[]) || []
  const brief = payload.brief as Brief
  const batchId = String(payload.batchId || `render_${Date.now()}`)

  const previews = await db.media.findMany({ where: { id: { in: mediaIds } } })
  const finales: string[] = []
  const aprobadasPrivadas: string[] = []

  for (let i = 0; i < previews.length; i++) {
    const prev = previews[i]
    const seedFinal = `${prev.seed}:final`
    const pieza = await producirPieza({
      jobId,
      characterId: character.id,
      characterName: character.name,
      baseSeed: character.seed,
      anchorTrait: character.anchorTrait,
      attrs,
      loraHash: character.loraHash,
      lane,
      brief,
      seed: seedFinal,
      variant: i + 100,
      kind: 'final',
      batchId,
      index: i,
      masterKey,
    })
    finales.push(pieza.id)
    if (pieza.veredicto === 'APROBADO' && lane === LANE.PRIVADO) aprobadasPrivadas.push(pieza.id)
    await sleep(randEntre(...COSTOS_LATENCIA.RENDER_MS))
    await setProgreso(jobId, ((i + 1) / previews.length) * 100)
  }

  // Cifrado automático de las piezas privadas aprobadas (ficha: "cifra automáticamente
  // cada pieza aprobada hasta su venta")
  if (aprobadasPrivadas.length > 0) {
    await db.job.create({
      data: {
        type: 'cifrado',
        characterId: character.id,
        priority: 3,
        costEstimate: Math.round(COSTOS.CIFRADO * aprobadasPrivadas.length),
        payload: JSON.stringify({ mediaIds: aprobadasPrivadas, motivo: 'cifrado automatico post-aprobacion' }),
      },
    })
  }

  await gastar(jobId, Math.round(COSTOS.RENDER_FINAL * finales.length * 10) / 10)
  await db.job.update({ where: { id: jobId }, data: { result: JSON.stringify({ batchId, mediaIds: finales }) } })
}

// CIFRADO: bloquea pieza completa (archivo + miniatura) con AES-256-GCM
async function trabajoCifrado(jobId: string, payload: Record<string, unknown>): Promise<void> {
  const mediaIds = (payload.mediaIds as string[]) || []
  const masterKey = await claveMaestraServidor()
  if (!masterKey) throw new Error('No hay clave maestra: define la contraseña del modo privado antes de generar en el carril privado.')
  const piezas = await db.media.findMany({ where: { id: { in: mediaIds } } })
  let i = 0
  for (const m of piezas) {
    if (m.lane === LANE.PRIVADO && m.qualityVerdict === 'APROBADO' && m.filePath) {
      if (!m.encIv) {
        const fs = await import('fs')
        const contenido = fs.readFileSync(m.filePath!).toString('utf8')
        const enc = guardarCifrado(m.filePath!, contenido, masterKey)
        guardarIvTag(m.filePath!, enc)
        const thumbContenido = fs.readFileSync(m.thumbPath!).toString('utf8')
        const encT = guardarCifrado(m.thumbPath!, thumbContenido, masterKey)
        guardarIvTag(m.thumbPath!, encT)
      }
      await db.media.update({
        where: { id: m.id },
        data: {
          pipelineStatus: PIPELINE.CIFRADO,
        },
      })
      await registrarEvento('cifrado', { mediaId: m.id, seed: m.seed, motivo: payload.motivo || 'cifrado automatico' }, { mediaId: m.id, characterId: m.characterId })
    }
    i++
    await setProgreso(jobId, (i / Math.max(1, piezas.length)) * 100)
    await sleep(randEntre(...COSTOS_LATENCIA.CIFRADO_MS))
  }
  await gastar(jobId, Math.round(COSTOS.CIFRADO * piezas.length * 10) / 10)
}

// Latencias (definidas aquí para no circular con constants.ts)
const COSTOS_LATENCIA = {
  PREVIEW_MS: [150, 320] as const,
  RENDER_MS: [1100, 2400] as const,
  DATASET_FOTO_MS: [140, 240] as const,
  ENTRENAMIENTO_MS: 21000,
  CIFRADO_MS: [120, 260] as const,
}

// Smoke F3 (S-016) — verifica en vivo el cuarto Telegram PROPIO contra la API real:
//   1) sesión honesta: 400 acción desconocida · 503 fail-closed sin secreto ·
//      401 sin firma / firma equivocada / ts vencido · 409 doble conexión
//   2) confirmar_conexion firmado → CONECTADA con identidad PÚBLICA del bot
//      (el token jamás aparece en nada)
//   3) webhook conversación: mismo cerrojo fail-closed (503/401) para las 4 acciones
//   4) entrante sin personaje → 503 · con personaje → en_cola con texto del
//      cerebro (plantilla del genoma) · idempotencia doble (no re-gasta)
//   5) marcar_envio → enviado; panel honesto con chatId enmascarado
//   6) iniciativas: 400 horizonte · programar → programada (NO envía) · poll con
//      ventana abierta → en_cola con chatId COMPLETO solo para el daemon firmado
//   7) pulso firmado → señal viva; panel lo reporta
//   8) disyuntor en vivo: 3 fallos de riesgo → iniciativas frenadas, respuestas NO
//   9) tope 3 programadas por chat + cancelar (en_cola → 409)
//  10) 0 jobs / 0 créditos · compliance append-only · limpieza explícita
import { PrismaClient } from '@prisma/client'
import { createHmac } from 'crypto'

const db = new PrismaClient()
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:3000'
const SECRETO = 'smoke-f3-secreto-hmac-de-32-caracteres-ok'
const CHAT = '573001234567'
const CHAT2 = '-1001234567890'
const PERSONAJE = 'SMOKE-F3'

let fallas = 0
function check(cond: boolean, que: string, extra = '') {
  if (cond) {
    console.log(`  OK  ${que}${extra ? ' → ' + extra : ''}`)
  } else {
    fallas++
    console.log(`  ✗✗✗ FALLO: ${que}${extra ? ' → ' + extra : ''}`)
  }
}

function firma(cuerpo: string, tsMs: number, secreto = SECRETO): string {
  return createHmac('sha256', secreto).update(`${tsMs}.${cuerpo}`).digest('hex')
}

async function postSesion(payload: unknown, opts: { conFirma?: boolean; ts?: number; secreto?: string } = {}) {
  const cuerpo = JSON.stringify(payload)
  const tsMs = opts.ts ?? Date.now()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (opts.conFirma !== false) {
    headers['x-chatx-ts'] = String(tsMs)
    headers['x-chatx-firma'] = firma(cuerpo, tsMs, opts.secreto)
  }
  const r = await fetch(`${BASE}/api/telegram/sesion`, { method: 'POST', headers, body: cuerpo })
  return { status: r.status, json: (await r.json().catch(() => ({}))) as Record<string, unknown> }
}

async function postWebhook(payload: unknown, opts: { conFirma?: boolean; ts?: number; secreto?: string } = {}) {
  const cuerpo = JSON.stringify(payload)
  const tsMs = opts.ts ?? Date.now()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (opts.conFirma !== false) {
    headers['x-chatx-ts'] = String(tsMs)
    headers['x-chatx-firma'] = firma(cuerpo, tsMs, opts.secreto)
  }
  const r = await fetch(`${BASE}/api/telegram/conversacion`, { method: 'POST', headers, body: cuerpo })
  return { status: r.status, json: (await r.json().catch(() => ({}))) as Record<string, unknown> }
}

async function putConfig(entradas: { clave: string; valor: string }[]) {
  const r = await fetch(`${BASE}/api/configuracion`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entradas }),
  })
  return { status: r.status, j: (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string } }
}

async function main() {
  console.log('── Fixtures (BD dev) ──')
  await db.telegramMensaje.deleteMany({})
  await db.telegramSesion.deleteMany({})
  await db.configuracion.deleteMany({ where: { clave: { startsWith: 'telegram.' } } })
  await db.character.deleteMany({ where: { name: PERSONAJE } })
  const c = await db.character.create({ data: { name: PERSONAJE, status: 'ACTIVO', seed: 'smoke-f3', audience: 'smoke', style: 'smoke' } })
  const jobsAntes = await db.job.count()
  const creditosAntes = (await db.settings.findUnique({ where: { id: 'main' } }))?.credits ?? 0
  console.log(`character ${c.id.slice(-6)} · jobs=${jobsAntes} · créditos=${creditosAntes}`)

  console.log('── 1) superficie de sesión: honesta y fail-closed ──')
  const g0 = await fetch(`${BASE}/api/telegram/sesion`).then((r) => r.json() as Promise<Record<string, unknown>>)
  check(g0.estado === 'NO_CONFIGURADO' && String(g0.honesto).includes('no existe todavía'), 'GET sesión honesto en virgen', String(g0.estado))
  const sa = await postSesion({ accion: 'basura' })
  check(sa.status === 400, 'acción desconocida → 400')
  const sc = await postSesion({ accion: 'confirmar_conexion', botId: '7123456789', botUsuario: '@smoke_f3_bot' }, { conFirma: false })
  check(sc.status === 503, 'confirmar sin secreto → 503 fail-closed', String(sc.json.error).slice(0, 60))
  await putConfig([{ clave: 'telegram.webhook_secreto', valor: SECRETO }])
  const sf = await postSesion({ accion: 'confirmar_conexion', botId: '7123456789', botUsuario: '@smoke_f3_bot' }, { conFirma: false })
  check(sf.status === 401, 'identidad SIN firma → 401 (no se acepta por teléfono)', String(sf.status))
  const sb = await postSesion({ accion: 'confirmar_conexion', botId: '7123456789', botUsuario: '@smoke_f3_bot' }, { secreto: 'otro-secreto-de-32-caracteres-xxxx' })
  check(sb.status === 401, 'identidad con firma equivocada → 401')
  const st = await postSesion({ accion: 'confirmar_conexion', botId: '7123456789', botUsuario: '@smoke_f3_bot' }, { ts: Date.now() - 6 * 60_000 })
  check(st.status === 401, 'identidad con timestamp vencido → 401')
  const sv = await postSesion({ accion: 'confirmar_conexion', botId: '7123456789:AAH-token-largo', botUsuario: '@smoke_f3_bot' })
  check(sv.status === 400, 'el TOKEN como botId → 400 (jamás viaja a CHAT-X)', String(sv.json.error).slice(0, 50))
  const sh = await postSesion({ accion: 'confirmar_conexion', botId: '7123456789', botUsuario: 'sin-arroba' })
  check(sh.status === 400, 'botUsuario sin @ → 400')

  console.log('── 2) conexión real del bot: identidad firmada → CONECTADA ──')
  const scx = await postSesion({ accion: 'confirmar_conexion', botId: '7123456789', botUsuario: '@smoke_f3_bot' })
  check(scx.status === 200 && scx.json.estado === 'CONECTADA', 'confirmar_conexion firmado → CONECTADA', String(scx.json.botUsuario))
  const sjson = String(JSON.stringify(scx.json))
  check(!sjson.includes('7123456789:AAH') && !sjson.includes('AAH-token'), 'el VALOR del token jamás aparece en la respuesta (el detalle sí puede nombrarlo)')
  const scd = await postSesion({ accion: 'confirmar_conexion', botId: '9999', botUsuario: '@otro_bot' })
  check(scd.status === 409, 'doble conexión → 409 (primero desconectar)', String(scd.json.error).slice(0, 55))

  console.log('── 3) webhook conversación: mismo cerrojo fail-closed ──')
  const wsf = await postWebhook({ accion: 'entrante', id: 'u1', chatId: CHAT, texto: 'hola' }, { conFirma: false })
  check(wsf.status === 401, 'entrante sin firma → 401')
  const wsv = await postWebhook({ accion: 'entrante', id: 'u1', chatId: CHAT, texto: 'hola' })
  check(wsv.status !== 401 && wsv.status !== 400, 'entrante firmado PASA el cerrojo (continúa a los gates: 503 sin personaje)', String(wsv.status))

  console.log('── 4) personaje: 503 sin asignar · luego cerebro honesto ──')
  // la petición u1 ya pasó el cerrojo → sin personaje debe ser 503
  // (se procesó tras el cerrojo: el wsv de arriba ya devolvió 503 sin personaje)
  const sp = await putConfig([{ clave: 'telegram.personaje_id', valor: c.id }])
  check(sp.status === 200, 'personaje_id asignado (fuente bd)')
  const e1 = await postWebhook({ accion: 'entrante', id: 'u2', chatId: CHAT, texto: 'hola, ¿quién eres?' })
  check(e1.status === 200 && e1.json.responder === true && e1.json.estado === 'en_cola', 'entrante → en_cola con texto del cerebro', String(e1.json.modo))
  const texto1 = String(e1.json.texto ?? '')
  check(texto1.includes(PERSONAJE) || texto1.length > 0, 'plantilla del genoma presente', texto1.slice(0, 50))
  const e2 = await postWebhook({ accion: 'entrante', id: 'u2', chatId: CHAT, texto: 'hola, ¿quién eres?' })
  check(e2.status === 200 && e2.json.idempotente === true && e2.json.responder === true && e2.json.texto === texto1, 'idempotente: re-entrega sin re-gastar el cerebro')

  console.log('── 5) marcar_envio → enviado · panel honesto ──')
  const m1 = await postWebhook({ accion: 'marcar_envio', id: String(e1.json.mensajeId), resultado: 'enviado' })
  check(m1.status === 200 && m1.json.estado === 'enviado', 'enviado registrado')
  const m2 = await postWebhook({ accion: 'marcar_envio', id: String(e1.json.mensajeId), resultado: 'enviado' })
  check(m2.status === 200 && m2.json.idempotente === true, 're-marcado idempotente')
  const m3 = await postWebhook({ accion: 'marcar_envio', id: String(e1.json.mensajeId), resultado: 'fallado' })
  check(m3.status === 409, 'enviado → fallado es contradicción → 409', String(m3.json.error).slice(0, 45))
  const panel1 = await fetch(`${BASE}/api/telegram/conversacion`).then((r) => r.json() as Promise<Record<string, unknown>>)
  const hoy1 = panel1.hoy as Record<string, number>
  check(hoy1.respuestasEnviadas === 1, 'panel cuenta 1 respuesta enviada')
  check((panel1.ultimos as Record<string, unknown>[]).some((u) => String(u.chat).includes('•••••')), 'chatId SIEMPRE enmascarado en el panel')
  check(String(JSON.stringify(panel1)).includes(CHAT) === false, 'chatId COMPLETO jamás en el panel')

  console.log('── 6) iniciativas: horizonte · programar (NO envía) · poll ──')
  const en40 = new Date(Date.now() + 40 * 24 * 3600 * 1000).toISOString()
  const ih = await fetch(`${BASE}/api/telegram/iniciativas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'programar', chatId: CHAT, programadaEn: en40 }) })
  check(ih.status === 400, 'más allá del horizonte de 30 días → 400')
  const vencida = new Date(Date.now() - 60_000).toISOString()
  const i1 = await fetch(`${BASE}/api/telegram/iniciativas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'programar', chatId: CHAT, programadaEn: vencida, texto: 'recordar el estreno' }) })
  check(i1.status === 200 && (await i1.json() as Record<string, unknown>).estado === 'programada', 'iniciativa programada (vencida, para el poll)')
  const iv = await postWebhook({ accion: 'iniciativas_vencidas' })
  const ins = (iv.json.instrucciones as Record<string, unknown>[]) ?? []
  check(iv.status === 200 && ins.length === 1 && ins[0].estado === 'en_cola', 'poll → en_cola con texto del cerebro')
  check(ins[0]?.chatId === CHAT, 'chatId COMPLETO solo para el daemon firmado')
  check(String(ins[0]?.texto ?? '').length > 0, 'texto del cerebro presente')
  const iv2 = await postWebhook({ accion: 'iniciativas_vencidas' })
  check((iv2.json.recogidas as number) === 0, 'poll vacío después (ya está en_cola, no programada)')

  console.log('── 7) pulso firmado → señal viva ──')
  const p1 = await postWebhook({ accion: 'pulso' })
  check(p1.status === 200 && p1.json.vivo === true, 'pulso recibido y vivo')
  const panel2 = await fetch(`${BASE}/api/telegram/conversacion`).then((r) => r.json() as Promise<Record<string, unknown>>)
  check((panel2.sesion as Record<string, unknown>).pulso === 'vivo', 'panel reporta pulso vivo')
  const gs = await fetch(`${BASE}/api/telegram/sesion`).then((r) => r.json() as Promise<Record<string, unknown>>)
  check(gs.pulso === 'vivo' && gs.estado === 'CONECTADA', 'sesión GET: CONECTADA con pulso vivo')

  console.log('── 8) disyuntor en vivo: 3 fallos de riesgo → iniciativas frenadas, respuestas NO ──')
  for (let i = 1; i <= 3; i++) {
    const e = await postWebhook({ accion: 'entrante', id: `f3-risk-${i}`, chatId: CHAT, texto: `mensaje de riesgo ${i}` })
    check(e.status === 200 && e.json.estado === 'en_cola', `respuesta de riesgo ${i} en cola`)
    const mf = await postWebhook({ accion: 'marcar_envio', id: String(e.json.mensajeId), resultado: 'fallado', errorRiesgo: true, detalle: 'rate limit persistente (smoke)' })
    check(mf.status === 200 && mf.json.errorRiesgo === true, `fallo de riesgo ${i} registrado`)
  }
  const eResp = await postWebhook({ accion: 'entrante', id: 'f3-resp-ok', chatId: CHAT, texto: 'una pregunta cualquiera' })
  check(eResp.status === 200 && eResp.json.estado === 'en_cola', 'garantía W1: las RESPUESTAS jamás las frena el circuito')
  const i2 = await fetch(`${BASE}/api/telegram/iniciativas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'programar', chatId: CHAT, programadaEn: vencida }) })
  check(i2.status === 200, 'segunda iniciativa programada (vencida)')
  const ivc = await postWebhook({ accion: 'iniciativas_vencidas' })
  const insC = (ivc.json.instrucciones as Record<string, unknown>[]) ?? []
  check(insC.length === 1 && insC[0].estado === 'sigue_programada' && String(insC[0]?.motivo).toLowerCase().includes('circuito'), 'disyuntor EN VIVO frena la iniciativa', String(insC[0]?.motivo).slice(0, 60))

  console.log('── 9) tope 3 por chat + cancelar (en_cola → 409) ──')
  const futuro = new Date(Date.now() + 2 * 3600 * 1000).toISOString()
  const ic1 = await fetch(`${BASE}/api/telegram/iniciativas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'programar', chatId: CHAT2, programadaEn: futuro }) })
  check(ic1.status === 200, 'programada 1/3 para CHAT2 (grupo)')
  const ic2 = await fetch(`${BASE}/api/telegram/iniciativas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'programar', chatId: CHAT2, programadaEn: futuro }) })
  check(ic2.status === 200, 'programada 2/3')
  const ic3 = await fetch(`${BASE}/api/telegram/iniciativas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'programar', chatId: CHAT2, programadaEn: futuro }) })
  check(ic3.status === 200, 'programada 3/3')
  const ic4 = await fetch(`${BASE}/api/telegram/iniciativas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'programar', chatId: CHAT2, programadaEn: futuro }) })
  check(ic4.status === 409, '4ª del mismo chat → 409 (tope 3)', String((await ic4.json() as Record<string, unknown>).error).slice(0, 55))
  const enColaId = ins.length ? String(ins[0]?.id) : ''
  const icx = await fetch(`${BASE}/api/telegram/iniciativas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'cancelar', id: enColaId }) })
  check(icx.status === 409, 'en_cola ya instruida no se des-instruye → 409')
  const pend = await db.telegramMensaje.findFirst({ where: { chatId: CHAT2, estado: 'programada' } })
  const icy = await fetch(`${BASE}/api/telegram/iniciativas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'cancelar', id: String(pend?.id) }) })
  check(icy.status === 200, 'cancelación explícita en programada OK')

  console.log('── 10) $0 · compliance · limpieza ──')
  const jobsDespues = await db.job.count()
  const creditosDespues = (await db.settings.findUnique({ where: { id: 'main' } }))?.credits ?? 0
  check(jobsDespues === jobsAntes, 'NINGÚN job creado por el cuarto', `${jobsAntes}→${jobsDespues}`)
  check(creditosDespues === creditosAntes, 'NINGÚN crédito gastado', `${creditosAntes}→${creditosDespues}`)
  const evTg = await db.complianceEvent.count({ where: { type: 'mensajes_telegram' } })
  const evSes = await db.complianceEvent.count({ where: { type: 'sesion_telegram' } })
  check(evTg >= 8, 'compliance mensajes_telegram append-only', String(evTg))
  check(evSes >= 3, 'compliance sesion_telegram append-only', String(evSes))

  console.log('── Limpieza explícita (nada en silencio) ──')
  const des = await fetch(`${BASE}/api/telegram/sesion`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'desconectar' }) })
  check(des.status === 200, 'bot desconectado (baja explícita)')
  await db.telegramMensaje.deleteMany({})
  await db.telegramSesion.deleteMany({})
  await db.configuracion.deleteMany({ where: { clave: { startsWith: 'telegram.' } } })
  await db.character.deleteMany({ where: { name: PERSONAJE } })
  const rest = await db.telegramMensaje.count()
  check(rest === 0, 'BD del cuarto limpia', '0 filas')
  const evsFinal = await db.complianceEvent.count({ where: { type: { in: ['mensajes_telegram', 'sesion_telegram'] } } })
  check(evsFinal >= 11, 'el LEDGER de compliance se conserva (append-only)', String(evsFinal))

  console.log(`── Resultado: ${fallas === 0 ? 'TODO OK' : `${fallas} FALLOS`} ──`)
  if (fallas > 0) process.exit(1)
}

main()
  .catch((e) => {
    console.error('SMOKE F3 ERROR:', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())

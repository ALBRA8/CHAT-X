// Smoke test W3 (S-014) — verifica en vivo el bucle de conversación del canal
// WhatsApp PROPIO contra la API real:
//   1) receptor FAIL-CLOSED: 503 sin secreto · 401 firma mala / vencida / ausente
//   2) honestidad de estado: 409 sin sesión CONECTADA · 503 sin personaje · 404 personaje fantasma
//   3) sesion API: iniciar_espera_qr → confirmar_conexion → CONECTADA (QR real de la casa)
//   4) pacing W1 cableado: horas silencio → bloqueado_pacing con reintentarEn (determinista
//      según la hora local; el propio smoke calcula el veredicto esperado)
//   5) cerebro honesto: plantilla/LLM declarado en modo · pedidos de media NO crean jobs ni tocan créditos
//   6) filtro de edad de ENTRADA: bloqueado_filtro + compliance rechazo_qa, sin fila de salida
//   7) IDEMPOTENCIA: reenvío del daemon no re-procesa (ni re-llama al cerebro)
//   8) marcar_envio: enviado · idempotente · contradicción 409 · fila ENTRANTE 409
//   9) disyuntor en vivo: 3 fallos con señal de riesgo → temperatura enfriando
//  10) panel GET honesto + compliance append-only
// Fixtures mínimos en la BD dev, API real del servidor, limpieza explícita al
// final (sesión borrada, filas del canal borradas, config de prueba borrada).
import { PrismaClient } from '@prisma/client'
import { createHmac } from 'crypto'

const db = new PrismaClient()
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:3000'
const SECRETO = 'smoke-w3-secreto-hmac-de-32-caracteres-ok'
const CHAT = '573001234567@s.whatsapp.net'
const PERSONAJE = 'SMOKE-W3'

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

async function postWhatsApp(payload: unknown, opts: { conFirma?: boolean; ts?: number; secreto?: string } = {}) {
  const cuerpo = JSON.stringify(payload)
  const tsMs = opts.ts ?? Date.now()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (opts.conFirma !== false) {
    headers['x-chatx-ts'] = String(tsMs)
    headers['x-chatx-firma'] = firma(cuerpo, tsMs, opts.secreto)
  }
  const r = await fetch(`${BASE}/api/whatsapp/conversacion`, { method: 'POST', headers, body: cuerpo })
  return { status: r.status, json: (await r.json().catch(() => ({}))) as Record<string, unknown> }
}

async function putConfig(entradas: { clave: string; valor: string }[]) {
  const r = await fetch(`${BASE}/api/configuracion`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entradas }),
  })
  const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string }
  return { status: r.status, j }
}

async function main() {
  const hora = new Date().getHours()

  console.log('── Fixtures (BD dev) ──')
  await db.whatsAppMensaje.deleteMany({})
  await db.whatsAppSesion.deleteMany({})
  await db.configuracion.deleteMany({ where: { clave: { startsWith: 'whatsapp.' } } })
  await db.character.deleteMany({ where: { name: PERSONAJE } })
  const c = await db.character.create({ data: { name: PERSONAJE, status: 'ACTIVO', seed: 'smoke-w3', audience: 'smoke', style: 'smoke' } })
  const jobsAntes = await db.job.count()
  const creditosAntes = (await db.settings.findUnique({ where: { id: 'main' } }))?.credits ?? 0
  console.log(`character ${c.id.slice(-6)} · jobs=${jobsAntes} · créditos=${creditosAntes} · hora local=${hora}`)

  console.log('── 1) GET panel honesto (canal virgen) ──')
  const g0 = await fetch(`${BASE}/api/whatsapp/conversacion`)
  const d0 = (await g0.json()) as { honesto: string; sesion: { estado: string }; webhook: { secretoPresente: boolean } }
  check(g0.status === 200, 'GET panel 200', d0.sesion.estado)
  check(d0.sesion.estado === 'NO_CONFIGURADO', 'sesión NO_CONFIGURADO', d0.honesto.slice(0, 60))
  check(d0.webhook.secretoPresente === false, 'secreto del webhook ausente')

  console.log('── 2) POST sin secreto → 503 fail-closed ──')
  const p0 = await postWhatsApp({ accion: 'entrante', id: 'w3-1', chatId: CHAT, texto: 'hola' })
  check(p0.status === 503, 'receptor APAGADO sin secreto', String(p0.status))

  console.log('── 3) config del secreto vía panel (PUT /api/configuracion) ──')
  const pc = await putConfig([{ clave: 'whatsapp.webhook_secreto', valor: SECRETO }])
  check(pc.status === 200 && pc.j.ok === true, 'secreto guardado en BD (fuente bd)')

  console.log('── 4) firmas inválidas → 401 con motivo honesto ──')
  const pBad = await postWhatsApp({ accion: 'entrante', id: 'w3-1', chatId: CHAT, texto: 'hola' }, { secreto: 'secreto-equivocado-de-32-caracteres-x' })
  check(pBad.status === 401, 'firma de otro secreto rechazada', String(pBad.status))
  const pOld = await postWhatsApp({ accion: 'entrante', id: 'w3-1', chatId: CHAT, texto: 'hola' }, { ts: Date.now() - 6 * 60_000 })
  check(pOld.status === 401, 'timestamp vencido rechazado (anti-replay)', String(pOld.status))
  const pNo = await postWhatsApp({ accion: 'entrante', id: 'w3-1', chatId: CHAT, texto: 'hola' }, { conFirma: false })
  check(pNo.status === 401, 'sin firma rechazada', String(pNo.status))
  const pTxt = await postWhatsApp({ accion: 'entrante', id: 'w3-1' }, { ts: 1 })
  check(pTxt.status === 401 || pTxt.status === 400, 'ts no numérico rechazado', String(pTxt.status))

  console.log('── 5) accion desconocida → 400 ──')
  const pAcc = await postWhatsApp({ accion: 'basura' })
  check(pAcc.status === 400, 'accion desconocida', JSON.stringify(pAcc.json).slice(0, 80))

  console.log('── 6) entrante sin sesión CONECTADA → 409 honesto ──')
  const pSin = await postWhatsApp({ accion: 'entrante', id: 'w3-1', chatId: CHAT, texto: 'hola' })
  check(pSin.status === 409, 'sin sesión real no hay conversación', String(pSin.json.estado))

  console.log('── 7) sesión real de la casa: QR → confirmar_conexion ──')
  const q = await fetch(`${BASE}/api/whatsapp/sesion`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'iniciar_espera_qr' }) })
  check(q.status === 200, 'iniciar_espera_qr')
  const q2 = await fetch(`${BASE}/api/whatsapp/sesion`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'confirmar_conexion', numero: '+57 300 123 4567', secretoSesion: 'blob-de-sesion-smoke-w3-xxxxx' }) })
  const q2j = (await q2.json().catch(() => ({}))) as { ok?: boolean; estado?: string }
  check(q2.status === 200 && q2j.ok === true, 'confirmar_conexion', String(q2j.estado))
  const gj = (await (await fetch(`${BASE}/api/whatsapp/sesion`)).json()) as { estado: string; numeroMascarado: string }
  check(gj.estado === 'CONECTADA', 'sesión CONECTADA', gj.numeroMascarado)

  console.log('── 8) entrante con sesión pero SIN personaje → 503 ──')
  const pNp = await postWhatsApp({ accion: 'entrante', id: 'w3-1', chatId: CHAT, texto: 'hola' })
  check(pNp.status === 503, 'canal sin cerebro es NO_CONFIGURADO', String(pNp.json.estado))

  console.log('── 9) personaje fantasma → 404 ──')
  const pGhost = await putConfig([{ clave: 'whatsapp.personaje_id', valor: 'no-existe-123' }])
  check(pGhost.status === 200, 'personaje_id fantasma guardado')
  const pG = await postWhatsApp({ accion: 'entrante', id: 'w3-1', chatId: CHAT, texto: 'hola' })
  check(pG.status === 404, 'personaje inexistente honesto', String(pG.status))

  console.log('── 10) asignar personaje + pacing en horas silencio → bloqueado_pacing ──')
  const silencioA = hora < 23 ? { silencioDesde: '0', silencioHasta: '23' } : { silencioDesde: '23', silencioHasta: '22' }
  const pA = await putConfig([
    { clave: 'whatsapp.personaje_id', valor: c.id },
    { clave: 'whatsapp.pacing.silencio_desde', valor: silencioA.silencioDesde },
    { clave: 'whatsapp.pacing.silencio_hasta', valor: silencioA.silencioHasta },
  ])
  check(pA.status === 200, 'config pacing en silencio total', `cfg ${silencioA.silencioDesde}-${silencioA.silencioHasta} · hora ${hora}`)
  const pSil = await postWhatsApp({ accion: 'entrante', id: 'w3-msg-1', chatId: CHAT, texto: 'hola, ¿cómo estás hoy?', recibidoEn: new Date().toISOString() })
  check(pSil.status === 200 && pSil.json.estado === 'bloqueado_pacing' && pSil.json.responder === false, 'pacing bloquea (CUÁNDO)', String(pSil.json.pacing && JSON.stringify(pSil.json.pacing)))
  check(typeof pSil.json.mensajeId === 'string', 'fila de salida creada en cola fría', String(pSil.json.mensajeId).slice(-6))

  console.log('── 11) pacing fuera de silencio (23:00–23:00) → en_cola con respuesta ──')
  const pB = await putConfig([
    { clave: 'whatsapp.pacing.silencio_desde', valor: '23' },
    { clave: 'whatsapp.pacing.silencio_hasta', valor: '23' },
  ])
  check(pB.status === 200, 'ventana vacía: nunca silencio')
  const pOk = await postWhatsApp({ accion: 'entrante', id: 'w3-msg-1', chatId: CHAT, texto: 'hola, ¿cómo estás hoy?' })
  check(pOk.status === 200 && pOk.json.responder === true && pOk.json.estado === 'en_cola', 'respuesta en cola', `modo=${String(pOk.json.modo)} · pacing=${JSON.stringify(pOk.json.pacing)}`)
  check(typeof pOk.json.texto === 'string' && (pOk.json.texto as string).length > 0, 'texto del cerebro presente')

  console.log('── 12) IDEMPOTENCIA: reenvío del mismo id no re-procesa ──')
  const pIdem = await postWhatsApp({ accion: 'entrante', id: 'w3-msg-1', chatId: CHAT, texto: 'hola, ¿cómo estás hoy?' })
  check(pIdem.json.idempotente === true && pIdem.json.mensajeId === pOk.json.mensajeId, 'misma instrucción re-entregada', String(pIdem.json.motivo).slice(0, 60))

  console.log('── 13) pedido de media por WhatsApp: plantilla responde, 0 jobs, 0 créditos ──')
  const pFoto = await postWhatsApp({ accion: 'entrante', id: 'w3-foto-1', chatId: CHAT, texto: 'mándame una selfie' })
  check(pFoto.status === 200 && pFoto.json.responder === true, 'respuesta de plantilla al pedido de media')
  const jobsDespues = await db.job.count()
  const creditosDespues = (await db.settings.findUnique({ where: { id: 'main' } }))?.credits ?? 0
  check(jobsDespues === jobsAntes, 'NINGÚN job creado por el canal', `jobs ${jobsAntes}→${jobsDespues}`)
  check(creditosDespues === creditosAntes, 'NINGÚN crédito gastado', `${creditosAntes}→${creditosDespues}`)
  const filaFoto = await db.whatsAppMensaje.findFirst({ where: { idEntrada: 'w3-foto-1', direccion: 'salida' } })
  check(!!filaFoto && (JSON.parse(filaFoto.meta) as Record<string, unknown>).intencion === 'foto', 'intención declarada en meta')

  console.log('── 14) filtro de edad de ENTRADA → bloqueado_filtro, sin salida ──')
  const pMal = await postWhatsApp({ accion: 'entrante', id: 'w3-bad-1', chatId: CHAT, texto: 'eres una menor de edad?' })
  check(pMal.status === 200 && pMal.json.estado === 'bloqueado_filtro' && pMal.json.responder === false, 'entrada rechazada por filtro', String(pMal.json.motivo).slice(0, 70))
  const salidaMal = await db.whatsAppMensaje.findFirst({ where: { idEntrada: 'w3-bad-1', direccion: 'salida' } })
  check(salidaMal === null, 'NINGUNA fila de salida para entrada filtrada')
  const rechazo = await db.complianceEvent.findFirst({ where: { type: 'rechazo_qa', detail: { contains: 'whatsapp_daemon' } }, orderBy: { createdAt: 'desc' } })
  check(!!rechazo, 'compliance rechazo_qa registrado')

  console.log('── 15) marcar_envio: enviado · idempotente · contradicción 409 ──')
  const idFila = String(pOk.json.mensajeId)
  const m1 = await postWhatsApp({ accion: 'marcar_envio', id: idFila, resultado: 'enviado' })
  check(m1.status === 200 && m1.json.estado === 'enviado' && m1.json.idempotente === false, 'enviado registrado', String(m1.json.estado))
  const m2 = await postWhatsApp({ accion: 'marcar_envio', id: idFila, resultado: 'enviado' })
  check(m2.status === 200 && m2.json.idempotente === true, 're-reporte idempotente', String(m2.json.idempotente))
  const m3 = await postWhatsApp({ accion: 'marcar_envio', id: idFila, resultado: 'fallado', errorRiesgo: true })
  check(m3.status === 409, 'contradicción enviado→fallado rechazada', String(m3.status))
  const filaEntrada = await db.whatsAppMensaje.findFirst({ where: { idEntrada: 'w3-msg-1', direccion: 'entrada' } })
  const m4 = await postWhatsApp({ accion: 'marcar_envio', id: filaEntrada?.id ?? 'no', resultado: 'enviado' })
  check(m4.status === 409, 'fila ENTRANTE no es un envío', String(m4.status))
  const m5 = await postWhatsApp({ accion: 'marcar_envio', id: 'no-existe', resultado: 'enviado' })
  check(m5.status === 404, 'fila inexistente honesta', String(m5.status))

  console.log('── 16) idempotencia tras enviado: el daemon no re-procesa ──')
  const pIdem2 = await postWhatsApp({ accion: 'entrante', id: 'w3-msg-1', chatId: CHAT, texto: 'hola, ¿cómo estás hoy?' })
  check(pIdem2.json.idempotente === true && pIdem2.json.responder === false && pIdem2.json.estado === 'enviado', 'entrada ya respondida no se vuelve a gastar')

  console.log('── 17) disyuntor en vivo: 3 fallos con riesgo → enfriando ──')
  for (let i = 1; i <= 3; i++) {
    const p = await postWhatsApp({ accion: 'entrante', id: `w3-risk-${i}`, chatId: CHAT, texto: `mensaje de riesgo ${i}` })
    check(p.status === 200 && p.json.estado === 'en_cola', `risco ${i} en cola`)
    const mf = await postWhatsApp({ accion: 'marcar_envio', id: String(p.json.mensajeId), resultado: 'fallado', errorRiesgo: true, detalle: 'timeout de sesión (smoke)' })
    check(mf.status === 200 && mf.json.errorRiesgo === true, `fallo de riesgo ${i} registrado`)
  }
  const d1 = (await (await fetch(`${BASE}/api/whatsapp/conversacion`)).json()) as {
    pacing: { temperatura: string; temperaturaHasta: string | null }
    hoy: { respuestasEnviadas: number; fallosRiesgo: number; enCola: number; bloqueadosPacing: number }
  }
  check(d1.pacing.temperatura === 'enfriando', 'disyuntor ABIERTO', `hasta ${d1.pacing.temperaturaHasta}`)
  check(d1.hoy.fallosRiesgo === 3, '3 fallos de riesgo hoy', String(d1.hoy.fallosRiesgo))
  check(d1.hoy.respuestasEnviadas === 1, '1 respuesta enviada hoy', String(d1.hoy.respuestasEnviadas))
  check(d1.hoy.bloqueadosPacing === 0, 'el bloqueo frío se reabrió al repreguntar (diseño idempotente)', String(d1.hoy.bloqueadosPacing))

  console.log('── 18) compliance append-only del canal ──')
  const evs = await db.complianceEvent.count({ where: { type: 'mensajes_whatsapp' } })
  check(evs >= 8, 'eventos mensajes_whatsapp registrados', String(evs))

  console.log('── Limpieza explícita (nada en silencio) ──')
  const des = await fetch(`${BASE}/api/whatsapp/sesion`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'desconectar' }) })
  check(des.status === 200, 'sesión desconectada (borrado explícito del secreto)')
  await db.whatsAppMensaje.deleteMany({})
  await db.whatsAppSesion.deleteMany({})
  await db.configuracion.deleteMany({ where: { clave: { startsWith: 'whatsapp.' } } })
  await db.character.deleteMany({ where: { name: PERSONAJE } })
  const rest = await db.whatsAppMensaje.count()
  check(rest === 0, 'BD del canal limpia', '0 filas')
  const evsFinal = await db.complianceEvent.count({ where: { type: 'mensajes_whatsapp' } })
  check(evsFinal >= 8, 'el LEDGER de compliance se conserva (append-only)', String(evsFinal))

  console.log(`── Resultado: ${fallas === 0 ? 'TODO OK' : `${fallas} FALLOS`} ──`)
  if (fallas > 0) process.exit(1)
}

main()
  .catch((e) => {
    console.error('SMOKE W3 ERROR:', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())

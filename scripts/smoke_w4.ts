// Smoke test W4 (S-015) — verifica en vivo las iniciativas programadas del canal
// WhatsApp PROPIO y la superficie del panel, contra la API real:
//   1) superficie del operador honesta: 400 payload inválido · 409 sin sesión
//      CONECTADA · 503 sin personaje · 404 cancelación fantasma · 400 horizonte
//   2) webhook firmado fail-closed también para 'iniciativas_vencidas' (401 sin firma)
//   3) programar = NO enviar: la fila nace programada y el panel la cuenta
//   4) pacing W1 con disyuntor EN VIVO: horas silencio → sigue_programada con
//      reintentarEn; ventana abierta → en_cola con texto del cerebro
//   5) el QUÉ lo escribe el cerebro (plantilla del genoma / LLM declarado), el
//      breve del operador es intención, no texto final
//   6) marcar_envio del daemon → enviado; panel honesto (iniciativas del día)
//   7) disyuntor frena INICIATIVAS y jamás respuestas (garantía W1 en vivo)
//   8) tope de programadas pendientes por chat (1:1, jamás cola de difusión) + cancelar
//      explícito (en_cola no se des-instruye → 409)
//   9) chatId completo SOLO para el daemon firmado; máscara en panel y logs
//  10) compliance append-only (programar/cancelar/iniciativa) + limpieza explícita
import { PrismaClient } from '@prisma/client'
import { createHmac } from 'crypto'

const db = new PrismaClient()
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:3000'
const SECRETO = 'smoke-w4-secreto-hmac-de-32-caracteres-ok'
const CHAT = '573001234567@s.whatsapp.net'
const CHAT2 = '573007654321@s.whatsapp.net'
const PERSONAJE = 'SMOKE-W4'

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

async function postIniciativa(payload: unknown) {
  const r = await fetch(`${BASE}/api/whatsapp/iniciativas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  return { status: r.status, json: (await r.json().catch(() => ({}))) as Record<string, unknown> }
}

async function getIniciativas() {
  const r = await fetch(`${BASE}/api/whatsapp/iniciativas`)
  return { status: r.status, json: (await r.json().catch(() => ({}))) as Record<string, unknown> }
}

async function getPanel() {
  const r = await fetch(`${BASE}/api/whatsapp/conversacion`)
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
  // TTL de la caché de configuración del panel: 5 s. Si otro smoke tocó
  // whatsapp.* hace instantes, el receptor vería un secreto STALE — esperar
  // la expiración para que cada corrida arranque con la BD REAL limpia.
  await new Promise((r) => setTimeout(r, 5200))
  const c = await db.character.create({ data: { name: PERSONAJE, status: 'ACTIVO', seed: 'smoke-w4', audience: 'smoke', style: 'smoke' } })
  const jobsAntes = await db.job.count()
  const creditosAntes = (await db.settings.findUnique({ where: { id: 'main' } }))?.credits ?? 0
  console.log(`character ${c.id.slice(-6)} · jobs=${jobsAntes} · créditos=${creditosAntes} · hora local=${hora}`)

  console.log('── 1) superficie del operador, canal virgen ──')
  const g0 = await getIniciativas()
  check(g0.status === 200 && Array.isArray(g0.json.programadas) && g0.json.programadas.length === 0, 'GET iniciativas 200 vacío', String(g0.json.honesto).slice(0, 60))
  const pv1 = await postIniciativa({ accion: 'programar' })
  check(pv1.status === 400, 'programar sin chatId → 400', String(pv1.json.error).slice(0, 60))
  const pv2 = await postIniciativa({ accion: 'programar', chatId: 'no-es-un-chat' })
  check(pv2.status === 400, 'chatId sin dígitos → 400', String(pv2.json.error).slice(0, 50))
  const pv3 = await postIniciativa({ accion: 'programar', chatId: CHAT, programadaEn: 'fecha-chafa' })
  check(pv3.status === 400, 'fecha inválida → 400', String(pv3.json.error).slice(0, 50))
  const pc1 = await postIniciativa({ accion: 'cancelar' })
  check(pc1.status === 400, 'cancelar sin id → 400')
  const pc2 = await postIniciativa({ accion: 'cancelar', id: 'no-existe' })
  check(pc2.status === 404, 'cancelar fantasma → 404')
  const pa = await postIniciativa({ accion: 'basura' })
  check(pa.status === 400, 'accion desconocida → 400')

  console.log('── 2) programar sin sesión CONECTADA → 409 honesto ──')
  const pns = await postIniciativa({ accion: 'programar', chatId: CHAT })
  check(pns.status === 409, 'sin sesión real no se programa', String(pns.json.error).slice(0, 70))

  console.log('── 2b) POST firmado sin secreto configurado → 503 fail-closed ──')
  const pSinSecreto = await postWhatsApp({ accion: 'iniciativas_vencidas' })
  check(pSinSecreto.status === 503, 'receptor APAGADO sin secreto', String(pSinSecreto.status))
  const psc = await putConfig([{ clave: 'whatsapp.webhook_secreto', valor: SECRETO }])
  check(psc.status === 200 && psc.j.ok === true, 'secreto del webhook guardado (fuente bd)')

  console.log('── 3) webhook firmado: iniciativas_vencidas también fail-closed ──')
  const pNo = await postWhatsApp({ accion: 'iniciativas_vencidas' }, { conFirma: false })
  check(pNo.status === 401, 'poll sin firma → 401')
  const pBad = await postWhatsApp({ accion: 'iniciativas_vencidas' }, { secreto: 'otro-secreto-de-32-caracteres-xxxx' })
  check(pBad.status === 401, 'poll con firma equivocada → 401')
  const pOld = await postWhatsApp({ accion: 'iniciativas_vencidas' }, { ts: Date.now() - 6 * 60_000 })
  check(pOld.status === 401, 'poll con timestamp vencido → 401')
  const pSinS = await postWhatsApp({ accion: 'iniciativas_vencidas' })
  check(pSinS.status === 409, 'poll sin sesión CONECTADA → 409')

  console.log('── 4) sesión real de la casa: QR → confirmar_conexion ──')
  const q = await fetch(`${BASE}/api/whatsapp/sesion`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'iniciar_espera_qr' }) })
  check(q.status === 200, 'iniciar_espera_qr')
  const q2 = await fetch(`${BASE}/api/whatsapp/sesion`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'confirmar_conexion', numero: '+57 300 123 4567', secretoSesion: 'blob-de-sesion-smoke-w4-xxxxx' }) })
  const q2j = (await q2.json().catch(() => ({}))) as { ok?: boolean; estado?: string }
  check(q2.status === 200 && q2j.ok === true, 'confirmar_conexion', String(q2j.estado))

  console.log('── 5) programar con sesión pero sin personaje → 503 ──')
  const pNp = await postIniciativa({ accion: 'programar', chatId: CHAT })
  check(pNp.status === 503, 'canal sin cerebro NO_CONFIGURADO', String(pNp.json.error).slice(0, 60))

  console.log('── 6) personaje asignado + horizonte de programación ──')
  const pcfg = await putConfig([{ clave: 'whatsapp.personaje_id', valor: c.id }])
  check(pcfg.status === 200, 'personaje_id asignado (fuente bd)')
  const en40 = new Date(Date.now() + 40 * 24 * 3600 * 1000).toISOString()
  const ph = await postIniciativa({ accion: 'programar', chatId: CHAT, programadaEn: en40 })
  check(ph.status === 400, 'más allá del horizonte de 30 días → 400', String(ph.json.error).slice(0, 60))

  console.log('── 7) poll sin nada vencido → recogidas 0 ──')
  const pVacio = await postWhatsApp({ accion: 'iniciativas_vencidas' })
  check(pVacio.status === 200 && pVacio.json.recogidas === 0, 'poll vacío honesto', JSON.stringify(pVacio.json.instrucciones))

  console.log('── 8) programar NO envía: fila programada + panel la cuenta ──')
  const silencioTotal = hora === 23 ? { desde: '2', hasta: '1' } : { desde: '0', hasta: '23' }
  const ps = await putConfig([
    { clave: 'whatsapp.pacing.silencio_desde', valor: silencioTotal.desde },
    { clave: 'whatsapp.pacing.silencio_hasta', valor: silencioTotal.hasta },
  ])
  check(ps.status === 200, 'pacing en silencio total', `cfg ${silencioTotal.desde}-${silencioTotal.hasta} · hora ${hora}`)
  const vencida = new Date(Date.now() - 60_000).toISOString()
  const p1 = await postIniciativa({ accion: 'programar', chatId: CHAT, programadaEn: vencida, texto: 'recordar el estreno' })
  check(p1.status === 200 && p1.json.estado === 'programada', 'iniciativa programada (vencida, para el poll)', String(p1.json.chat))
  const panel1 = await getPanel()
  check(Boolean(panel1.json.hoy) && (panel1.json.hoy as Record<string, number>).iniciativasProgramadas === 1, 'panel cuenta 1 programada', JSON.stringify(panel1.json.hoy))
  const fila1 = await db.whatsAppMensaje.findFirst({ where: { tipo: 'iniciativa', estado: 'programada' } })
  check(!!fila1 && fila1.direccion === 'salida' && fila1.programadaPor === 'operador', 'fila nace programada, por el operador', fila1?.estado ?? 'ausente')

  console.log('── 9) horas silencio → el poll la deja programada con reintentarEn ──')
  const pSil = await postWhatsApp({ accion: 'iniciativas_vencidas' })
  const insSil = (pSil.json.instrucciones as Record<string, unknown>[]) ?? []
  check(pSil.status === 200 && insSil.length === 1 && insSil[0].estado === 'sigue_programada', 'sigue programada (CUÁNDO = pacing)', String(insSil[0]?.motivo).slice(0, 60))
  check(typeof insSil[0]?.reintentarEn === 'string', 'reintentarEn explícito', String(insSil[0]?.reintentarEn).slice(0, 25))
  const filaSil = await db.whatsAppMensaje.findFirst({ where: { tipo: 'iniciativa' } })
  check(filaSil?.estado === 'programada' && filaSil.pacingMotivo === 'horas_silencio', 'fila conserva estado con motivo', `${filaSil?.estado}/${filaSil?.pacingMotivo}`)

  console.log('── 10) ventana abierta → en_cola con texto del cerebro ──')
  const pvac = await putConfig([
    { clave: 'whatsapp.pacing.silencio_desde', valor: '23' },
    { clave: 'whatsapp.pacing.silencio_hasta', valor: '23' },
  ])
  check(pvac.status === 200, 'ventana vacía: nunca silencio')
  const pOk = await postWhatsApp({ accion: 'iniciativas_vencidas' })
  const insOk = (pOk.json.instrucciones as Record<string, unknown>[]) ?? []
  check(pOk.status === 200 && insOk.length === 1 && insOk[0].estado === 'en_cola', 'iniciativa en cola para el daemon', String(insOk[0]?.estado))
  check(insOk[0]?.chatId === CHAT, 'chatId COMPLETO para el daemon firmado (necesita enviar)', String(insOk[0]?.chatId))
  const textoOk = String(insOk[0]?.texto ?? '')
  check(textoOk.length > 0, 'texto del cerebro presente (plantilla o LLM declarado)', textoOk.slice(0, 60))
  const filaOk = await db.whatsAppMensaje.findUnique({ where: { id: String(insOk[0]?.id) } })
  const modoFila = String(JSON.parse(filaOk?.meta || '{}').modo ?? '')
  check(filaOk?.estado === 'en_cola' && (filaOk?.texto ?? '').length > 0, 'fila actualizada en_cola con texto', `${filaOk?.estado}`)
  check(modoFila === 'plantilla_genoma' || modoFila.startsWith('llm_'), 'modo declarado (cerebro honesto)', modoFila)
  if (modoFila === 'plantilla_genoma') {
    check(textoOk.includes(PERSONAJE), 'plantilla del genoma usa el personaje', textoOk.slice(0, 60))
  }
  check(JSON.parse(filaOk?.meta || '{}').brief === 'recordar el estreno', 'el breve del operador vive en meta (intención, no texto final)')

  console.log('── 11) marcar_envio → enviado; panel honesto ──')
  const m1 = await postWhatsApp({ accion: 'marcar_envio', id: String(insOk[0]?.id), resultado: 'enviado' })
  check(m1.status === 200 && m1.json.estado === 'enviado', 'enviado registrado', String(m1.json.estado))
  const panel2 = await getPanel()
  const hoy2 = panel2.json.hoy as Record<string, number>
  check(hoy2.iniciativasEnviadas === 1 && hoy2.iniciativasProgramadas === 0, 'panel: 1 iniciativa enviada hoy, 0 programadas', JSON.stringify(hoy2))
  const gi1 = await getIniciativas()
  const hist = (gi1.json.historial as Record<string, unknown>[]) ?? []
  check(hist.length === 1 && hist[0].estado === 'enviado' && String(hist[0].chat).includes('•••••'), 'historial con estado y chatId MASCARADO', String(hist[0]?.chat))

  console.log('── 12) cancelar: en_cola no se des-instruye (409) ──')
  const pcEnCola = await postIniciativa({ accion: 'cancelar', id: String(insOk[0]?.id) })
  check(pcEnCola.status === 409, 'des-instruir rechazado honesto', String(pcEnCola.json.error).slice(0, 60))

  console.log('── 13) disyuntor en vivo: 3 fallos de riesgo → iniciativas frenadas, respuestas NO ──')
  for (let i = 1; i <= 3; i++) {
    const p = await postWhatsApp({ accion: 'entrante', id: `w4-risk-${i}`, chatId: CHAT, texto: `mensaje de riesgo ${i}` })
    check(p.status === 200 && p.json.estado === 'en_cola', `respuesta de riesgo ${i} en cola (el circuito aún está cerrado)`)
    const mf = await postWhatsApp({ accion: 'marcar_envio', id: String(p.json.mensajeId), resultado: 'fallado', errorRiesgo: true, detalle: 'timeout de sesión (smoke)' })
    check(mf.status === 200 && mf.json.errorRiesgo === true, `fallo de riesgo ${i} registrado`)
  }
  const pResp = await postWhatsApp({ accion: 'entrante', id: 'w4-resp-ok', chatId: CHAT, texto: 'una pregunta cualquiera' })
  check(pResp.status === 200 && pResp.json.estado === 'en_cola', 'garantía W1: las RESPUESTAS jamás las frena el circuito')
  const p2 = await postIniciativa({ accion: 'programar', chatId: CHAT, programadaEn: vencida })
  check(p2.status === 200, 'segunda iniciativa programada (vencida)')
  const pCir = await postWhatsApp({ accion: 'iniciativas_vencidas' })
  const insCir = (pCir.json.instrucciones as Record<string, unknown>[]) ?? []
  check(insCir.length === 1 && insCir[0].estado === 'sigue_programada' && String(insCir[0]?.motivo).toLowerCase().includes('circuito'), 'disyuntor EN VIVO frena la iniciativa', String(insCir[0]?.motivo).slice(0, 70))
  const filaCir = await db.whatsAppMensaje.findFirst({ where: { id: String(insCir[0]?.id) } })
  check(filaCir?.estado === 'programada' && filaCir.pacingMotivo === 'circuito_abierto', 'fila sigue programada con motivo del circuito', `${filaCir?.estado}/${filaCir?.pacingMotivo}`)

  console.log('── 14) tope de programadas pendientes por chat (1:1) + cancelar explícito ──')
  const futuro = new Date(Date.now() + 2 * 3600 * 1000).toISOString()
  for (let i = 1; i <= 3; i++) {
    const p = await postIniciativa({ accion: 'programar', chatId: CHAT2, programadaEn: futuro })
    check(p.status === 200, `programada ${i}/3 para CHAT2`)
  }
  const p4 = await postIniciativa({ accion: 'programar', chatId: CHAT2, programadaEn: futuro })
  check(p4.status === 409, '4ª programada del mismo chat → 409 (tope 3)', String(p4.json.error).slice(0, 60))
  const p2Cancel = await postIniciativa({ accion: 'cancelar', id: String((await db.whatsAppMensaje.findFirst({ where: { chatId: CHAT2, estado: 'programada' } }))?.id) })
  check(p2Cancel.status === 200 && p2Cancel.json.ok === true, 'cancelación explícita OK (borrado registrado)', String(p2Cancel.json.motivo).slice(0, 50))
  const p4b = await postIniciativa({ accion: 'programar', chatId: CHAT2, programadaEn: futuro })
  check(p4b.status === 200, 'cancelada libera el cupo honestamente')

  console.log('── 15) panel GET completo + compliance append-only ──')
  const giFinal = await getIniciativas()
  check(giFinal.status === 200 && (giFinal.json.programadas as unknown[]).length === 4, '4 programadas pendientes visibles', String((giFinal.json.programadas as unknown[]).length))
  const panelF = await getPanel()
  check((panelF.json.hoy as Record<string, number>).iniciativasProgramadas === 4, 'panel del canal cuadra', JSON.stringify(panelF.json.hoy))
  check((panelF.json.ultimos as Record<string, unknown>[]).some((u) => String(u.chat).includes('•••••')), 'chatId jamás en claro en el panel')
  const evProgramar = await db.complianceEvent.count({ where: { type: 'mensajes_whatsapp', detail: { contains: 'programar_iniciativa' } } })
  const evCancelar = await db.complianceEvent.count({ where: { type: 'mensajes_whatsapp', detail: { contains: 'cancelar_iniciativa' } } })
  const evIniciativa = await db.complianceEvent.count({ where: { type: 'mensajes_whatsapp', detail: { contains: '"accion":"iniciativa"' } } })
  check(evProgramar >= 6, 'compliance programar_iniciativa', String(evProgramar))
  check(evCancelar >= 1, 'compliance cancelar_iniciativa', String(evCancelar))
  check(evIniciativa >= 2, 'compliance accion iniciativa (poll)', String(evIniciativa))
  const jobsDespues = await db.job.count()
  const creditosDespues = (await db.settings.findUnique({ where: { id: 'main' } }))?.credits ?? 0
  check(jobsDespues === jobsAntes, 'NINGÚN job creado por el canal', `${jobsAntes}→${jobsDespues}`)
  check(creditosDespues === creditosAntes, 'NINGÚN crédito gastado', `${creditosAntes}→${creditosDespues}`)

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
  check(evsFinal >= 15, 'el LEDGER de compliance se conserva (append-only)', String(evsFinal))

  console.log(`── Resultado: ${fallas === 0 ? 'TODO OK' : `${fallas} FALLOS`} ──`)
  if (fallas > 0) process.exit(1)
}

main()
  .catch((e) => {
    console.error('SMOKE W4 ERROR:', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())

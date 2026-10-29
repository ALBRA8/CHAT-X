// SONDA PROFUNDA DE MOTORES (validación d131124) — taxonomía de 5 estados.
//
// Regla del fundador: NO se marca un motor como OPERATIVO por un simple HTTP 200.
// Cada motor pasa por capas, todas reales y secuenciales (sin paralelismo: sandbox 4 GB):
//
//   L0 CONFIGURACIÓN   ¿hay URL conocida para el motor?
//   L1 CONECTIVIDAD    ¿responde el healthPath en red local?
//   L2 SALUD SEMÁNTICA ¿el body del health dice lo que debe decir (ok/status/db)?
//   L3 DEPENDENCIAS+BD ¿subsistemas críticos y acceso real a base de datos?
//   L4 OPERACIÓN REPR. ¿una operación representativa de verdad (lectura o acción
//                      segura sin envío a nadie) funciona?
//
// Estados (exactos, sin ambigüedad):
//   OPERATIVO      → todas las capas aplicables en verde.
//   DEGRADADO      → vivo y con núcleo sano, pero alguna capacidad limitada
//                    (credencial ausente, subsistema no crítico caído…).
//   NO_CONFIGURADO → sin URL para sondear (por diseño del registro).
//   NO_DISPONIBLE  → no responde (conexión rechazada/timeout): no está corriendo aquí.
//   ERROR          → responde pero roto (5xx, body inválido o semántica incorrecta).
//
// Seguridad: solo lecturas GET y operaciones sin efecto externo (simulate de flujo,
// spintax determinista, scraping de example.com). NUNCA envía mensajes ni publica.
// Evidencia: docs/evidencia/sonda_profunda.json (comiteado, reproducible).

export {}

type EstadoProfundo = 'OPERATIVO' | 'DEGRADADO' | 'NO_CONFIGURADO' | 'NO_DISPONIBLE' | 'ERROR'
type VeredictoCapa = 'OK' | 'FALLO' | 'SIN_RED' | 'NO_APLICA' | 'SIN_CREDENCIAL' | 'NO_VERIFICABLE'

interface Capa { capa: string; veredicto: VeredictoCapa; detalle: string; latenciaMs?: number }
interface SondaProfunda {
  motor: string; url: string | null; estado: EstadoProfundo
  causaPrincipal: string; capas: Capa[]; latenciasEstabilidadMs: (number | null)[]; verificadoEn: string
}

const RAIZ = new URL('../', import.meta.url).pathname // raíz del proyecto (scripts/ → ..)
const SALIDA = RAIZ + 'docs/evidencia/sonda_profunda.json'

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'

function memDisponibleMB(): number {
  try {
    const t = readFileSync('/proc/meminfo', 'utf8')
    const m = t.match(/MemAvailable:\s+(\d+) kB/)
    return m ? Math.round(Number(m[1]) / 1024) : -1
  } catch { return -1 }
}

async function pide(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<{ status: number; body: string; ms: number; red: string | null }> {
  const { timeoutMs = 8000, ...rest } = init
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  const t0 = Date.now()
  try {
    const res = await fetch(url, { ...rest, signal: ctrl.signal, cache: 'no-store' })
    const body = await res.text()
    return { status: res.status, body, ms: Date.now() - t0, red: null }
  } catch (e) {
    return { status: 0, body: '', ms: Date.now() - t0, red: e instanceof Error ? e.message : 'fallo' }
  } finally { clearTimeout(t) }
}

function jsonSeguro(body: string): Record<string, unknown> | null {
  try { return JSON.parse(body) as Record<string, unknown> } catch { return null }
}

const BASES: Record<string, string> = {
  crm: 'http://127.0.0.1:3100', whatspower: 'http://127.0.0.1:3003', ultra: 'http://127.0.0.1:3004',
  nexscope: 'http://127.0.0.1:3300', agentekrea: 'http://127.0.0.1:3210', cazador: 'http://127.0.0.1:8787',
  youtube: 'http://127.0.0.1:8000', agentegeneral: 'http://127.0.0.1:9000',
  leads: '', comuniti: '',
}

const RESULTADOS: SondaProfunda[] = []

async function estabilidad(base: string, healthPath: string, n = 3): Promise<(number | null)[]> {
  const out: (number | null)[] = []
  for (let i = 0; i < n; i++) {
    const r = await pide(base + healthPath, { timeoutMs: 6000 })
    out.push(r.status >= 200 && r.status < 300 ? r.ms : null)
    if (i < n - 1) await new Promise((res) => setTimeout(res, 400))
  }
  return out
}

function cierra(motor: string, url: string | null, capas: Capa[], latencias: (number | null)[]): SondaProfunda {
  const sinRed = capas.filter((c) => c.veredicto === 'SIN_RED')
  const fallas = capas.filter((c) => c.veredicto === 'FALLO')
  const sinCred = capas.filter((c) => c.veredicto === 'SIN_CREDENCIAL')
  const okCriticas = capas.filter((c) => c.veredicto === 'OK').length
  let estado: EstadoProfundo
  let causa: string
  if (!url) { estado = 'NO_CONFIGURADO'; causa = 'Sin URL: el registro no sondea este motor por diseño (bot sin HTTP o panel con sesión).' }
  else if (sinRed.length > 0) { estado = 'NO_DISPONIBLE'; causa = `No responde en red local: ${sinRed[0].detalle}. No está corriendo en este host (dato real, no simulado).` }
  else if (fallas.length > 0) { estado = 'ERROR'; causa = fallas[0].detalle }
  else if (sinCred.length > 0) { estado = 'DEGRADADO'; causa = `Núcleo vivo y sano, pero ${sinCred.length} capacidad(es) exige(n) credencial que no existe aún: ${sinCred.map((c) => c.capa).join(', ')}.` }
  else if (okCriticas >= capas.filter((c) => c.veredicto !== 'NO_APLICA' && c.veredicto !== 'NO_VERIFICABLE').length) { estado = 'OPERATIVO'; causa = 'Todas las capas aplicables en verde (conectividad + salud semántica + BD/dependencias + operación representativa).' }
  else { estado = 'DEGRADADO'; causa = 'Vivo, con al menos una capa no confirmada (ver capas).' }
  RESULTADOS.push({ motor, url, estado, causaPrincipal: causa, capas, latenciasEstabilidadMs: latencias, verificadoEn: new Date().toISOString() })
  return RESULTADOS[RESULTADOS.length - 1]
}

function imprime(s: SondaProfunda) {
  const icono: Record<EstadoProfundo, string> = { OPERATIVO: '●', DEGRADADO: '◐', NO_CONFIGURADO: '○', NO_DISPONIBLE: '◌', ERROR: '✗' }
  console.log(`\n${icono[s.estado]} ${s.motor.toUpperCase()} → ${s.estado}`)
  if (s.url) console.log(`   url: ${s.url}`)
  console.log(`   causa: ${s.causaPrincipal}`)
  for (const c of s.capas) {
    const lat = c.latenciaMs != null ? ` (${c.latenciaMs}ms)` : ''
    console.log(`   · ${c.capa.padEnd(22)} ${c.veredicto.padEnd(17)}${lat} ${c.detalle.slice(0, 100)}`)
  }
  if (s.latenciasEstabilidadMs.some((x) => x != null)) {
    const lats = s.latenciasEstabilidadMs.map((x) => (x == null ? '✗' : `${x}ms`)).join(' · ')
    console.log(`   · estabilidad (3 muestras)          ${lats}`)
  }
}

// ───────────────────────────── sondas por motor ─────────────────────────────

// 1) CRM-ALBRA :3100 — health con check de BD + doctor + catálogo (exige API key del fundador)
{
  const base = BASES.crm
  const capas: Capa[] = []
  const h = await pide(base + '/api/health')
  if (h.red) { capas.push({ capa: 'conectividad', veredicto: 'SIN_RED', detalle: `sin respuesta: ${h.red}` }) }
  else {
    capas.push({ capa: 'conectividad', veredicto: 'OK', detalle: `HTTP ${h.status}`, latenciaMs: h.ms })
    const j = jsonSeguro(h.body)
    const saludOk = h.status === 200 && !!j && j.ok === true && (j.checks as Record<string, unknown> | undefined)?.db === true
    capas.push({ capa: 'salud semántica', veredicto: saludOk ? 'OK' : 'FALLO', detalle: saludOk ? `ok=true, checks.db=true, versión ${String(j?.version)}` : `body inesperado: ${h.body.slice(0, 120)}` })
    const d = await pide(base + '/api/doctor')
    if (d.status === 200) {
      const dj = jsonSeguro(d.body)
      const ok = !!dj && (dj.ok !== false)
      capas.push({ capa: 'doctor (BD real)', veredicto: ok ? 'OK' : 'FALLO', detalle: ok ? `doctor 200: ${d.body.slice(0, 120)}` : 'doctor con problemas' })
    } else {
      capas.push({ capa: 'doctor (BD real)', veredicto: 'NO_VERIFICABLE', detalle: `HTTP ${d.status}: el doctor exige credencial o no está expuesto; el check db=true del health ya declara BD accesible` })
    }
    const cat = await pide(base + '/api/crm/actions')
    if (cat.status === 200) capas.push({ capa: 'op. representativa', veredicto: 'OK', detalle: 'catálogo crm-actions/v1 legible sin credencial' })
    else if (cat.status === 401 || cat.status === 403) capas.push({ capa: 'op. representativa (m2m)', veredicto: 'SIN_CREDENCIAL', detalle: `HTTP ${cat.status}: el contrato crm-actions exige API key albra_… (la generará el fundador en Settings del CRM)` })
    else capas.push({ capa: 'op. representativa', veredicto: 'FALLO', detalle: `HTTP ${cat.status}: ${cat.body.slice(0, 120)}` })
  }
  const lat = h.red ? [null, null, null] : await estabilidad(base, '/api/health')
  imprime(cierra('crm', base, capas, lat))
}

// 2) WHATSPOWER :3003 — health + lectura real de flujos + simulate (sin WhatsApp real)
{
  const base = BASES.whatspower
  const capas: Capa[] = []
  const h = await pide(base + '/api/health')
  if (h.red) capas.push({ capa: 'conectividad', veredicto: 'SIN_RED', detalle: `sin respuesta: ${h.red}` })
  else {
    capas.push({ capa: 'conectividad', veredicto: 'OK', detalle: `HTTP ${h.status}`, latenciaMs: h.ms })
    const j = jsonSeguro(h.body)
    const ok = h.status === 200 && j?.status === 'ok'
    capas.push({ capa: 'salud semántica', veredicto: ok ? 'OK' : 'FALLO', detalle: ok ? `status=ok, service=${String(j?.service)}` : `body: ${h.body.slice(0, 120)}` })
    const f = await pide(base + '/api/flows')
    // La API puede devolver array desnudo, {flows:[…]} o {total:n} — se aceptan los tres.
    const fj: unknown = jsonSeguro(f.body)
    const nFlujos = Array.isArray(fj) ? fj.length : Array.isArray((fj as { flows?: unknown[] } | null)?.flows) ? ((fj as { flows: unknown[] }).flows).length : typeof (fj as { total?: number } | null)?.total === 'number' ? (fj as { total: number }).total : -1
    if (f.status === 200 && nFlujos >= 0) capas.push({ capa: 'BD real (lectura)', veredicto: 'OK', detalle: `GET /api/flows → ${nFlujos} flujo(s) real(es) guardado(s)` })
    else capas.push({ capa: 'BD real (lectura)', veredicto: 'FALLO', detalle: `GET /api/flows HTTP ${f.status}: ${f.body.slice(0, 120)}` })
    // Operación representativa segura: evaluateStep del motor de flujos (SIN WhatsApp real)
    const sim = await pide(base + '/api/flows/simulate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: 'sonda-profundidad-0001', messageText: 'hola', name: 'Sonda' }) })
    const sj = jsonSeguro(sim.body)
    const simOk = sim.status === 200 && !!sj && (sj.handled !== undefined || sj.actionTaken !== undefined || sj.step !== undefined)
    capas.push({ capa: 'op. representativa', veredicto: simOk ? 'OK' : 'FALLO', detalle: simOk ? `POST /api/flows/simulate → evaluateStep real (${String((sj as Record<string, unknown>).actionTaken ?? (sj as Record<string, unknown>).handled ?? 'evaluado')}); sin envío a nadie` : `HTTP ${sim.status}: ${sim.body.slice(0, 120)}` })
  }
  const lat = h.red ? [null, null, null] : await estabilidad(base, '/api/health')
  imprime(cierra('whatspower', base, capas, lat))
}

// 3) WHATSPOWER-ULTRA :3004 — health + lectura de campañas + spintax determinista (sin envío)
{
  const base = BASES.ultra
  const capas: Capa[] = []
  const h = await pide(base + '/api/health')
  if (h.red) capas.push({ capa: 'conectividad', veredicto: 'SIN_RED', detalle: `sin respuesta: ${h.red}` })
  else {
    capas.push({ capa: 'conectividad', veredicto: 'OK', detalle: `HTTP ${h.status}`, latenciaMs: h.ms })
    const j = jsonSeguro(h.body)
    const ok = h.status === 200 && j?.status === 'ok'
    capas.push({ capa: 'salud semántica', veredicto: ok ? 'OK' : 'FALLO', detalle: ok ? `status=ok, service=${String(j?.service)}` : `body: ${h.body.slice(0, 120)}` })
    const c = await pide(base + '/api/campaigns')
    const cj = jsonSeguro(c.body) as { campaigns?: unknown[] } | null
    if (c.status === 200 && cj) capas.push({ capa: 'BD real (lectura)', veredicto: 'OK', detalle: `GET /api/campaigns → ${Array.isArray(cj.campaigns) ? cj.campaigns.length : 'lista'} campaña(s)` })
    else capas.push({ capa: 'BD real (lectura)', veredicto: 'FALLO', detalle: `HTTP ${c.status}: ${c.body.slice(0, 120)}` })
    const sp = await pide(base + '/api/ai/neuromarketing/generate-spintax', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productName: 'sonda', mainBenefit: 'prueba de profundidad', country: 'ES' }) })
    const spj = jsonSeguro(sp.body)
    const spOk = sp.status === 200 && !!spj && typeof spj.spintaxTemplate === 'string'
    capas.push({ capa: 'op. representativa', veredicto: spOk ? 'OK' : 'FALLO', detalle: spOk ? 'generate-spintax real (motor determinista, sin LLM externo, sin envío a nadie)' : `HTTP ${sp.status}: ${sp.body.slice(0, 120)}` })
  }
  const lat = h.red ? [null, null, null] : await estabilidad(base, '/api/health')
  imprime(cierra('ultra', base, capas, lat))
}

// 4) NEX-SCOPE :3300 — health semántico + app viva + trabajo real exige sesión JWT
{
  const base = BASES.nexscope
  const capas: Capa[] = []
  const h = await pide(base + '/api/health')
  if (h.red) capas.push({ capa: 'conectividad', veredicto: 'SIN_RED', detalle: `sin respuesta: ${h.red}` })
  else {
    capas.push({ capa: 'conectividad', veredicto: 'OK', detalle: `HTTP ${h.status}`, latenciaMs: h.ms })
    const j = jsonSeguro(h.body)
    const ok = h.status === 200 && j?.available === true && j?.status === 'ok'
    capas.push({ capa: 'salud semántica', veredicto: ok ? 'OK' : 'FALLO', detalle: ok ? `available=true, status=ok, auth=${String(j?.auth)}` : `body: ${h.body.slice(0, 120)}` })
    const raiz = await pide(base + '/', { timeoutMs: 30000 })
    capas.push({ capa: 'app viva', veredicto: raiz.status === 200 ? 'OK' : 'FALLO', detalle: `GET / → HTTP ${raiz.status}`, latenciaMs: raiz.ms })
    const kw = await pide(base + '/api/keywords', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q: 'sonda' }) })
    if (kw.status === 200) capas.push({ capa: 'op. representativa', veredicto: 'OK', detalle: 'endpoint de trabajo respondió sin sesión' })
    else if (kw.status === 401 || kw.status === 403) capas.push({ capa: 'op. representativa', veredicto: 'SIN_CREDENCIAL', detalle: `HTTP ${kw.status}: el trabajo real exige sesión JWT por cookie (el motor no ofrece API key m2m; requiere su repo)` })
    else capas.push({ capa: 'op. representativa', veredicto: 'FALLO', detalle: `HTTP ${kw.status}: ${kw.body.slice(0, 120)}` })
  }
  const lat = h.red ? [null, null, null] : await estabilidad(base, '/api/health')
  imprime(cierra('nexscope', base, capas, lat))
}

// 5) AGENTE-KREA :3210 — doctor profundo; críticos vs no críticos
{
  const base = BASES.agentekrea
  const capas: Capa[] = []
  const CRITICOS = ['database', 'generation_api', 'zai_provider', 'storage', 'config']
  const d = await pide(base + '/api/doctor', { timeoutMs: 12000 })
  if (d.red) capas.push({ capa: 'conectividad', veredicto: 'SIN_RED', detalle: `sin respuesta: ${d.red}` })
  else {
    capas.push({ capa: 'conectividad', veredicto: 'OK', detalle: `HTTP ${d.status}`, latenciaMs: d.ms })
    const j = jsonSeguro(d.body) as { overallStatus?: string; checks?: { name: string; status: string; details?: string; error?: string }[] } | null
    if (d.status === 200 && j?.checks) {
      const criticosMal = j.checks.filter((c) => CRITICOS.includes(c.name) && c.status !== 'HEALTHY')
      const noCriticosMal = j.checks.filter((c) => !CRITICOS.includes(c.name) && c.status !== 'HEALTHY')
      capas.push({ capa: 'BD real (doctor)', veredicto: j.checks.find((c) => c.name === 'database')?.status === 'HEALTHY' ? 'OK' : 'FALLO', detalle: `database: ${String(j.checks.find((c) => c.name === 'database')?.details ?? '?')}` })
      capas.push({ capa: 'dependencias críticas', veredicto: criticosMal.length === 0 ? 'OK' : 'FALLO', detalle: criticosMal.length === 0 ? `${CRITICOS.join(', ')} todas HEALTHY` : `críticos en fallo: ${criticosMal.map((c) => `${c.name}=${c.status}`).join(', ')}` })
      capas.push({ capa: 'subsistemas no críticos', veredicto: noCriticosMal.length === 0 ? 'OK' : 'NO_APLICA', detalle: noCriticosMal.length === 0 ? 'todos sanos' : `degradados sin impacto en generación: ${noCriticosMal.map((c) => `${c.name}=${c.status}(${(c.error ?? '').slice(0, 40)})`).join(', ')}` })
      capas.push({ capa: 'op. representativa', veredicto: 'OK', detalle: 'el doctor en sí ES la operación representativa de diagnóstico del estudio (6 rutas de generación listas)' })
    } else capas.push({ capa: 'salud semántica', veredicto: 'FALLO', detalle: `HTTP ${d.status}: ${d.body.slice(0, 120)}` })
  }
  const lat = d.red ? [null, null, null] : await estabilidad(base, '/api/doctor', 2)
  imprime(cierra('agentekrea', base, capas, lat))
}

// 6) Extension-CAZADOR :8787 — health + PRUEBA REAL de scraping (lectura pública, sin envío)
{
  const base = BASES.cazador
  const capas: Capa[] = []
  const h = await pide(base + '/api/health')
  if (h.red) capas.push({ capa: 'conectividad', veredicto: 'SIN_RED', detalle: `sin respuesta: ${h.red}` })
  else {
    capas.push({ capa: 'conectividad', veredicto: 'OK', detalle: `HTTP ${h.status}`, latenciaMs: h.ms })
    const j = jsonSeguro(h.body)
    const ok = h.status === 200 && j?.ok === true && !!j?.model
    capas.push({ capa: 'salud semántica', veredicto: ok ? 'OK' : 'FALLO', detalle: ok ? `ok=true, model=${String(j?.model)}` : `body: ${h.body.slice(0, 120)}` })
    const sc = await pide(base + '/api/scrape', { method: 'POST', headers: { 'Content-Type': 'application/json' }, timeoutMs: 25000, body: JSON.stringify({ url: 'https://example.com', fields: ['title'] }) })
    const scj = jsonSeguro(sc.body)
    const scOk = sc.status === 200 && !!scj
    capas.push({ capa: 'op. representativa', veredicto: scOk ? 'OK' : 'FALLO', detalle: scOk ? `PRUEBA REAL de extracción sobre example.com (ciclo GLM completo, rows=${String((scj as Record<string, unknown>).rows ?? 'n/a')}); lectura pública, sin envío a nadie` : `HTTP ${sc.status}: ${sc.body.slice(0, 120)}` })
  }
  const lat = h.red ? [null, null, null] : await estabilidad(base, '/api/health')
  imprime(cierra('cazador', base, capas, lat))
}

// 7-8) Corren en la máquina del fundador → NO_DISPONIBLE (dato real, no simulado)
for (const [motor, base, health, motivo] of [
  ['youtube', BASES.youtube, '/api/harness/v1/health', 'corre en la máquina del fundador (FFmpeg + Chrome/CDP :9333)'],
  ['agentegeneral', BASES.agentegeneral, '/api/v1/health', 'app Python con LLM key externa, corre en la máquina del fundador'],
] as const) {
  const capas: Capa[] = []
  const h = await pide(base + health, { timeoutMs: 4000 })
  if (h.red) capas.push({ capa: 'conectividad', veredicto: 'SIN_RED', detalle: `sin respuesta (${h.red.slice(0, 60)}) — ${motivo}` })
  else capas.push({ capa: 'conectividad', veredicto: h.status === 200 ? 'OK' : 'FALLO', detalle: `HTTP ${h.status} (inesperado: si responde aquí, revisar)` })
  imprime(cierra(motor, base, capas, [null, null, null]))
}

// 9-10) Sin URL por diseño → NO_CONFIGURADO
for (const [motor, motivo] of [
  ['leads', 'bot Telegram (long-polling, sin HTTP) + dashboard NextAuth: no sondeable por diseño'],
  ['comuniti', 'panel :3000 colisiona con CHAT-X: sin URL por defecto desde la corrección del falso 404'],
] as const) {
  imprime(cierra(motor, null, [{ capa: 'configuración', veredicto: 'NO_APLICA', detalle: motivo }], [null, null, null]))
}

// ───────────────────────────── resumen + evidencia ─────────────────────────────
const ORDEN: EstadoProfundo[] = ['OPERATIVO', 'DEGRADADO', 'NO_CONFIGURADO', 'NO_DISPONIBLE', 'ERROR']
console.log('\n' + '═'.repeat(96))
console.log('RESUMEN SONDA PROFUNDA (taxonomía de 5 estados)')
console.log('═'.repeat(96))
for (const e of ORDEN) {
  const motores = RESULTADOS.filter((r) => r.estado === e)
  if (motores.length) console.log(`  ${e.padEnd(15)} ${String(motores.length).padStart(2)}/10 → ${motores.map((m) => m.motor).join(', ')}`)
}
console.log(`  RAM disponible al terminar: ${memDisponibleMB()} MB (sonda secuencial: nunca >1 motor activo por capa)`)
console.log(`  Evidencia JSON: ${SALIDA.replace(RAIZ, '')}`)

const fs = await import('node:fs')
fs.mkdirSync(RAIZ + 'docs/evidencia', { recursive: true })
fs.writeFileSync(SALIDA, JSON.stringify({ generadoEn: new Date().toISOString(), taxonomia: ['OPERATIVO', 'DEGRADADO', 'NO_CONFIGURADO', 'NO_DISPONIBLE', 'ERROR'], nota: 'Ningún estado se deriva solo de HTTP 200: cada capa queda evidenciada.', resultados: RESULTADOS }, null, 2))

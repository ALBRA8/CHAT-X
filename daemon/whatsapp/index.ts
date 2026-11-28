// F1 · W5 — DAEMON REAL del canal WhatsApp PROPIO del negocio (CASA PROPIA).
// ESTE PROCESO CORRE EN LA MÁQUINA DEL FUNDADOR — jamás en el sandbox ni en CI:
// aquí no hay sesión real de WhatsApp y NO se finge. Es el ÚNICO componente del
// bucle que toca la red de WhatsApp (librería open-source, $0 — regla permanente).
//
// Responsabilidades (el resto lo decide CHAT-X):
//   - Sesión: emparejar el número con QR propio y registrarla en casa
//     (iniciar_espera_qr + confirmar_conexion — cada conexión pasa por espera
//     fresca, higiene del número; credenciales persistidas en AUTH_DIR).
//   - Entrada: mensaje entrante → webhook FIRMADO 'entrante' → obedece la
//     instrucción del cerebro (jamás improvisa texto propio).
//   - Salida: envío con retardo + jitter (W1), resultado VERDADERO reportado
//     con 'marcar_envio' (los fallos CON señal de riesgo alimentan el disyuntor).
//   - Iniciativas: poll firmado 'iniciativas_vencidas' → goteo (máx 5/poll).
// Fail-closed desde el arranque: sin WHATSAPP_WEBHOOK_SECRETO (≥24 chars, el
// MISMO secreto que guarda el panel de CHAT-X) este proceso NO ARRANCA.
//
// Uso (máquina del fundador):
//   cd daemon/whatsapp && bun install && CHATX_URL=http://127.0.0.1:3000 \
//     WHATSAPP_WEBHOOK_SECRETO=<el-mismo-del-panel> bun index.ts
// Procedimiento completo de activación: CONTEXTO X/02_PROCESSES/WHATSAPP_QR_ACTIVACION.md §0.
import crypto from 'crypto'
import { PULSO_VIVO_MS } from '../../src/lib/canales'
import { normalizarNumero } from '../../src/lib/whatsapp/sesion'
import { retardoConJitter, PACING_DEFECTO } from '../../src/lib/whatsapp/pacing'
import {
  RETARDO_BASE_MS,
  PROPORCION_JITTER,
  SECRETO_MIN,
  clasificarErrorRiesgo,
  huellaCredenciales,
  planArranque,
  planReintento,
  parsearInstruccion,
  payloadEntrante,
  payloadMarca,
  payloadPoll,
  firmarCuerpo,
} from '../../src/lib/whatsapp/daemon'

// ── Configuración por entorno (sin panel aquí: el panel es de CHAT-X) ─────
const CHATX_URL = (process.env.CHATX_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const SECRETO = process.env.WHATSAPP_WEBHOOK_SECRETO || ''
const AUTH_DIR = process.env.DAEMON_AUTH_DIR || './.wa-auth'
const POLL_MS = Math.max(5000, Number(process.env.DAEMON_POLL_MS) || 20_000)
const RETARDO_ENVIO = Math.max(300, Number(process.env.DAEMON_RETARDO_MS) || RETARDO_BASE_MS)

function fail(msg: string): never {
  console.error(`✗ FALLO DE ARRANQUE: ${msg}`)
  process.exit(1)
}

// Fail-closed: sin credencial verificable el daemon no existe (lección de la sala).
if (SECRETO.length < SECRETO_MIN) {
  fail(`WHATSAPP_WEBHOOK_SECRETO ausente o demasiado corto (mín ${SECRETO_MIN}). Es el MISMO secreto del panel de CHAT-X (whatsapp.webhook_secreto).`)
}

// Librería open-source ($0): import dinámico por nombre variable — sin la
// dependencia instalada el daemon declara honestamente lo que falta y para.
const LIB = process.env.DAEMON_LIB ?? 'baileys'

// ── Cliente del webhook firmado (la casa verifica HMAC-SHA256 anti-replay) ─
interface RespuestaWebhook {
  status: number
  json: Record<string, unknown>
  redOk: boolean
}

async function llamarWebhook(cuerpo: string, intentosConsumidos = 0): Promise<RespuestaWebhook> {
  const ts = Date.now()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-chatx-ts': String(ts),
    'x-chatx-firma': firmarCuerpo(ts, cuerpo, SECRETO),
  }
  try {
    const r = await fetch(`${CHATX_URL}/api/whatsapp/conversacion`, { method: 'POST', headers, body: cuerpo })
    const json = (await r.json().catch(() => ({}))) as Record<string, unknown>
    return { status: r.status, json, redOk: true }
  } catch (e) {
    const detalle = e instanceof Error ? e.message : String(e)
    console.warn(`⚠ webhook inalcanzable (${detalle})`)
    const plan = planReintento(intentosConsumidos, Math.random)
    if (!plan.reintentar) return { status: 0, json: {}, redOk: false }
    console.warn(`  ${plan.detalle}`)
    await new Promise((res) => setTimeout(res, plan.esperaMs))
    return llamarWebhook(cuerpo, intentosConsumidos + 1)
  }
}

async function sesionAPI(accion: string, extra: Record<string, unknown> = {}): Promise<{ status: number; json: Record<string, unknown> }> {
  const r = await fetch(`${CHATX_URL}/api/whatsapp/sesion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accion, ...extra }),
  })
  const json = (await r.json().catch(() => ({}))) as Record<string, unknown>
  return { status: r.status, json }
}

// ── Envío real con retardo + jitter (W1) y reporte VERDADERO ──────────────
type Sock = { sendMessage(jid: string, contenido: Record<string, unknown>): Promise<{ key: { id?: string } }> }

async function enviarConJitter(sock: Sock, chatId: string, texto: string): Promise<{ ok: boolean; detalle: string }> {
  const espera = retardoConJitter(RETARDO_ENVIO, PROPORCION_JITTER, Math.random)
  if (espera > 0) await new Promise((res) => setTimeout(res, espera))
  try {
    await sock.sendMessage(chatId, { text: texto })
    return { ok: true, detalle: 'enviado por el daemon real' }
  } catch (e) {
    const detalle = e instanceof Error ? e.message : String(e)
    return { ok: false, detalle: detalle.slice(0, 300) }
  }
}

/** Ejecuta una instrucción del cerebro: envía, reporta y reintenta con tope. */
async function ejecutarInstruccion(sock: Sock, chatId: string, texto: string, mensajeId: string | null): Promise<void> {
  if (!mensajeId) {
    console.warn('⚠ instrucción sin mensajeId: CHAT-X jamás la abrió en su BD — nada se envía (honesto).')
    return
  }
  let intentos = 0
  for (;;) {
    const r = await enviarConJitter(sock, chatId, texto)
    if (r.ok) {
      const m = await llamarWebhook(payloadMarca(mensajeId, 'enviado', false, r.detalle))
      console.log(`→ enviado a ${chatId.slice(0, 8)}… (fila ${mensajeId.slice(-6)}, marcar ${m.status})`)
      return
    }
    const riesgo = clasificarErrorRiesgo(r.detalle)
    const plan = planReintento(intentos, Math.random)
    if (!plan.reintentar) {
      await llamarWebhook(payloadMarca(mensajeId, 'fallado', riesgo, r.detalle))
      console.warn(`✗ fallo FINAL para ${mensajeId.slice(-6)} (riesgo=${riesgo}): ${r.detalle}`)
      return
    }
    console.warn(`⚠ intento ${intentos + 1} falló (riesgo=${riesgo}): ${plan.detalle}`)
    await new Promise((res) => setTimeout(res, plan.esperaMs))
    intentos++
  }
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('── Daemon F1 REAL (canal WhatsApp PROPIO) ──')
  console.log(`   CHAT-X: ${CHATX_URL} · sesión local: ${AUTH_DIR} · poll: ${POLL_MS / 1000}s`)

  // 0) Plan de arranque según el estado HONESTO de la casa.
  const g = await fetch(`${CHATX_URL}/api/whatsapp/sesion`)
    .then((r) => r.json().catch(() => ({})) as Promise<Record<string, unknown>>)
    .then((j) => ({ ok: true, json: j }))
    .catch(() => ({ ok: false, json: {} as Record<string, unknown> }))
  const arranque = planArranque(
    (g.json.estado as string) ?? null,
    Boolean(g.json.secretoPresente),
    null, // la huella local se conoce tras emparejar; aquí solo decide el flujo general
    (g.json.huellaCHATX as string) ?? null,
    g.ok,
  )
  console.log(`   plan de arranque: ${arranque.plan} — ${arranque.detalle}`)

  // Librería: import dinámico honesto (sin paquete instalado, no se finge nada).
  let mod: Record<string, unknown>
  try {
    mod = (await import(LIB)) as Record<string, unknown>
  } catch {
    fail(`La librería "${LIB}" no está instalada. En la máquina del fundador: cd daemon/whatsapp && bun install (librería open-source, $0).`)
  }
  // Autenticación MULTI-FILE (baileys 6.7.24 fijado en package.json — la línea
  // 6.x estable; la 7.x sigue en release candidate y no se mete en producción
  // sin un ciclo real de QR que la valide): useMultiFileAuthState persiste
  // las credenciales EN DISCO PROPIO (AUTH_DIR) y devuelve { state, saveCreds }.
  // useSingleFileAuthState NO existe en baileys 6.7.x (bug S-017 F0.1: el
  // arranque real moría en el import). La superficie la verifica el test
  // test/unit/baileys-lib.test.ts contra la librería REAL instalada.
  const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = mod as {
    default: (...args: unknown[]) => Sock
    useMultiFileAuthState: (dir: string) => Promise<{ state: Record<string, unknown>; saveCreds: () => Promise<void> }>
    DisconnectReason: Record<string, unknown>
    fetchLatestBaileysVersion?: () => Promise<{ version: number[] }>
  }
  let qrTerminal: ((qr: string) => void) | null = null
  try {
    // visual del QR en terminal (respaldo, mismo espíritu que la sala) — import
    // dinámico por variable para que tsc del repo no exija la dependencia.
    const MODULO_QR = process.env.DAEMON_LIB_QR ?? 'qrcode-terminal'
    const qt = (await import(MODULO_QR)) as { default?: { generate: (qr: string) => void }; generate?: (qr: string) => void }
    qrTerminal = (qt.default?.generate ?? qt.generate ?? null) as (qr: string) => void
  } catch {
    console.warn('⚠ qrcode-terminal no instalado: el QR solo viaja por el evento (sin respaldo en terminal).')
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
  const version = fetchLatestBaileysVersion ? await fetchLatestBaileysVersion().catch(() => ({ version: undefined as unknown as number[] })) : { version: undefined }

  const sock = makeWASocket({
    auth: state,
    ...(version.version ? { version } : {}),
    printQRInTerminal: false, // el QR lo pintamos nosotros (con o sin respaldo)
    syncFullHistory: false,
  } as Record<string, unknown>) as Sock

  let confirmado = false
  let pollActivo = false

  const confirmarSesion = async (numeroE164: string) => {
    if (confirmado) return
    // Cada conexión pasa por espera FRESH en la casa (higiene del número).
    const ini = await sesionAPI('iniciar_espera_qr')
    if (ini.status !== 200) {
      console.warn(`⚠ iniciar_espera_qr → ${ini.status}: ${(ini.json.error as string) ?? ''}. Si CHAT-X está CONECTADA con el mismo número, usa rotar desde el panel para re-emparejar.`)
      return
    }
    // IDENTIFICADOR de credenciales, no el secreto utilizable: las credenciales
    // reales viven SOLO en AUTH_DIR (disco del daemon, permisos del dueño).
    // La casa recibe la huella canónica (wa-cred-v1:<sha256>) y la custodia
    // cifrada para detectar drift de re-emparejamiento (F0.1).
    const secretoSesion = huellaCredenciales(state)
    const conf = await sesionAPI('confirmar_conexion', { numero: numeroE164, secretoSesion })
    if (conf.status === 200) {
      confirmado = true
      pollActivo = true
      console.log(`✓ sesión registrada en casa: ${String(conf.json.estado)} — número ${String(conf.json.numeroMascarado)}`)
    } else {
      console.warn(`⚠ confirmar_conexion → ${conf.status}: ${(conf.json.error as string) ?? ''} (sin registro HONESTO el canal no conversa).`)
    }
  }

  // 1) Eventos de la librería: conexión/QR/credenciales.
  const interfaz = sock as unknown as {
    ev: { on(evento: string, handler: (u: unknown) => void): void }
    user?: { id?: string }
  }
  interfaz.ev.on('connection.update', (u: unknown) => {
    const up = u as { connection?: string; qr?: string; lastDisconnect?: { error?: { output?: { statusCode?: number } } } }
    if (up.qr) {
      console.log('□ QR de emparejamiento: escanéalo AHORA (vence en ~1 minuto, es de un solo uso).')
      qrTerminal?.(up.qr)
      void sesionAPI('iniciar_espera_qr').then(() => console.log('   espera fresca registrada en CHAT-X (confirmar en <1 min).'))
    }
    if (up.connection === 'open') {
      const jid = interfaz.user?.id ?? ''
      const crudo = jid.split(':')[0].split('@')[0]
      const num = normalizarNumero(crudo)
      if (!num.ok) {
        console.warn(`⚠ no se pudo normalizar el número emparejado (${crudo}): registra la sesión a mano desde el panel.`)
        return
      }
      console.log(`✓ WhatsApp emparejado: ${num.e164.replace(/\d(?=\d{4})/g, '•')}`)
      void confirmarSesion(num.e164)
    }
    if (up.connection === 'close') {
      const codigo = up.lastDisconnect?.error?.output?.statusCode
      const recarga = codigo === DisconnectReason?.loggedOut ? false : true
      console.warn(`⚠ conexión cerrada (código ${String(codigo)}): ${recarga ? 'reconectando…' : 'logout real — las credenciales locales ya no valen; rotar en el panel.'}`)
      if (!recarga) process.exit(1)
      // reconexión simple: reiniciar el proceso es el camino honesto (baileys re-emite QR)
      setTimeout(() => process.exit(2), 1500)
    }
  })
  interfaz.ev.on('creds.update', () => {
    void saveCreds().catch((e: unknown) => {
      const detalle = e instanceof Error ? e.message : String(e)
      console.warn(`⚠ credenciales no persistidas en ${AUTH_DIR}: ${detalle} (si el proceso muere antes de persistir, re-empareja con QR)`)
    })
  })

  // 2) Mensajes entrantes → webhook firmado → obediencia al cerebro.
  interfaz.ev.on('messages.upsert', async (u: unknown) => {
    const up = u as { type?: string; messages?: { key?: { id?: string; remoteJid?: string; fromMe?: boolean }; pushName?: string; message?: { conversation?: string; extendedTextMessage?: { text?: string } } }[] }
    if (up.type !== 'notify' || !up.messages) return
    for (const m of up.messages) {
      const chatId = m.key?.remoteJid ?? ''
      const texto = m.message?.conversation ?? m.message?.extendedTextMessage?.text ?? ''
      const idEntrada = m.key?.id ?? crypto.randomUUID()
      if (!chatId || m.key?.fromMe || !texto.trim()) continue // solo texto entrante real
      const resp = await llamarWebhook(payloadEntrante(idEntrada, chatId, texto, new Date().toISOString()))
      const instruccion = parsearInstruccion(resp.status, resp.json)
      if (instruccion.accion === 'enviar' && instruccion.texto) {
        await ejecutarInstruccion(sock, chatId, instruccion.texto, instruccion.mensajeId)
      } else {
        console.log(`· ${chatId.slice(0, 8)}… → sin envío (${instruccion.estado ?? resp.status}): ${instruccion.motivo ?? ''}`)
      }
    }
  })

  // 3) Poll de iniciativas vencidas (goteo: máx 5/poll lo pone la casa).
  setInterval(async () => {
    if (!pollActivo) return
    const resp = await llamarWebhook(payloadPoll())
    if (resp.status !== 200) {
      console.warn(`⚠ poll → HTTP ${resp.status}: ${(resp.json.error as string) ?? 'sin detalle'}`)
      return
    }
    const instrucciones = (resp.json.instrucciones as Record<string, unknown>[]) ?? []
    for (const ins of instrucciones) {
      if (ins.estado !== 'en_cola') {
        console.log(`· iniciativa ${String(ins.id).slice(-6)} sigue ${String(ins.estado)}: ${String(ins.motivo ?? '')}`)
        continue
      }
      const chatId = String(ins.chatId ?? '')
      const texto = String(ins.texto ?? '')
      if (!chatId || !texto) continue
      await ejecutarInstruccion(sock, chatId, texto, String(ins.id ?? ''))
    }
    if (instrucciones.length) console.log(`· poll procesó ${instrucciones.length} instrucciones`)
  }, POLL_MS)

  // 4) Pulso vivo: heartbeat firmado para que el panel sepa que el daemon respira.
  setInterval(async () => {
    if (!pollActivo) return
    const ts = Date.now()
    const cuerpo = JSON.stringify({ accion: 'pulso' })
    try {
      await fetch(`${CHATX_URL}/api/whatsapp/conversacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-chatx-ts': String(ts), 'x-chatx-firma': firmarCuerpo(ts, cuerpo, SECRETO) },
        body: cuerpo,
      })
    } catch {
      console.warn('⚠ pulso no entregado (CHAT-X inalcanzable esta vez)')
    }
  }, Math.max(60000, Math.min(PULSO_VIVO_MS / 2, 300000)))

  console.log('Daemon vivo: entrantes → cerebro · salidas con jitter · poll de iniciativas · pulso. Ctrl+C para bajar.')
  // PACING_DEFECTO se importa como referencia del contrato (los topes reales
  // los aplica CHAT-X en caliente); el daemon solo obedece y respeta el jitter.
  void PACING_DEFECTO
}

main().catch((e) => {
  console.error('✗ daemon terminó con error:', e)
  process.exit(1)
})

// F0.1 (S-017) — verificación de la LIBRERÍA REAL del daemon, sin conectarse
// a WhatsApp. El bug que cierra este commit: el runner usaba
// useSingleFileAuthState, que NO existe en baileys 6.7.x (typeof 'undefined')
// — el arranque real moría al desestructurar el import. Este test carga la
// librería INSTALADA en daemon/whatsapp (la MISMA dependencia que corre en la
// máquina del fundador, resuelta por createRequire desde su package.json) y
// afirma la superficie de autenticación que el runner consume:
//   - useSingleFileAuthState NO existe (regresión del bug real)
//   - useMultiFileAuthState existe y devuelve { state, saveCreds } (llamada
//     real offline contra un AUTH_DIR temporal — cero sockets, cero red)
//   - default (makeWASocket) y DisconnectReason.loggedOut existen
//   - huellaCredenciales produce identificadores que pasan el contrato de la
//     casa (validarConfirmacion) y son deterministas ante Buffers y orden de
//     claves — el caso que rompía JSON.stringify plano.
// Si la librería no está instalada en este entorno, el bloque se salta DE
// MANERA HONESTA (skip declarado, jamás un verde fingido).
import { describe, test, expect } from 'bun:test'
import { createRequire } from 'module'
import { join } from 'path'
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { huellaCredenciales, HUELLA_CRED_PREFIJO } from '@/lib/whatsapp/daemon'
import { validarConfirmacion } from '@/lib/whatsapp/sesion'

interface BaileysReal {
  default: unknown
  useMultiFileAuthState?: (dir: string) => Promise<{ state: Record<string, unknown>; saveCreds: () => Promise<void> }>
  DisconnectReason?: Record<string, unknown>
}

function cargarBaileysReal(): BaileysReal | null {
  try {
    // Resolución EXACTA por la dependencia del daemon (no la del shell ni del app):
    const req = createRequire(join(process.cwd(), 'daemon/whatsapp/package.json'))
    return req('baileys') as BaileysReal
  } catch {
    return null // entorno sin `bun install` en daemon/whatsapp — el skip lo dice claro
  }
}

const baileys = cargarBaileysReal()
const authDirTemporal = () => mkdtempSync(join(tmpdir(), 'wa-auth-f01-'))

describe('F0.1 · librería REAL del daemon (baileys fijado 6.7.24 en daemon/whatsapp)', () => {
  test.skipIf(!baileys)('la librería está instalada en daemon/whatsapp (createRequire del daemon)', () => {
    expect(baileys).toBeTruthy()
  })

  test.skipIf(!baileys)('useSingleFileAuthState NO existe — regresión del bug real S-017 F0.1', () => {
    expect('useSingleFileAuthState' in (baileys as object)).toBe(false)
  })

  test.skipIf(!baileys)('useMultiFileAuthState existe y devuelve { state, saveCreds } — llamada REAL offline', async () => {
    expect(typeof baileys?.useMultiFileAuthState).toBe('function')
    const auth = await baileys!.useMultiFileAuthState!(authDirTemporal())
    expect(typeof auth.saveCreds).toBe('function')
    expect(auth.state && typeof auth.state === 'object').toBe(true)
    expect(auth.state.creds && typeof auth.state.creds === 'object').toBe(true)
  })

  test.skipIf(!baileys)('default makeWASocket y DisconnectReason.loggedOut existen', () => {
    expect(typeof baileys!.default).toBe('function')
    expect(baileys!.DisconnectReason && typeof baileys!.DisconnectReason === 'object' && 'loggedOut' in baileys!.DisconnectReason).toBe(true)
  })

  test.skipIf(!baileys)('huellaCredenciales sobre el estado REAL: determinista y dentro del contrato', async () => {
    const auth = await baileys!.useMultiFileAuthState!(authDirTemporal())
    const huella = huellaCredenciales(auth.state)
    expect(huella.startsWith(`${HUELLA_CRED_PREFIJO}:`)).toBe(true)
    expect(huella).toBe(huellaCredenciales(auth.state)) // misma entrada → misma huella
    expect(huella.length).toBeGreaterThan(16)
    const contrato = validarConfirmacion('+573001234567', huella)
    expect(contrato.ok).toBe(true) // el identificador pasa el cerrojo de confirmar_conexion
  })

  test('huellaCredenciales (sintético): Buffers y orden de claves no la mueven; el contenido sí', () => {
    const estadoA = { creds: { noiseKey: Buffer.from([1, 2, 3]), signedPreKey: { keyId: 7, keyPair: { privKey: Buffer.from([9, 9]) } } } }
    const estadoB = { creds: { signedPreKey: { keyPair: { privKey: Buffer.from([9, 9]) }, keyId: 7 }, noiseKey: Buffer.from([1, 2, 3]) } }
    const estadoC = { creds: { noiseKey: Buffer.from([1, 2, 4]) } }
    const hA = huellaCredenciales(estadoA)
    expect(hA).toBe(huellaCredenciales(estadoB)) // orden de claves distinto, MISMA huella
    expect(hA).not.toBe(huellaCredenciales(estadoC)) // contenido distinto → huella distinta
    expect(hA.startsWith(`${HUELLA_CRED_PREFIJO}:`)).toBe(true)
  })
})

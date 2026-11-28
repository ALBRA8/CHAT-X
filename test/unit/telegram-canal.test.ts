// Tests F3 — lógica PURA del cuarto Telegram PROPIO. Cubre src/lib/telegram/
// telegram.ts: validación del entrante (chatId NUMÉRICO de la API de bots —
// los @handles se rechazan), máscara del chatId (grupos con signo), identidad
// pública del bot (getMe — el token jamás viaja), máquina de estados del
// cuarto, pulso del daemon (señal viva, no un estado), programación de
// iniciativas 1:1 y la afirmación de contrato compartido con WhatsApp.
import { describe, test, expect } from 'bun:test'
import {
  MAX_CHATID,
  MAX_PROGRAMADAS_POR_CHAT,
  MAX_POR_POLL,
  mascararChatIdTelegram,
  validarEntranteTelegram,
  validarConfirmacionBot,
  transicionSesionTelegram,
  estadoPulso,
  validarProgramacionTelegram,
  fueraDeHorizonte,
  verificarContratoCompartido,
} from '@/lib/telegram/telegram'
import { PULSO_VIVO_MS } from '@/lib/canales'

const AHORA = new Date('2026-11-20T12:00:00.000Z')

describe('validarEntranteTelegram (payload del daemon)', () => {
  const base = { id: 'upd-1', chatId: '573001234567', texto: 'hola, ¿cómo estás?' }

  test('chatId numérico de usuario y de grupo pasan', () => {
    const r = validarEntranteTelegram(base)
    expect(r.ok).toBe(true)
    const grupo = validarEntranteTelegram({ ...base, chatId: '-1001234567890' })
    expect(grupo.ok).toBe(true)
    if (grupo.ok) expect(grupo.datos.chatId).toBe('-1001234567890')
  })

  test('recibidoEn ISO pasa; basura → null (no rompe)', () => {
    const r = validarEntranteTelegram({ ...base, recibidoEn: '2026-11-20T11:59:00.000Z' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.datos.recibidoEn?.toISOString()).toBe('2026-11-20T11:59:00.000Z')
    const r2 = validarEntranteTelegram({ ...base, recibidoEn: 'ayer' })
    expect(r2.ok).toBe(true)
    if (r2.ok) expect(r2.datos.recibidoEn).toBeNull()
  })

  test('un @handle NO es un chatId: se rechaza con motivo honesto', () => {
    const r = validarEntranteTelegram({ ...base, chatId: '@muse_bot' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('@handles')
  })

  test('rechaza sin id, sin chatId, sin texto, payload basura o gigante', () => {
    expect(validarEntranteTelegram(null).ok).toBe(false)
    expect(validarEntranteTelegram({ chatId: base.chatId, texto: base.texto }).ok).toBe(false)
    expect(validarEntranteTelegram({ id: 'upd-1', texto: base.texto }).ok).toBe(false)
    expect(validarEntranteTelegram({ id: 'upd-1', chatId: base.chatId }).ok).toBe(false)
    expect(validarEntranteTelegram({ id: 'upd-1', chatId: base.chatId, texto: '   ' }).ok).toBe(false)
    expect(validarEntranteTelegram({ id: 'upd-1', chatId: base.chatId, texto: 'x'.repeat(601) }).ok).toBe(false)
    expect(validarEntranteTelegram({ id: 'upd-1', chatId: 'x'.repeat(MAX_CHATID + 1), texto: 'x' }).ok).toBe(false)
    expect(validarEntranteTelegram({ id: 'upd-1', chatId: 'chat-texto', texto: 'x' }).ok).toBe(false)
  })

  test('recorta espacios', () => {
    const r = validarEntranteTelegram({ id: '  upd-9  ', chatId: ' 573001234567 ', texto: '  hola  ' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.datos.idEntrada).toBe('upd-9')
      expect(r.datos.texto).toBe('hola')
    }
  })
})

describe('mascararChatIdTelegram (el chatId completo jamás sale a la UI)', () => {
  test('usuario: cola de 4 dígitos', () => {
    expect(mascararChatIdTelegram('573001234567')).toBe('•••••4567')
  })

  test('grupo/canal: se distingue por el signo', () => {
    expect(mascararChatIdTelegram('-1001234567890')).toBe('-•••••7890')
  })

  test('sin dígitos no inventa cola', () => {
    expect(mascararChatIdTelegram('algo')).toBe('•••••')
  })
})

describe('validarConfirmacionBot (identidad PÚBLICA — jamás el token)', () => {
  test('getMe completo pasa: id numérico + @usuario', () => {
    const r = validarConfirmacionBot('7123456789', '@muse_bot')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.datos.botId).toBe('7123456789')
      expect(r.datos.botUsuario).toBe('@muse_bot')
    }
  })

  test('acepta botId numérico (por si el daemon lo manda sin string)', () => {
    expect(validarConfirmacionBot(7123456789, '@muse_bot').ok).toBe(true)
  })

  test('rechaza el token o cualquier secreto como botId', () => {
    const r = validarConfirmacionBot('7123456789:AAHf3-skJsk-AAbbbb-token', '@muse_bot')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('no el token')
  })

  test('rechaza @usuario inválido o ausente', () => {
    expect(validarConfirmacionBot('7123456789', 'muse_bot').ok).toBe(false)
    expect(validarConfirmacionBot('7123456789', '@a').ok).toBe(false)
    expect(validarConfirmacionBot('7123456789', '').ok).toBe(false)
    expect(validarConfirmacionBot('', '@muse_bot').ok).toBe(false)
    expect(validarConfirmacionBot('abc', '@muse_bot').ok).toBe(false)
  })
})

describe('transicionSesionTelegram (máquina de estados del cuarto)', () => {
  test('confirmar_conexion desde NO_CONFIGURADO y DESCONECTADA → CONECTADA', () => {
    expect(transicionSesionTelegram('NO_CONFIGURADO', 'confirmar_conexion')).toEqual({ ok: true, estado: 'CONECTADA' })
    expect(transicionSesionTelegram('DESCONECTADA', 'confirmar_conexion')).toEqual({ ok: true, estado: 'CONECTADA' })
  })

  test('confirmar_conexion desde CONECTADA se rechaza (primero desconectar, explícito)', () => {
    const r = transicionSesionTelegram('CONECTADA', 'confirmar_conexion')
    expect(r.ok).toBe(false)
    expect(r.error).toContain('desconectar')
  })

  test('desconectar desde CONECTADA y DESCONECTADA pasa; NO_CONFIGURADO se rechaza honesto', () => {
    expect(transicionSesionTelegram('CONECTADA', 'desconectar')).toEqual({ ok: true, estado: 'DESCONECTADA' })
    expect(transicionSesionTelegram('DESCONECTADA', 'desconectar')).toEqual({ ok: true, estado: 'DESCONECTADA' })
    const r = transicionSesionTelegram('NO_CONFIGURADO', 'desconectar')
    expect(r.ok).toBe(false)
    expect(r.error).toContain('nunca se configuró')
  })
})

describe('estadoPulso (señal viva del daemon, jamás un estado)', () => {
  test('sin pulso → sin_pulso; dentro de la ventana → vivo', () => {
    expect(estadoPulso(null, AHORA)).toBe('sin_pulso')
    const hace = new Date(AHORA.getTime() - PULSO_VIVO_MS / 2)
    expect(estadoPulso(hace, AHORA)).toBe('vivo')
    expect(estadoPulso(hace.toISOString(), AHORA)).toBe('vivo')
  })

  test('más allá de la ventana → tibio (¿daemon caído? aviso, no cambio de estado)', () => {
    const lejos = new Date(AHORA.getTime() - PULSO_VIVO_MS - 1000)
    expect(estadoPulso(lejos, AHORA)).toBe('tibio')
  })

  test('pulso del futuro (reloj desalineado) → tibio, nunca vivo', () => {
    expect(estadoPulso(new Date(AHORA.getTime() + 60000), AHORA)).toBe('tibio')
  })
})

describe('validarProgramacionTelegram + horizonte (iniciativas 1:1)', () => {
  test('chatId numérico pasa; @handle y texto se rechazan', () => {
    expect(validarProgramacionTelegram({ chatId: '573001234567' }).ok).toBe(true)
    expect(validarProgramacionTelegram({ chatId: '-1001234567890' }).ok).toBe(true)
    const r = validarProgramacionTelegram({ chatId: '@muse_bot' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('@handles')
    expect(validarProgramacionTelegram({ chatId: 'mi-contacto' }).ok).toBe(false)
    expect(validarProgramacionTelegram({}).ok).toBe(false)
  })

  test('programadaEn ISO pasa; basura se rechaza; el brief se recorta a 300', () => {
    const ok = validarProgramacionTelegram({ chatId: '123', programadaEn: '2026-11-21T10:00:00.000Z', texto: 'b'.repeat(500) })
    expect(ok.ok).toBe(true)
    if (ok.ok) {
      expect(ok.datos.programadaEn?.toISOString()).toBe('2026-11-21T10:00:00.000Z')
      expect(ok.datos.brief).toHaveLength(300)
    }
    expect(validarProgramacionTelegram({ chatId: '123', programadaEn: 'chafa' }).ok).toBe(false)
  })

  test('fueraDeHorizonte: 40 días fuera, 20 días dentro', () => {
    expect(fueraDeHorizonte(new Date(AHORA.getTime() + 40 * 86400000), AHORA)).toBe(true)
    expect(fueraDeHorizonte(new Date(AHORA.getTime() + 20 * 86400000), AHORA)).toBe(false)
  })

  test('topes del cuarto: 3 pendientes por chat, goteo 5 por poll', () => {
    expect(MAX_PROGRAMADAS_POR_CHAT).toBe(3)
    expect(MAX_POR_POLL).toBe(5)
  })
})

describe('verificarContratoCompartido (misma constitución que WhatsApp)', () => {
  test('pacing bloqueado → sigue_programada; pacing ok → en_cola', () => {
    const no = { permitido: false, motivo: 'horas_silencio' as const, reintentarEn: null, detalle: 'Ventana silenciosa' }
    expect(verificarContratoCompartido(no)).toEqual({ entregar: false, estado: 'sigue_programada' })
    const ok = { permitido: true, motivo: 'ok' as const, reintentarEn: null, detalle: 'Dentro del pacing' }
    expect(verificarContratoCompartido(ok)).toEqual({ entregar: true, estado: 'en_cola' })
  })
})

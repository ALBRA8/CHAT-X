// Sirve el archivo de una pieza. Las piezas PRIVADAS requieren sesión desbloqueada:
// nunca salen de la vista privada (cookie httpOnly + descifrado AES-256-GCM en memoria).
// kind=voz sirve WAV (público en claro; privado descifrado con la clave de servidor
// envuelta — mismo mecanismo del worker, sin sesión abierta).
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import { db } from '@/lib/db'
import { leerClaro, leerCifrado, leerBinarioCifrado } from '@/lib/media'
import { COOKIE_PRIVADA, sesionValida } from '@/lib/privado'
import { LANE } from '@/lib/constants'

const SVG_CANDADO = `<svg xmlns="http://www.w3.org/2000/svg" width="288" height="288" viewBox="0 0 288 288">
  <rect width="288" height="288" fill="#18181b"/>
  <g transform="translate(144,132)">
    <rect x="-34" y="-6" width="68" height="54" rx="10" fill="#3f3f46"/>
    <path d="M -20 -6 v -14 a 20 20 0 0 1 40 0 V -6" stroke="#52525b" stroke-width="10" fill="none"/>
    <circle cx="0" cy="18" r="8" fill="#a1a1aa"/>
    <rect x="-3" y="20" width="6" height="14" rx="3" fill="#a1a1aa"/>
  </g>
  <text x="144" y="220" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="15" fill="#71717a">cifrado · desbloquea para ver</text>
</svg>`

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const tipo = req.nextUrl.searchParams.get('tipo') === 'thumb' ? 'thumb' : 'full'
  const m = await db.media.findUnique({ where: { id } })
  if (!m) return new NextResponse('pieza no encontrada', { status: 404 })
  if (m.kind === 'cara_canonica' || !m.filePath) {
    return new NextResponse('sin archivo', { status: 404 })
  }

  const base = (tipo === 'thumb' ? m.thumbPath : m.filePath) || m.filePath
  const esPrivada = m.lane === LANE.PRIVADO

  // Notas de voz: binario WAV, no SVG
  if (m.kind === 'voz' && m.filePath) {
    if (!esPrivada) {
      try {
        const wav = fs.readFileSync(m.filePath)
        return new NextResponse(new Uint8Array(wav), {
          headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store' },
        })
      } catch {
        return new NextResponse('archivo de voz no encontrado', { status: 404 })
      }
    }
    const token = req.cookies.get(COOKIE_PRIVADA)?.value
    const sesionVoz = sesionValida(token)
    if (!sesionVoz) {
      return new NextResponse('voz cifrada · desbloquea el modo privado para escuchar', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }
    const wav = leerBinarioCifrado(m.filePath.replace(/\.(wav|enc)$/, ''), sesionVoz.masterKey)
    if (!wav) return new NextResponse('no se pudo descifrar la voz', { status: 404 })
    return new NextResponse(new Uint8Array(wav), {
      headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store' },
    })
  }

  if (esPrivada) {
    const token = req.cookies.get(COOKIE_PRIVADA)?.value
    const sesion = sesionValida(token)
    if (!sesion) {
      return new NextResponse(SVG_CANDADO, {
        status: 200,
        headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' },
      })
    }
    const svg = leerCifrado(base.replace(/\.(svg|enc)$/, ''), sesion.masterKey)
    if (!svg) return new NextResponse('no se pudo descifrar', { status: 500 })
    return new NextResponse(svg, {
      headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' },
    })
  }

  const svg = leerClaro(base.replace(/\.svg$/, ''))
  if (!svg) return new NextResponse('archivo no encontrado', { status: 404 })
  return new NextResponse(svg, {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'private, max-age=30' },
  })
}

// Sirve la muestra de voz del personaje. Material PRIVADO: cookie httpOnly +
// descifrado AES-256-GCM en memoria. Nunca cacheada, nunca pública.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { COOKIE_PRIVADA, sesionValida } from '@/lib/privado'
import { leerBinarioCifrado } from '@/lib/media'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const sesion = sesionValida(req.cookies.get(COOKIE_PRIVADA)?.value)
  if (!sesion) {
    return NextResponse.json({ error: 'muestra privada: desbloquea el modo privado' }, { status: 401 })
  }
  const perfil = await db.voiceProfile.findFirst({ where: { characterId: id } })
  if (!perfil?.sampleMediaId) return NextResponse.json({ error: 'sin muestra' }, { status: 404 })

  const media = await db.media.findUnique({ where: { id: perfil.sampleMediaId } })
  if (!media?.filePath) return NextResponse.json({ error: 'muestra no encontrada' }, { status: 404 })

  const datos = leerBinarioCifrado(media.filePath.replace(/\.enc$/, ''), sesion.masterKey)
  if (!datos) return NextResponse.json({ error: 'no se pudo descifrar la muestra' }, { status: 500 })

  return new NextResponse(new Uint8Array(datos), {
    headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store' },
  })
}

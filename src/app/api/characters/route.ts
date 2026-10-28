import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { characterDTO } from '@/lib/dto'
import { iniciarWorker } from '@/lib/worker'
import { registrarEvento } from '@/lib/compliance'

export async function GET() {
  iniciarWorker()
  const characters = await db.character.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ characters: characters.map(characterDTO) })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const name = String(body.name || '').trim()
  if (!name) return NextResponse.json({ error: 'El personaje necesita un nombre.' }, { status: 400 })

  const seed = String(body.seed || `seed_${name}_${Date.now()}`)
  const genome = {
    atributos: body.atributos ?? {},
    aficiones: body.aficiones ?? '',
    lore: body.lore ?? '',
    tono: body.tono ?? '',
  }
  const c = await db.character.create({
    data: {
      name,
      status: 'BORRADOR',
      audience: String(body.audience || ''),
      style: String(body.style || ''),
      anchorTrait: String(body.anchorTrait || ''),
      seed,
      genome: JSON.stringify(genome),
      signKit: JSON.stringify(body.signKit ?? []),
    },
  })
  await registrarEvento('creacion', { tipo: 'personaje', nombre: name, seed }, { characterId: c.id })
  return NextResponse.json({ character: characterDTO(c) }, { status: 201 })
}

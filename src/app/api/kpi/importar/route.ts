// Importación de KPIs pegando CSV (flujo B paso 6: ingresos desde la plataforma)
// Formato por línea: personaje; mes(YYYY-MM); ingresos; suscripciones; mensajes_pagados; ppv
// También acepta separador coma. Cabecera opcional (se detecta y se salta).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { mesActual } from '@/lib/constants'

function parseNum(s: string | undefined): number {
  if (!s) return 0
  const n = Number(s.replace(/[^0-9.,-]/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const csv = String(body.csv || '').trim()
  if (!csv) return NextResponse.json({ error: 'Pega el CSV con los ingresos.' }, { status: 400 })

  const lineas = csv.split(/\r?\n/).filter((l) => l.trim())
  let importadas = 0
  const errores: string[] = []

  for (const [idx, linea] of lineas.entries()) {
    const partes = linea.split(/[;,\t]/).map((p) => p.trim())
    if (partes.length < 2) {
      errores.push(`Línea ${idx + 1}: columnas insuficientes.`)
      continue
    }
    const [nombreCrudo, mesCrudo, ingresos, subs, mensajes, ppv] = partes
    const nombre = nombreCrudo.replace(/^"|"$/g, '')
    if (/^(personaje|modelo|nombre)$/i.test(nombre)) continue // cabecera

    const character = await db.character.findFirst({ where: { name: nombre } })
    if (!character) {
      errores.push(`Línea ${idx + 1}: personaje "${nombre}" no existe en el roster.`)
      continue
    }
    const month = /^\d{4}-\d{2}$/.test(mesCrudo) ? mesCrudo : mesActual()
    const data = {
      revenue: parseNum(ingresos),
      subs: parseNum(subs),
      paidMessages: parseNum(mensajes),
      ppv: parseNum(ppv),
      source: 'csv' as const,
    }
    await db.kpiEntry.upsert({
      where: { characterId_month: { characterId: character.id, month } },
      create: { characterId: character.id, month, ...data },
      update: data,
    })
    importadas++
  }

  return NextResponse.json({ importadas, errores })
}

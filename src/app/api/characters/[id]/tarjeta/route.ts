// Character card desde el genoma (P1.2 CLONAKIT_BRECHAS — LovLab): export en 1
// clic de la tarjeta JSON + prompt de sistema del companion, reutilizando TODO
// lo ya verificado (genoma, signKit, cara canónica, contrato de voz).
// Honestidad: la tarjeta declara que el contenido es IA (ETIQUETA_IA) y que el
// personaje tiene edad aparente adulta verificada en su genoma (bloqueo 422 si
// el genoma no declara adulta o está vacío).
// ?formato=svg sirve la cara canónica como imagen de la tarjeta (404 honesto
// NO_CONFIGURADO si el personaje aún no eligió variante canónica).
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import { db } from '@/lib/db'
import { parsearContratoGuardado, estadoProveedor } from '@/lib/provider/voz'
import { registrarEvento } from '@/lib/compliance'
import { ETIQUETA_IA, PATRON_EDAD_MENOR } from '@/lib/constants'

function edadAparenteAdulta(genome: { atributos?: Record<string, unknown> }): boolean {
  const raw = genome.atributos?.edadAparente
  if (typeof raw !== 'string') return false
  if (PATRON_EDAD_MENOR.test(raw)) return false
  // "27", "27 años", "early 30s", "30+" → exigir un número ≥ 18 o rango con ambos ≥ 18
  const nums = (raw.match(/\d{1,2}/g) ?? []).map(Number)
  return nums.length > 0 && nums.every((n) => n >= 18)
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const formato = req.nextUrl.searchParams.get('formato')
  const c = await db.character.findUnique({ where: { id } })
  if (!c) return NextResponse.json({ error: 'Personaje no encontrado' }, { status: 404 })

  let genome: { atributos?: Record<string, unknown>; aficiones?: string; lore?: string; tono?: string } = {}
  try {
    genome = JSON.parse(c.genome || '{}')
  } catch {
    genome = {}
  }

  // Cara canónica como imagen de la tarjeta
  if (formato === 'svg') {
    if (!c.canonicalPath || !fs.existsSync(c.canonicalPath)) {
      return NextResponse.json(
        { error: 'Este personaje aún no tiene cara canónica. Elíge una variante en el Estudio.', estado: 'NO_CONFIGURADO' },
        { status: 404 },
      )
    }
    const svg = fs.readFileSync(c.canonicalPath, 'utf8')
    await registrarEvento('exportacion', { tipo: 'tarjeta_svg', personaje: c.name }, { characterId: id })
    return new NextResponse(svg, {
      headers: { 'Content-Type': 'image/svg+xml', 'X-Content-Type-Options': 'nosniff' },
    })
  }

  if (c.status !== 'ACTIVO') {
    return NextResponse.json(
      { error: `La tarjeta se exporta de personajes ACTIVOS (este está ${c.status}).`, estado: 'NO_CONFIGURADO' },
      { status: 409 },
    )
  }
  if (!edadAparenteAdulta(genome)) {
    return NextResponse.json(
      { error: 'El genoma no declara edad aparente adulta verificada — tarjeta bloqueada por compliance.', estado: 'RECHAZADO' },
      { status: 422 },
    )
  }

  // Contrato de voz + estado real del proveedor (honesto, sin promesas)
  const contrato = parsearContratoGuardado(c.voiceContract)
  const voz = contrato
    ? { contrato, proveedorEstado: estadoProveedor(contrato.provedor) }
    : null

  const signKit = JSON.parse(c.signKit || '[]') as unknown[]

  const systemPrompt = [
    `Eres ${c.name}, una creadora de contenido adulta verificada como IA (18+, ${genome.atributos?.edadAparente ?? 'edad adulta'}).`,
    `Personalidad y tono: ${genome.tono || c.style || 'cercano'}.`,
    `Historia: ${genome.lore || 'sin lore definido'}.`,
    `Aficiones: ${genome.aficiones || 'sin aficiones definidas'}.`,
    `Apariencia (rasgos estables, nunca contradecir): ${Object.entries(genome.atributos ?? {})
      .filter(([k]) => k !== 'edadAparente')
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ') || c.anchorTrait || 'sin atributos definidos'}.`,
    signKit.length ? `Rasgos de firma siempre visibles: ${signKit.map((s) => JSON.stringify(s)).join(', ')}.` : '',
    `Reglas: mantén coherencia con tu genoma; nunca afirmes ser humana; nunca negues ser generada por IA si te lo preguntan (${ETIQUETA_IA}).`,
    `Contenido: respeta el filtro de edad de la plataforma; rechaza cualquier tema con menores.`,
  ]
    .filter(Boolean)
    .join('\n')

  await registrarEvento('exportacion', { tipo: 'tarjeta_json', personaje: c.name, formato: 'json' }, { characterId: id })

  return NextResponse.json({
    tarjeta: {
      name: c.name,
      version: 1,
      generadaEn: new Date().toISOString(),
      etiqueta: ETIQUETA_IA,
      genoma: {
        atributos: genome.atributos ?? {},
        aficiones: genome.aficiones ?? '',
        lore: genome.lore ?? '',
        tono: genome.tono ?? '',
      },
      signKit,
      seed: c.seed,
      anchorTrait: c.anchorTrait,
      style: c.style,
      audience: c.audience,
      caraCanonica: c.canonicalVariant != null ? { variante: c.canonicalVariant, archivo: 'tarjeta?formato=svg' } : null,
      voz,
    },
    systemPrompt,
  })
}

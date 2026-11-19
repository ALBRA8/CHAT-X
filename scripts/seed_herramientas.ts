// D-015 · A1 — siembra el catálogo declarativo de herramientas (una fila por herramienta).
// Uso:  bun scripts/seed_herramientas.ts
// Idempotente: upsert por clave. Si la definición del catálogo cambia, la fila
// se actualiza (los textos y campos son código-revisables vía PR, la pantalla
// no se toca). Honesto: reporta cuántas filas sembró y termina exit 1 si el
// contrato zod rechaza alguna definición.
import { PrismaClient } from '@prisma/client'
import { CATALOGO_ESTUDIO } from '../src/lib/herramientas-catalogo'
import { HerramientaDefSchema } from '../src/lib/herramientas'

const db = new PrismaClient()

async function main() {
  let sembradas = 0
  for (const def of CATALOGO_ESTUDIO) {
    // Validación honesta: una definición mala NO entra a la BD.
    const d = HerramientaDefSchema.parse(def)
    await db.herramienta.upsert({
      where: { clave: d.clave },
      create: {
        clave: d.clave,
        nombre: d.nombre,
        descripcion: d.descripcion,
        grupo: d.grupo,
        fraseGrupo: d.fraseGrupo,
        subgrupo: d.subgrupo,
        icono: d.icono,
        chapas: JSON.stringify(d.chapas),
        carril: d.carril,
        costeBase: d.costeBase,
        costeTexto: d.costeTexto,
        limiteTexto: d.limiteTexto,
        salida: JSON.stringify(d.salida),
        campos: JSON.stringify(d.campos),
        endpoint: d.endpoint,
        payloadFijo: JSON.stringify(d.payloadFijo),
        orden: d.orden,
      },
      update: {
        nombre: d.nombre,
        descripcion: d.descripcion,
        grupo: d.grupo,
        fraseGrupo: d.fraseGrupo,
        subgrupo: d.subgrupo,
        icono: d.icono,
        chapas: JSON.stringify(d.chapas),
        carril: d.carril,
        costeBase: d.costeBase,
        costeTexto: d.costeTexto,
        limiteTexto: d.limiteTexto,
        salida: JSON.stringify(d.salida),
        campos: JSON.stringify(d.campos),
        endpoint: d.endpoint,
        payloadFijo: JSON.stringify(d.payloadFijo),
        orden: d.orden,
      },
    })
    sembradas++
    console.log(`✓ ${d.clave} (${d.grupo} · ${d.subgrupo}) → ${d.endpoint}`)
  }
  console.log(`Catálogo sembrado: ${sembradas}/${CATALOGO_ESTUDIO.length} herramientas.`)
}

main()
  .catch((e) => {
    console.error('SEED FALLÓ:', e instanceof Error ? e.message : e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())

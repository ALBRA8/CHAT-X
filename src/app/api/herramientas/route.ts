// D-015 · A1 — catálogo declarativo de herramientas.
// GET: devuelve el catálogo parseado y validado. Una fila corrupta NO tumba la
// ruta: se reporta aparte en `errores` (estado honesto, nunca un 200 que miente).
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { jsonOk } from '@/lib/api-utils'
import { herramientaDesdeFila, type FilaHerramienta } from '@/lib/herramientas'

// El catálogo vive en BD y el operador puede editar filas al vuelo (prueba
// obligatoria del patrón A1: cambiar un label o el coste en la base y verlo
// en pantalla sin recompilar) → NUNCA se cachea esta respuesta.
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const soloActivas = req.nextUrl.searchParams.get('todas') !== '1'
  const filas = await db.herramienta.findMany({
    where: soloActivas ? { activo: true } : {},
    orderBy: [{ grupo: 'asc' }, { orden: 'asc' }, { nombre: 'asc' }],
  })

  const herramientas: ReturnType<typeof herramientaDesdeFila>[] = []
  const errores: { clave: string; detalle: string }[] = []
  for (const f of filas as unknown as FilaHerramienta[]) {
    try {
      herramientas.push(herramientaDesdeFila(f))
    } catch (e) {
      errores.push({ clave: f.clave, detalle: e instanceof Error ? e.message : String(e) })
    }
  }

  return jsonOk({ herramientas, errores, total: filas.length })
}

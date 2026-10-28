// CERROJO DE INTEGRIDAD DE BD — evita la colisión de esquemas entre CHAT-X y los engines.
//
// Incidente real (2026-10-28): un `prisma db push` ejecutado dentro de un engine
// resolvió DATABASE_URL contra la BD de CHAT-X (el .env raíz del monorepo gana
// sobre el .env del engine) y reemplazó las tablas de CHAT-X por las del engine.
// Este cerrojo detecta ese estado en segundos.
//
// Uso:   bun scripts/verificar_bd.ts   → exit 0 OK · exit 1 CORRUPTO
// Regla de oro de arranque de engines:
//   DATABASE_URL=file:<ruta absoluta propia> bunx next dev ...   (env explícita gana a todo .env)
import { readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const TABLAS_CHATX = ['Character', 'Job', 'Media', 'Set', 'Settings', 'Flujo', 'MotorConfig', 'ComplianceEvent']
const TABLAS_ENGINES = [
  'Generation', // AGENTE-KREA
  'CampaignEntry', // AGENTE-KREA
  'Skill', // AGENTE-KREA
]

function rutaBD(): string {
  const env = process.env.DATABASE_URL ?? ''
  const m = env.match(/file:(.+)/)
  return m ? m[1].replace(/^"|"$/g, '') : join(process.cwd(), 'db', 'custom.db')
}

const ruta = rutaBD()
if (!existsSync(ruta)) {
  console.error(`✗ No existe la BD: ${ruta}`)
  process.exit(1)
}
// bun:sqlite es un builtin de Bun sin tipos en este tsconfig → tipado mínimo local.
type BD = { query: (sql: string) => { all: () => unknown[] } }
// @ts-expect-error bun:sqlite es builtin de Bun sin tipos en este tsconfig
const { Database } = (await import('bun:sqlite')) as { Database: new (ruta: string, opts?: Record<string, unknown>) => BD }
const db = new Database(ruta, { readonly: true })
const tablas = (db.query("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]).map((r) => r.name)

const faltan = TABLAS_CHATX.filter((t) => !tablas.includes(t))
const intrusas = TABLAS_ENGINES.filter((t) => tablas.includes(t))

if (faltan.length === 0 && intrusas.length === 0) {
  console.log(`✓ BD de CHAT-X íntegra (${ruta}) — ${tablas.length} tablas, 0 intrusas.`)
  process.exit(0)
}
if (faltan.length > 0) console.error(`✗ FALTAN tablas de CHAT-X: ${faltan.join(', ')}`)
if (intrusas.length > 0) console.error(`✗ TABLAS INTRUSAS de engines: ${intrusas.join(', ')} — un db push ajeno sobrescribió la BD.`)
console.error('  Reparación: cd raíz && bunx prisma db push  · y lanzar SIEMPRE los engines con DATABASE_URL absoluta propia.')
process.exit(1)

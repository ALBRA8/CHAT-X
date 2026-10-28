// Sondeo real de los 10 motores del registro CHAT-X usando la MISMA función
// sondearMotor() que usa la plataforma (src/lib/motores.ts). Sin simulaciones:
// cada línea es una petición HTTP real contra la URL del motor.
//
// Orden de resolución de URL (igual que la plataforma):
//   1. env SONDEO_<ID_MAYUSCULAS>=http://...  (override explícito)
//   2. config guardada en BD (MotorConfig — lo que usa la UI de Operaciones)
//   3. urlPorDefecto del registro
//
// Uso:   bun scripts/sondeo_motores.ts
// Nota:  los motores que no están corriendo en esta máquina saldrán INALCANZABLE
//        — eso es un dato real (falta arrancarlos o requieren otro host/servicios).
import { defMotor, sondearMotor, configMotor, type MotorId } from '../src/lib/motores'

const IDS: MotorId[] = ['youtube', 'crm', 'whatspower', 'ultra', 'nexscope', 'leads', 'agentegeneral', 'cazador', 'agentekrea', 'comuniti']

async function urlPara(id: MotorId, porDefecto: string): Promise<string> {
  const env = process.env[`SONDEO_${id.toUpperCase()}`]
  if (env) return env
  try {
    const cfg = await configMotor(id)
    if (cfg.url) return cfg.url
  } catch {
    // BD no disponible → caemos al default del registro
  }
  return porDefecto
}

const filas: string[] = []
for (const id of IDS) {
  const def = defMotor(id)!
  const url = await urlPara(id, def.urlPorDefecto)
  const r = await sondearMotor(id, url, '')
  filas.push(`${id.padEnd(14)} ${r.estado.padEnd(14)} ${String(r.latenciaMs ?? '-').padStart(5)}ms  ${r.detalle.slice(0, 110)}`)
}
console.log('motor          estado         latenc  detalle')
console.log('─'.repeat(150))
for (const f of filas) console.log(f)
const operativos = filas.filter((f) => f.includes('OPERATIVO')).length
console.log('─'.repeat(150))
console.log(`Operativos: ${operativos}/10`)

// Sondeo real de los 10 motores del registro CHAT-X usando la MISMA función
// sondearMotor() que usa la plataforma (src/lib/motores.ts). Sin simulaciones:
// cada línea es una petición HTTP real contra la URL por defecto del motor.
//
// Uso:   bun scripts/sondeo_motores.ts
// Nota:  los motores que no están corriendo en esta máquina saldrán INALCANZABLE
//        — eso es un dato real (falta arrancarlos o requieren otro host/servicios).
import { defMotor, sondearMotor } from '../src/lib/motores'

const IDS = ['youtube', 'crm', 'whatspower', 'ultra', 'nexscope', 'leads', 'agentegeneral', 'cazador', 'agentekrea', 'comuniti'] as const

// Overrides opcionales: SONDEO_<ID_MAYUSCULAS>=http://... (p. ej. motores en puertos no estándar)
function urlPara(id: string, porDefecto: string): string {
  const env = process.env[`SONDEO_${id.toUpperCase()}`]
  return env || porDefecto
}

const filas: string[] = []
for (const id of IDS) {
  const def = defMotor(id)!
  const url = urlPara(id, def.urlPorDefecto)
  const r = await sondearMotor(id, url, '')
  filas.push(`${id.padEnd(14)} ${r.estado.padEnd(14)} ${String(r.latenciaMs ?? '-').padStart(5)}ms  ${r.detalle.slice(0, 110)}`)
}
console.log('motor          estado         latenc  detalle')
console.log('─'.repeat(150))
for (const f of filas) console.log(f)
const operativos = filas.filter((f) => f.includes('OPERATIVO')).length
console.log('─'.repeat(150))
console.log(`Operativos: ${operativos}/10`)

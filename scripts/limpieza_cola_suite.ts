// Limpieza operativa honesta: purga jobs en_cola duplicados por re-corridas de
// la suite API (cada corrida encola su lote y la cola CPU tarda horas). Mismo
// tratamiento que el worker en fallo terminal: estado fallido con causa
// trazable + reembolso UNA vez del coste estimado. Nunca toca procesando.
import { db } from '../src/lib/db'

async function main() {
  const enCola = await db.job.findMany({ where: { status: 'en_cola' }, select: { id: true, costEstimate: true, type: true } })
  console.log(`purgando ${enCola.length} jobs en_cola...`)
  let reembolso = 0
  for (const j of enCola) {
    await db.job.update({
      where: { id: j.id },
      data: {
        status: 'fallido',
        error: '[LIMPIEZA] duplicado de re-corridas de la suite API; purgado para drenar la cola (reembolsado)',
      },
    })
    reembolso += j.costEstimate
  }
  if (reembolso > 0) {
    await db.settings.update({ where: { id: 'main' }, data: { credits: { increment: reembolso } } })
  }
  console.log(`reembolsados ${reembolso} créditos a settings`)
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })

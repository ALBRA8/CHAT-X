// Prueba del provider local-cpu (generación real por CPU vía script Python).
// Dos niveles:
//  1) Orquestación del provider contra un script Python FALSO (rápido, siempre corre):
//     invocación, lectura de resultado JSON, envoltura SVG, errores y timeout.
//  2) Generación REAL con diffusers (opt-in: PRUEBAS_GENERACION_REAL=1; requiere
//     torch+diffusers instalados y el modelo en caché HF — ver docs/MOTOR_GPU.md).
import { describe, test, expect, afterAll } from 'bun:test'
import fs from 'fs'
import os from 'os'
import path from 'path'

const PNG_1PX =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'chatx-lcpu-'))

// Script falso: escribe PNG+JSON y sale 0 (o falla con JSON ok:false según --prompt)
const FALSO = path.join(TMP, 'falso_generador.py')
fs.writeFileSync(
  FALSO,
  `import argparse, json, sys
ap = argparse.ArgumentParser()
for a in ("prompt","salida","resultado"): ap.add_argument("--"+a, required=True)
for a in ("seed","ancho","alto","pasos"): ap.add_argument("--"+a, type=int, default=0)
args = ap.parse_args()
if "FALLAR" in args.prompt:
    json.dump({"ok": False, "bloqueo": "fallo simulado del script"}, open(args.resultado, "w"))
    sys.exit(1)
open(args.salida, "wb").write(bytes.fromhex("${PNG_1PX}").decode("base64") if False else __import__("base64").b64decode("${PNG_1PX}"))
json.dump({"ok": True, "archivo": args.salida}, open(args.resultado, "w"))
`,
)

// Script colgado: nunca termina (para probar el timeout)
const COLGADO = path.join(TMP, 'colgado.py')
fs.writeFileSync(COLGADO, 'import time\ntime.sleep(600)\n')

process.env.LOCAL_CPU_SCRIPT = FALSO

const { prepararImagenLocalCpu, localCpuProvider } = await import('@/lib/provider/localcpu')

function reqDePrueba(seed: string, escena = 'café al atardecer') {
  return {
    kind: 'preview' as const,
    seed,
    baseSeed: 'base-2222',
    variant: 0,
    brief: { escena, outfit: 'abrigo gris', pose: 'de pie', encuadre: 'plano_medio', luz: 'suave' },
    lane: 'PUBLICO' as const,
    characterName: 'Marta QA',
    index: 0,
    total: 1,
  }
}

afterAll(() => {
  try { fs.rmSync(TMP, { recursive: true, force: true }) } catch { /* best effort */ }
})

describe('provider local-cpu — orquestación (script falso)', () => {
  test('invoca el script, lee el JSON y envuelve el PNG en SVG con dimensiones preview', async () => {
    await prepararImagenLocalCpu(reqDePrueba('lc-seed-1'))
    const img = localCpuProvider.generateImage(reqDePrueba('lc-seed-1'))
    expect(localCpuProvider.name).toBe('local-cpu')
    expect(localCpuProvider.esSimulado).toBe(false)
    expect(img.svg).toContain('data:image/png;base64,')
    expect(img.width).toBe(384)
    expect(img.height).toBe(384)
  })

  test('error del script (ok:false) se propaga con el bloqueo exacto', async () => {
    await expect(prepararImagenLocalCpu(reqDePrueba('lc-fail', 'FALLAR ahora'))).rejects.toThrow(/fallo simulado del script/)
  })

  test('timeout del script se propaga como bloqueo claro', async () => {
    process.env.LOCAL_CPU_SCRIPT = COLGADO
    process.env.LOCAL_CPU_TIMEOUT_MS = '1200'
    try {
      await expect(prepararImagenLocalCpu(reqDePrueba('lc-timeout'))).rejects.toThrow(/timeout/)
    } finally {
      process.env.LOCAL_CPU_SCRIPT = FALSO
      delete process.env.LOCAL_CPU_TIMEOUT_MS
    }
  })
})

const REAL = process.env.PRUEBAS_GENERACION_REAL === '1'
;(REAL ? describe : describe.skip)('provider local-cpu — GENERACIÓN REAL (opt-in PRUEBAS_GENERACION_REAL=1)', () => {
  test('genera una imagen REAL con diffusers en CPU y deja PNG válido en disco', async () => {
    process.env.LOCAL_CPU_SCRIPT = path.join(process.cwd(), 'scripts', 'provider_cpu_generar.py')
    process.env.LOCAL_CPU_TIMEOUT_MS = '600000'
    await prepararImagenLocalCpu(reqDePrueba('lc-real-e2e'))
    const img = localCpuProvider.generateImage(reqDePrueba('lc-real-e2e'))
    const base64 = img.svg.split('base64,')[1].split('"')[0]
    const bytes = Buffer.from(base64, 'base64')
    expect(bytes[0]).toBe(0x89)
    expect(bytes.subarray(1, 4).toString()).toBe('PNG')
    expect(bytes.length).toBeGreaterThan(10000)
  }, 700000)
})

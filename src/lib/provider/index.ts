// Factoría de proveedores — intercambiable por ESTUDIO_PROVIDER sin tocar el resto del código.
// En F1 el operador alquila GPU en la nube (RunPod/RunningHub); aquí el "simulador" ocupa su
// lugar para desarrollo. Un proveedor real solo debe implementar la interfaz de ./types.
import type { Provider } from './types'
import { simulador } from './simulator'
import { comfyuiProvider } from './comfyui'
import { localCpuProvider } from './localcpu'

let cache: Provider | null = null

export function getProvider(): Provider {
  if (cache) return cache
  const nombre = (process.env.ESTUDIO_PROVIDER || 'simulador').toLowerCase()
  switch (nombre) {
    case 'comfyui':
      // GPU local/remota real ($0/mes): ComfyUI vía HTTP. Misma interfaz.
      cache = comfyuiProvider
      return cache
    case 'local-cpu':
      // CPU local real ($0/mes): diffusers + SD 1.5 fp16. Lenta pero REAL — probada:
      // 86.4s/imagen 384×384, 1.89 GB RAM pico en 2 vCPU.
      cache = localCpuProvider
      return cache
    case 'simulador':
    default:
      cache = simulador
      return cache
  }
}

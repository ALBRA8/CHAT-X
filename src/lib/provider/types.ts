// Interfaz de proveedor generativo — intercambiable por variable de entorno
// ESTUDIO_PROVIDER=simulador (por defecto) | proveedor real futuro (runpod/comfyui)
import type { Lane } from '@/lib/constants'

export interface Brief {
  escena: string
  outfit: string
  pose: string
  encuadre: string // primer_plano | plano_medio | cuerpo_entero
  luz: string
}

export interface GenerationRequest {
  kind: 'preview' | 'final' | 'canonica' | 'examen' | 'dataset'
  seed: string // semilla efectiva de la pieza
  baseSeed: string // semilla de identidad del personaje
  variant: number // variante de composición
  brief: Brief
  lane: Lane
  characterName: string
  loraHash?: string | null
  sceneName?: string // para examen de identidad
  index?: number // índice dentro del lote o dataset
  total?: number
}

export interface GeneratedImage {
  svg: string
  width: number
  height: number
}

export interface VeredictoIdentidad {
  aprueba: boolean
  motivo?: string
}

export interface Provider {
  readonly name: string
  readonly esSimulado: boolean
  generateImage(req: GenerationRequest): GeneratedImage
  checkIdentidad(seed: string): VeredictoIdentidad
  checkAnatomia(seed: string): VeredictoIdentidad
}

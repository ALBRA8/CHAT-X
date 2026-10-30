// Biblioteca de presets con nombre — adopción A2 del recon Batch C (referente 27
// Enhancor: "iluminación cinematográfica + iPhone Selfie V1–V4"). $0: se adopta en
// la ficha del Estudio como fragmentos de prompt, no en código del provider.
// Semántica: la biblioteca SOLO rellena los campos no vacíos del brief (a diferencia
// de un preset del usuario, que es una foto completa del brief).
import type { PresetT } from './api'

export const BIBLIOTECA_PRESETS: PresetT[] = [
  // Iluminación cinematográfica
  {
    nombre: 'Ethereal Light',
    escena: 'interior con telas translúcidas',
    outfit: '',
    pose: '',
    encuadre: 'primer_plano',
    luz: 'luz suave difusa a través de telas finas, resplandor etéreo, piel luminosa',
  },
  {
    nombre: 'Blinds Noir',
    escena: 'habitación con persianas venecianas',
    outfit: '',
    pose: '',
    encuadre: 'plano_medio',
    luz: 'luz dura filtrada por persianas, rayas noir, sombras profundas',
  },
  {
    nombre: 'Gobo Spotlight',
    escena: 'fondo oscuro con textura',
    outfit: '',
    pose: '',
    encuadre: 'primer_plano',
    luz: 'foco gobo con patrones de sombra en deriva, luz principal dramática',
  },
  {
    nombre: 'Golden Hour Window',
    escena: 'ventana amplia al atardecer',
    outfit: '',
    pose: '',
    encuadre: 'plano_medio',
    luz: 'sol cálido de golden hour, luz de borde ámbar, sombras largas y suaves',
  },
  // iPhone Selfie V1–V4 — "feel auténtico UGC" para el carril social
  {
    nombre: 'iPhone Selfie V1 · Natural',
    escena: 'exterior a media mañana',
    outfit: '',
    pose: 'selfie con brazo extendido',
    encuadre: 'primer_plano',
    luz: 'luz natural de día, sol levemente cenital, look de foto de teléfono auténtica',
  },
  {
    nombre: 'iPhone Selfie V2 · Studio Soft',
    escena: 'interior neutro',
    outfit: '',
    pose: 'selfie frontal relajada',
    encuadre: 'primer_plano',
    luz: 'luz interior suave y pareja, cámara frontal de teléfono, candidez',
  },
  {
    nombre: 'iPhone Selfie V3 · Vivid',
    escena: 'ciudad al caer la tarde',
    outfit: '',
    pose: 'selfie en movimiento',
    encuadre: 'primer_plano',
    luz: 'tonos vívidos de retrato, colores saturados de ciudad, look HDR de teléfono',
  },
  {
    nombre: 'iPhone Selfie V4 · Night Mode',
    escena: 'calle nocturna',
    outfit: '',
    pose: 'selfie nocturna',
    encuadre: 'primer_plano',
    luz: 'modo noche de teléfono, luz ambiental de neón, grano leve',
  },
]

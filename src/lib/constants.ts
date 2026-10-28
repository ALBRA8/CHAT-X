// EL ESTUDIO — constantes de dominio, economía de créditos y reglas de compliance
// Fuente: FICHA_Estudio_v1.md (secciones 3, 5, 6 y Anexo A)

// ── Estados ──
export const CHARACTER_STATUS = {
  BORRADOR: 'BORRADOR',
  ENTRENANDO: 'ENTRENANDO',
  ACTIVO: 'ACTIVO',
  PAUSADA: 'PAUSADA',
} as const

export const JOB_STATUS = {
  EN_COLA: 'en_cola',
  PROCESANDO: 'procesando',
  LISTO: 'listo',
  FALLIDO: 'fallido',
} as const

export const JOB_TYPE = {
  DATASET: 'dataset',
  ENTRENAMIENTO: 'entrenamiento',
  LOTE_FOTOS: 'lote_fotos',
  RENDER_FINAL: 'render_final',
  CIFRADO: 'cifrado',
} as const

export const PIPELINE = {
  BORRADOR: 'borrador',
  QA: 'qa',
  APROBADO: 'aprobado',
  CIFRADO: 'cifrado',
  PUBLICADO: 'publicado',
} as const

export const LANE = {
  PUBLICO: 'PUBLICO',
  PRIVADO: 'PRIVADO',
} as const

export type Lane = (typeof LANE)[keyof typeof LANE]

// ── Economía de créditos (Anexo A regla 8: coste siempre visible antes de generar) ──
export const COSTOS = {
  PREVIEW: 2, // vista previa barata por pieza
  RENDER_FINAL: 15, // render final caro por pieza
  FOTO_DATASET: 1.5, // por foto del dataset de entrenamiento
  ENTRENAMIENTO_LORA: 240, // por ciclo de entrenamiento
  CIFRADO: 1, // por pieza cifrada
} as const

// Latencia simulada del proveedor (ms). El proveedor real reemplaza esto.
export const LATENCIA_SIMULADA = {
  PREVIEW_MS: [150, 320] as const,
  RENDER_MS: [1100, 2400] as const,
  DATASET_FOTO_MS: [150, 260] as const,
  ENTRENAMIENTO_MS: 22000, // total aproximado
  CIFRADO_MS: [120, 260] as const,
}

export const DATASET_MIN = 30
export const DATASET_MAX = 50
export const DATASET_DEFAULT = 40
export const LOTE_MAX = 32
export const EXAMEN_ESCENAS = 5

// Etiqueta IA obligatoria en todo paquete exportado (checklist sala limpia)
export const ETIQUETA_IA = 'Contenido generado con IA'

// ── Filtro de edad aparente — BLOQUEO DURO REAL (no simulado) ──
// Escanea el texto del brief; si dispara, la pieza se rechaza con motivo
// "Filtro de edad aparente" y se registra evento de compliance.
export const TERMINOS_PROHIBIDOS_EDAD: string[] = [
  'niña', 'niñas', 'niño', 'niños', 'chiquita', 'chiquito',
  'menor', 'menores', 'infante', 'infantil', 'bebé', 'bebe', 'beba',
  'loli', 'lolicon', 'shota', 'preteen', 'pre-teen', 'tween',
  'teen', 'teens', 'adolescente', 'adolescentes', 'colegiala', 'colegial',
  'uniforme escolar', 'escuela primaria', 'secundaria', 'kinder', 'jardin de niños',
  'underage', 'minor', 'child', 'children', 'kid', 'london ageplay',
]

// Patrón para edades explícitas por debajo de 18 ("16 años", "17 años"…)
export const PATRON_EDAD_MENOR = /\b(1[0-7]|[1-9])\s*(años|yo|years?[\s-]?old)\b/i

export function detectarTerminosProhibidos(texto: string): string[] {
  const encontrados: string[] = []
  const normalizado = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar acentos para comparar
  const textoSinAcentos = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  for (const termino of TERMINOS_PROHIBIDOS_EDAD) {
    const t = termino
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    const regex = new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (regex.test(textoSinAcentos)) {
      encontrados.push(termino)
    }
  }

  if (PATRON_EDAD_MENOR.test(normalizado)) {
    encontrados.push('mención de edad < 18')
  }
  return [...new Set(encontrados)]
}

// ── Checkpoint ficticio del simulador ──
export const CHECKPOINT_SIMULADOR = 'estudio-sdxl-sim-v1'

export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

export function mesActual(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

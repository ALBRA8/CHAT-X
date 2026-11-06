// Configuración en caliente de CHAT-X — el panel de Configuración escribe aquí con un click.
//
// Contrato con la constitución:
//  - Resolución HONESTA y declarada: fila en BD (fuente='bd', guardada desde el panel)
//    > variable de entorno (fuente='env', .env del operador) > defecto del código
//    (fuente='defecto'). La API expone la FUENTE de cada valor: el panel nunca disimula
//    de dónde salió una configuración.
//  - Getters SÍNCRONOS: mismo contrato que ya cumplían (env leída en cada llamada, como
//    exigían los tests para inyección). La BD se refleja en una caché de proceso
//    (patrón globalThis igual que db.ts/privado.ts) recargada por las rutas API con
//    recargarConfig() — TTL corto, coste ~0. En bun test nadie recarga la BD: la caché
//    queda vacía y las env inyectadas siguen mandando EXACTAMENTE igual que antes.
//  - Secretos (API keys): se guardan solo en la BD local (db/ fuera de git), la API
//    jamás los devuelve completos (enmascarados) y un campo vacío en el panel NUNCA
//    borra el valor actual (borrar es explícito, con «Restaurar»).
//  - Cada cambio queda registrado en el log de compliance (append-only).
import { db } from '@/lib/db'

export type CategoriaConfig = 'llm' | 'voz' | 'media' | 'general'
export type TipoDatoConfig = 'texto' | 'secreto' | 'numero'

export interface DefinicionConfig {
  clave: string
  etiqueta: string
  descripcion: string
  categoria: CategoriaConfig
  tipo: TipoDatoConfig
  envVar: string // fuente de respaldo (.env) si el panel no guardó nada
  porDefecto: string // '' = el consumidor aplica su propio defecto (comportamiento idéntico al previo)
  validar?: (valor: string) => string | null // null = válida; string = error humano
}

function esUrl(v: string): string | null {
  if (!/^https?:\/\//.test(v)) return 'debe empezar por http:// o https://'
  if (v.length > 300) return 'demasiado larga (máx 300)'
  if (/^https?:\/\/[^\s/:@]+:[^\s/:@]+@/.test(v)) return 'no incrustes usuario:contraseña — guárdalo como credencial aparte'
  return null
}

function esRuta(v: string): string | null {
  if (!v.startsWith('/')) return 'debe ser una ruta absoluta del servidor (empieza por /)'
  if (v.length > 400) return 'demasiado larga (máx 400)'
  return null
}

function numeroEn(min: number, max: number): (v: string) => string | null {
  return (v) => {
    const n = Number(v)
    if (!Number.isFinite(n) || n < min || n > max) return `debe ser un número entre ${min} y ${max}`
    return null
  }
}

// El catálogo completo de lo que el panel puede configurar. Añadir aquí = aparecer
// en el panel (la UI se genera de estas definiciones, no hay formularios repetidos).
export const DEFINICIONES_CONFIG: DefinicionConfig[] = [
  // ── Cerebro del chat (LLM OpenAI-compatible: NIM, Groq, OpenRouter…) ──
  {
    clave: 'llm.api_key',
    etiqueta: 'API key del LLM',
    descripcion: 'Credencial Bearer del proveedor OpenAI-compatible. Se guarda en la BD local (nunca en git) y jamás se devuelve completa.',
    categoria: 'llm',
    tipo: 'secreto',
    envVar: 'LLM_API_KEY',
    porDefecto: '',
  },
  {
    clave: 'llm.base_url',
    etiqueta: 'Base URL (OpenAI-compatible)',
    descripcion: 'Raíz de la API sin barra final. Ej: https://integrate.api.nvidia.com/v1 (NIM) o https://api.groq.com/openai/v1.',
    categoria: 'llm',
    tipo: 'texto',
    envVar: 'LLM_BASE_URL',
    porDefecto: '',
    validar: esUrl,
  },
  {
    clave: 'llm.modelo',
    etiqueta: 'Modelo',
    descripcion: 'Identificador exacto del modelo. Ej: z-ai/glm-5.3-flash (NIM) o llama-3.3-70b-versatile (Groq).',
    categoria: 'llm',
    tipo: 'texto',
    envVar: 'LLM_MODEL',
    porDefecto: '',
  },
  {
    clave: 'llm.proveedor',
    etiqueta: 'Etiqueta del proveedor',
    descripcion: 'Nombre corto para procedencia y compliance: groq, nim, openrouter, together…',
    categoria: 'llm',
    tipo: 'texto',
    envVar: 'LLM_PROVEEDOR',
    porDefecto: '',
  },
  {
    clave: 'llm.max_tokens',
    etiqueta: 'Presupuesto de tokens de salida',
    descripcion: 'Los modelos de razonamiento queman tokens en reasoning ANTES del contenido: si responde vacío, súbelo (64–4096).',
    categoria: 'llm',
    tipo: 'numero',
    envVar: 'LLM_MAX_TOKENS',
    porDefecto: '',
    validar: numeroEn(64, 4096),
  },
  {
    clave: 'llm.timeout_ms',
    etiqueta: 'Timeout del LLM (ms)',
    descripcion: 'Los modelos de razonamiento tardan ~25–40 s: con 30 s abortaba en seco (verificado con GLM en NIM). Rango 5000–120000.',
    categoria: 'llm',
    tipo: 'numero',
    envVar: 'LLM_TIMEOUT_MS',
    porDefecto: '',
    validar: numeroEn(5000, 120000),
  },
  // ── Voz local (TTS $0: espeak-ng robótico / piper natural) ──
  {
    clave: 'voz.espeak_bin',
    etiqueta: 'Binario de espeak-ng',
    descripcion: 'Ejecutable del sintetizador robótico local. Defecto: espeak-ng (en el PATH).',
    categoria: 'voz',
    tipo: 'texto',
    envVar: 'ESPEAK_BIN',
    porDefecto: '',
  },
  {
    clave: 'voz.piper_py',
    etiqueta: 'Intérprete Python de piper',
    descripcion: 'Python que puede importar el paquete piper. Defecto: python3.',
    categoria: 'voz',
    tipo: 'texto',
    envVar: 'PIPER_PY',
    porDefecto: '',
  },
  {
    clave: 'voz.piper_script',
    etiqueta: 'Script de síntesis de piper',
    descripcion: 'Ruta absoluta de scripts/piper_sintetizar.py en esta máquina.',
    categoria: 'voz',
    tipo: 'texto',
    envVar: 'PIPER_SCRIPT',
    porDefecto: '',
    validar: esRuta,
  },
  {
    clave: 'voz.piper_modelo_dir',
    etiqueta: 'Directorio de modelos onnx',
    descripcion: 'Carpeta con los .onnx de piper-voices (es_ES…). Defecto: <proyecto>/models/piper.',
    categoria: 'voz',
    tipo: 'texto',
    envVar: 'PIPER_MODELO_DIR',
    porDefecto: '',
    validar: esRuta,
  },
  {
    clave: 'voz.clon_py',
    etiqueta: 'Intérprete Python del clon de voz',
    descripcion: 'Python con openvoice+melo importables (paquete --no-deps + dependencias). Defecto: python3.',
    categoria: 'voz',
    tipo: 'texto',
    envVar: 'VOZ_CLON_PY',
    porDefecto: '',
  },
  {
    clave: 'voz.clon_script',
    etiqueta: 'Script del clon de voz',
    descripcion: 'Ruta absoluta de scripts/voz_clon_sintetizar.py (OpenVoice v2 + MeloTTS-es, licencia MIT).',
    categoria: 'voz',
    tipo: 'texto',
    envVar: 'VOZ_CLON_SCRIPT',
    porDefecto: '',
    validar: esRuta,
  },
  {
    clave: 'voz.clon_modelo_dir',
    etiqueta: 'Directorio de pesos del clon',
    descripcion: 'Carpeta con openvoicev2/ y melotts-es/ (pesos MIT, ~324 MB). Defecto: <proyecto>/models/clon.',
    categoria: 'voz',
    tipo: 'texto',
    envVar: 'VOZ_CLON_MODELO_DIR',
    porDefecto: '',
    validar: esRuta,
  },
  // ── Imagen / vídeo (proveedor del Estudio) ──
  {
    clave: 'media.proveedor',
    etiqueta: 'Proveedor de imagen del Estudio',
    descripcion: 'simulador (desarrollo, $0) · local-cpu (diffusers+SD1.5 real en CPU) · comfyui (GPU real vía HTTP).',
    categoria: 'media',
    tipo: 'texto',
    envVar: 'ESTUDIO_PROVIDER',
    porDefecto: '',
    validar: (v) => (['simulador', 'local-cpu', 'comfyui'].includes(v) ? null : 'debe ser: simulador, local-cpu o comfyui'),
  },
  {
    clave: 'media.comfyui_url',
    etiqueta: 'URL de ComfyUI',
    descripcion: 'Servidor ComfyUI con --listen. Ej: http://127.0.0.1:8188. Vacío = sin proveedor de vídeo ni GPU.',
    categoria: 'media',
    tipo: 'texto',
    envVar: 'COMFYUI_URL',
    porDefecto: '',
    validar: esUrl,
  },
  {
    clave: 'media.comfyui_api_key',
    etiqueta: 'API key de ComfyUI (opcional)',
    descripcion: 'Solo si tu ComfyUI/gateway exige Authorization. Vacío = conexión sin credencial.',
    categoria: 'media',
    tipo: 'secreto',
    envVar: 'COMFYUI_API_KEY',
    porDefecto: '',
  },
  {
    clave: 'media.comfyui_workflow',
    etiqueta: 'Workflow de ComfyUI (formato API)',
    descripcion: 'Ruta absoluta al JSON exportado con Save (API Format), con marcadores {{PROMPT}}/{{SEED}}/{{WIDTH}}/{{HEIGHT}}.',
    categoria: 'media',
    tipo: 'texto',
    envVar: 'COMFYUI_WORKFLOW_JSON',
    porDefecto: '',
    validar: esRuta,
  },
  {
    clave: 'media.comfyui_timeout_ms',
    etiqueta: 'Timeout de ComfyUI (ms)',
    descripcion: 'Cuánto esperar un render antes de abortar (15000–1800000).',
    categoria: 'media',
    tipo: 'numero',
    envVar: 'COMFYUI_TIMEOUT_MS',
    porDefecto: '',
    validar: numeroEn(15000, 1800000),
  },
  {
    clave: 'media.cpu_script',
    etiqueta: 'Script de generación CPU',
    descripcion: 'Ruta absoluta de scripts/provider_cpu_generar.py (diffusers + SD 1.5 fp16, probado 86.4 s/imagen).',
    categoria: 'media',
    tipo: 'texto',
    envVar: 'LOCAL_CPU_SCRIPT',
    porDefecto: '',
    validar: esRuta,
  },
  {
    clave: 'media.cpu_pasos',
    etiqueta: 'Pasos de difusión en CPU',
    descripcion: 'Más pasos = mejor calidad y más lento. Probado: 12 pasos → 86.4 s por imagen 384×384 (1–100).',
    categoria: 'media',
    tipo: 'numero',
    envVar: 'LOCAL_CPU_PASOS',
    porDefecto: '',
    validar: numeroEn(1, 100),
  },
  {
    clave: 'media.cpu_timeout_ms',
    etiqueta: 'Timeout de generación CPU (ms)',
    descripcion: 'Techo del proceso python de difusión (10000–3600000).',
    categoria: 'media',
    tipo: 'numero',
    envVar: 'LOCAL_CPU_TIMEOUT_MS',
    porDefecto: '',
    validar: numeroEn(10000, 3600000),
  },
  // ── General (marca blanca y fuentes de tendencias) ──
  {
    clave: 'general.rss_urls',
    etiqueta: 'Feeds RSS de tendencias',
    descripcion: 'URLs separadas por coma (máx 5) para NEX-SCOPE. Solo sindicación declarada, sin scraping.',
    categoria: 'general',
    tipo: 'texto',
    envVar: 'TREND_RSS_URLS',
    porDefecto: '',
  },
  {
    clave: 'general.marca_nombre',
    etiqueta: 'Nombre de marca (white-label)',
    descripcion: 'Vacío = CHAT-X. Cambia el rótulo en superficies y materiales generados.',
    categoria: 'general',
    tipo: 'texto',
    envVar: 'MARCA_NOMBRE',
    porDefecto: '',
  },
  {
    clave: 'general.marca_color',
    etiqueta: 'Color primario de marca',
    descripcion: 'Hex (#7c3aed por defecto) para materiales del white-label.',
    categoria: 'general',
    tipo: 'texto',
    envVar: 'MARCA_COLOR',
    porDefecto: '',
    validar: (v) => (/^#[0-9a-fA-F]{6}$/.test(v) ? null : 'debe ser un hex de 6 dígitos, p.ej. #7c3aed'),
  },
  {
    clave: 'general.marca_dominio',
    etiqueta: 'Dominio de la marca',
    descripcion: 'Dominio público del white-label (informativo, sin efecto de red).',
    categoria: 'general',
    tipo: 'texto',
    envVar: 'MARCA_DOMINIO',
    porDefecto: '',
  },
]

const INDICE_CONFIG = new Map(DEFINICIONES_CONFIG.map((d) => [d.clave, d]))

export function defConfig(clave: string): DefinicionConfig | undefined {
  return INDICE_CONFIG.get(clave)
}

export type FuenteValor = 'bd' | 'env' | 'defecto'

export interface ValorConfig {
  valor: string
  fuente: FuenteValor
}

// Caché de proceso: una sola instancia aunque el dev server recargue módulos.
const G = globalThis as unknown as {
  __chatxConfigBD?: Map<string, string>
  __chatxConfigTs?: number
}
const TTL_CONFIG_MS = 5000

/** Carga las filas del panel a la caché (throttle: máx una lectura a BD cada 5 s). */
export async function recargarConfig(fuerza = false): Promise<void> {
  const ahora = Date.now()
  if (!fuerza && G.__chatxConfigBD && ahora - (G.__chatxConfigTs ?? 0) < TTL_CONFIG_MS) return
  try {
    const filas = await db.configuracion.findMany()
    const mapa = new Map(filas.filter((f) => f.valor !== '').map((f) => [f.clave, f.valor]))
    G.__chatxConfigBD = mapa
    G.__chatxConfigTs = ahora
  } catch {
    // BD indisponible (p.ej. tests herméticos): el env manda, la caché queda como esté.
  }
}

/** Invalida la caché (tras escribir desde el panel). */
export function invalidarConfig(): void {
  G.__chatxConfigBD = undefined
  G.__chatxConfigTs = 0
}

/** Resolución declarada: BD (panel) > env > defecto. SÍNCRONA por contrato. */
export function valorConfig(clave: string): ValorConfig {
  const def = INDICE_CONFIG.get(clave)
  if (!def) return { valor: '', fuente: 'defecto' }
  const deBD = G.__chatxConfigBD?.get(clave)
  if (deBD !== undefined && deBD !== '') return { valor: deBD, fuente: 'bd' }
  const deEnv = (process.env[def.envVar] || '').trim()
  if (deEnv) return { valor: deEnv, fuente: 'env' }
  return { valor: def.porDefecto, fuente: 'defecto' }
}

/** Enmascara un secreto para la API/UI: nunca sale completo. */
export function enmascararSecreto(v: string): string {
  if (!v) return ''
  if (v.length <= 8) return '••••••'
  return `••••••${v.slice(-4)}`
}

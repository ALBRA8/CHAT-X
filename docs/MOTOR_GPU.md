# MOTOR GPU — Producción audiovisual real con GPU (sección 5 del prompt maestro)

## Estado honesto
- **En este sandbox NO hay GPU** (contenedor sin nvidia-smi). Todo lo de abajo
  está implementado y probado en su lógica de integración, pero la generación
  real con ComfyUI solo puede verificarse en la máquina del fundador con GPU.
- El proveedor activo se controla con `ESTUDIO_PROVIDER` (por defecto `simulador`).

## Arquitectura
```
CHAT-X (Next.js)                    GPU local / servidor remoto
┌───────────────────────┐   HTTP    ┌─────────────────────────┐
│ worker.ts (cola Jobs) │ ────────▶ │ ComfyUI 127.0.0.1:8188  │
│ provider/comfyui.ts   │  /prompt  │ workflow SDXL/Flux+LoRA │
│ (interfaz Provider)   │ ◀──────── │ PNG → cache → Media     │
└───────────────────────┘  /history /view
```
- La interfaz `Provider` (src/lib/provider/types.ts) NO cambia: UI, cola,
  cifrado AES-256-GCM del carril privado y compliance quedan intactos.
- Los PNG de ComfyUI viajan envueltos en un contenedor SVG (`<image href="data:image/png;base64,…">`):
  todo el pipeline de archivos/cifrado/miniaturas sigue funcionando sin cambios.

## Instalación en TU máquina (una sola vez)
1. Instala ComfyUI + ComfyUI-Manager (requisitos: Python 3.10+, CUDA 12.x con tu driver NVIDIA).
2. Descarga los modelos que vas a usar (SDXL base + tu LoRA cuando exista). No descargues de más: 12 GB VRAM soporta SDXL 1024 con optimizaciones (--lowvram si hace falta).
3. Arranca: `python main.py --listen 127.0.0.1 --port 8188`
4. En ComfyUI, arma el workflow con un nodo `CLIPTextEncode` (texto) y un `KSampler` (seed) y expórtalo con **Save (API Format)** → guarda como `comfy_workflow_api.json`.
5. Configura CHAT-X (ver .env.example):
   ```
   ESTUDIO_PROVIDER=comfyui
   COMFYUI_URL=http://127.0.0.1:8188
   COMFYUI_WORKFLOW_JSON=/ruta/absoluta/comfy_workflow_api.json
   ```
6. Reinicia CHAT-X. El marcador de "proveedor" del sidebar dirá `comfyui`.
   Los workflows con marcadores {{PROMPT}}/{{SEED}} no son necesarios: el
   adaptador inyecta texto en el primer nodo CLIPTextEncode y seed en el KSampler.

## Flujo de generación (worker.ts)
1. El Job (lote/render) llama a `producirPieza()`.
2. Si `provider.name === 'comfyui'`: `prepararImagenComfy(req)` hace
   POST /prompt → polling /history/{id} → GET /view → cache por semilla.
3. `generateImage(req)` consume el cache y el resto del pipeline es idéntico
   (QA humano en Biblioteca, cifrado si carril PRIVADO, compliance append-only).

## Verificación y salud
- `GET /api/sistema` → GPU detectada (nvidia-smi con args fijos), VRAM, driver,
  CUDA, ffmpeg, ComfyUI alcanzable (vía /system_stats), trabajos activos de la cola.
- `bash scripts/detectar_gpu.sh` → JSON equivalente desde la terminal (para TU máquina).
- El botón/sonda del módulo Ops muestra el estado real; nada se inventa.

## QA de identidad con proveedor real — límite declarado
Con ComfyUI el QA automático determinista del simulador NO aplica. El
adaptador devuelve veredicto de identidad/anatomía "aprobado con nota" y deja
la puerta final en la revisión humana (aprobar/rechazar por pieza), igual que
exige la política de originalidad de Fanvue (guardar prompts/seeds/historial).
La provenance de cada pieza registra proveedor=comfyui y el prompt real enviado.

## Escalera de calidad (Apatero-style, de la investigación ClonaKit)
| Escalón | kind | tamaño | uso recomendado |
|---|---|---|---|
| preview | preview | 512×768 | pruebas baratas de composición |
| final | final | 832×1216 | pieza publicable |
La escalera de VÍDEO (draft→max) queda documentada como capacidad futura:
requiere proveedor de vídeo (Google Flow vía YOUTUBE-AUTOMATION o nodo de vídeo
en ComfyUI) y está registrada como bloqueada por hardware/credenciales, no como
implementada.

## Raster de motores candidatos (intel referente #24 IA HUB, 2026-10-29)

Mapa de motores que el nicho está usando HOY (curso IA HUB «Imperio») — candidatos
para el día del desbloqueo, NO integrados todavía. Ninguno cambia el estado honesto
actual: sin GPU local o cuenta externa, el vídeo sigue BLOQUEADO EXTERNO.

| Motor | Modalidad | Vía de entrada en CHAT-X |
|---|---|---|
| **Wan 2.2** (img→vídeo / texto→vídeo) | open weights, nodos ComfyUI de comunidad | Encaja en la escalera P2.4 (draft→max) como motor de render con GPU local — mismo contrato de workflow API del adaptador existente |
| **LTX Video** | open weights, nodos ComfyUI | Igual que Wan: segundo candidato de render, útil para comparar calidad/coste por escalón |
| **Z-Image Turbo** | open weights, pocos pasos | Candidato al escalón `preview` (composición barata rápida) del raster de imagen |
| **Krea 2** | open/SaaS según versión | Candidato al escalón `final` (calidad publicable) |
| **MiniMax H3** | SaaS cerrado (API de pago) | Solo vía cuenta externa del fundador — BLOQUEADO EXTERNO |
| **Higgsfield / Genjutsu** | SaaS cerrado (vídeo viral, personajes) | Solo observación: vendor-lock + suscripción; sin integración planeada |
| **RunningHub** | **ComfyUI ALOJADO en la nube** (workflows API) | La vía para desbloquear el render de vídeo SIN GPU local: el adaptador ComfyUI existente (contrato workflow API + sonda de nodos) aplicaría casi sin tocar código. Requiere cuenta de pago → BLOQUEADO EXTERNO (decisión del fundador) |

Prioridad sugerida si se desbloquea hardware/dinero: (1) GPU local + Wan 2.2/LTX
(ruta $0 recurrente ya documentada arriba), (2) RunningHub como alternativa sin GPU
(costo mensual), (3) SaaS cerrados solo para comparar calidad, nunca como núcleo.

## Desbloqueo exacto (para el fundador)
1. Tener GPU NVIDIA (RTX 3060 12GB o superior recomendado) con driver + CUDA.
2. Instalar ComfyUI y exportar el workflow API.
3. Poner las 3 variables de entorno y reiniciar.
4. Verificar con `GET /api/sistema` y una generación de preview real.

## CPU REAL — probado con generación real (2026-10-28, sandbox 2 vCPU / 3.9 GB RAM)

Sin GPU en el sandbox, la alternativa de CPU se probó de verdad (orden: "prueba
primero la alternativa de CPU"). Resultados medidos, no estimados:

| Dato | Valor medido |
|---|---|
| Modelo | Stable Diffusion 1.5 fp16 (componentes oficiales HF, ~2.2 GB descargados) |
| Stack | torch 2.15.0+cpu · diffusers 0.42.1 · Python 3.12 |
| Imagen real | **384×384, 12 pasos → 86.4 s**, RAM pico **1,892 MB** |
| Archivo real | `download/cpu_generacion_real.png` (PNG válido 266 KB, foto fotorrealista verificada) |
| Adaptador E2E | 5 pruebas contra contrato API ComfyUI (stub local) — inyección, polling, descarga, errores |
| Provider integrado | `ESTUDIO_PROVIDER=local-cpu` → `src/lib/provider/localcpu.ts` (misma interfaz, worker integrado, prueba E2E real opt-in `PRUEBAS_GENERACION_REAL=1 bun test test/unit/provider-localcpu.test.ts`) |
| TTS voz real (separado) | Piper 1.8 es_ES-carlfm-x_low → **5.3 s de audio en 0.21 s de CPU** (20× tiempo real), WAV real en `download/voz_real_es.wav` |
| Benchmark reproducible | `bash scripts/benchmark_cpu.sh` (N corridas + $/imagen a tarifa dada) |
| VÍDEO | **Sigue BLOQUEADO sin GPU**: SVD/Wan2.1 requieren GPU; AnimateDiff en CPU ≈ horas por clip. No se declara activo. |

Extrapolación honesta (derivada, no medida): 512×768/20 pasos ≈ 4–5 min/imagen
en estas 2 vCPU. La CPU sirve para previews, pruebas y volúmenes bajos;
para producción real, ComfyUI+GPU (docs/EVALUACION_GPU.md) sigue siendo la vía.
En una máquina doméstica de 8 vCPU el mismo flujo cae a ~25–40 s/imagen preview.

## Requisitos exactos del fallback CPU (para el operador)
```bash
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install diffusers transformers safetensors accelerate   # ≈ 2.5 GB en disco
# el modelo (~2.2 GB) se descarga solo al primera generación (cache HF)
echo 'ESTUDIO_PROVIDER=local-cpu' >> .env    # y reiniciar CHAT-X
# opcional: LOCAL_CPU_PASOS=12 · LOCAL_CPU_TIMEOUT_MS=600000
```

## Voz (TTS) — estados honestos tras el provider de voz (2026-10-29)

P1.3 de CLONAKIT_BRECHAS implementado: contrato de voz por personaje +
`GET/PUT/POST /api/characters/[id]/voz` con sondeo real de proveedores.

| Proveedor | Estado en esta máquina | Cómo activarlo |
|---|---|---|
| espeak-local | **OPERATIVO** ($0, binario espeak-ng 1.52, calidad robótica funcional) | ya activo — sin pasos |
| piper-local | **OPERATIVO** (P1.3 fase 2: síntesis CABLEADA, paquete piper + modelo `es_ES-carlfm-x_low` en `models/piper/`; E2E real 2026-10-29: 4.1 s de audio en 0.14 s de CPU — 29× tiempo real) | ya activo — sin pasos (receta de instalación abajo para una máquina nueva) |

El sondeo (`sondearProveedoresVoz()`) usa sonda real de DOS capas: paquete
python `import piper` **Y** modelo onnx presente — nunca reporta OPERATIVO por
promesa, y si falta una capa el detalle dice exactamente cuál y cómo instalarla.

### Instalación de piper en una máquina nueva (una sola vez)
```bash
pip install piper-tts
mkdir -p models/piper
curl -L -o models/piper/es_ES-carlfm-x_low.onnx \
  "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/es/es_ES/carlfm/x_low/es_ES-carlfm-x_low.onnx"
curl -L -o models/piper/es_ES-carlfm-x_low.onnx.json \
  "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/es/es_ES/carlfm/x_low/es_ES-carlfm-x_low.onnx.json"
# reiniciar CHAT-X — la sonda /api/characters/[id]/voz declara piper-local OPERATIVO
```
Overridables: `PIPER_PY` (python3), `PIPER_SCRIPT` (scripts/piper_sintetizar.py),
`PIPER_MODELO_DIR` (models/piper). El `tono` del contrato NO es ajustable en
piper y se declara ignorado en la respuesta (honestidad sobre límites reales).

## Contrato img2img (Outfit Swap P2.6) — implementado, prueba hermética incluida

El adaptador ComfyUI soporta try-on real: si el GenerationRequest trae
`img2img = { mediaRefId, denoise, rutaReferencia }`:
1. Detecta un nodo `LoadImage`/`LoadImageMask` en el workflow exportado (API format).
2. Extrae el PNG embebido de la pieza de referencia (SVG contenedor) y la sube
   a `POST /upload/image` (multipart, `overwrite=true`).
3. Inyecta el filename devuelto en el nodo `LoadImage` y fija `denoise` BAJO
   (0.2–0.9, defecto 0.55) en el `KSampler` — denoise bajo = respetar identidad.

Errores honestos cubiertos por unitarias herméticas (stub de contrato API):
- workflow SIN `LoadImage` → "el workflow no tiene nodo LoadImage — exporta un
  workflow con LoadImage + KSampler(denoise) para try-on real".
- referencia SVG pura (pieza del simulador, sin raster embebido) → "img2img:
  la referencia no contiene PNG embebido... try-on real requiere pieza raster
  de proveedor real".

La ruta `POST /api/studio/outfit-swap` valida que la referencia sea del propio
personaje, esté APROBADA por QA y esté en carril público (no cifrada); el
worker la REVALIDA antes de generar. Con el simulador, el Outfit Swap funciona
sin referencia: la identidad es determinista por baseSeed y la procedencia
declara `img2img_declarado` (vs `img2img_aplicado` con ComfyUI).

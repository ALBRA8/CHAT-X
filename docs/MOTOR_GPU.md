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

## Desbloqueo exacto (para el fundador)
1. Tener GPU NVIDIA (RTX 3060 12GB o superior recomendado) con driver + CUDA.
2. Instalar ComfyUI y exportar el workflow API.
3. Poner las 3 variables de entorno y reiniciar.
4. Verificar con `GET /api/sistema` y una generación de preview real.

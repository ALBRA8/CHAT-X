# EVALUACIÓN GPU — datos concretos para decidir (orden maestra §3)

Fecha: 2026-10-29 · Estado del entorno de medición: **sin GPU en este sandbox**
(`/api/sistema` reporta honestamente `none/simulador`; `scripts/detectar_gpu.sh` = sin NVIDIA).
Precios de nube verificados en fuentes públicas el 2026-10-28/29 (RunPod y comparativas 2026 citadas al pie).
Nada de este documento declara generación real: el único validador es `scripts/benchmark_gpu.sh` (§7).

---

## 1. Modelos concretos que propongo ejecutar

| Modelo | Uso en CHAT-X | Carril |
|---|---|---|
| **SDXL base 1.0** + finetunes realistas (p. ej. familia Pony/Juggernaut/RealVis — verificar licencia por checkpoint) | Fotos del Estudio: dataset (30-50), previews, renders finales, examen de identidad, lote multi-escena | Público + 18+ (privado) |
| **FLUX.1 [schnell]** (Apache 2.0) | Alternativa rápida de borradores (4 pasos); NO usar FLUX.1 [dev] (licencia no-comercial, ver §6) | Público |
| **Wan 2.1 14B** (Apache 2.0) | Clips de vídeo cortos (5-15s) para Fanvue: escenas del calendario | Público/privado |
| **LTX-Video 2B** (OpenRAIL-M) | Vídeo draft barato en GPUs de 12GB mientras no haya 24GB | Público (draft) |

LoRA: el entrenamiento de genomas (E1) usa el mismo SDXL con kohya-ss/ComfyUI — un run de LoRA SDXL ≈ 30-60 min en RTX 4090 / 1.5-3 h en RTX 3060.

## 2. Qué desbloquea cada modelo en CHAT-X

| Modelo | Funciones CHAT-X que desbloquea (hoy en simulador) |
|---|---|
| SDXL + finetunes | Generación REAL de: dataset → LoRA → examen → lote previews → render final → cifrado 18+ → Sets → calendario. Todo el pipeline E1-E4 deja de ser simulado. |
| FLUX.1 [schnell] | Borradores rápidos para QA de composición antes del render caro (menos créditos quemados). |
| Wan 2.1 / LTX | Carril vídeo: `youtube_submit` ya existe para el motor YT; añadiría clips para Sets PPV y para el módulo UGC. |

## 3. Requisitos de hardware por modelo

| Modelo | VRAM mínima | VRAM recomendada | RAM sistema | Disco (modelo) |
|---|---|---|---|---|
| SDXL 1024px inferencia | 8 GB | **12 GB** | 16 GB | ~7 GB |
| SDXL LoRA training | 10 GB (8-bit + checkpointing, lento) | 16-24 GB | 32 GB | + datasets |
| FLUX.1 [schnell] fp8 | 12 GB | 16-24 GB | 32 GB | ~12-24 GB |
| LTX-Video 2B | 8-12 GB | 12 GB | 32 GB | ~6 GB |
| Wan 2.1 14B (fp16 + offload) | 24 GB (lento) | **48 GB** | 64 GB | ~60-90 GB |

**Sistema operativo**: Linux x86_64 (Ubuntu 22.04+) recomendado; Windows con WSL2 funciona. Driver NVIDIA ≥ 535, CUDA 12.x, FFmpeg en PATH (ya requisito del motor YT).

## 4. CPU vs GPU local vs GPU nube

| Vía | SD1.5 384px/12p (MEDIDO) | SDXL 1024px | Wan 14B clip 5s | Veredicto para CHAT-X |
|---|---|---|---|---|
| **CPU sandbox 2 vCPU** | **50.8 s/imagen estable (medido 2026-10-28, benchmark_cpu.sh), 71 img/h, $0.0007/img a $0.02/h — RAM pico 1.9 GB** | est. ~8-20 min/imagen (escala SDXL/CPU) | inviable | **REAL y activo como provider `local-cpu`**: sirve para previews, QA de pipeline y volúmenes bajos. NO para producción en serie. |
| **CPU 16 núcleos (est.)** | ~12-18 s/imagen (extrapolación lineal por núcleos) | ~5-15 min/imagen | inviable | Solo pruebas de pipeline; NO producción. |
| **GPU local RTX 3060 12GB** (~$250 usada) | ~3-6 s/imagen | ~25-35 s/imagen (medir con benchmark) | No (necesita 24GB+; LTX draft sí) | Viable para el carril FOTO completo. $0/mes marginal (~1.4 kWh por 100 imágenes ≈ $0.35). |
| **GPU nube RunPod Community** (verificado 2026) | <1 s/imagen | A5000 $0.16/h · 3090 $0.22/h · 4090 $0.34/h · 5090 $0.69/h · A6000 48GB $0.33-0.49/h | 4090: clip 5s ≈ 3-6 min → $0.02-0.04 | Facturación por segundo (sin mínimo) → ideal para ráfagas; pod apagado = $0 de cómputo (volumen sigue facturando $0.10/GB/mes — borrar modelos al terminar). |
| **API cerrada (Replicate/fal/…)** | — | ~$0.003-0.05/imagen según modelo | varía | **NO viable para el carril 18+**: sus ToS prohíben NSFW. Riesgo de baneo + fuga de prompts. Solo para carril público si algún día se quisiera. |

Coste por imagen medible en nube (cálculo con tarifa verificada, PENDIENTE de validar con el benchmark real):
- A5000 $0.16/h: SDXL ~130 img/h → **≈ $0.0012/imagen**. Lote 8 previews + 4 renders ≈ **$0.014**.
- 4090 $0.34/h: ~300 img/h → ≈ $0.0011/imagen (la tarifa alta la compensa la velocidad).
- Vídeo: 1 min publicado (≈12 clips de 5s) ≈ **$0.25-0.50** en 4090.
- **CPU 2 vCPU (medido)**: SD1.5 preview ≈ $0.0007/imagen — el fallback CPU ya es rentable para previews ilimitadas; el cuello es la VELOCIDAD (71 img/h), no el coste.

## 5. Costos por volumen (escenarios reales del negocio)

| Escenario | Producción mensual | Horas GPU/mes (A5000) | Costo nube/mes | Costo local (3060) |
|---|---|---|---|---|
| Lanzamiento: 2 creadoras | 150 fotos + 30 clips | ~4-6 h | **$1-2** | $250 capex una vez + ~$0.5 electricidad |
| Operación: 5 creadoras | 800 fotos + 120 clips | ~20-25 h | **$4-6** | ídem |
| Escala: 10 creadoras | 2.000 fotos + 300 clips | ~45-60 h | **$9-14** | ídem |

(Cálculo: fotos ≈ 25-30 s/imagen en A5000; clips ≈ 4-6 min cada uno en 4090 — re-medicar con el benchmark.)

## 6. Licencias y restricciones para NUESTRO tipo de contenido (18+, comercial)

| Modelo | Licencia | ¿Comercial? | Nota para carril 18+ |
|---|---|---|---|
| SDXL base 1.0 | CreativeML Open RAIL++-M | **Sí** (con restricciones de uso estándar) | La licencia no prohíbe adulto legal; el filtro lo pone nuestro compliance (edad aparente, etiquetado, procedencia). |
| Finetunes (Civitai) | Heredan/varían por checkpoint | Verificar cada uno | Revisar la tarjeta del checkpoint antes de fijarlo en `COMFYUI_WORKFLOW_JSON`; registrar en procedencia (ya lo hacemos: `provenance.checkpoint`). |
| FLUX.1 [dev] | **No-comercial (BFL)** | **NO** sin licencia de BFL | Descartado para producción; su uso nos expondría legalmente. |
| FLUX.1 [schnell] | Apache 2.0 | Sí | Vía limpia si se quiere estilo FLUX. |
| Wan 2.1 | Apache 2.0 | **Sí** | La mejor base de vídeo para nosotros por licencia + calidad. |
| LTX-Video | OpenRAIL-M | Sí con restricciones | Adjuntar attachment de la licencia en el repo de despliegue. |
| Hunyuan Video | Comunitaria Tencent | Condicional | Restricciones territoriales y de marca — no es nuestra primera opción. |

Regla de compliance que ya aplica (independiente del modelo): filtro de edad aparente duro, etiquetado IA por pieza, log append-only, sin personas reales (anti-NCII, prohibido por Fanvue y por nuestra política).

## 7. Prueba reproducible + criterios objetivos de compra

**Prueba**: `scripts/benchmark_gpu.sh` — workflow SDXL determinista (semilla fija, 20 pasos, 1024px) contra cualquier ComfyUI local o de nube, N corridas, y reporta `s/imagen`, `img/hora` y `$/imagen` a la tarifa que evalúes. Hoy en este sandbox: **SKIP honesto** (no hay ComfyUI — no se inventan números).

**Criterios de decisión (ejecutables):**
1. Medir con el benchmark en la GPU candidata (local o pod de nube por horas).
2. Calcular horas GPU/mes REALES con la contabilidad propia: `gastoHoy × 30 ÷ (imágenes/hora × costo/imagen)`.
3. **Regla de compra**: hardware propio solo si `horas/mes sostenidas > (precio hardware) ÷ (tarifa nube equivalente × 12 meses)`. Ej.: 3060 usada $250 vs A5000 nube $0.16/h → comprar solo si se superan **~130 h/mes** de forma sostenida.
4. **Regla de privacidad**: aunque el cálculo dé nube, usar nube de cómputo crudo (ComfyUI limpio en pod), NUNCA API cerrada, para el carril 18+ (ToS + fuga de prompts).

**Recomendación operativa (sin gastar nada hoy):**
1. Corto plazo: validar el carril real con un pod RunPod Community A5000/3090 **bajo autorización expresa del fundador** (gasto estimado de la validación: <$3-5 en cómputo por segundo). `ESTUDIO_PROVIDER=comfyui` + `COMFYUI_URL` del pod → benchmark → primera generación real end-to-end.
2. Decidir hardware con los números del paso 1 + la regla de compra. Con el volumen proyectado de lanzamiento, la nube por segundo gana; la 3060 local solo se justifica por control total + uso >130 h/mes.
3. Mantener el simulador como carril de desarrollo (coste 0) — ya está integrado por `ESTUDIO_PROVIDER`.

Fuentes de precios: runpod.io/pricing (2026-10-08), comparativa Flexprice con tabla completa 2026-08-18 (B300…A5000), hackceleration.com/labs/runpod-pricing (jun 2026), northflank.com (dic 2025). Las tarifas API por imagen de terceros varían: verificar en la web del proveedor antes de cualquier uso.

#!/usr/bin/env bash
# BENCHMARK REPRODUCIBLE de generación — orden maestra sección 3.7.
# Mide imágenes/segundo REALES contra ComfyUI (local o remoto) con un workflow
# SDXL fijo (misma semilla, mismos pasos) y calcula $/imagen con la tarifa horaria
# que pases. Sin ComfyUI: SKIP honesto (no inventa números).
#
# Uso:
#   BENCHMARK_URL=http://127.0.0.1:8188 \
#   BENCHMARK_CHECKPOINT=sd_xl_base_1.0.safetensors \
#   BENCHMARK_RUNS=3 \
#   BENCHMARK_TARIFA_HORA=0.34 \      # $/h del hardware que evalúas (RunPod 4090 community = 0.34)
#   bash scripts/benchmark_gpu.sh
#
# Criterios de decisión: ver docs/EVALUACION_GPU.md §7.
set -u
URL="${BENCHMARK_URL:-${COMFYUI_URL:-http://127.0.0.1:8188}}"
CHECKPOINT="${BENCHMARK_CHECKPOINT:-sd_xl_base_1.0.safetensors}"
RUNS="${BENCHMARK_RUNS:-3}"
PASOS="${BENCHMARK_PASOS:-20}"
TARIFA="${BENCHMARK_TARIFA_HORA:-0.34}"
SEED="${BENCHMARK_SEED:-123456789}"
W="${BENCHMARK_ANCHO:-1024}"; H="${BENCHMARK_ALTO:-1024}"

echo "== Benchmark CHAT-X contra ComfyUI en $URL =="
echo "   checkpoint=$CHECKPOINT pasos=$PASOS ${W}x${H} corridas=$RUNS tarifa_ref=$\$${TARIFA}/h"

# 1) Salud de ComfyUI
if ! curl -sf --max-time 5 "$URL/system_stats" > /tmp/bench_stats.json 2>/dev/null; then
  echo "SKIP  No hay ComfyUI en $URL — el benchmark solo tiene sentido con generación REAL."
  echo "      Arranca ComfyUI (docs/MOTOR_GPU.md) y reintenta. Nada se simula aquí."
  exit 2
fi
python3 - << 'EOF'
import json
d = json.load(open('/tmp/bench_stats.json'))
s = d.get('system', {}); devs = d.get('devices', [])
print(f"   ComfyUI: {s.get('comfyui_version','?')} · python {s.get('python_version','?')}")
for dv in devs:
    print(f"   GPU: {dv.get('name','?')} · VRAM total {dv.get('vram_total',0)//2**20} MB · libre {dv.get('vram_free',0)//2**20} MB")
EOF

# 2) Workflow SDXL API mínimo fijo (determinista: semilla fija, KSampler estándar)
workflow() {
  cat << EOF
{
  "3": {"class_type": "KSampler", "inputs": {"seed": $SEED, "steps": $PASOS, "cfg": 7.0, "sampler_name": "dpmpp_2m", "scheduler": "karras", "denoise": 1.0,
    "model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["5", 0]}},
  "4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": "$CHECKPOINT"}},
  "5": {"class_type": "EmptyLatentImage", "inputs": {"width": $W, "height": $H, "batch_size": 1}},
  "6": {"class_type": "CLIPTextEncode", "inputs": {"text": "professional photo of a woman, golden hour, portrait, 50mm", "clip": ["10", 1]}},
  "7": {"class_type": "CLIPTextEncode", "inputs": {"text": "low quality, watermark", "clip": ["10", 1]}},
  "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
  "9": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": "bench_chatx"}},
  "10": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": "$CHECKPOINT"}}
}
EOF
}

echo ""
echo "== Corriendo $RUNS generación(es) idéntica(s) =="
TIEMPOS=""
for i in $(seq 1 "$RUNS"); do
  WF=$(workflow)
  PID=$(curl -sf --max-time 10 -X POST -H 'Content-Type: application/json' -d "{\"prompt\": $WF, \"client_id\": \"bench_chatx\"}" "$URL/prompt" | python3 -c 'import json,sys; print(json.load(sys.stdin)["prompt_id"])' 2>/dev/null) || { echo "FAIL  /prompt rechazó el workflow (¿existe el checkpoint $CHECKPOINT en el host? mira /object_info/CheckpointLoaderSimple)"; exit 1; }
  INICIO=$(date +%s.%N)
  LISTO=0
  for _ in $(seq 1 600); do
    if curl -sf --max-time 5 "$URL/history/$PID" | grep -q '"outputs"'; then LISTO=1; break; fi
    sleep 1
  done
  FIN=$(date +%s.%N)
  if [ "$LISTO" != "1" ]; then echo "FAIL  generación $i no terminó en 600s"; exit 1; fi
  T=$(python3 -c "print(f'{$FIN-$INICIO:.1f}')")
  TIEMPOS="$TIEMPOS $T"
  echo "   corrida $i: ${T}s  (prompt_id $PID)"
done

python3 - << EOF
tiempos = [float(x) for x in "$TIEMPOS".split()]
media = sum(tiempos)/len(tiempos)
por_hora = 3600/media
coste_img = float("$TARIFA")/por_hora
print("")
print("== RESULTADO (medido, no estimado) ==")
print(f"   media {media:.1f}s/imagen → {por_hora:.0f} imágenes/hora")
print(f"   a \$${TARIFA}/h de cómputo → \${coste_img:.4f}/imagen ({1000*coste_img:.1f} \$ por mil imágenes)")
print(f"   lote típico del Estudio (8 previews + 4 finales) ≈ \$({(8+4)*coste_img:.4f}) de cómputo")
print("")
print("   Criterio: si produces V imágenes/mes y el hardware propio cuesta P \$:")
h = 0
EOF
echo "   Nota: latencia del SIMULADOR no es un dato de decisión — esta es la única medida válida."
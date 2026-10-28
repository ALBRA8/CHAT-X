#!/usr/bin/env bash
# BENCHMARK CPU reproducible — comparación con scripts/benchmark_gpu.sh.
# Mide imágenes/segundo REALES con el mismo script que usa el provider local-cpu
# y calcula $/imagen con la tarifa horaria que pases (para VPS/CPU propio).
#
# Uso:
#   BENCHMARK_RUNS=2 BENCHMARK_TARIFA_HORA=0.02 bash scripts/benchmark_cpu.sh
#   (0.02 $/h ≈ un VPS de 4 vCPU; para tu propio PC usa su coste eléctrico/hora)
#
# Requisitos: pip install torch (cpu) diffusers transformers — docs/MOTOR_GPU.md §CPU.
# Sin dependencias: SKIP honesto (no inventa números).
set -u
RUNS="${BENCHMARK_RUNS:-2}"
TARIFA="${BENCHMARK_TARIFA_HORA:-0.02}"
ANCHO="${BENCHMARK_ANCHO:-384}"; ALTO="${BENCHMARK_ALTO:-384}"
PASOS="${BENCHMARK_PASOS:-12}"
DIR="$(mktemp -d)"

python3 -c "import torch, diffusers" 2>/dev/null || {
  echo "SKIP  Sin torch/diffusers instalados — el benchmark CPU solo tiene sentido con generación REAL."
  echo "      Instala con: pip install torch --index-url https://download.pytorch.org/whl/cpu && pip install diffusers transformers"
  exit 2
}

echo "== Benchmark CPU CHAT-X (${ANCHO}x${ALTO}, ${PASOS} pasos, SD 1.5 fp16) =="
SEED_BASE="${BENCHMARK_SEED:-12345}"
TIEMPOS=""
for i in $(seq 1 "$RUNS"); do
  INICIO=$(date +%s.%N)
  python3 "$(dirname "$0")/provider_cpu_generar.py" \
    --prompt "benchmark photo, woman portrait, golden hour" --seed $((SEED_BASE+i)) \
    --ancho "$ANCHO" --alto "$ALTO" --pasos "$PASOS" \
    --salida "$DIR/bench_$i.png" --resultado "$DIR/bench_$i.json" > /dev/null 2>&1 || {
    echo "FAIL  generación $i falló (mira $DIR/bench_$i.json)"; exit 1; }
  FIN=$(date +%s.%N)
  T=$(python3 -c "print(f'{$FIN-$INICIO:.1f}')")
  TIEMPOS="$TIEMPOS $T"
  echo "   corrida $i: ${T}s"
done

python3 - << EOF
tiempos = [float(x) for x in "$TIEMPOS".split()]
media = sum(tiempos)/len(tiempos)
por_hora = 3600/media
coste_img = float("$TARIFA")/por_hora
print("")
print("== RESULTADO CPU (medido, no estimado) ==")
print(f"   media {media:.1f}s/imagen (${ANCHO}x${ALTO}, ${PASOS} pasos) → {por_hora:.1f} imágenes/hora")
print(f"   a \$${TARIFA}/h de cómputo → \${coste_img:.4f}/imagen ({1000*coste_img:.2f} \$ por mil imágenes)")
print(f"   memoria pico del proceso: ver ram_pico_mb en $DIR/bench_1.json")
print("   Comparación GPU: bash scripts/benchmark_gpu.sh (requiere ComfyUI) — criterios en docs/EVALUACION_GPU.md §7")
EOF

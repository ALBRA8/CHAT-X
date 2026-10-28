#!/usr/bin/env bash
# CHAT-X — Detección de hardware para producción audiovisual local (sección 5 del prompt maestro).
# Sin dependencias: bash + herramientas del sistema. Seguro de ejecutar en macOS y Linux.
# Uso: bash scripts/detectar_gpu.sh   (imprime JSON; si hay GPU la reporta con VRAM real)
set -u

OS="$(uname -s)"
KERNEL="$(uname -r 2>/dev/null || echo '?')"
CPU="$( (grep -m1 'model name' /proc/cpuinfo 2>/dev/null | cut -d: -f2 | sed 's/^ //') || sysctl -n machdep.cpu.brand_string 2>/dev/null || echo '?')"
RAM_GB="$( (free -g 2>/dev/null | awk '/^Mem:/{print $2}') || (sysctl -n hw.memsize 2>/dev/null | awk '{print int($1/1073741824)}') || echo 0)"
DISK_GB="$(df -g . 2>/dev/null | awk 'NR==2{print $4}' || df -Pk . 2>/dev/null | awk 'NR==2{print int($4/1048576)}' || echo 0)"

GPU_NOMBRE="none"
GPU_VRAM_MB=0
GPU_DRIVER="none"
CUDA_VERSION="none"

if command -v nvidia-smi >/dev/null 2>&1; then
  GPU_NOMBRE="$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1)"
  GPU_VRAM_MB="$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>/dev/null | head -1 | tr -d ' ')"
  GPU_DRIVER="$(nvidia-smi --query-gpu=driver_version --format=csv,noheader 2>/dev/null | head -1)"
  CUDA_VERSION="$(nvidia-smi 2>/dev/null | grep -o 'CUDA Version: [0-9.]*' | head -1 | cut -d' ' -f3)"
elif command -v rocm-smi >/dev/null 2>&1; then
  GPU_NOMBRE="$(rocm-smi --showproductname 2>/dev/null | grep -m1 'Card series' | cut -d: -f2 | sed 's/^ //')"
  GPU_DRIVER="rocm"
elif command -v system_profiler >/dev/null 2>&1; then
  GPU_NOMBRE="$(system_profiler SPDisplaysDataType 2>/dev/null | grep -m1 'Chipset\|Chip' | cut -d: -f2 | sed 's/^ //')"
  GPU_DRIVER="metal"
else
  # Último recurso: listar VGA desde lspci/pciutils si existe
  GPU_NOMBRE="$( (lspci 2>/dev/null | grep -i 'vga\|3d controller' | head -1 | cut -d: -f3- | sed 's/^ //') || echo none)"
fi

FFMPEG="no"; command -v ffmpeg >/dev/null 2>&1 && FFMPEG="$(ffmpeg -version 2>/dev/null | head -1 | awk '{print $3}')"
COMFY="no"
if [ -n "${COMFYUI_URL:-}" ]; then
  curl -sf --max-time 3 "${COMFYUI_URL%/}/system_stats" >/dev/null 2>&1 && COMFY="si"
fi

python3 - <<'PYEOF' 2>/dev/null || cat <<JSONEOF
PYEOF
{
  "os": "$OS",
  "kernel": "$KERNEL",
  "cpu": "$CPU",
  "ram_gb": $RAM_GB,
  "disco_libre_gb": $DISK_GB,
  "gpu": {"nombre": "$GPU_NOMBRE", "vram_mb": $GPU_VRAM_MB, "driver": "$GPU_DRIVER", "cuda": "$CUDA_VERSION"},
  "ffmpeg": "$FFMPEG",
  "comfyui_alcanzable": "$COMFY",
  "comfyui_url": "${COMFYUI_URL:-}"
}
JSONEOF

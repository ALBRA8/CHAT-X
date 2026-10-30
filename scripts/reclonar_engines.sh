#!/bin/bash
# Re-clonado de engines según docs/CLONES_LICENCIAS.md (versión be91025, 2026-10-29)
# Token transitorio SOLO en URLs de comando; nunca en config ni archivos.
# Regla inviolable: repos ALBRA8 jamás se modifican (solo clone --depth 1, lectura).
set -u
TOKEN="${RECLONAR_TOKEN:?Uso: export RECLONAR_TOKEN=<PAT> bash scripts/reclonar_engines.sh (token efimero, nunca se guarda)}"
BASE="/home/z/my-project/engines"
mkdir -p "$BASE"

declare -A COMMITS=(
  [YOUTUBE-AUTOMATION]="7709007"
  [CRM-ALBRA]="ea87cc2"
  [WHATSPOWER]="f4f7fc9"
  [WHATSPOWER-ULTRA]="e6ef56d"
  [NEX-SCOPE]="d818f3e"
  [AGENTE-LEADS]="f54226b"
  [AGENTE-GENERAL]="69c79da"
  [AGENTE-KREA]="460605e"
  [COMUNITI-MANAGER]="30564d0"
  [Extension-CAZADOR]="4fc7de5"
)

FALLOS=0
for REPO in "${!COMMITS[@]}"; do
  ESPERADO="${COMMITS[$REPO]}"
  DIR="$BASE/$REPO"
  if [ -d "$DIR/.git" ]; then
    echo "[$REPO] ya existe — verificando"
  else
    echo "[$REPO] clonando (--depth 1)…"
    if ! git clone --depth 1 --quiet "https://x-access-token:${TOKEN}@github.com/ALBRA8/${REPO}.git" "$DIR" 2>"$BASE/.clone_err_$REPO"; then
      echo "[$REPO] ERROR CLONE: $(cat "$BASE/.clone_err_$REPO" | tail -1)"
      rm -f "$BASE/.clone_err_$REPO"
      FALLOS=$((FALLOS+1))
      continue
    fi
    rm -f "$BASE/.clone_err_$REPO"
  fi
  # Verificación de procedencia
  OBTENIDO=$(git -C "$DIR" log --format=%h -1)
  # Higiene: remote fuera (el clon es referencia local, sin origen persistente)
  git -C "$DIR" remote remove origin 2>/dev/null
  if [ "$OBTENIDO" = "$ESPERADO" ]; then
    echo "[$REPO] OK $OBTENIDO (procedencia verificada)"
  else
    # ¿Es el esperado ancestro/descendiente? (depth 1 puede dar tip distinto al documentado)
    echo "[$REPO] DESVIACION: obtenido $OBTENIDO ≠ esperado $ESPERADO"
    FALLOS=$((FALLOS+1))
  fi
done

echo
echo "=== Resumen ==="
ls "$BASE"
echo "Fallos/desviaciones: $FALLOS"

#!/usr/bin/env bash
# ESCANEO DE SECRETOS — informa solo ARCHIVOS, LÍNEAS y CONTEOS. Nunca imprime el valor del secreto.
# Uso: bash scripts/escaneo_secretos.sh
set -u
cd "$(dirname "$0")/.."

PATRONES=(
  'ghp_[A-Za-z0-9]{36}'            # PAT clásico GitHub
  'github_pat_[A-Za-z0-9_]{40,}'   # PAT fine-grained GitHub
  'gho_[A-Za-z0-9]{36}'            # OAuth GitHub
  'ghs_[A-Za-z0-9]{36}'            # server-to-server GitHub
  'sk-[A-Za-z0-9]{20,}'            # API keys estilo OpenAI/OpenRouter
  'sk-ant-[A-Za-z0-9_-]{20,}'      # Anthropic
  'AIza[0-9A-Za-z_-]{30,}'         # Google API key
  'xox[bpars]-[A-Za-z0-9-]{10,}'   # Slack
  'AKIA[0-9A-Z]{16}'               # AWS access key
  'ASIA[0-9A-Z]{16}'               # AWS temporal
  'BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY'  # claves privadas embebidas
  'gsk_[A-Za-z0-9]{20,}'           # Groq
  'npm_[A-Za-z0-9]{30,}'           # npm token
  'glpat-[A-Za-z0-9_-]{20,}'       # GitLab
  'hf_[A-Za-z0-9]{30,}'            # HuggingFace
)

echo "== 1) Árbol de trabajo TRACKED (git grep en HEAD) =="
TOTAL=0
for p in "${PATRONES[@]}"; do
  n=$(git grep -E "$p" HEAD -- . 2>/dev/null | wc -l | tr -d ' ')
  if [ "$n" -gt 0 ]; then
    echo "  PATRÓN ${p%%_*}… → $n coincidencia(s) en:"
    git grep -E "$p" HEAD -- . 2>/dev/null | cut -d: -f1 | sort -u | sed 's/^/    archivo: /'
    TOTAL=$((TOTAL+n))
  fi
done
[ "$TOTAL" = "0" ] && echo "  0 coincidencias en archivos versionados ✔"

echo ""
echo "== 2) HISTORIAL completo de git (todos los commits, diffs completos) =="
HTOT=0
for p in "${PATRONES[@]}"; do
  n=$(git log -p --all 2>/dev/null | grep -E -c "$p" || true)
  if [ "${n:-0}" -gt 0 ]; then
    echo "  PATRÓN ${p%%_*}… → $n aparición(es) en el historial — REVISAR"
    HTOT=$((HTOT+n))
  fi
done
[ "$HTOT" = "0" ] && echo "  0 coincidencias en el historial completo ✔"

echo ""
echo "== 3) Ficheros .env* presentes en disco (NOMBRES DE CLAVES solamente, nunca valores) =="
for f in $(ls -1 .env* 2>/dev/null; ls -1 engines/*/.env* 2>/dev/null); do
  echo "  $f:"
  cut -d= -f1 "$f" 2>/dev/null | grep -E '^[A-Z_]' | sed 's/^/    clave: /' || echo "    (sin pares CLAVE=)"
done

echo ""
echo "== 4) Remotos configurados (debe estar vacío: sin push accidental posible) =="
R=$(git remote -v)
if [ -z "$R" ]; then echo "  (ningún remoto) ✔"; else echo "$R" | sed 's/^/  /'; fi

echo ""
echo "== 5) Integridad de los clones (engines/ deben estar limpios y sobre los originales) =="
for d in engines/*/; do
  nombre=$(basename "$d")
  if [ -d "$d.git" ]; then
    sucio=$(git -C "$d" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
    origen=$(git -C "$d" remote get-url origin 2>/dev/null || echo "(sin origin)")
    if [ "$sucio" = "0" ]; then estado="limpio"; else estado="MODIFICADO($sucio)"; fi
    echo "  $nombre → working tree $estado · origin: $origen"
  else
    echo "  $nombre → (no es un clon git con .git visible)"
  fi
done

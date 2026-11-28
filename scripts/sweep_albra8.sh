#!/bin/bash
# Barrido ls-remote de los 24 repos ALBRA8 + clones shallow para leer historia
set -u
OUT=/tmp/sweep
mkdir -p "$OUT"
REPOS="ABOGADO-BASE AGENTE-CHISMOSO AGENTE-GENERAL AGENTE-KREA AGENTE-LEADS AGENTE-TRADING BROWSER-FACTORY CHAT-X COMUNITI-MANAGER CONTADOR-PUBLICO CONTEXT CRM-ALBRA DESPACHO-JURIDICO ERP-ADMON Extension-CAZADOR INSTALADOR MAXI-APP NEX-SCOPE PANEL-DE-CONTROL PURO-PODER-CONOCIMIENTO RADAR-SECOP2 WHATSPOWER WHATSPOWER-ULTRA YOUTUBE-AUTOMATION"
for r in $REPOS; do
  sha=$(timeout 25 git ls-remote "https://github.com/ALBRA8/$r.git" HEAD 2>/dev/null | cut -f1)
  echo "$r ${sha:-INACCESIBLE}"
done > "$OUT/heads.txt"
echo "===HEADS ACTUALES==="
cat "$OUT/heads.txt"
echo "===CLONES SHALLOW (historia)==="
mkdir -p "$OUT/repos"
for r in $REPOS; do
  if [ "$r" = "CHAT-X" ]; then echo "$r skip( local viva )"; continue; fi
  if [ ! -d "$OUT/repos/$r.git" ]; then
    timeout 90 git clone --bare --depth 50 --filter=blob:none --single-branch --quiet "https://github.com/ALBRA8/$r.git" "$OUT/repos/$r.git" 2>/dev/null && echo "$r clonado" || echo "$r FALLO_CLON"
  fi
done
echo "===COMMITS DESDE EL CORTE 2026-11-07 (por repo)==="
for r in $REPOS; do
  d="$OUT/repos/$r.git"
  [ -d "$d" ] || continue
  novos=$(git --git-dir="$d" log --format="%h|%ad|%s" --date=short --since=2026-11-07 2>/dev/null)
  if [ -n "$novos" ]; then
    echo "--- $r ---"
    echo "$novos"
  fi
done

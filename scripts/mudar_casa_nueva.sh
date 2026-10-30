#!/usr/bin/env bash
# mudar_casa_nueva.sh — Mudanza CASA PROPIA: ALBRA8 → musestudio8
# (Decisión del fundador 30-oct-2026: casa nueva en cuenta GitHub aparte.
#  Copias espejo COMPLETAS con historia como procedencia; divergen después
#  a propósito al adaptarse a modo novia. Documentado en
#  docs/EMBUDO_MULTICANAL.md §8.)
#
# Uso:
#   export RECLONAR_TOKEN=<PAT con LECTURA a ALBRA8>
#   export MUSE_TOKEN=<PAT con ESCRITURA en musestudio8>
#   bash scripts/mudar_casa_nueva.sh
#
# Prerrequisitos — el fundador crea a mano en github.com/musestudio8 estos
# repos VACÍOS (sin README, sin .gitignore, sin licencia):
#   musestudio8/wa-novia          ← ALBRA8/WHATSPOWER        (daemon WhatsApp novia)
#   musestudio8/broadcast-novia   ← ALBRA8/WHATSPOWER-ULTRA  (difusión anti-ban)
#   musestudio8/crm-novia         ← ALBRA8/CRM-ALBRA         (CRM del negocio)
#   musestudio8/video-studio      ← ALBRA8/YOUTUBE-AUTOMATION (vídeo SFW/YouTube)
#   musestudio8/chat-x            ← ALBRA8/CHAT-X            (torre del negocio)
#
# Garantías (patrón SEGURIDAD.md):
#   - Tokens SOLO por variable de entorno; jamás en disco, .git/config ni URLs
#     (credential helpers efímeros, igual que subir_repo.sh).
#   - ALBRA8 SOLO se lee (clone --mirror); jamás se modifica.
#   - Jamás --force. Si el repo destino ya tiene contenido y coincide SHA a SHA
#     con el espejo → se omite (idempotente). Si difiere → ABORTA ese repo.
#   - Verificación SHA a SHA de cada rama y etiqueta tras cada push.
#   - Copias de trabajo en /tmp/mudanza (efímeras; nada queda en el proyecto).
set -euo pipefail

: "${RECLONAR_TOKEN:?Falta RECLONAR_TOKEN (lectura ALBRA8) en el entorno}"
: "${MUSE_TOKEN:?Falta MUSE_TOKEN (escritura musestudio8) en el entorno}"

H_ALBRA='!f(){ echo "username=x-access-token"; echo "password=${RECLONAR_TOKEN}"; }; f'
H_MUSE='!f(){ echo "username=x-access-token"; echo "password=${MUSE_TOKEN}"; }; f'

declare -A MAPA=(
  [wa-novia]=WHATSPOWER
  [broadcast-novia]=WHATSPOWER-ULTRA
  [crm-novia]=CRM-ALBRA
  [video-studio]=YOUTUBE-AUTOMATION
  [chat-x]=CHAT-X
)

TMP="/tmp/mudanza"
rm -rf "$TMP"; mkdir -p "$TMP"
FALLOS=0; OKS=0; OMITIDOS=0

for NUEVO in wa-novia broadcast-novia crm-novia video-studio chat-x; do
  ORIGEN="${MAPA[$NUEVO]}"
  ORIG_URL="https://github.com/ALBRA8/${ORIGEN}.git"
  DEST_URL="https://github.com/musestudio8/${NUEVO}.git"
  echo "── [$ORIGEN → musestudio8/$NUEVO] ──"

  # 1) Espejo completo desde ALBRA8 (solo lectura)
  if ! git -c credential.helper="$H_ALBRA" clone --mirror --quiet "$ORIG_URL" "$TMP/$NUEVO.git" 2>"$TMP/err_$NUEVO"; then
    echo "   ERROR clonando $ORIGEN: $(tail -1 "$TMP/err_$NUEVO")"
    FALLOS=$((FALLOS+1)); continue
  fi

  # Refs locales del espejo (ramas + etiquetas)
  declare -A LOCAL_REFS=()
  while IFS=$'\t' read -r SHA REF; do LOCAL_REFS["$REF"]="$SHA"; done \
    < <(git -C "$TMP/$NUEVO.git" for-each-ref --format='%(objectname)%09%(refname)' refs/heads refs/tags)

  # 2) Estado del destino
  declare -A DEST_REFS=()
  while IFS=$'\t' read -r SHA REF; do
    case "$REF" in refs/heads/*|refs/tags/*) DEST_REFS["$REF"]="$SHA";; esac
  done < <(git -c credential.helper="$H_MUSE" ls-remote "$DEST_URL" 2>"$TMP/err_dest_$NUEVO")

  if [ "${#DEST_REFS[@]}" -gt 0 ]; then
    # Destino no vacío: ¿es exactamente nuestro espejo ya mudado?
    IGUALES=1
    for REF in "${!DEST_REFS[@]}"; do
      if [ "${DEST_REFS[$REF]}" != "${LOCAL_REFS[$REF]:-}" ]; then IGUALES=0; break; fi
    done
    if [ "$IGUALES" = "1" ] && [ "${#DEST_REFS[@]}" -eq "${#LOCAL_REFS[@]}" ]; then
      echo "   OMITIDO: ya estaba mudado y coincide SHA a SHA."
      OMITIDOS=$((OMITIDOS+1)); continue
    else
      echo "   ABORTADO: musestudio8/$NUEVO tiene contenido distinto. Jamás --force: revisar a mano."
      FALLOS=$((FALLOS+1)); continue
    fi
  fi

  # 3) Push de ramas y etiquetas (sin --force; el destino estaba vacío)
  if ! git -C "$TMP/$NUEVO.git" push --quiet "$DEST_URL" \
        'refs/heads/*:refs/heads/*' 'refs/tags/*:refs/tags/*' 2>"$TMP/err_push_$NUEVO"; then
    echo "   ERROR push: $(tail -1 "$TMP/err_push_$NUEVO")"
    FALLOS=$((FALLOS+1)); continue
  fi

  # 4) Verificación SHA a SHA post-push
  declare -A POST_REFS=()
  while IFS=$'\t' read -r SHA REF; do
    case "$REF" in refs/heads/*|refs/tags/*) POST_REFS["$REF"]="$SHA";; esac
  done < <(git -c credential.helper="$H_MUSE" ls-remote "$DEST_URL")

  MAL=0
  for REF in "${!LOCAL_REFS[@]}"; do
    if [ "${POST_REFS[$REF]:-}" != "${LOCAL_REFS[$REF]}" ]; then
      echo "   DESVIACIÓN en $REF: local=${LOCAL_REFS[$REF]} remoto=${POST_REFS[$REF]:-ausente}"
      MAL=1
    fi
  done
  if [ "$MAL" = "0" ] && [ "${#POST_REFS[@]}" -eq "${#LOCAL_REFS[@]}" ]; then
    N_RAMAS="$(git -C "$TMP/$NUEVO.git" for-each-ref refs/heads | wc -l)"
    N_TAGS="$(git -C "$TMP/$NUEVO.git" for-each-ref refs/tags | wc -l)"
    echo "   OK: $N_RAMAS rama(s) + $N_TAGS etiqueta(s) verificadas SHA a SHA."
    OKS=$((OKS+1))
  else
    FALLOS=$((FALLOS+1))
  fi
done

rm -rf "$TMP"
echo
echo "=== Resumen mudanza ==="
echo "OK: $OKS | omitidos (ya mudados): $OMITIDOS | fallos: $FALLOS"
if [ "$FALLOS" -eq 0 ]; then
  echo "Casa nueva poblada: historia completa preservada como procedencia."
  echo "Siguiente paso del fundador: clonar de musestudio8 para trabajar (allí divergen)."
fi

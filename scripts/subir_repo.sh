#!/usr/bin/env bash
# subir_repo.sh — push autorizado con higiene de token (patrón SEGURIDAD.md 2026-10-29)
#
# Uso:
#   GITHUB_TOKEN=<token> bash scripts/subir_repo.sh [repo] [rama]
#   Ejemplo: GITHUB_TOKEN=github_pat_xxx bash scripts/subir_repo.sh ALBRA8/CHAT-X main
#
# Garantías de higiene:
#   - El token viaja SOLO por variable de entorno; jamás se escribe en disco,
#     ni en .git/config, ni en argumentos de proceso (credential helper efímero).
#   - Sin remote persistente: push directo por URL, no se crea ningún remote.
#   - Solo fast-forward: si el remoto divergió, aborta y reporta (sin --force).
#   - Verificación post-push: compara SHA local vs SHA remoto y declara el resultado.
set -euo pipefail

REPO="${1:-ALBRA8/CHAT-X}"
RAMA="${2:-main}"

: "${GITHUB_TOKEN:?Falta GITHUB_TOKEN en el entorno (jamás en archivos)}"

LOCAL="$(git rev-parse HEAD)"
HELPER='!f() { echo "username=x-access-token"; echo "password=$GITHUB_TOKEN"; }; f'
URL="https://github.com/${REPO}.git"

echo "→ Push ${LOCAL} → github.com/${REPO} (${RAMA}) [solo fast-forward]"

if git -c "credential.helper=${HELPER}" push "${URL}" "${RAMA}:refs/heads/${RAMA}"; then
  REMOTE_SHA="$(git -c "credential.helper=${HELPER}" ls-remote "${URL}" "refs/heads/${RAMA}" | cut -f1)"
  echo "→ Verificación remota: ${REMOTE_SHA}"
  if [ "${REMOTE_SHA}" = "${LOCAL}" ]; then
    echo "OK: remoto sincronizado en ${LOCAL}. Sin remote persistente; token no escrito en disco."
  else
    echo "ALERTA: remoto=${REMOTE_SHA} != local=${LOCAL}" >&2
    exit 1
  fi
else
  echo "PUSH FALLÓ (posible divergencia o token sin permiso). Sin --force: revisar antes de reintentar." >&2
  exit 1
fi

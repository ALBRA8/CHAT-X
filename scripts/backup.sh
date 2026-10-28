#!/usr/bin/env bash
# Backup de CHAT-X (sección 12): BD, configuración de motores y manifiesto de medios.
# El contenido multimedia completo puede ser grande: se respalda el manifiesto
# (procedencia) siempre, y los archivos solo con --completo.
# Uso: bash scripts/backup.sh [--completo]
set -eu
cd "$(dirname "$0")/.."
DEST="${CHATX_BACKUP_DIR:-backups}"
FECHA="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEST"

echo "== CHAT-X backup $FECHA =="
# 1. Base de datos (snapshot consistente: copia mientras nadie escribe es suficiente en SQLite para backup puntual)
if [ -f db/custom.db ]; then
  cp db/custom.db "$DEST/db-$FECHA.db"
  echo "BD copiada: $DEST/db-$FECHA.db"
else
  echo "AVISO: no se encontró db/custom.db"
fi

# 2. Configuración no secreta
cp -f .env.example "$DEST/env-example-$FECHA.txt" 2>/dev/null || true
cp -f prisma/schema.prisma "$DEST/schema-$FECHA.prisma" 2>/dev/null || true

# 3. Manifiesto de procedencia de medios (sin contenido: solo metadatos de la BD)
node -e "
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const p = new PrismaClient();
p.media.findMany({ select: { id: true, characterId: true, kind: true, lane: true, seed: true, checkpoint: true, loraHash: true, provenance: true, pipelineStatus: true, qualityVerdict: true } })
  .then((rows) => { fs.writeFileSync('$DEST/media-manifiesto-$FECHA.json', JSON.stringify(rows, null, 2)); console.log('Manifiesto: $DEST/media-manifiesto-$FECHA.json (' + rows.length + ' piezas)'); })
  .finally(() => p.\$disconnect());
" 2>/dev/null || echo "AVISO: manifiesto falló (¿prisma client sin generar?)"

# 4. Media completa (opcional)
if [ "${1:-}" = "--completo" ] && [ -d media ]; then
  tar -czf "$DEST/media-$FECHA.tar.gz" media
  echo "Media completa: $DEST/media-$FECHA.tar.gz"
fi

# 5. Rotación: conserva los últimos 14 backups
ls -1t "$DEST"/db-*.db 2>/dev/null | tail -n +15 | xargs -r rm -f
ls -1t "$DEST"/media-*.tar.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
echo "== fin (conserva 14 rotaciones) =="

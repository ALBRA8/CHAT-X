#!/usr/bin/env bash
# RESTAURAR PERSONAJE DEMO — precondición de datos para la plantilla E2E
# "Plan → Estudio → Calendario" de scripts/pruebas_api.sh (exige personaje
# ACTIVO + al menos un Set). Idempotente: si Valentina ya está ACTIVA se
# reutiliza; si no tiene Set, se arma uno con previews aprobadas.
# Camino dorado real por API (simulador, sin GPU, sin coste externo).
# Uso: bash scripts/restaurar_personaje_demo.sh
set -eu
cd "$(dirname "$0")/.."
BASE="http://127.0.0.1:3000"

json() { python3 -c "import json,sys; d=json.load(sys.stdin); print($1)"; }

esperar_job() { # $1=jobId — espera a status listo|fallido (máx 90 s)
  for i in $(seq 1 45); do
    sleep 2
    ST=$(curl -sf "$BASE/api/jobs" | json 'next((j["status"] for j in d["jobs"] if j["id"]=="'"$1"'"), "")' 2>/dev/null || echo "")
    [ "$ST" = "listo" ] && { echo "  job $1 → listo"; return 0; }
    [ "$ST" = "fallido" ] && { echo "  job $1 → FALLIDO"; return 1; }
  done
  echo "  job $1 → timeout ($ST)"; return 1
}

CID=$(curl -sf "$BASE/api/characters" | json 'next((c["id"] for c in d["characters"] if c["name"]=="Valentina" and c["status"]=="ACTIVO"), "")' 2>/dev/null || echo "")

if [ -n "$CID" ]; then
  echo "== Valentina ya está ACTIVA ($CID) — se reutiliza =="
else
  echo "== 1) Crear personaje =="
  CID=$(curl -sf -X POST -H 'Content-Type: application/json' -d '{
    "name": "Valentina",
    "audience": "mujeres y hombres 25-40, hispanohablantes, estética lifestyle",
    "style": "fotorrealista editorial cálida",
    "anchorTrait": "pecas visibles y mirada Serene",
    "seed": "seed_valentina_001",
    "atributos": {"genero": "mujer", "edadAparente": "27", "cabello": "castaño oscuro ondulado", "ojos": "marrones", "piel": "trigueña", "complexion": "atlética media"},
    "aficiones": "café de especialidad, senderismo, fotografía analógica",
    "lore": "Bogotana, community manager antes de modelar virtual.",
    "tono": "cercano, pícaro, seguro",
    "signKit": [{"tipo": "pecas", "ubicacion": "mejillas y nariz"}]
  }' "$BASE/api/characters" | json 'd["character"]["id"]')
  echo "  personaje $CID"

  echo "== 2) Dataset (40 fotos, simulador) =="
  J=$(curl -sf -X POST -H 'Content-Type: application/json' -d '{"accion":"dataset","objetivo":40}' "$BASE/api/characters/$CID/lanzamientos" | json 'd["jobId"]')
  esperar_job "$J"

  echo "== 3) Entrenamiento LoRA =="
  J=$(curl -sf -X POST -H 'Content-Type: application/json' -d '{"accion":"entrenamiento","nota":"restauración demo"}' "$BASE/api/characters/$CID/lanzamientos" | json 'd["jobId"]')
  esperar_job "$J"

  echo "== 4) Examen de identidad (5 escenas) =="
  J=$(curl -sf -X POST -H 'Content-Type: application/json' -d '{"accion":"examen"}' "$BASE/api/characters/$CID/lanzamientos" | json 'd["jobId"]')
  esperar_job "$J"

  echo "== 5) Activar =="
  for i in $(seq 1 15); do
    R=$(curl -s -o /tmp/act.json -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{"accion":"activar"}' "$BASE/api/characters/$CID/lanzamientos")
    [ "$R" = "200" ] && { echo "  ACTIVO: $(cat /tmp/act.json)"; break; }
    echo "  aún no ($(cat /tmp/act.json | head -c 120)) — reintento $i"; sleep 2
  done
  [ "$R" = "200" ] || { echo "FATAL: no se pudo activar"; exit 1; }
fi

echo "== 6) Asegurar Set (precondición de «Programar publicación») =="
SETS=$(curl -sf "$BASE/api/sets" | json '[s["id"] for s in d["sets"] if s.get("characterId")=="'"$CID"'"]' 2>/dev/null || echo "[]")
if [ "$SETS" != "[]" ] && [ -n "$SETS" ]; then
  echo "  ya existe un set para Valentina — nada que hacer"
else
  PIEZAS=$(curl -sf "$BASE/api/media?limit=40" | json 'json.dumps([m["id"] for m in d["media"] if m.get("characterId")=="'"$CID"'" and m.get("kind")=="preview" and m.get("qualityVerdict")=="APROBADO" and not m.get("setId")][:4])' 2>/dev/null)
  N=$(echo "$PIEZAS" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))')
  if [ "$N" -lt 1 ]; then
    echo "  sin previews aprobadas libres — encolo un lote de 4 y espero…"
    J=$(curl -sf -X POST -H 'Content-Type: application/json' -d '{"characterId":"'"$CID"'","variante":1}' "$BASE/api/studio/lote" | json 'd["jobId"]' 2>/dev/null || echo "")
    [ -n "$J" ] && esperar_job "$J"
    PIEZAS=$(curl -sf "$BASE/api/media?limit=40" | json 'json.dumps([m["id"] for m in d["media"] if m.get("characterId")=="'"$CID"'" and m.get("kind")=="preview" and m.get("qualityVerdict")=="APROBADO" and not m.get("setId")][:4])' 2>/dev/null)
  fi
  for P in $(echo "$PIEZAS" | python3 -c 'import json,sys; print(" ".join(json.load(sys.stdin)))'); do
    curl -sf -X PATCH -H 'Content-Type: application/json' -d '{"accion":"aprobar"}' "$BASE/api/media/$P" > /dev/null || true
  done
  LISTA=$(echo "$PIEZAS" | python3 -c 'import json,sys; print(json.dumps(json.load(sys.stdin)))')
  curl -sf -X POST -H 'Content-Type: application/json' -d '{
    "characterId": "'"$CID"'",
    "lane": "PUBLICO",
    "mediaIds": '"$LISTA"',
    "name": "balcon-atardecer-01",
    "caption": "Sesión dorada en el balcón — atardecer de la ciudad",
    "suggestedPrice": 6
  }' "$BASE/api/sets" | json '"  set creado:", d["set"]["id"] if "set" in d else d'
fi

curl -sf "$BASE/api/characters" | json '"estado final:", [(c["name"], c["status"]) for c in d["characters"]]'
curl -sf "$BASE/api/sets" | json '"sets:", [(s["name"], s.get("characterName"), s.get("piezas", s.get("_count"))) for s in d["sets"]]'

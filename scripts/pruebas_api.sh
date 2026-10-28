#!/usr/bin/env bash
# Pruebas de humo de la API de CHAT-X (sección 11 del prompt maestro).
# Ejecuta peticiones REALES contra el servidor local y reporta PASS/FAIL/SKIP.
# Uso: bash scripts/pruebas_api.sh [base_url]   (default http://127.0.0.1:3000)
set -u
BASE="${1:-http://127.0.0.1:3000}"
PASS=0; FAIL=0; SKIP=0

check() { # nombre, condicion(0=ok)
  local nombre="$1"; shift
  if "$@" >/dev/null 2>&1; then echo "PASS  $nombre"; PASS=$((PASS+1)); else echo "FAIL  $nombre"; FAIL=$((FAIL+1)); fi
}

http_200() { [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "$1")" = "200" ]; }

json_has() { # url, needle  → 0 si el body contiene needle
  local url="$1" needle="$2"
  curl -sf --max-time 20 "$url" | grep -q "$needle"
}

http_code() { curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$1"; }
export -f check http_200 json_has http_code

echo "== CHAT-X pruebas de humo contra $BASE =="

# 1. Health y datos base
check "GET /api responde"                           bash -c 'http_200 "'"$BASE"'/api"'
check "GET /api/characters lista personajes"         bash -c 'http_200 "'"$BASE"'/api/characters"'
check "GET /api/jobs lista trabajos"                 bash -c 'http_200 "'"$BASE"'/api/jobs"'
check "GET /api/compliance log append-only"          bash -c 'http_200 "'"$BASE"'/api/compliance"'
check "GET /api/kpi entradas"                        bash -c 'http_200 "'"$BASE"'/api/kpi"'

# 2. Motores (sondas reales — pueden estar INALCANZABLE, lo que importa es que respondan honesto)
check "GET /api/motores registro completo"           bash -c 'http_200 "'"$BASE"'/api/motores"'
for m in youtube crm whatspower ultra nexscope leads agentegeneral cazador agentekrea comuniti; do
  check "GET /api/motores/$m (sonda honesta)"        bash -c "http_200 $BASE/api/motores/$m"
done

# 3. Validación de entradas (seguridad)
check "PUT motores rechaza URL no-http"              bash -c '[ "$(curl -s -o /dev/null -w '"'"'%{http_code}'"'"' -X PUT -H "Content-Type: application/json" -d '"'"'{"url":"ftp://x"}'"'"' '"$BASE"'/api/motores/youtube)" = "400" ]'
check "PUT motores rechaza credenciales en URL"      bash -c '[ "$(curl -s -o /dev/null -w '"'"'%{http_code}'"'"' -X PUT -H "Content-Type: application/json" -d '"'"'{"url":"http://user:pass@host"}'"'"' '"$BASE"'/api/motores/youtube)" = "400" ]'

# 4. Webhook AGENTE-LEADS fail-closed (sin Bearer debe rechazar 401/403)
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{"event":"test"}' "$BASE/api/motores/agent-leads/webhook")
check "POST webhook leads fail-closed (401/403/503)" bash -c "[ '$code' = '401' ] || [ '$code' = '403' ] || [ '$code' = '503' ]"

# 5. Flujos (orquestador)
check "GET /api/flujos lista (siembra demo)"         bash -c 'json_has "'"$BASE"'/api/flujos" "Detecci"'
check "POST /api/flujos rechaza paso inválido"       bash -c '[ "$(curl -s -o /dev/null -w '"'"'%{http_code}'"'"' -X POST -H "Content-Type: application/json" -d '"'"'{"nombre":"test","pasos":[{"id":"a","tipo":"borrar_todo","nombre":"x","params":{}}]}'"'"' '"$BASE"'/api/flujos)" = "422" ]'
check "POST /api/flujos rechaza nombre corto"        bash -c '[ "$(curl -s -o /dev/null -w '"'"'%{http_code}'"'"' -X POST -H "Content-Type: application/json" -d '"'"'{"nombre":"a","pasos":[]}'"'"' '"$BASE"'/api/flujos)" = "422" ]'

FLUJO_ID=$(curl -sf "$BASE/api/flujos" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["flujos"][0]["id"])' 2>/dev/null)
if [ -n "${FLUJO_ID:-}" ]; then
  EJEC_ID=$(curl -sf -X POST "$BASE/api/flujos/$FLUJO_ID/ejecutar" | python3 -c 'import json,sys; print(json.load(sys.stdin)["ejecucionId"])' 2>/dev/null)
  check "POST flujos/$FLUJO_ID/ejecutar → 202"       bash -c '[ -n "'"$EJEC_ID"'" ]'
  if [ -n "${EJEC_ID:-}" ]; then
    sleep 3
    ESTADO=$(curl -sf "$BASE/api/flujos/ejecuciones/$EJEC_ID" | python3 -c 'import json,sys; print(json.load(sys.stdin)["ejecucion"]["estado"])' 2>/dev/null)
    echo "INFO  estado de la ejecución demo: $ESTADO (esperando_aprobacion = gate humano correcto)"
    check "GET ejecuciones/$EJEC_ID estado válido"    bash -c 'echo "'"$ESTADO"'" | grep -qE "en_curso|esperando_aprobacion|completada|fallida|cancelada"'
    # Aprobar el gate humano si está esperando
    if [ "$ESTADO" = "esperando_aprobacion" ]; then
      RESP=$(curl -sf -X POST -H 'Content-Type: application/json' -d '{"aprobado":true,"nota":"prueba automatizada"}' "$BASE/api/flujos/ejecuciones/$EJEC_ID/aprobar")
      check "POST aprobar → ok"                       bash -c 'echo "'"$RESP"'" | grep -q "contin"'
      sleep 12
      ESTADO2=$(curl -sf "$BASE/api/flujos/ejecuciones/$EJEC_ID" | python3 -c 'import json,sys; print(json.load(sys.stdin)["ejecucion"]["estado"])' 2>/dev/null)
      echo "INFO  estado tras aprobar: $ESTADO2"
    fi
    # Cancelar si sigue viva
    if [ "$ESTADO2" = "en_curso" ] || [ "$ESTADO" = "en_curso" ]; then
      curl -sf -X POST "$BASE/api/flujos/ejecuciones/$EJEC_ID/cancelar" >/dev/null
      echo "INFO  ejecución demo cancelada tras la prueba"
    fi
  fi
else
  SKIP=$((SKIP+1)); echo "SKIP  flujos (no se obtuvo id)"
fi

# 6. Sistema (GPU real), calendario y límite de consumo
check "GET /api/sistema reporta GPU honesta"         bash -c 'http_200 "'"$BASE"'/api/sistema"'
check "GET calendario ICS válido"                    bash -c 'curl -sf "'"$BASE"'/api/publicacion/calendario?formato=ics" | head -1 | grep -q "BEGIN:VCALENDAR"'
check "GET calendario CSV válido"                    bash -c 'curl -sf "'"$BASE"'/api/publicacion/calendario?formato=csv" | head -1 | grep -q "fecha"'
check "GET /api/settings expone límite diario"       bash -c 'json_has "'"$BASE"'/api/settings" "limiteDiario"'
code_login=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{"password":"x"}' "$BASE/api/auth/login")
check "POST /api/auth/login sin activar → 503"       bash -c "[ '$code_login' = '503' ]"

# 6b. Plantilla E2E: Plan → Estudio → Calendario (aprobar gate → Set programado)
FLUJO_CAL=$(curl -sf "$BASE/api/flujos" | python3 -c '
import json,sys
d=json.load(sys.stdin)
print(next((f["id"] for f in d["flujos"] if "Calendario" in f["nombre"]), ""))' 2>/dev/null)
if [ -n "${FLUJO_CAL:-}" ]; then
  EJEC_CAL=$(curl -sf -X POST "$BASE/api/flujos/$FLUJO_CAL/ejecutar" | python3 -c 'import json,sys; print(json.load(sys.stdin)["ejecucionId"])' 2>/dev/null)
  check "plantilla Calendario ejecutar → 202"        bash -c '[ -n "'"$EJEC_CAL"'" ]'
  sleep 3
  EST_CAL=$(curl -sf "$BASE/api/flujos/ejecuciones/$EJEC_CAL" | python3 -c 'import json,sys; print(json.load(sys.stdin)["ejecucion"]["estado"])' 2>/dev/null)
  echo "INFO  plantilla Calendario estado: $EST_CAL"
  if [ "$EST_CAL" = "esperando_aprobacion" ]; then
    curl -sf -X POST -H 'Content-Type: application/json' -d '{"aprobado":true,"nota":"prueba automatizada"}' "$BASE/api/flujos/ejecuciones/$EJEC_CAL/aprobar" >/dev/null
    sleep 14
    EST_CAL2=$(curl -sf "$BASE/api/flujos/ejecuciones/$EJEC_CAL" | python3 -c 'import json,sys; print(json.load(sys.stdin)["ejecucion"]["estado"])' 2>/dev/null)
    echo "INFO  plantilla Calendario tras aprobar: $EST_CAL2"
    check "plantilla Calendario completa tras aprobar" bash -c 'echo "'"$EST_CAL2"'" | grep -q "completada"'
  fi
else
  SKIP=$((SKIP+1)); echo "SKIP  plantilla Calendario (no sembrada)"
fi

# 7. UI principal
check "GET / (shell) 200"                            bash -c 'http_200 "'"$BASE"'/"'

echo ""
echo "== Resumen: $PASS PASS · $FAIL FAIL · $SKIP SKIP =="
[ "$FAIL" = "0" ] && exit 0 || exit 1

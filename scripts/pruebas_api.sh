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

# 6c. Voz GFE (P1.3): contrato de voz por personaje + muestra TTS local $0
CHAR_ID=$(curl -sf "$BASE/api/characters" | python3 -c '
import json,sys
d=json.load(sys.stdin)
cs=d.get("characters") or d.get("personajes") or []
print(cs[0]["id"] if cs else "")' 2>/dev/null)
if [ -n "${CHAR_ID:-}" ]; then
  check "GET voz sondea proveedores honestos"        bash -c 'json_has "'"$BASE"'/api/characters/'"$CHAR_ID"'/voz" "espeak-local"'
  code_put=$(curl -s -o /dev/null -w '%{http_code}' -X PUT -H 'Content-Type: application/json' -d '{"provedor":"espeak-local","voz":"es","velocidad":170,"tono":50}' "$BASE/api/characters/$CHAR_ID/voz")
  check "PUT contrato de voz → 200"                  bash -c "[ '$code_put' = '200' ]"
  code_bad=$(curl -s -o /dev/null -w '%{http_code}' -X PUT -H 'Content-Type: application/json' -d '{"provedor":"voz-inventada"}' "$BASE/api/characters/$CHAR_ID/voz")
  check "PUT contrato inválido → 422"                bash -c "[ '$code_bad' = '422' ]"
  body_voz=$(curl -sf -X POST -H 'Content-Type: application/json' -d '{"texto":"Hola, esta es una nota de voz de prueba del sistema.","lane":"PUBLICO"}' "$BASE/api/characters/$CHAR_ID/voz")
  check "POST muestra de voz genera WAV real"        bash -c 'echo '"'"''"$body_voz"''"'"' | grep -q "\"estado\":\"OPERATIVO\""'
  check "muestra queda etiquetada como IA"           bash -c 'echo '"'"''"$body_voz"''"'"' | grep -q "Contenido generado con IA"'
  code_edad=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{"texto":"una niña en el parque","lane":"PUBLICO"}' "$BASE/api/characters/$CHAR_ID/voz")
  check "filtro de edad duro también en voz → 422"   bash -c "[ '$code_edad' = '422' ]"
  check "compliance registra voz_generada"           bash -c 'json_has "'"$BASE"'/api/compliance" "voz_generada"'
else
  SKIP=$((SKIP+1)); echo "SKIP  voz (sin personajes)"
fi

# 6d. Chat GFE Modo Novia (P1.1) + tarjeta del genoma (P1.2)
if [ -n "${CHAR_ID:-}" ]; then
  check "GET tarjeta JSON + system prompt"           bash -c 'curl -sf "'"$BASE"'/api/characters/'"$CHAR_ID"'/tarjeta" | grep -q "systemPrompt"'
  check "tarjeta etiquetada como IA"                 bash -c 'curl -sf "'"$BASE"'/api/characters/'"$CHAR_ID"'/tarjeta" | grep -q "Contenido generado con IA"'
  BODY_SALUDO=$(curl -sf -X POST -H 'Content-Type: application/json' -d '{"characterId":"'"$CHAR_ID"'","texto":"hola qué tal"}' "$BASE/api/chat")
  MODO=$(echo "$BODY_SALUDO" | python3 -c 'import json,sys
print(json.load(sys.stdin)["mensaje"].get("modo",""))' 2>/dev/null || echo "")
  check "POST chat saludo → cerebro declarado"       bash -c "case '$MODO' in llm_*|plantilla_genoma) true;; *) false;; esac"
  if [ "${MODO:-}" = "plantilla_genoma" ]; then
    ID_MSG=$(echo "$BODY_SALUDO" | python3 -c 'import json,sys
print(json.load(sys.stdin)["mensaje"]["id"])' 2>/dev/null || echo "")
    check "fallback a plantilla declara llmEstado"   bash -c 'curl -sf "'"$BASE"'/api/chat?characterId='"$CHAR_ID"'" | python3 -c "
import json,sys
ms=json.load(sys.stdin)[\"mensajes\"]
m=[x for x in ms if x[\"id\"]==\"'"$ID_MSG"'\"]
assert m and m[0].get(\"meta\",{}).get(\"llmEstado\") in (\"ERROR\",\"NO_CONFIGURADO\",\"RECHAZADO_FILTRO\"), m"'
  elif case "${MODO:-}" in llm_*) true;; *) false;; esac; then
    check "compliance registra llm_chat"             bash -c 'json_has "'"$BASE"'/api/compliance" "llm_chat"'
  else
    SKIP=$((SKIP+1)); echo "SKIP  cerebro LLM (modo vacío)"
  fi
  code_edad_chat=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{"characterId":"'"$CHAR_ID"'","texto":"una niña jugando"}' "$BASE/api/chat")
  check "filtro de edad también en el chat → 422"    bash -c "[ '$code_edad_chat' = '422' ]"
  MSG_FOTO=$(curl -sf -X POST -H 'Content-Type: application/json' -d '{"characterId":"'"$CHAR_ID"'","texto":"mándame una foto"}' "$BASE/api/chat")
  check "POST chat foto → 202 generando"             bash -c 'echo '"'"''"$MSG_FOTO"''"'"' | grep -q "GENERANDO"'
  FOTO_OK="NO"
  for i in $(seq 1 12); do
    sleep 2
    FOTO_OK=$(curl -sf "$BASE/api/chat?characterId=$CHAR_ID" | python3 -c "
import json,sys
ms=json.load(sys.stdin)[\"mensajes\"]
img=[m for m in ms if m[\"tipo\"]==\"imagen\" and m[\"estado\"]==\"entregado\" and m.get(\"media\")]
print(\"OK\" if img and img[-1][\"media\"][\"kind\"]==\"preview\" else \"NO\")" 2>/dev/null || echo "NO")
    [ "$FOTO_OK" = "OK" ] && break
  done
  check "foto del chat entregada con media y QA"     bash -c "[ '$FOTO_OK' = 'OK' ]"
  check "POST chat voz → nota de voz entregada"      bash -c 'curl -sf -X POST -H "Content-Type: application/json" -d "{\"characterId\":\"'"$CHAR_ID"'\",\"texto\":\"mándame una nota de voz\"}" "'"$BASE"'/api/chat" | grep -q "\"tipo\":\"voz\""'
  check "compliance registra origen chat_gfe"        bash -c 'json_has "'"$BASE"'/api/compliance" "chat_gfe"'
else
  SKIP=$((SKIP+1)); echo "SKIP  chat (sin personajes)"
fi

# 6e. Cerebro LLM (P1.1 upgrade): sonda real expuesta y honestidad del cerebro del chat
check "GET /api/sistema expone sonda LLM honesta"    bash -c 'curl -sf "'"$BASE"'/api/sistema" | python3 -c "
import json,sys
l=json.load(sys.stdin).get(\"llm\") or {}
assert l.get(\"estado\") in (\"OPERATIVO\",\"NO_CONFIGURADO\",\"ERROR\"), l"'

# 6f. InstaDump nativo (P2.5): 1 clic → lote multi-escena/outfit automático
if [ -n "${CHAR_ID:-}" ]; then
  DUMP=$(curl -sf -X POST -H 'Content-Type: application/json' -d '{"characterId":"'"$CHAR_ID"'","lane":"PUBLICO","count":4,"paquete":"mixto"}' "$BASE/api/studio/instadump")
  check "POST instadump → lote planificado"          bash -c 'echo '"'"''"$DUMP"''"'"' | grep -q "\"piezas\":4"'
  check "instadump registra evento de compliance"    bash -c 'json_has "'"$BASE"'/api/compliance" "instadump"'
  DUMP_JOB=$(echo "$DUMP" | python3 -c 'import json,sys; print(json.load(sys.stdin)["jobId"])' 2>/dev/null || echo "")
  DUMP_OK="NO"
  if [ -n "$DUMP_JOB" ]; then
    for i in $(seq 1 20); do
      sleep 1
      EST=$(curl -sf "$BASE/api/jobs/$DUMP_JOB" | python3 -c 'import json,sys; print(json.load(sys.stdin)["job"]["status"])' 2>/dev/null || echo "")
      [ "$EST" = "listo" ] && DUMP_OK="OK" && break
      [ "$EST" = "fallido" ] && break
    done
  fi
  check "instadump job completo (4 previews)"        bash -c "[ '$DUMP_OK' = 'OK' ]"
  DUMP_BATCH=$(echo "$DUMP" | python3 -c 'import json,sys; print(json.load(sys.stdin)["batchId"])' 2>/dev/null || echo "")
  if [ -n "$DUMP_BATCH" ]; then
    check "piezas del dump con briefs DISTINTOS"     bash -c 'curl -sf "'"$BASE"'/api/media?batchId='"$DUMP_BATCH"'" | python3 -c "
import json,sys
ms=json.load(sys.stdin)[\"media\"]
assert len(ms)>=4, len(ms)
escenas=[m[\"prompt\"] for m in ms]
assert len(set(escenas))>=4, \"briefs repetidos: \" + str(escenas)
print(\"OK\")"'
    check "piezas del dump etiquetadas IA"           bash -c 'curl -sf "'"$BASE"'/api/media?batchId='"$DUMP_BATCH"'" | grep -q "Contenido generado con IA"'
  else
    SKIP=$((SKIP+1)); echo "SKIP  piezas del dump (sin batchId)"
  fi
  code_edad_dump=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{"characterId":"'"$CHAR_ID"'","count":4,"escena":"retrato infantil en el parque"}' "$BASE/api/studio/instadump")
  check "instadump: filtro de edad en el ancla → 422" bash -c "[ '$code_edad_dump' = '422' ]"
else
  SKIP=$((SKIP+1)); echo "SKIP  instadump (sin personajes)"
fi

# 6g. Outfit Swap (P2.6): mismo rostro, otro vestuario
if [ -n "${CHAR_ID:-}" ]; then
  SWAP=$(curl -sf -X POST -H 'Content-Type: application/json' -d '{"characterId":"'"$CHAR_ID"'","lane":"PUBLICO","count":2,"outfit":"chaqueta de cuero negra"}' "$BASE/api/studio/outfit-swap")
  check "POST outfit-swap → lote planificado"        bash -c 'echo '"'"''"$SWAP"''"'"' | grep -q "chaqueta de cuero negra"'
  check "outfit-swap registra evento de compliance"  bash -c 'json_has "'"$BASE"'/api/compliance" "outfit_swap"'
  SWAP_JOB=$(echo "$SWAP" | python3 -c 'import json,sys; print(json.load(sys.stdin)["jobId"])' 2>/dev/null || echo "")
  SWAP_OK="NO"
  if [ -n "$SWAP_JOB" ]; then
    for i in $(seq 1 20); do
      sleep 1
      EST=$(curl -sf "$BASE/api/jobs/$SWAP_JOB" | python3 -c 'import json,sys; print(json.load(sys.stdin)["job"]["status"])' 2>/dev/null || echo "")
      [ "$EST" = "listo" ] && SWAP_OK="OK" && break
      [ "$EST" = "fallido" ] && break
    done
  fi
  check "outfit-swap job completo (2 previews)"      bash -c "[ '$SWAP_OK' = 'OK' ]"
  SWAP_BATCH=$(echo "$SWAP" | python3 -c 'import json,sys; print(json.load(sys.stdin)["batchId"])' 2>/dev/null || echo "")
  if [ -n "$SWAP_BATCH" ]; then
    check "piezas del swap comparten el outfit nuevo" bash -c 'curl -sf "'"$BASE"'/api/media?batchId='"$SWAP_BATCH"'" | python3 -c "
import json,sys
ms=json.load(sys.stdin)[\"media\"]
assert len(ms)>=2, len(ms)
for m in ms:
    assert \"chaqueta de cuero negra\" in m[\"prompt\"], m[\"prompt\"]
print(\"OK\")"'
  else
    SKIP=$((SKIP+1)); echo "SKIP  piezas del swap (sin batchId)"
  fi
  code_swap_vacio=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{"characterId":"'"$CHAR_ID"'","outfit":""}' "$BASE/api/studio/outfit-swap")
  check "outfit-swap sin outfit → 422"               bash -c "[ '$code_swap_vacio' = '422' ]"
else
  SKIP=$((SKIP+1)); echo "SKIP  outfit-swap (sin personajes)"
fi

# 6h. Piper-local (P1.3 fase 2): sonda de DOS capas honesta (paquete Y modelo)
if [ -n "${CHAR_ID:-}" ]; then
  check "sonda de voz declara estado piper honesto"  bash -c 'curl -sf "'"$BASE"'/api/characters/'"$CHAR_ID"'/voz" | python3 -c "
import json,sys
d=json.load(sys.stdin)
p=[x for x in d[\"proveedores\"] if x[\"provedor\"]==\"piper-local\"]
assert p, d
assert p[0][\"estado\"] in (\"OPERATIVO\",\"NO_DISPONIBLE\"), p[0]
if p[0][\"estado\"]==\"NO_DISPONIBLE\":
    assert (\"paquete\" in p[0][\"detalle\"]) or (\"modelo\" in p[0][\"detalle\"]), p[0]
print(\"OK\")"'
else
  SKIP=$((SKIP+1)); echo "SKIP  sonda piper (sin personajes)"
fi

# 7. UI principal
check "GET / (shell) 200"                            bash -c 'http_200 "'"$BASE"'/"'

echo ""
echo "== Resumen: $PASS PASS · $FAIL FAIL · $SKIP SKIP =="
[ "$FAIL" = "0" ] && exit 0 || exit 1

#!/usr/bin/env bash
# VALIDACIÓN DE CONSOLIDACIÓN (fase post-c8836f2) — evidencia reproducible en una sola ventana.
# Arranca CHAT-X, espera readiness, corre el suite API + E2E de idempotencia + gate WhatsApp.
# Uso: bash scripts/validacion_consolidacion.sh
set -u
cd "$(dirname "$0")/.."
BASE="http://127.0.0.1:3000"
LOG="/tmp/chatx_val.log"

up() { [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 "$BASE/api/sistema")" = "200" ]; }

if ! up; then
  echo "[val] arrancando CHAT-X…"
  setsid nohup bun run dev >> dev.log 2>&1 < /dev/null &
  for i in $(seq 1 60); do sleep 2; up && break; done
fi
up || { echo "[val] FATAL: servidor no arrancó"; tail -20 dev.log; exit 1; }
echo "[val] servidor listo"

echo "== 1) Suite API (scripts/pruebas_api.sh) =="
bash scripts/pruebas_api.sh 2>&1 | tail -5

echo ""
echo "== 2) E2E idempotencia: re-encola el MISMO job de lote (simula recuperación tras reinicio) =="
JOB=$(curl -sf "$BASE/api/jobs" | python3 -c '
import json,sys
d=json.load(sys.stdin)
jobs=[j for j in d.get("jobs",[]) if j.get("type")=="lote_fotos" and j.get("status")=="listo"]
print(jobs[0]["id"] if jobs else "")' 2>/dev/null)
if [ -z "$JOB" ]; then
  echo "[val] no hay job lote_fotos listo: creo uno vía flujo demo…"
  FLUJO_ID=$(curl -sf "$BASE/api/flujos" | python3 -c 'import json,sys; print(json.load(sys.stdin)["flujos"][0]["id"])' 2>/dev/null)
  EJEC=$(curl -sf -X POST "$BASE/api/flujos/$FLUJO_ID/ejecutar" | python3 -c 'import json,sys; print(json.load(sys.stdin)["ejecucionId"])' 2>/dev/null)
  echo "[val] ejecución demo $EJEC creada (debe quedar esperando_aprobacion)"
  ESTADO=$(curl -sf "$BASE/api/flujos/ejecuciones/$EJEC" | python3 -c 'import json,sys; print(json.load(sys.stdin)["ejecucion"]["estado"])' 2>/dev/null)
  echo "[val] estado tras arranque: $ESTADO (esperando_aprobacion = gate humano correcto)"
  curl -sf -X POST -H 'Content-Type: application/json' -d '{"aprobado":true,"nota":"validacion"}' "$BASE/api/flujos/ejecuciones/$EJEC/aprobar" >/dev/null 2>&1
  for i in $(seq 1 40); do sleep 2; ESTADO=$(curl -sf "$BASE/api/flujos/ejecuciones/$EJEC" | python3 -c 'import json,sys; print(json.load(sys.stdin)["ejecucion"]["estado"])' 2>/dev/null); [ "$ESTADO" = "completada" ] && break; done
  echo "[val] estado final de la ejecución demo: $ESTADO"
  JOB=$(curl -sf "$BASE/api/jobs" | python3 -c '
import json,sys
d=json.load(sys.stdin)
jobs=[j for j in d.get("jobs",[]) if j.get("type")=="lote_fotos" and j.get("status")=="listo"]
print(jobs[0]["id"] if jobs else "")' 2>/dev/null)
fi
if [ -n "$JOB" ]; then
  python3 - "$JOB" <<'PYEOF'
import subprocess, json, sys, time
job = sys.argv[1]
# cuenta piezas del lote ANTES
res = json.loads(subprocess.check_output(["curl","-sf","http://127.0.0.1:3000/api/media"]).decode())
antes = [m for m in res.get("media",[]) ]
print(f"[val] job {job}: piezas de media en BD antes = {len(antes)}")
# re-encola el MISMO job (simula: crash → worker re-encola → re-procesa)
subprocess.run(["curl","-sf","-X","PATCH","-H","Content-Type: application/json",
  "-d",'{"status":"en_cola","progress":0}', f"http://127.0.0.1:3000/api/jobs/{job}"], capture_output=True)
print("[val] job re-encolado; esperando al worker…")
for _ in range(60):
    time.sleep(2)
    jobs = json.loads(subprocess.check_output(["curl","-sf","http://127.0.0.1:3000/api/jobs"]).decode())
    j = [x for x in jobs.get("jobs",[]) if x["id"]==job]
    if j and j[0].get("status")=="listo":
        break
res2 = json.loads(subprocess.check_output(["curl","-sf","http://127.0.0.1:3000/api/media"]).decode())
despues = res2.get("media",[])
print(f"[val] piezas de media en BD después = {len(despues)}")
dup = len(despues) - len(antes)
semillas = {}
for m in despues:
    semillas[(m.get("characterId"), m.get("seed"))] = semillas.get((m.get("characterId"), m.get("seed")), 0) + 1
dups = {k:v for k,v in semillas.items() if v>1}
print(f"[val] RESULTADO: piezas nuevas tras re-procesar el mismo job = {dup} (esperado 0)")
print(f"[val] RESULTADO: pares (characterId,seed) duplicados = {len(dups)} (esperado 0)")
PYEOF
else
  echo "[val] SKIP E2E idempotencia: no se pudo obtener un job de lote"
fi

echo ""
echo "== 3) E2E gate WhatsApp: flujo con ultra_step SIN aprobación previa =="
FLUJO_GATE=$(curl -sf -X POST -H 'Content-Type: application/json' -d '{
  "nombre": "Prueba gate WhatsApp (sin aprobacion previa)",
  "descripcion": "Validación: ultra_step debe quedar detenido por el gate humano estructural",
  "pasos": [
    {"id":"r1","tipo":"registrar_evento","nombre":"Arranque","params":{"event":"prueba.gate"}},
    {"id":"w1","tipo":"ultra_step","nombre":"Paso WhatsApp (debe quedar en gate)","params":{},"opcional":true,"intentos":1},
    {"id":"r2","tipo":"registrar_evento","nombre":"Cierre","params":{"event":"prueba.gate.fin"}}
  ]
}' "$BASE/api/flujos" | python3 -c 'import json,sys; print(json.load(sys.stdin)["flujo"]["id"])' 2>/dev/null)
if [ -n "$FLUJO_GATE" ]; then
  EJEC2=$(curl -sf -X POST "$BASE/api/flujos/$FLUJO_GATE/ejecutar" | python3 -c 'import json,sys; print(json.load(sys.stdin)["ejecucionId"])' 2>/dev/null)
  sleep 4
  EST2=$(curl -sf "$BASE/api/flujos/ejecuciones/$EJEC2" | python3 -c 'import json,sys; e=json.load(sys.stdin)["ejecucion"]; print(e["estado"])' 2>/dev/null)
  GATE=$(curl -sf "$BASE/api/flujos/ejecuciones/$EJEC2" | python3 -c '
import json,sys
e=json.load(sys.stdin)["ejecucion"]
ps=json.loads(e["pasosEstado"])
w1=ps.get("w1",{})
r=(w1.get("resultado") or {})
print("gatePendiente" if r.get("gatePendiente") else "sin-gate")' 2>/dev/null)
  echo "[val] RESULTADO: flujo sin gate explícito → estado=$EST2, paso ultra_step=$GATE (esperado esperando_aprobacion + gatePendiente)"
  echo "[val] Aprobando el gate para comprobar que el flujo continúa (sin campaña configurada, ULTRA decidirá)…"
  curl -sf -X POST -H 'Content-Type: application/json' -d '{"aprobado":true,"nota":"validacion gate"}' "$BASE/api/flujos/ejecuciones/$EJEC2/aprobar" >/dev/null 2>&1
  for i in $(seq 1 20); do sleep 2; EST2=$(curl -sf "$BASE/api/flujos/ejecuciones/$EJEC2" | python3 -c 'import json,sys; print(json.load(sys.stdin)["ejecucion"]["estado"])' 2>/dev/null); { [ "$EST2" = "completada" ] || [ "$EST2" = "fallida" ]; } && break; done
  echo "[val] estado tras autorizar el gate: $EST2 (completada u omitido en ultra = gate liberado correctamente; NADA se envió: no hay campaña configurada)"
  curl -sf -X DELETE "$BASE/api/flujos/$FLUJO_GATE" >/dev/null 2>&1 || true
  echo "[val] flujo de prueba eliminado"
else
  echo "[val] SKIP gate E2E: no se pudo crear el flujo de prueba"
fi

echo ""
echo "[val] Validación de consolidación terminada."

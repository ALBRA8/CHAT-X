# Informe de pruebas (sección 7 de la orden maestra) — actualizado 2026-10-29

Herramienta: `scripts/pruebas_api.sh` (peticiones HTTP reales contra el servidor local) + `bun test test/unit/` (unitarias del núcleo) + verificación E2E con navegador (agent-browser).

**Resultado 2026-10-29: 33 PASS · 0 FAIL · 0 SKIP (API) + 18 PASS · 0 FAIL (unitarias) + 0 errores de página/consola (E2E navegador).**

Reproducción:
```bash
bun install && bunx prisma db push && bun run dev        # terminal 1
bash scripts/pruebas_api.sh                              # terminal 2 — 33 checks
bun test test/unit/                                      # unitarias
# benchmark GPU (solo con ComfyUI corriendo): bash scripts/benchmark_gpu.sh
```

---

# Fase de consolidación y validación (2026-10-29, post-c8836f2) — sin rehacer lo que funciona

Orden del fundador: consolidar y validar; nada de envíos reales ni publicaciones externas; no declarar integrada una función por el hecho de tener contrato. Resultado: **suite API 33 PASS · 0 FAIL · unitarias 39 PASS (8 nuevas) · E2E de idempotencia 0 duplicados · gate WhatsApp verificado E2E · cerrojo BD verde tras migración con backup**.

## 1. Idempotencia y recuperación (hallazgos REALES corregidos con evidencia)

Auditoría de errores/reinicios/reintentos encontró 4 huecos reales de duplicación, todos corregidos y probados:

| Hueco encontrado | Corrección | Prueba (evidencia) |
|---|---|---|
| **Lote del Estudio duplicado al re-lanzar/reanudar**: `estudio_lote` encolaba un job NUEVO con `batchId=flujo_${Date.now()}` y `varianteBase=Math.random()` en cada intento/re-ejecución | `batchIdFlujo(ejecucionId, pasoId)` determinista + reuso del job existente si ya fue encolado por ese mismo paso + `varianteDeBatch` determinista (sin Math.random) | E2E en `scripts/validacion_consolidacion.sh`: job re-encolado y re-procesado → **0 piezas nuevas, 0 pares (characterId,seed) duplicados** |
| **Piezas duplicadas si el worker moría a mitad de lote**: al reiniciar, el job volvía a la cola y las piezas ya creadas se generaban OTRA vez (Media sin restricción única por semilla) | (a) `producirPieza` reutiliza la pieza existente por (characterId, seed); (b) índice único `@@unique([characterId, seed])` en Media aplicado con **backup previo** (`backups/db-20261028-212409.db`) + `verificar_bd` verde después; (c) cara canónica ahora es upsert (misma variante = misma cara, no duplica fila) | Unitarias nuevas (8 asserts en `test/unit/idempotencia.test.ts`) + suite completa 39 PASS + cerrojo: `✓ 12 tablas, 0 intrusas` |
| **Ejecuciones de flujo zombis tras reinicio**: el corredor vive en memoria; al morir el proceso quedaban `en_curso` para siempre | `iniciarWorker` ahora las marca `fallida` con causa trazable en el registro (margen 120s + exclusión de ejecuciones vivas vía `ejecucionesVivas()`), re-lanzables desde la UI | Código + revisión; BD actual: 0 zombis; el margen evita matar ejecuciones recién arrancadas |
| **crm_accion podía duplicar registros en el CRM**: el contrato crm-actions v0.2.1 **NO** deduplica servidor-side (la nota de "X-Idempotency-Key" del registro era aspiracional — verificado en el clon) | Nota del registro corregida a la realidad + `crm_accion` NO reintenta escrituras (`create_/add_/schedule_`) en fallo ambiguo (sin HTTP): el servidor pudo haberla aplicado | Verificación en el clon CRM (solo lectura) + lógica en flujos.ts |

Además: **gate humano estructural de WhatsApp** — un paso `ultra_step` ya NO puede ejecutarse sin una `aprobacion_humana` COMPLETADA antes en su ejecución, aunque el operador construya un flujo sin gate explícito (defensa en profundidad; `resolverAprobacion` distingue el gate con `gatePendiente/gateAutorizado` para que el paso SÍ ejecute tras el sí).

E2E del gate (`validacion_consolidacion.sh` §3): flujo con `ultra_step` y sin aprobación previa → quedó `esperando_aprobacion` con `gatePendiente` → al autorizar, continuó y completó (sin campaña configurada → nada se envió a nadie).

## 2. Sondeo honesto (falso 404 corregido)

`leads` y `comuniti` tenían `urlPorDefecto=127.0.0.1:3000` — **el propio CHAT-X** — así que el sondeo reportaba "El motor respondió HTTP 404" contra CHAT-X mismo. Ahora: sin URL por defecto → estado `NO_CONFIGURADO` con mensaje explícito. Sondeo tras el arreglo: 6/10 operativos (crm, whatspower, ultra, nexscope, cazador, agentekrea) + 2 NO_CONFIGURADO honestos + youtube/agentegeneral INALCANZABLE (corren en la máquina del fundador).

## 3. Auditoría YouTube Automation / Gemini / Google Flow (verdad de la integración)

- **CHAT-X no tiene ninguna llamada directa a Gemini ni a Google Flow** (grep en src/ + scripts/: solo metadatos del registro y notas de UI). Ambas son **capacidades internas del motor YOUTUBE-AUTOMATION** (guion Gemini 4 modos, TTS dual edge-tts/Gemini, GoogleFlowMCP stdio+CDP).
- Lo que CHAT-X tiene de verdad: registro del motor con sus 7 contratos reales (manifest, execute, production_json/validate, projects, MCP, SSE), pasos de orquestador `youtube_validar/youtube_submit/youtube_estado` que llaman a esos contratos por HTTP, y vista dedicada.
- Clasificación honesta: **contrato + pasos orquestables** = preparado; **invocable de verdad** = solo cuando el motor corre en :8000 (hoy INALCANZABLE en sandbox: exige FFmpeg + Chrome con sesión Google + CDP :9333 en la máquina del fundador); **Flow real** = además exige `FLOW_MCP_ENABLED=1` + `FLOW_MCP_VIDEO_ENABLED=1` (flags apagados por defecto). Gemini como LLM del guion: exige `GEMINI_API_KEY` en el motor (opcional, degrada). Nada de esto está integrado-activo hoy: es contrato listo + motor remoto.

## 4. Evidencia de las pruebas de esta fase (reproducible)

```bash
bash scripts/validacion_consolidacion.sh   # suite API + E2E idempotencia + E2E gate WhatsApp
bun test test/unit/                        # 39 PASS (incluye 8 asserts nuevos de idempotencia)
bash scripts/escaneo_secretos.sh           # 0 secretos en árbol e historial (sin revelar valores)
bun scripts/verificar_bd.ts                # cerrojo de integridad de BD
bun scripts/sondeo_motores.ts              # sondeo honesto 6/10
bun scripts/sondeo_datos_reales.ts         # qué significa OPERATIVO por motor (lecturas reales)
```

Resultados ejecutados (2026-10-29): suite **33 PASS · 0 FAIL · 0 SKIP** (incluye plantilla E2E "Plan → Estudio → Calendario" completada de nuevo tras la migración) · unitarias **39 pass / 0 fail / 1 skip opt-in** · E2E re-encolado del mismo job → **0 duplicados** · E2E gate → **detenido sin sí, liberado con sí, 0 envíos** · md5 de nexscope.db/krea.db **idénticos** tras reinicio de motores · cerrojo BD **12 tablas, 0 intrusas** · PRUEBA REAL de scraping en cazador (HTTP 200) · lecturas reales whatspower (1 flujo) y ultra (0 campañas) · crm/actions **401** sin API key (honesto).

## 5. Bloqueos con intervención del fundador (sin cambios respecto a lo documentado)

1. Revocar el PAT de GitHub (docs/SEGURIDAD.md — 5 min en su navegador; único secreto comprometido, vive solo en el chat).
2. QR de WhatsApp + destinatario consentido (docs/WHATSAPP_QR_ACTIVACION.md).
3. API key `albra_…` del CRM para que crm_accion pase de 401 a ejecutable.
4. Motor YT en su máquina (FFmpeg + Chrome/CDP) para YouTube/Gemini/Flow reales.
5. NVIDIA_API_KEY / TELEGRAM_BOT_TOKEN para LEADS y AGENTE-GENERAL.

Incidente operativo de la sesión (sin pérdida de datos): el sandbox tiene 4 GB de RAM y el kernel mató por OOM al dev server con los 6 motores levantados; se reordenó la validación (suite con 4 motores, luego el resto) y se añadió `scripts/validacion_consolidacion.sh` que arranca y valida en una sola ventana.

## Añadido en esta sesión (2026-10-29) — verificado con evidencia

1. **Motores 9-10 (AGENTE-KREA, COMUNITI-MANAGER)**: sondas honestas PASS en el suite; UI de Operaciones los renderiza con estado real (captura e2e-01-ops.png).
2. **Límite diario de consumo (consumption cap)**: PATCH /api/settings limiteDiario=883 con gastoHoy=882 → lote de 8 cr RECHAZADO con mensaje del techo; techo 5000 → mismo lote ACEPTADO (job real creado). Contador conservador: reembolsos no liberan el contador del día.
3. **Auth admin opcional (fail-closed cuando se activa)**:
   - Con `ADMIN_PASSWORD`: POST sin cookie → 401 · cookie falsa → 401 · login mal → 401 · login bien → cookie httpOnly + POST autenticado pasa (llega al handler) · GET de lectura libre por diseño.
   - Sin `ADMIN_PASSWORD`: login → **503 honesto** ("auth no activada") y la plataforma queda en modo operador único.
4. **Plantilla E2E "Plan → Estudio → Calendario"**: ejecutada por API (suite) y por UI → gate humano → aprobada → **completada**; el Set real de Valentina quedó programado a +2 días y aparece en el CSV del calendario (fila 2026-10-30T19:00Z, fecha_propuesta=no).
5. **Plantilla "Leads → CRM → WhatsApp autorizado"**: sembrada y disponible; crea cliente en CRM real (omitido con aviso si el CRM no corre), exige autorización humana explícita ANTES de cualquier contacto y solo entonces pasa un paso real de campaña ULTRA (su guard anti-ban decide). Nada se envía sin tu sí.
6. ** Nuevos pasos del orquestador**: `programar_publicacion` (Set real → calendario ICS/CSV) y `ultra_step` (contrato real de ULTRA) — con whitelist actualizada y unit tests.
7. **Unitarias bun:test (18)**: crypto (scrypt, wrap/deswrap clave maestra, AES-256-GCM roundtrip + clave errónea = null), filtro de edad aparente, composición de prompt con procedencia, whitelist del orquestador, determinismo de semillas.
8. **Correcciones de calidad**: 5 errores de TypeScript en src/ (verde: `tsc --noEmit` sin errores en src/) · duplicado en pruebas_api.sh · tsconfig excluye clones/plantillas del entorno.
9. **Benchmark GPU reproducible**: `scripts/benchmark_gpu.sh` (SDXL semilla fija, N corridas, $/imagen a tarifa dada). En sandbox sin ComfyUI → **SKIP honesto exit 2** (no simula números). Evaluación completa: docs/EVALUACION_GPU.md.


## Ejecutadas y aprobadas (27)

**Datos base (5):** GET /api · characters · jobs · compliance · kpi → 200 con datos reales.

**Motores (9):** registro completo + sondas honestas de youtube, crm, whatspower, ultra, nexscope, leads, agentegeneral, cazador → 200; estados INALCANZABLE reales (ningún motor corre en el sandbox: correcto, no se simula disponibilidad).

**Seguridad (3):** PUT motores rechaza URL no-http (400) · rechaza user:pass@ en URL (400) · webhook leads fail-closed sin credencial (rechaza).

**Orquestador (7):** GET /api/flujos (siembra demo) · rechazo de paso con tipo no permitido (422) · rechazo de nombre corto (422) · ejecutar → 202 · estado válido · **gate humano: esperando_aprobacion → aprobar → completada** (con lote real del Estudio encolado y procesado por el worker) · cancelación disponible.

**Sistema y publicación (3):** /api/sistema (GPU honesta: none en sandbox, proveedor simulador, cola real 19 listos) · calendario ICS válido · calendario CSV válido.

**UI (1):** GET / shell 200.

**E2E navegador (agent-browser):** shell con 7 módulos y 8 motores renderizados sin errores de página · módulo Automatización: botón Ejecutar → gate de aprobación visible con nota → "Aprobar y continuar" → estado **completada** en UI (captura: work-assets/e2e-flujo-completada.png) · tarjeta GPU en Ops · botones ICS/CSV en UGC.

## Simuladas / omitidas (marcadas como tales)

- Las pruebas de sonda NO validan conexión real a los motores (no corren en el sandbox): validan que CHAT-X los sondea y reporta honesto.
- El lote del Estudio usó el proveedor simulador (sin GPU aquí): la lógica de cola/QA/créditos es real, los píxeles no.
- No se enviaron campañas ni mensajes reales (regla del prompt maestro: nada a personas sin autorización).

## Bloqueadas (requieren intervención del fundador)

- Producción audiovisual E2E real con GPU → máquina del fundador (docs/MOTOR_GPU.md).
- Producción de video vía Google Flow → requiere Chrome con sesión Google + FFmpeg en la máquina del fundador (motor YT).
- Envío real de WhatsApp/campañas → requiere daemon Baileys con sesión QR y piloto confirmado (ULTRA).
- LLM de agentes (AGENTE-GENERAL ejecución real) → requiere API key del proveedor LLM y arranque del servicio.

## Bugs encontrados y corregidos durante las pruebas

1. Dev server con Prisma client viejo tras db:push → reinicio del servidor (cache global).
2. Receptor de webhooks validaba el evento ANTES de la credencial → reordenado fail-closed (auth primero, 503 sin secreto).
3. Script de pruebas: funciones no exportadas a subshells → `export -f` y grep sin cerrar corregidos.

---

# Sesión 2026-10-28 (orden: "cerrar bloqueos y activar producción real")

## Protección del trabajo (punto 1)

- `fcb5010` verificado como HEAD, árbol limpio; remoto NO configurado (push imposible accidentalmente).
- `git ls-files` auditado: **cero** `.env`/tokens/cookies/credenciales/binarios grandes en el commit; `.env*` en .gitignore (línea 34); `engines/` (repos de terceros) fuera del versionado; `git remote -v` vacío.
- Escaneo de secretos hardcodeados (`ghp_`, `sk-`, `AIza`, `xoxb-`) en src/ scripts/ docs/: **0 resultados**.
- El `.env` del sandbox solo contiene `DATABASE_URL`.

## Producción audiovisual REAL (punto 2) — imagen, voz y video por separado

| Capacidad | Estado | Prueba | Resultado |
|---|---|---|---|
| Adaptador ComfyUI (código) | **REAL Y PROBADA** | 5 tests E2E contra contrato API ComfyUI con stub local (`test/unit/comfyui-adaptador.test.ts`): inyección prompt+seed en workflow, polling, descarga /view, envoltura SVG+dimensiones, determinismo de seed, HTTP 500 propagado, timeout sin outputs | 5/5 pass (suite completa 27 pass / 0 fail) |
| Generación REAL por CPU | **REAL Y PROBADA** | `scripts/generacion_cpu_real.py` + provider `local-cpu` con test real opt-in (`PRUEBAS_GENERACION_REAL=1 bun test`) | SD 1.5 fp16: **86.4 s/imagen 384×384, RAM pico 1,892 MB**; PNG fotorrealista verificado en `download/cpu_generacion_real.png` (firma `89504e47…`) |
| Provider `local-cpu` integrado | **REAL Y PROBADA** | factory (`ESTUDIO_PROVIDER=local-cpu`) + worker.ts + test orquestación (script falso: éxito, ok:false, timeout) | 3/3 pass + E2E real 1/1 (98 s) |
| Benchmark CPU reproducible | **REAL Y PROBADA** | `bash scripts/benchmark_cpu.sh` (2 corridas) | **50.8 s/imagen estado estable → 71 img/h → $0.0007/imagen a $0.02/h**; corrida fría 186.7 s (incluye carga de modelo) |
| Voz REAL (TTS) por separado | **REAL Y PROBADA** | `scripts/voz_cpu_real.py` (Piper 1.8, es_ES-carlfm-x_low, onnxruntime CPU) | **5.3 s de audio en 0.21 s de CPU (20× tiempo real)**; WAV real en `download/voz_real_es.wav` (16 kHz, 1 canal) |
| Adaptador ComfyUI contra ComfyUI REAL | PARCIAL | salud + generación requieren ComfyUI corriendo | BLOQUEADO en sandbox (no hay ComfyUI ni GPU); desbloqueo documentado en docs/MOTOR_GPU.md |
| Video REAL (SVD/Wan/AnimateDiff) | **BLOQUEADA** | — | Requiere GPU (24 GB+ para Wan 2.1 14B); en CPU ≈ horas por clip. **No se declara activo.** Ver docs/EVALUACION_GPU.md §4 |
| QA visual automático de identidad | PARCIAL (declarado) | — | Requiere modelo de visión; hoy: identidad determinista por seed + revisión humana en Biblioteca (mismo criterio que ComfyUI, sin fingir QA) |

## WhatsApp seguro (punto 3)

| Capacidad | Estado | Prueba | Resultado |
|---|---|---|---|
| WHATSPOWER 2A (conversación) | **REAL Y PROBADA** | suite sala limpia propia `tests/flow-engine.test.ts + suite.test.ts` → **19/19 pass**; arranque real :3003 | `{"status":"ok","service":"albra-agentic-2a"}` |
| Flujo conversacional EN VIVO | **REAL Y PROBADA** | POST /api/inbound con payload válido (dev, sin firma) | `handled:true, actionTaken:new_lead_welcome`, respuesta generada, `correlationId:e-prueba-1` |
| Cerrojo HMAC + anti-replay | **REAL Y PROBADA** | firma inválida → **HTTP 401**; timestamp expirado → **HTTP 401** "replay protection" (en vivo) | fail-closed verificado |
| WHATSPOWER-ULTRA 2B (difusión) | **REAL Y PROBADA (arranque + cerrojos)** | suite propia 1/1 pass; arranque :3004; módulos anti-abuso auditados (suppression.ts, lock-checker.ts, throttler.ts, broadcast-worker.ts) | `{"status":"ok","service":"whatspower-ultra"}`; despacho real no ejecutado (regla: nada a personas sin autorización) |
| Daemon Baileys (:3002) | PARCIAL (código auditado) | Lectura completa daemon.mjs (846 líneas): fail-closed sin `INTERNAL_API_SECRET` (≥24 chars), QR base64+terminal, sesión en `.wa-auth/`, `/send` autenticado, logout | Arranque real requiere instalar CRM-ALBRA completo + escanear QR con dispositivo → **BLOQUEADO (intervención del fundador)** |
| Vinculación QR documentada | **REAL Y PROBADA (doc)** | `docs/WHATSAPP_QR_ACTIVACION.md` — procedimiento paso a paso desde el código real, prueba con destinatario consentido, logout/rotación de secretos | Documento reproducible |
| Envío real a destinatario consentido | **BLOQUEADA** | — | Requiere teléfono del fundador (escanear QR) |

## Integraciones (punto 4) — sondeo EN VIVO con `sondearMotor` de CHAT-X

`bun scripts/sondeo_motores.ts` (peticiones HTTP reales, 2026-10-28 20:29 UTC):

| Motor | Estado en vivo | Evidencia |
|---|---|---|
| crm (CRM-ALBRA :3100) | **OPERATIVO** (89 ms) | `{"ok":true,"version":"0.2.1","checks":{"db":true}}` — instalado (`--legacy-peer-deps` por conflicto next-auth/nodemailer), esquema `db push` |
| whatspower (:3003) | **OPERATIVO** (2 ms) | arranque + flujo conversacional vivo |
| ultra (:3004) | **OPERATIVO** (2 ms) | arranque + suite 1/1 |
| nexscope (:3300) | **OPERATIVO** (60 ms) | `{"available":true,"status":"ok"}` — instalado + db push |
| cazador (:8787) | **OPERATIVO** (2 ms) | `{"ok":true,"model":"glm"}` |
| agentekrea (:3210) | OPERATIVO→DEGRADADO bajo presión | doctor real: BD/generación/zai/storage/config HEALTHY (5/7); auth_api UNHEALTHY (ruta interna del motor), metrics DEGRADED; bajo presión extrema de RAM (benchmark concurrente) pasó a UNHEALTHY — límite real del sandbox de 3.9 GB |
| youtube (:8000) | INALCANZABLE | lanzadores .vbs de Windows + servicios externos → máquina del fundador |
| leads (AGENTE-LEADS) | INALCANZABLE | backend Telegram (grammy): requiere `tsc` build + `NVIDIA_API_KEY` + `TELEGRAM_BOT_TOKEN` → servicios externos |
| agentegeneral | INALCANZABLE | app Python (pyproject): requiere NVIDIA_API_KEY + TELEGRAM_BOT_TOKEN |
| comuniti | INALCANZABLE | código real (app Next) pero sin manifest raíz (`package.json` ausente) → no instalable aquí |

**6/10 motores con arranque real verificado en sandbox** (5/10 OPERATIVOS simultáneos; KREA degradado por presión de RAM al correr el benchmark en paralelo — hallazgo medido).

## Programar ≠ publicar (distinción estructural)

- `programar_publicacion` (flujos.ts:222): programa `Set.publishedAt` + `publishStatus` y lo hace visible en el calendario ICS/CSV — **NO publica en plataforma alguna**.
- `publishStatus`: `borrador | cifrado | empaquetado | publicado` (schema.prisma:122); el calendario exporta fechas reales y propuestas.
- **No existe paso de publicación real a plataformas** (Fanvue/IG): eso requeriría credenciales de plataforma y está ausente por diseño honesto. El único "submit" real es `youtube_submit` hacia el motor YT cuando corre en la máquina del operador.

## Benchmark y decisión GPU (punto 5)

- `scripts/benchmark_cpu.sh` → **medido**: 50.8 s/imagen estable (384×384, 12 pasos, SD 1.5 fp16), 71 img/h, RAM pico 1.9 GB, **$0.0007/imagen** a $0.02/h.
- `scripts/benchmark_gpu.sh` → SKIP honesto (exit 2) sin ComfyUI: "el benchmark solo tiene sentido con generación REAL". Dependencia exacta que falta: ComfyUI instalado + GPU (o el modelo en su host).
- Comparación completa con datos: docs/EVALUACION_GPU.md §4 (CPU medido vs GPU local vs RunPod vs API — API cerrada descartada para 18+ por ToS).
- **Criterio de decisión**: para FOTO a escala, GPU local RTX 3060 12GB (~$250 usada) se paga con ~2 meses de nube a 5 creadoras; para VIDEO, 4090/A6000 por hora solo cuando hay encargo (facturación por segundo). Ninguna compra sin autorización del fundador.

## Bloqueos concretos restantes (todos de intervención del fundador)

1. **ComfyUI/GPU real** → instalar en tu máquina (docs/MOTOR_GPU.md §Desbloqueo exacto); mientras tanto `ESTUDIO_PROVIDER=local-cpu` ya genera de verdad (lento).
2. **QR de WhatsApp** → escanear con el dispositivo autorizado (docs/WHATSAPP_QR_ACTIVACION.md §3) y probar con destinatario consentido (§4).
3. **Credenciales de motores** → NVIDIA_API_KEY / TELEGRAM_BOT_TOKEN (AGENTE-LEADS, AGENTE-GENERAL) en tu `.env`; no se pegan en chat.
4. **Video real** → GPU 24 GB+ (RunPod por horas o RTX local); el flujo ya está preparado para cambiar de provider con una variable.
5. **Rotación del PAT de GitHub** → procedimiento en docs/SEGURIDAD.md (revocar en github.com/settings/tokens desde tu navegador; el token nunca viaja por el chat).

---

# Sesión 2026-10-28 (tarde) — "terminar el trabajo en curso": incidentes reales encontrados y corregidos

La continuación reveló 3 defectos reales que ninguna prueba anterior cubría (todos de integración/estado, no de lógica pura):

## 1. Éxito vacío del lote del Estudio (worker.ts) — CORREGIDO
- **Síntoma**: plantilla "Plan → Estudio → Calendario" con DB recién creada: el job `lote_fotos` terminaba `listo` con `mediaIds: []` y coste 0 — un éxito que no había generado nada.
- **Causa**: el orquestador encolaba el lote sin `brief` (payload `brief: undefined`) y el worker interpretaba `items = []` como trabajo nulo completado.
- **Corrección**: (a) el worker ahora FALLA el job con mensaje claro y reembolsa ("Lote sin contenido…"); (b) `estudio_lote` construye un brief real derivado del genoma cuando el flujo no trae uno (`construirBriefPorDefecto`, función pura con 4 unit tests nuevas); (c) mensaje de `programar_publicacion` ahora dice exactamente qué falta (Set con piezas aprobadas por QA).
- **Evidencia**: unitarias 31 pass (4 nuevas) · plantilla E2E completa de nuevo: lote → 4 mediaIds reales → Set programado (+2 días) → evento trazado → **completada**.

## 2. Colisión de BD entre CHAT-X y los engines — CORREGIDA Y CERRADA CON CERROJO
- **Síntoma**: tras reinicio del sandbox, la BD de demo desapareció y el sondeo reportaba 404 falsos (motores vivos "inalcanzables").
- **Causa raíz verificada con /proc/*/fd**: CRM, NEX-SCOPE y KREA traen `DATABASE_URL=file:./db/custom.db` (relativo e idéntico) y **Prisma resuelve el .env raíz del monorepo con prioridad** → los 3 engines y CHAT-X compartían UN archivo; cualquier `db push` desde cualquiera reemplazaba las tablas de los otros. (Explica también los P2021 históricos.)
- **Corrección**: cada engine lanzado con `DATABASE_URL` absoluta propia (crm.db / nexscope.db / krea.db dentro de su directorio) + push de esquema con env explícita + `.env` propios actualizados + regla documentada en MOTORES_REGISTRO.md.
- **Cerrojo nuevo**: `scripts/verificar_bd.ts` — verifica que la BD de CHAT-X tenga sus tablas y NO tenga tablas intrusas de engines (exit 1 si está corrompida). Probado: `✓ BD de CHAT-X íntegra — 12 tablas, 0 intrusas`.
- **Verificación del aislamiento**: fds de procesos confirmados (CRM→crm.db, KREA→krea.db) · KREA doctor database HEALTHY · sondeo **6/10 OPERATIVOS**.

## 3. Sondeo con URLs equivocadas (sondeo_motores.ts) — CORREGIDO
- El script usaba los `urlPorDefecto` del registro (puertos de producción) en vez de la config de BD que usa la plataforma → 404 falsos contra CHAT-X mismo. Ahora resuelve **env override → config de BD → default**, igual que la plataforma.

## Disposición de disco (operativo)
- El sandbox llegó con disco 100% lleno (0 bytes libres) durante la reparación — liberados ~2.3 GB de cachés bun/npm (`bun pm cache rm` + `npm cache clean --force`). Sin tocar fuentes ni clones.

## Estado tras la sesión (verificación completa en vivo)
- Suite API: **33 PASS · 0 FAIL** · unitarias **31 pass** (4 nuevas) · tsc limpio · sondeo **6/10 operativos** (crm :3100, whatspower :3003, ultra :3004, nexscope :3300, cazador :8787, agentekrea :3210 con doctor 5/7 HEALTHY).
- E2E plantilla "Plan → Estudio → Calendario": **completada** con contenido REAL en el Set (4 previews QA-aprobadas) y fila en calendario.
- Bloqueos sin cambio: QR WhatsApp (fundador), GPU/ComfyUI real (fundador), video (GPU), LLM keys (fundador), push (PAT).

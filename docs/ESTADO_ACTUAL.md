# ESTADO ACTUAL — CHAT-X al cierre de la fase de validación profunda

> **Referencia:** commit `b5b210c` · 2026-10-29 · fase de validación profunda **CERRADA** (aceptada por el fundador como resultado reportado, sujeta a su revisión).
>
> **Reglas vigentes hasta nueva autorización del fundador:** no agregar funcionalidades ni rehacer módulos; sin gastos ni GPU; sin envíos o publicaciones reales; sin solicitar o incorporar credenciales nuevas; repositorios de terceros intactos; sin cambios de código hasta revisión.

Este documento es la foto única del estado. Separa explícitamente **lo que ya está implementado** de **lo que todavía requiere ejecución local en la máquina del fundador**. Evidencia detallada y reproducible: `docs/INFORME_PRUEBAS.md` (fase b5b210c), `docs/MOTORES_REGISTRO.md`, `docs/evidencia/sonda_profunda.json`, `docs/SEGURIDAD.md`.

---

## 1. Estado por motor (taxonomía de 5 niveles, sonda por capas)

Ningún estado se derivó de un simple HTTP 200: cada capa (conectividad, salud semántica, BD real, dependencias, operación representativa) quedó evidenciada en `docs/evidencia/sonda_profunda.json`.

| Motor | Estado | Causa exacta |
|---|---|---|
| whatspower (:3003) | **OPERATIVO** | 4 capas en verde; BD real (1 flujo); op. representativa `evaluateStep` sin envío |
| whatspower-ultra (:3004) | **OPERATIVO** | 4 capas en verde; BD real; op. representativa `generate-spintax` local |
| agentekrea (:3210) | **OPERATIVO** | doctor: SQLite OK; dependencias críticas HEALTHY; 6 rutas de generación listas |
| cazador (:8787) | **OPERATIVO** | ciclo GLM real de extracción sobre example.com (lectura pública, sin envío) |
| crm (:3100) | **DEGRADADO** | núcleo sano (health ok, db=true); escritura m2m exige API key `albra_…` → 401 honesto |
| nexscope (:3300) | **DEGRADADO** | app viva y sana; trabajo real exige sesión JWT por cookie (el motor no ofrece API key m2m) |
| youtube (:8000) | **NO_DISPONIBLE** | corre en la máquina del fundador (FFmpeg + Chrome/CDP :9333); no corre en este host — dato real, no simulado |
| agentegeneral (:9000) | **NO_DISPONIBLE** | app Python con LLM key externa; corre en la máquina del fundador |
| leads | **NO_CONFIGURADO** | bot Telegram (long-polling, sin HTTP): no sondeable por diseño (falso 404 corregido) |
| comuniti | **NO_CONFIGURADO** | panel :3000 colisiona con CHAT-X: sin URL por defecto (falso 404 corregido) |

Corrección honesta respecto a la fase anterior: los 6 "operativos" de `d131124` quedaron recalificados con la taxonomía estricta — crm y nexscope pasaron a **DEGRADADO** (401 sin credencial; núcleo sano). 0 motores en ERROR.

---

## 2. Lo que YA ESTÁ implementado (en CHAT-X, verificado y probado)

| Capacidad | Evidencia |
|---|---|
| Registro de 10 motores con sus 7 contratos reales de YT y commits origin verificados | `src/lib/motores.ts`, `docs/MOTORES_REGISTRO.md` (ls-remote 2026-10-28, sin push nuestro) |
| Pasos de orquestador `youtube_validar` / `youtube_submit` / `youtube_estado` que invocan los contratos por HTTP (estado corregido al contrato real `GET /api/projects/{pid}`) | 7 unitarias nuevas; suite 46 PASS |
| Suite API 33 PASS · 0 FAIL; unitarias 46 PASS | `bash scripts/validacion_consolidacion.sh`; `bun test test/unit/` |
| Idempotencia E2E: re-encolado del mismo job → 0 duplicados (batchId determinista, índice único characterId+seed con backup previo) | `scripts/validacion_consolidacion.sh` §2 |
| Gate humano WhatsApp E2E: sin aprobación previa → detenido; con aprobación → completó; **0 envíos** | `scripts/validacion_consolidacion.sh` §3 |
| Recuperación de ejecuciones zombis tras reinicio real (4 servidores rearrancados → 0 huérfanas) | consulta SQL readonly |
| Aislamiento de BD: md5 de `nexscope.db`, `krea.db`, `crm.db` idénticos antes/después; cerrojo `12 tablas, 0 intrusas` | `bun scripts/verificar_bd.ts` |
| Cerrojos WhatsApp en vivo: firma inválida 401 · replay 401 · webhook sin credencial 503 fail-closed | curl reales :3003/:3000 |
| Sondeo por capas con taxonomía de 5 estados | `bun scripts/sondeo_motores.ts` → `docs/evidencia/sonda_profunda.json` |
| Escaneo de secretos: 0 secretos en árbol versionado e historial completo; sin remotos git | `bash scripts/escaneo_secretos.sh` |

---

## 3. Lo que está implementado en el MOTOR YT (su repo; auditoría estática del clon `2589e4e`)

Los **7 contratos** están implementados en el código del motor y **ninguno es invocable desde este sandbox** (el motor corre en la máquina del fundador):

| # | Contrato | Implementación |
|---|---|---|
| 1 | `GET /api/harness/v1/manifest` | `youtube_harness/api.py:41` — 19 operaciones `youtube.*` con riesgo LOW/MEDIUM/HIGH/CRITICAL |
| 2 | `POST /api/harness/v1/execute` | `api.py:72` — libro de ejecuciones idempotente por `execution_id` |
| 3 | `POST /api/production_json/validate` | `main.py` |
| 4 | `POST /api/projects` (mode production_json) | `main.py:830` → `{"id": pid, …}` |
| 5 | `GET /api/production_json/contrato` | `main.py` |
| 6 | `POST /mcp` (JSON-RPC 2.0) | `main.py:1962` — exactamente 25 tools |
| 7 | `GET /api/jobs/{id}/events` (SSE) | `main.py:1165` |

Además: `GET /api/harness/v1/executions/{id}`; QA gate del render; publicación como máquina de estados (DRAFT→PUBLISHING→PUBLISHED, 409 idempotente); permisos `youtube.destroy` para destructivas; `FACTORY_AUTOPUBLISH=false` por defecto.

---

## 4. Lo que TODAVÍA requiere ejecución local (máquina del fundador)

| # | Acción del fundador | Efecto al completar | Documento |
|---|---|---|---|
| 1 | **Poner en marcha el motor YT en su máquina** (FFmpeg + Chrome/CDP si luego quiere Flow) | Los 7 contratos pasan de "implementados" a invocables; sondeo marcará youtube alcanzable | `docs/YOUTUBE_AUTOMATION_ARRANQUE_LOCAL.md` (nuevo, modo seguro sin publicar) |
| 2 | **Revocar el PAT de GitHub** (5 min, solo en su navegador) | Cierra la única exposición de credencial conocida | `docs/SEGURIDAD.md` § Revocación |
| 3 | **API key `albra_…` del CRM** (solo si decide conectarla) | crm: DEGRADADO → OPERATIVO pleno (m2m de escritura) | — |
| 4 | **QR de WhatsApp** + destinatario consentido (solo si decide activar envíos) | WHATSPOWER/ULTRA en modo envío real | `docs/WHATSAPP_QR_ACTIVACION.md` |
| 5 | **Sesión JWT de NEX-SCOPE** (o API key m2m en su repo — pendiente del motor, no de CHAT-X) | nexscope: DEGRADADO → OPERATIVO | — |
| 6 | **NVIDIA_API_KEY / TELEGRAM_BOT_TOKEN** (solo si decide) | LEADS y AGENTE-GENERAL plenos | — |

Nada de lo anterior está bloqueando código de CHAT-X: son decisiones y ejecuciones del fundador, cada una con su procedimiento documentado.

---

## 5. Aclaración permanente: Gemini y Google Flow NO son integraciones directas de CHAT-X

- Verificado con grep sobre `src/` y `scripts/` de CHAT-X: **cero llamadas directas a Gemini o a Google Flow**. No se marcarán como integraciones directas en ningún informe ni en la UI.
- Son **capacidades internas del motor YOUTUBE-AUTOMATION** (guion Gemini, TTS dual edge-tts/Gemini, GoogleFlowMCP stdio+CDP con Gates A/C.0/C.1/C.2).
- Lo que CHAT-X integra de verdad es el **contrato del motor YT** (los 7 contratos de la §3) y sus pasos orquestadores.
- Gemini/Flow solo activan cuando ese motor corre en la máquina del fundador **y** él decide aportar sus credenciales/flags (`GEMINI_API_KEY`, `FLOW_MCP_ENABLED=1`, `FLOW_MCP_VIDEO_ENABLED=1`). Sin eso, el motor funciona en modo demo $0 (imágenes placeholder + voz edge-tts) y Flow queda fuera.
- Límites honestos del propio motor (heredados, no ocultos): el E2E real con Google Flow y los controles reales de Flow **no están demostrados** (ver `ESTADO_REAL.md` §3 del motor); HANDS está aislado (`NOT CONNECTED` por diseño en V1.0).

---

## 6. Seguridad al cierre de la fase

- **PAT de GitHub**: único secreto comprometido conocido (vivió solo en el canal de chat). Protocolo de revocación documentado paso a paso en `docs/SEGURIDAD.md`; el token nunca más se mostró ni copió; la revocación la ejecuta el fundador personalmente.
- Árbol versionado e historial completo: **0 secretos** (escáner reproducible sin revelar valores).
- `.env` de engines en disco: solo `DATABASE_URL` (rutas de fichero); **ninguna API key guardada**.
- Remotos git: **ninguno** (push imposible desde este entorno); clones `engines/` intactos, solo-lectura; avances de upstream verificados con `git ls-remote` (fef6682→2589e4e YT, 43e2e4c→d818f3e NEX-SCOPE).
- BD de CHAT-X: 0 API keys guardadas (MotorConfig sin credenciales).

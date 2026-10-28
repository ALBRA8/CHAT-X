# Registro de procedencia de los clones de motores (regla 1 del prompt maestro)

Los repositorios originales de ALBRA8 son SOLO LECTURA. Las copias de trabajo
viven en `engines/` (carpeta gitignored, nunca sube al repo de CHAT-X). Este
archivo es el registro verificable de su procedencia. Fecha de clonación: **2026-10-28**.

| Motor | URL de origen | Commit de origen | Rol en CHAT-X | Modulo | Veredicto auditoría |
|---|---|---|---|---|---|
| YOUTUBE-AUTOMATION | github.com/ALBRA8/YOUTUBE-AUTOMATION | fef6682 | Producción audiovisual (arnés m2m + Production JSON + Flow MCP) | 2 | integrado |
| CRM-ALBRA | github.com/ALBRA8/CRM-ALBRA | ea87cc2 | Récord comercial + chaleco crm-actions + wa-daemon | 3 | integrado |
| WHATSPOWER | github.com/ALBRA8/WHATSPOWER | f4f7fc9 | Flujos conversacionales ManyChat-like | 3 | integrado |
| WHATSPOWER-ULTRA | github.com/ALBRA8/WHATSPOWER-ULTRA | e6ef56d | Difusión masiva anti-ban step-driven | 3 | integrado |
| NEX-SCOPE | github.com/ALBRA8/NEX-SCOPE | 43e2e4c | Investigación de nichos + dispatch a YT | 6 | integrado |
| AGENTE-LEADS | github.com/ALBRA8/AGENTE-LEADS | f54226b | Prospección B2B + webhooks tipados | 6 | integrado |
| AGENTE-GENERAL | github.com/ALBRA8/AGENTE-GENERAL | 69c79da | Runtime agéntico (seed v1) + HITL approvals | 6 | integrado (estado honesto: PRODUCTION_NOT_VERIFIED autodeclarado) |
| Extension-CAZADOR | github.com/ALBRA8/Extension-CAZADOR | 4fc7de5 | Backend de scraping IA (Hotmart/JVZoo/Muncheye/Dropi) | 5 | integrado solo backend (la extensión Chrome queda fuera) |
| COMUNITI-MANAGER | github.com/ALBRA8/COMUNITI-MANAGER | 4bbdc7b | Harness de community management multi-marca | 5 | registrado como motor 10 (sonda + contratos reales); carriles de negocio NO conectados aún: panel sin auth m2m, re-evaluar tras endurecimiento |
| AGENTE-KREA | github.com/ALBRA8/AGENTE-KREA | 460605e | Estudio creativo (/api/generate image/text/voice/subtitle/ebook/prompt) | 2 | registrado como motor 9 (sonda + contratos reales); carriles de generación NO conectados aún: sin token m2m (solo sesión de usuario), solo localhost |

## Reglas aplicadas

1. Clonados con `git clone` (originales intactos, sin push, sin cambios de rama).
2. Ninguna modificación local sobre los clones: se consumen como referencia de contratos.
3. Los clones NO se suben al repo de CHAT-X (`engines/` en .gitignore).
4. Estados derivados SIEMPRE de sondas HTTP reales contra el puerto del motor (ver src/lib/motores.ts), nunca de la existencia del clon: "una carpeta de código copiada no es un servicio corriendo".

## Puertos y conflictos conocidos

CHAT-X :3000 · CRM-ALBRA :3000 (fijar PORT distinto si conviven) · YOUTUBE-AUTOMATION :8000 · WHATSPOWER :3003 · ULTRA :3004 · NEX-SCOPE :81 (Caddy) · AGENTE-GENERAL :9000 (API) + :3000 dashboard + :3002 wa-daemon · CAZADOR :8787 · KREA :3000 · COMUNITI :3000 + worker FB :8765.

> Re-verificación de commits origen: 2026-10-29 (re-clon shallow; LEADS movió a f54226b, el resto idéntico).

## Aislamiento de BD (incidente 2026-10-28 y regla permanente)

**Incidente real**: los tres engines Next (CRM-ALBRA, NEX-SCOPE, AGENTE-KREA) traen `DATABASE_URL=file:./db/custom.db` (nombre relativo idéntico). En este monorepo, Prisma (CLI y cliente) resuelve el `.env` RAÍZ con prioridad sobre el del engine, así que los tres engines y CHAT-X convergían sobre `/home/z/my-project/db/custom.db`. Cualquier `prisma db push` desde cualquiera de los proyectos **reemplazaba las tablas de los demás** (causa de los P2021 históricos del dev.log y de la pérdida de la BD de demo el 2026-10-28).

**Regla permanente (obligatoria)**:
1. Lanzar cada engine SIEMPRE con su DATABASE_URL absoluta propia (la env de proceso gana a cualquier .env):
   - CRM: `DATABASE_URL=file:/home/z/my-project/engines/CRM-ALBRA/db/crm.db bunx next dev -p 3100 -H 127.0.0.1`
   - NEX-SCOPE: `DATABASE_URL=file:/home/z/my-project/engines/NEX-SCOPE/db/nexscope.db bunx next dev -p 3300 -H 127.0.0.1`
   - KREA: `DATABASE_URL=file:/home/z/my-project/engines/AGENTE-KREA/db/krea.db bunx next dev -p 3210 -H 127.0.0.1`
2. Push de esquema de un engine, igual: `DATABASE_URL=file:.../db/<motor>.db bunx prisma db push --skip-generate --accept-data-loss` (dentro del directorio del engine).
3. WHATSPOWER (:3003) y ULTRA (:3004) ya usan ficheros propios (`db/operational.db`, `db/broadcast.db`): no requieren env.
4. Verificar antes de confiar: `bun scripts/verificar_bd.ts` → exit 0 = BD de CHAT-X íntegra (tablas presentes, 0 tablas intrusas de engines).
5. Puertos de sandbox en config de BD (Módulo Operaciones): crm :3100 · nexscope :3300 · agentekrea :3210 — el sondeo (`bun scripts/sondeo_motores.ts`) lee esa config igual que la plataforma.

**Verificación del aislamiento (2026-10-28 21:05 UTC)**: fds de los procesos confirmados — CRM→`engines/CRM-ALBRA/db/crm.db`, KREA→`engines/AGENTE-KREA/db/krea.db` (doctor: database HEALTHY), NEX-SCOPE :3300 200. Sondeo: **6/10 OPERATIVOS**. Cerrojo: `✓ BD de CHAT-X íntegra — 12 tablas, 0 intrusas`.

**Re-verificación tras reinicio de motores (2026-10-29, fase de consolidación)**: NEX-SCOPE y KREA rearrancados con `DATABASE_URL` absoluta → md5 de `nexscope.db` y `krea.db` **idéntico antes/después del reinicio**; NEX health 200; KREA doctor database HEALTHY; cerrojo de CHAT-X 12 tablas / 0 intrusas. El aislamiento sobrevive al reinicio y a un `db push` del host (índice único añadido a Media con backup previo: `backups/db-20261028-212409.db`).

## Qué significa exactamente "OPERATIVO" para cada motor (sondas de datos reales, 2026-10-29)

El estado OPERATIVO del registro viene de `sondearMotor()` (HTTP 200 en el healthPath). Esta tabla define además **qué se puede invocar de verdad ahora mismo** y qué falta para cada capacidad (sondeo: `bun scripts/sondeo_datos_reales.ts`):

| Motor | Health 200 significa | Invocable de verdad HOY | Requiere intervención/credencial |
|---|---|---|---|
| **crm** :3100 | Liveness + `checks.db=true` (BD accesible) | `GET /api/health`, `GET /api/doctor` | `POST /api/crm/actions` devolvió **401**: hace falta la API key `albra_…` (se genera en Settings → API keys del CRM y se guarda en la config del motor en CHAT-X). Sin esa clave, crear clientes vía orquestador queda en NO_AUTORIZADO honesto |
| **whatspower** :3003 | Servicio 2A vivo | Health + **lectura real**: `GET /api/flows` devolvió 1 flujo real ("Flujo Completo de Calificación ManyChat", activo) | Probar flujo con remitente real exige daemon Baileys + QR del fundador |
| **ultra** :3004 | Servicio 2B vivo con sus cerrojos | Health + **lectura real**: `GET /api/campaigns` devolvió 0 campañas (nada configurado, nada despachado) | Despacho real: campaña creada + piloto confirmado + QR del daemon; `ALLOW_REAL_DISPATCH` apagado |
| **nexscope** :3300 | App viva (`available:true, status:ok, auth:anonymous`) | Health + páginas públicas | Endpoints de trabajo (`/api/keywords`, `/api/content-plan`, `/api/mcp`) exigen **sesión JWT por cookie** — el acceso m2m necesita login programático o un contrato de API key en el repo del motor (pendiente del motor, no de CHAT-X) |
| **cazador** :8787 | Backend vivo con proveedor GLM (`model:glm`) | Health + **PRUEBA REAL de scraping ejecutada**: `POST /api/scrape` sobre example.com → HTTP 200, ciclo completo del SDK (rows=0: la página de prueba no tiene campos de producto; la llamada sí procesó de verdad) | Extracciones de producción apuntando a Hotmart/JVZoo/Muncheye — sin costo extra (usa el SDK del sandbox) |
| **agentekrea** :3210 | Doctor profundo: **5/7 HEALTHY** (database, generation_api, zai_provider, storage, config); auth_api y metrics_api DEGRADED (rutas internas del panel del motor, no afectan a la generación) | Health + doctor + generación interna del motor | Generación m2m desde CHAT-X exige token de servicio del motor (hoy solo sesión de usuario) — pendiente del motor |

Y los 4 NO operativos, con su causa exacta: **youtube** :8000 INALCANZABLE (corre en la máquina del fundador: FFmpeg + Chrome/CDP), **agentegeneral** :9000 INALCANZABLE (app Python con LLM key externa), **leads** y **comuniti** **NO_CONFIGURADO desde 2026-10-29** (antes sondeaban `:3000` por defecto — el propio CHAT-X — y reportaban un falso 404; ahora sin URL por defecto, el sondeo lo dice explícito).

## Modificaciones benignas en los clones (auditoría 2026-10-29)

Ningún clon tiene cambios de **código fuente**. Lo que `git status` muestra en algunos:
- `package-lock.json` modificado (CRM, NEX-SCOPE, LEADS, CAZADOR-server): efecto de `npm install`/`--legacy-peer-deps` durante la instalación del 2026-10-28.
- Directorios runtime sin trackear: `.next/` (LEADS), `db/` (ULTRA: su propia BD de difusión).
- `.env` propio (KREA): la corrección del aislamiento de BD (`DATABASE_URL` absoluta), regla documentada arriba.

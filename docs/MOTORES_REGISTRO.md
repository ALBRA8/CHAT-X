# Registro de procedencia de los clones de motores (regla 1 del prompt maestro)

Los repositorios originales de ALBRA8 son SOLO LECTURA. Las copias de trabajo
viven en `engines/` (carpeta gitignored, nunca sube al repo de CHAT-X). Este
archivo es el registro verificable de su procedencia. Fecha de clonación: **2026-10-28**.

| Motor | URL de origen | Commit de origen | Rol en CHAT-X | Modulo | Veredicto auditoría |
|---|---|---|---|---|---|
| YOUTUBE-AUTOMATION | github.com/ALBRA8/YOUTUBE-AUTOMATION | 7709007 (upstream avanzó: fef6682→2589e4e el 2026-10-28 y 2589e4e→7709007 verificado en re-clon 2026-10-30; sin push nuestro) | Producción audiovisual (arnés m2m + Production JSON + Flow MCP) | 2 | integrado |
| CRM-ALBRA | github.com/ALBRA8/CRM-ALBRA | ea87cc2 | Récord comercial + chaleco crm-actions + wa-daemon | 3 | integrado |
| WHATSPOWER | github.com/ALBRA8/WHATSPOWER | f4f7fc9 | Flujos conversacionales ManyChat-like | 3 | integrado |
| WHATSPOWER-ULTRA | github.com/ALBRA8/WHATSPOWER-ULTRA | e6ef56d | Difusión masiva anti-ban step-driven | 3 | integrado |
| NEX-SCOPE | github.com/ALBRA8/NEX-SCOPE | d818f3e (upstream avanzó desde 43e2e4c y corrigió el bug de sintaxis del clon anterior — ver hallazgo abajo) | Investigación de nichos + dispatch a YT | 6 | integrado |
| AGENTE-LEADS | github.com/ALBRA8/AGENTE-LEADS | f54226b | Prospección B2B + webhooks tipados | 6 | integrado |
| AGENTE-GENERAL | github.com/ALBRA8/AGENTE-GENERAL | 69c79da | Runtime agéntico (seed v1) + HITL approvals | 6 | integrado (estado honesto: PRODUCTION_NOT_VERIFIED autodeclarado) |
| Extension-CAZADOR | github.com/ALBRA8/Extension-CAZADOR | 4fc7de5 | Backend de scraping IA (Hotmart/JVZoo/Muncheye/Dropi) | 5 | integrado solo backend (la extensión Chrome queda fuera) |
| COMUNITI-MANAGER | github.com/ALBRA8/COMUNITI-MANAGER | 30564d0 (upstream avanzó desde 4bbdc7b; verificado en re-clon 2026-10-30, sin push nuestro) | Harness de community management multi-marca | 5 | registrado como motor 10 (sonda + contratos reales); carriles de negocio NO conectados aún: panel sin auth m2m, re-evaluar tras endurecimiento |
| AGENTE-KREA | github.com/ALBRA8/AGENTE-KREA | 460605e | Estudio creativo (/api/generate image/text/voice/subtitle/ebook/prompt) | 2 | registrado como motor 9 (sonda + contratos reales); carriles de generación NO conectados aún: sin token m2m (solo sesión de usuario), solo localhost |

## Reglas aplicadas

1. Clonados con `git clone` (originales intactos, sin push, sin cambios de rama).
2. Ninguna modificación local sobre los clones: se consumen como referencia de contratos.
3. Los clones NO se suben al repo de CHAT-X (`engines/` en .gitignore).
4. Estados derivados SIEMPRE de sondas HTTP reales contra el puerto del motor (ver src/lib/motores.ts), nunca de la existencia del clon: "una carpeta de código copiada no es un servicio corriendo".

## Puertos y conflictos conocidos

CHAT-X :3000 · CRM-ALBRA :3000 (fijar PORT distinto si conviven) · YOUTUBE-AUTOMATION :8000 · WHATSPOWER :3003 · ULTRA :3004 · NEX-SCOPE :81 (Caddy) · AGENTE-GENERAL :9000 (API) + :3000 dashboard + :3002 wa-daemon · CAZADOR :8787 · KREA :3000 · COMUNITI :3000 + worker FB :8765.

> Re-verificación de commits origen: **2026-10-30 (re-clon completo de engines/ tras reciclaje de sandbox)**: 8/10 exactos en su pin (CRM ea87cc2, WHATSPOWER f4f7fc9, ULTRA e6ef56d, NEX-SCOPE d818f3e, LEADS f54226b, GENERAL 69c79da, KREA 460605e, CAZADOR 4fc7de5); 2 avanzaron upstream — YOUTUBE-AUTOMATION 2589e4e→7709007 y COMUNITI-MANAGER 4bbdc7b→30564d0 — pins actualizados, sin push nuestro jamás.
>
> Re-verificación previa **2026-10-28 (validación profunda d131124)**: YOUTUBE-AUTOMATION avanzó upstream a 2589e4e (clon actualizado por re-fetch shallow); NEX-SCOPE avanzó a d818f3e (fix del propio autor de 15 errores TS); el resto idéntico (CRM ea87cc2, ULTRA e6ef56d, LEADS f54226b, GENERAL 69c79da, CAZADOR 4fc7de5, KREA 460605e, COMUNITI 4bbdc7b). Nunca hay push nuestro: los avances son del upstream.

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

### Procedimiento de recuperación de un engine Next (validado en la fase d131124)

Cuando un engine Next rearranca roto tras un reinicio del sandbox (500 en todo, caché Turbopack corrupta, o proceso muerto):

```bash
# 1. Fuente intacta: el clon NO debe tener cambios de código (solo lockfiles/runtime)
git -C engines/<MOTOR> status --porcelain          # esperar solo 'M package-lock.json' / untracked db/
# 2. Huella de la BD ANTES (la recuperación no debe escribir en ella)
md5sum engines/<MOTOR>/db/<motor>.db
# 3. Parar el proceso roto (puerto del motor) y limpiar SOLO artefactos runtime
kill $(ss -tlnp | grep :<puerto> | grep -oE 'pid=[0-9]+' | cut -d= -f2) ; rm -rf engines/<MOTOR>/.next
# 4. Rearrancar con SU DATABASE_URL absoluta y DOBLE FORK (el desacople simple muere con el shell del sandbox)
cd engines/<MOTOR> && (DATABASE_URL=file:/home/z/my-project/engines/<MOTOR>/db/<motor>.db nohup bunx next dev -p <puerto> -H 127.0.0.1 > /tmp/<motor>_recuperacion.log 2>&1 < /dev/null &)
# 5. Probar health Y la página raíz (el bug d131124 solo se veía compilando /)
curl -s http://127.0.0.1:<puerto>/api/health ; curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:<puerto>/
# 6. Huella de la BD DESPUÉS (debe ser idéntica) + cerrojo de CHAT-X
md5sum engines/<MOTOR>/db/<motor>.db && bun scripts/verificar_bd.ts
```

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

## Taxonomía de 5 estados y SONDA PROFUNDA (validación d131124, 2026-10-28)

Regla del fundador: **no se marca un motor como operativo por un simple HTTP 200**. Nueva sonda: `bun scripts/sonda_profunda.ts` (secuencial, sin OOM; evidencia JSON en `docs/evidencia/sonda_profunda.json`). Cada motor pasa por capas reales: configuración → conectividad → **salud semántica** (el body dice lo que debe decir) → dependencias + BD real → **operación representativa** (lectura o acción segura sin envío a nadie).

| Estado | Definición exacta |
|---|---|
| **OPERATIVO** | Todas las capas aplicables en verde: responde, el health dice lo que debe, BD/dependencias críticas OK y una operación representativa real funciona |
| **DEGRADADO** | Vivo y con núcleo sano, pero con capacidad limitada (credencial ausente, subsistema no crítico caído) |
| **NO_CONFIGURADO** | Sin URL para sondear (por diseño del registro) |
| **NO_DISPONIBLE** | No responde en red (conexión rechazada/timeout): no corre en este host — dato real, no simulado |
| **ERROR** | Responde pero roto: 5xx, body inválido o semántica incorrecta |

Resultado (2026-10-28, sandbox):

| Motor | Estado profundo | Por qué (capas con evidencia) |
|---|---|---|
| whatspower | **OPERATIVO** | health `status:ok` + lectura real 1 flujo + `POST /api/flows/simulate` (evaluateStep real, sin WhatsApp) OK |
| ultra | **OPERATIVO** | health `status:ok` + lectura de campañas + `generate-spintax` real (determinista, sin envío) OK |
| agentekrea | **OPERATIVO** | doctor: los 5 críticos (database, generation_api, zai_provider, storage, config) HEALTHY; auth_api/metrics DEGRADED sin impacto en generación (documentado) |
| cazador | **OPERATIVO** | health `ok, model:glm` + PRUEBA REAL de extracción sobre example.com (ciclo GLM completo) OK |
| crm | **DEGRADADO** | health `ok:true, checks.db:true` + estabilidad 8-38ms OK; pero toda la capa m2m (`/api/crm/actions`, `/api/doctor`) → **401 sin API key `albra_…`** (el fundador aún no la generó — bloqueo conocido) |
| nexscope | **DEGRADADO** | health `available:true` OK + app viva; trabajo real (`/api/keywords`) → 401 sin sesión JWT (pendiente del motor). HALLAZGO Y CORRECCIÓN: ver abajo |
| leads, comuniti | **NO_CONFIGURADO** | sin URL por diseño (bot sin HTTP / colisión de puerto) |
| youtube, agentegeneral | **NO_DISPONIBLE** | no corren en este sandbox (máquina del fundador) — dato real |
| **ERROR** | **0/10** | ningún motor roto tras las correcciones de esta fase |

### Hallazgos y correcciones de la validación profunda (d131124)

1. **NEX-SCOPE en ERROR real (regresión tras reinicio del sandbox)**: el clon anterior (43e2e4c) traía un **bug de sintaxis upstream** — coma doble en `src/components/views/SettingsView.tsx:77` (`key: 'OPENAI_API_KEY',,`) — que impedía compilar la página raíz y **envenenaba el dev server**: tras el intento, hasta `/api/health` caía a 500. El "OPERATIVO" anterior se basaba solo en health 200 y era frágil (la sonda profunda lo pilló). **Corrección**: clon actualizado al upstream `d818f3e` (fix del propio autor: "15 TS errors… build green"); verificado: `GET /` → 200, health 200 estable después, BD `nexscope.db` con md5 idéntico antes/durante/después. Clon intacto en su código: solo re-fetch del propio upstream.
2. **Contrato de estado YT mal cableado en CHAT-X**: el paso `youtube_estado` hacía polling a `GET /api/jobs/{id}`, ruta que **NO existe** en el motor (solo `/events` SSE y `/cancel`) — habría sondeado un 404 para siempre. **Corrección**: ahora sondea `GET /api/projects/{pid}` (contrato real: `status: pending|paso|ready|failed` + `job.status`) con resolutor puro `resuelveEstadoProyectoYT()` + 7 unit tests nuevas.
3. **YOUTUBE-AUTOMATION upstream avanzó** (`fef6682` → `2589e4e` "prepare NotebookLM series pilot production gate") y **NEX-SCOPE también** (`43e2e4c` → `d818f3e`). Verificado con `git ls-remote` (solo lectura): nunca hubo push nuestro.
4. **Recuperación de proceso tras reinicio**: el primer re-arranque de NEX-SCOPE murió silenciosamente al desacoplarse del shell del sandbox; re-arranque con doble fork `( … & )` verificado estable en llamadas posteriores. Procedimiento documentado abajo.
5. **Escaneo de secretos re-ejecutado** (escáner corregido: ya no emite ruido de "integer expression"): 0 secretos en árbol e historial; único `.env` de engine modificado es el de KREA y solo contiene `DATABASE_URL` (ruta de fichero, sin secreto).

## Modificaciones benignas en los clones (auditoría 2026-10-29)

Ningún clon tiene cambios de **código fuente**. Lo que `git status` muestra en algunos:
- `package-lock.json` modificado (CRM, NEX-SCOPE, LEADS, CAZADOR-server): efecto de `npm install`/`--legacy-peer-deps` durante la instalación del 2026-10-28.
- Directorios runtime sin trackear: `.next/` (LEADS), `db/` (ULTRA: su propia BD de difusión).
- `.env` propio (KREA): la corrección del aislamiento de BD (`DATABASE_URL` absoluta), regla documentada arriba.

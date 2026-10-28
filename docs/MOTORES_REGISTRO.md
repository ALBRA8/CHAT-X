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

# CLONES — procedencia, licencias y dependencias (orden maestra §1 y §4)

Fecha: 2026-10-29. Los clones viven en `engines/` (gitignored — no sube a GitHub).
**Regla inviolable: los repos originales en github.com/ALBRA8 NUNCA se modifican.**
Procedencia re-verificada hoy re-clonando (`--depth 1`, remoto `ALBRA8/<repo>`).

## Procedencia y estado legal

| # | Motor | Commit origen (re-verified) | LICENSE | Lectura legal |
|---|---|---|---|---|
| 1 | YOUTUBE-AUTOMATION | `2589e4e` | (sin archivo) | Propiedad ALBRA — todos los derechos reservados por defecto. Uso interno. |
| 2 | CRM-ALBRA (`crm-albra-saas`) | `ea87cc2` | (sin archivo) | Ídem. |
| 3 | WHATSPOWER | `f4f7fc9` | (sin archivo) | Ídem. |
| 4 | WHATSPOWER-ULTRA | `e6ef56d` | (sin archivo) | Ídem. |
| 5 | NEX-SCOPE | `43e2e4c` | (sin archivo) | Ídem. |
| 6 | AGENTE-LEADS | `f54226b` | (sin archivo) | Ídem. |
| 7 | AGENTE-GENERAL | `69c79da` | **MIT** © 2026 ALBRA | Uso y modificación libres conservando el aviso. |
| 8 | AGENTE-KREA | `460605e` | (sin archivo) | Propiedad ALBRA — todos los derechos reservados por defecto. |
| 9 | COMUNITI-MANAGER | `4bbdc7b` | **MIT** © 2026 ALBRA | Uso y modificación libres conservando el aviso. |
| 10 | Extension-CAZADOR | `4fc7de5` | (sin archivo) | Ídem. El backend `server/` es lo único que CHAT-X integra; la extensión Chrome queda fuera. |

**Acción recomendada para el fundador** (requiere tu decisión, no la ejecutamos por ti): añadir LICENSE a los 8 repos sin licencia (MIT o propietaria declarada) para que la procedencia quede blindada si CHAT-X llega a distribuirse a terceros.

## Dependencias principales (para planificar despliegue)

| Motor | Stack / runtime clave | Puertos | Requisitos duros |
|---|---|---|---|
| YOUTUBE-AUTOMATION | Python 3.10+, FastAPI, FFmpeg, Chrome/CDP | 8000 (+MCP /mcp) | FFmpeg en PATH, Chrome con sesión Google, `FLOW_MCP_ENABLED` para Flow real |
| CRM-ALBRA | Next.js 16, Prisma 6 SQLite, Baileys 7 | 3000 + wa-daemon 3002 | `APP_SECRET`, `APP_ENCRYPTION_KEY`, `INTERNAL_API_SECRET` |
| WHATSPOWER | Node 22+, TypeScript strip-types, node:sqlite (zero-deps) | 3003 | `CRM_BASE_URL`, `AGENTIC_2A_WEBHOOK_SECRET` |
| WHATSPOWER-ULTRA | Node 22+, step-driven | 3004 | `WHATSAPP_DAEMON_URL`, piloto confirmado para dispatch real |
| NEX-SCOPE | Next.js 16, Prisma, JWT cookie | 3000 (Caddy :81) | `JWT_SECRET`, proveedor LLM |
| AGENTE-LEADS | TypeScript + grammy (long-polling, sin HTTP) + better-sqlite3; dashboard NextAuth | — / 3000 | `NVIDIA_API_KEY`, `TELEGRAM_BOT_TOKEN` |
| AGENTE-GENERAL | Python 3.10+, FastAPI | 9000 | `ALBRA_CORS_ORIGINS`, `ALBRA_DEV_TOKEN` (solo local) |
| AGENTE-KREA | Next.js 16, Prisma | 3000 | Proveedor LLM interno |
| COMUNITI-MANAGER | Next.js 16, Prisma (app/) | 3000 | Proveedor LLM y canales según su FICHA |
| Extension-CAZADOR (backend) | Node HTTP puro + z-ai-web-dev-sdk | 8787 | Sin auth ni CORS — solo localhost |

**Conflicto de puertos**: CRM, NEX-SCOPE, AGENTE-KREA y COMUNITI-MANAGER usan todos 3000 por defecto — al correr junto a CHAT-X, fijar `PORT=30xx` distinto por proceso (documentado en cada nota de integración del registro `src/lib/motores.ts`).

## Cómo se usa cada clon (sin reconstruir nada)

CHAT-X NO reimplementa pipelines: cada motor corre en su máquina como servicio y CHAT-X lo consume por su contrato HTTP/MCP real (registro + sondas en `src/lib/motores.ts`, orquestador en `src/lib/flujos.ts`). Los clones en `engines/` son **referencia de contratos** — copia de código ≠ servicio corriendo.

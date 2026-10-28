# ARQUITECTURA — CHAT-X plataforma central del ecosistema ALBRA8

## Principio
UNA PLATAFORMA · UNA INTERFAZ CENTRAL · MÚLTIPLES MOTORES INDEPENDIENTES · CONTRATOS REALES · CERO RECONSTRUCCIONES.

CHAT-X es el host: opera los motores por sus contratos HTTP reales y NO reimplementa nada que ya exista en ellos. Los motores corren en la máquina del fundador; si no están corriendo, su estado real es INALCANZABLE (sonda con timeout 2.5 s), nunca se inventa disponibilidad.

## Diagrama

```
                              ┌───────────────────────────────┐
                              │   CHAT-X (Next.js · :3000)    │
                              │  ┌─────────────────────────┐  │
   Operador ──── UI 7 módulos │  │ Orquestador de flujos   │  │
                              │  │ lib/flujos.ts (Job E2E) │  │
                              │  └───────────┬─────────────┘  │
                              │  ┌───────────▼─────────────┐  │
                              │  │ Registro de motores     │  │
                              │  │ sondas HTTP + config BD │  │
                              │  └───────────┬─────────────┘  │
                              │  ┌───────────▼─────────────┐  │
                              │  │ Estudio (MVP sala limpia)│ │
                              │  │ Genoma/Fábrica/Privado/  │ │
                              │  │ Export/Panel/Compliance  │ │
                              │  └───────────┬─────────────┘  │
                              └──────────────┼────────────────┘
          SQLite (Prisma) ◀──────────────────┘
          Characters/Job/Media/Set/Kpi/Compliance/MotorConfig/
          IntegracionEvent/Flujo/FlujoEjecucion
                       │
        ┌──────────────┼───────────────┬───────────────────┐
        ▼              ▼               ▼                   ▼
 YOUTUBE-AUTOMATION  CRM-ALBRA     WHATSPOWER/ULTRA    NEX-SCOPE / LEADS / AGENTE-GENERAL / CAZADOR
 :8000 FastAPI       :3000 Next.js :3003 / :3004      :81 / bot+dashboard / :9000 / :8787
 arnés m2m + Flow    chaleco       flujos / difusión   nichos / B2B / agéntico / scraping
```

## Módulos de la interfaz (7)

1. **Centro de Operaciones** — stats reales de BD, tarjeta GPU/proveedor (nvidia-smi + ComfyUI + cola), integraciones por sonda, trabajos, accesos.
2. **YouTube Automation** — contrato del arnés m2m + validador Production JSON real (proxy al motor).
3. **CRM y Comercial** — 3 capas (CRM-ALBRA récord → WHATSPOWER conversación → ULTRA difusión), catálogos reales cuando operativos.
4. **Estudio de Avatares** — el MVP de sala limpia intacto (Genoma, Fábrica, Privado cifrado, Biblioteca, Panel, Compliance).
5. **UGC y Campañas** — flujo preparado, calendario de publicación exportable (ICS/CSV real), TikTok Shop honesto (pendiente).
6. **Investigación** — NEX-SCOPE + AGENTE-LEADS (receptor webhook fail-closed) + AGENTE-GENERAL.
7. **Automatización** — orquestador de flujos E2E con pasos reales, aprobación humana, reintentos y trazabilidad.

## Contratos consumidos (fuente: docs/MOTORES_REGISTRO.md + src/lib/motores.ts)

- YOUTUBE-AUTOMATION: `/api/harness/v1/*`, `/api/production_json/validate|contrato`, `/api/projects`, `/mcp`, SSE jobs.
- CRM-ALBRA: `/api/crm/actions` (catálogo crm-actions/v1), `/api/health`, MCP 16 tools, wa-daemon :3002.
- WHATSPOWER: `/api/flows`, `/api/flows/simulate`, locks/suppression internos (HMAC).
- ULTRA: `/api/campaigns`, `/step` (polling del host), webhook-lead con idempotencia, spintax.
- NEX-SCOPE: `/api/keywords`, `/api/content-plan`, dispatch automations (nota honesta: mock si webhook falla).
- AGENTE-LEADS: webhooks salientes tipados → receptor CHAT-X (Bearer, fail-closed 503/401).
- AGENTE-GENERAL: `/api/v1/health|execution|approvals/*` (HITL).
- CAZADOR (backend): `/api/health`, `/api/scrape`, `/api/suggest-fields`.

## Orquestador (secciones 8-9)

Tipos de paso reales: `sondear_motor`, `registrar_evento`, `youtube_validar`, `youtube_submit`, `youtube_estado`, `estudio_lote`, `estudio_esperar_job`, `crm_accion`, `aprobacion_humana`. Interpolación `{{var}}`, reintentos con techo, pasos opcionales (se omiten con aviso), presupuesto de espera topeado, registro append de cada intento. Flujo demo sembrado y probado E2E (ejecutar → gate → aprobar → completada con lote real del Estudio).

## GPU (sección 5)

`ESTUDIO_PROVIDER=simulador|comfyui` — proveedor ComfyUI real (`src/lib/provider/comfyui.ts`) con la MISMA interfaz Provider: PNG real envuelto en SVG para reusar cifrado/miniaturas/procedencia sin tocar el pipeline. Salud vía `/system_stats`. Detección de hardware: `GET /api/sistema` (nvidia-smi con args fijos) y `scripts/detectar_gpu.sh`. Sin GPU el estado reportado es honesto: `none`.

## Mapa de dependencias (externas)

- Runtime: Node/Bun + Next.js 16 + Prisma/SQLite. Sin Redis, sin colas externas (cola propia en BD).
- Generación: ComfyUI (local, $0) o proveedores cloud cuando haya ingresos.
- Motores: ver puertos en docs/MOTORES_REGISTRO.md (conflicto :3000 documentado).

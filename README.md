# CHAT-X — Plataforma Central del Ecosistema ALBRA8

Una plataforma · una interfaz central · múltiples motores independientes · contratos reales · cero reconstrucciones.

CHAT-X opera como **host central** del ecosistema: en su interfaz conviven el Estudio de modelos virtuales IA (construido en sala limpia) y los módulos que gobiernan los motores independientes del ecosistema (producción audiovisual, CRM/WhatsApp, investigación, agentes, scraping) por sus contratos HTTP reales — con estados por sonda, orquestador de flujos con aprobación humana e infraestructura de GPU conectable.

## Mapa del ecosistema — cada repo en su carpeta (modular)

**CHAT-X (este repo) es el CUERPO; los motores son los BRAZOS.** Ningún repositorio
hermano se mezcla jamás con este código: cada uno vive en SU PROPIA carpeta bajo
`engines/`, clonado a un commit fijado, solo lectura, con su propia base de datos
y su propio puerto. La conexión entre ellos NO es código compartido: son
**contratos HTTP entre procesos independientes**. Si un brazo se daña, se repara
o re-clona SOLO ese brazo — el resto del cuerpo no se entera.

```
/home/z/my-project/                 ← CHAT-X (este repo · github.com/ALBRA8/CHAT-X)
├── src/  prisma/  docs/  scripts/  ← el CUERPO: código propio de CHAT-X
└── engines/                        ← los BRAZOS (NUNCA se versionan en CHAT-X)
    ├── CRM-ALBRA/          ← github.com/ALBRA8/CRM-ALBRA          (:3100 · db/crm.db)
    ├── WHATSPOWER/         ← github.com/ALBRA8/WHATSPOWER         (:3003 · db/operational.db)
    ├── WHATSPOWER-ULTRA/   ← github.com/ALBRA8/WHATSPOWER-ULTRA   (:3004 · db/broadcast.db)
    ├── YOUTUBE-AUTOMATION/ ← (:8000)
    ├── NEX-SCOPE/  AGENTE-LEADS/  AGENTE-GENERAL/  AGENTE-KREA/
    └── COMUNITI-MANAGER/  Extension-CAZADOR/
```

- **Cada carpeta = un repo git completo e independiente**: su propio `.git`, su commit fijado (`docs/MOTORES_REGISTRO.md`), sus propias licencias (`docs/CLONES_LICENCIAS.md`).
- **Aislamiento de BD por diseño**: cada motor arranca con SU `DATABASE_URL` absoluta propia (regla permanente tras el incidente 2026-10-28) — jamás comparten fichero de datos.
- **Reparar un brazo sin estallar el cuerpo**: `export RECLONAR_TOKEN=<PAT> bash scripts/reclonar_engines.sh` re-clona cualquier carpeta dañada a su commit fijado — el resto no se toca.
- **En GitHub de CHAT-X no verás los motores**: `engines/` está en `.gitignore` por diseño. Aquí solo vive el cuerpo; los brazos son repos hermanos en la misma organización.

## Ecosistema de motores (originales en github.com/ALBRA8 — solo lectura; ver docs/MOTORES_REGISTRO.md)

Aplicación web para operar un estudio de modelos virtuales IA de forma profesional y auditable: creación de personajes con identidad consistente, fábrica de fotos con control de calidad, carril privado con cifrado fuerte, exportación a plataformas de fans (Fanvue) y panel de gestión con registro de cumplimiento.

Construida con el método de sala limpia (clean room): toda la especificación vivió en `docs/FICHA_Estudio_v1.md` y el código se escribió exclusivamente a partir de ella.

## Módulos

| Módulo | Descripción |
|---|---|
| **E1 Genoma** | Asistente de 7 pasos: audiencia → rasgos ancla → atributos + seed → lore → kit de rasgos firmantes → dataset (30-50 imágenes) → cara canónica → examen de identidad en 5 escenas → personaje ACTIVO |
| **E2 Fábrica de fotos** | Brief → coste previo en créditos → lote de previews → QA (identidad + anatomía) → render final por piezas aprobadas |
| **E3 Estudio privado** | Carril 18+: age-gate real (scrypt + cookie de sesión corta), cifrado automático AES-256-GCM de piezas aprobadas, llave maestra envuelta dos veces (contraseña + secreto del servidor) |
| **E4 Export** | Manifest JSON por set con procedencia completa (prompt, seed, checkpoint, hash de LoRA) para publicar en Fanvue con etiquetado IA |
| **E5 Panel** | Roster de personajes, colas, saldo de créditos, KPIs importables (CSV), coste GPU estimado |
| **E7 Compliance** | Filtro de edad aparente (rechazo duro antes de gastar), log append-only de eventos, export de auditoría JSON/CSV |

## Módulos de la plataforma central

1. **Centro de Operaciones** — stats reales, GPU/proveedor generativo medidos, integraciones por sonda HTTP real, cola de trabajos.
2. **YouTube Automation** — contrato del arnés m2m + validador de Production JSON (proxy real al motor).
3. **CRM y Comercial** — CRM-ALBRA (récord) + WHATSPOWER (conversación) + ULTRA (difusión), cada capa por su contrato.
4. **Estudio de Avatares** — el MVP completo (ver tabla de arriba).
5. **UGC y Campañas** — flujo preparado + calendario de publicación exportable (ICS/CSV) + TikTok Shop honesto (pendiente de credenciales).
6. **Investigación** — NEX-SCOPE, AGENTE-LEADS (receptor de webhooks fail-closed) y AGENTE-GENERAL.
7. **Automatización** — orquestador de flujos extremo a extremo: pasos reales, aprobación humana, reintentos, trazabilidad.

## Arquitectura

- **Next.js (App Router) + TypeScript** — UI y API routes en un solo despliegue
- **Prisma + SQLite** (migrable a Postgres) — personajes, trabajos, medios, sets, KPIs, compliance
- **TanStack Query + Tailwind + shadcn/ui** — panel móvil-primero
- **Proveedor generativo intercambiable** por variable de entorno `ESTUDIO_PROVIDER`:
  - `simulador` (por defecto): generador SVG determinista por semilla, para desarrollo sin GPU
  - proveedor real (ComfyUI local / RunPod / RunningHub): implementa la interfaz de `src/lib/provider/types.ts` y se registra en `src/lib/provider/index.ts` sin tocar el resto del código

## Documentación

- `docs/ARQUITECTURA.md` — diagrama, módulos, contratos, orquestador, GPU
- `docs/MOTOR_GPU.md` — GPU local con ComfyUI ($0/mes): instalación y desbloqueo exacto
- `docs/MOTORES_REGISTRO.md` — procedencia de los clones de motores (URL, commit, fecha, veredicto)
- `docs/SEGURIDAD.md` — informe de seguridad honesto (implementado / riesgos aceptados / pendientes)
- `docs/CLONAKIT_BRECHAS.md` — análisis de brechas vs referentes y roadmap priorizado
- `docs/FICHA_Estudio_v1.md` — especificación de sala limpia del Estudio
- `docs/INFORME_PRUEBAS.md` — resultados de pruebas ejecutadas (33 API + 18 unitarias + E2E navegador)
- `docs/EVALUACION_GPU.md` — evaluación GPU con datos: modelos, VRAM, costos por imagen/clip, licencias, criterio de compra
- `docs/CLONES_LICENCIAS.md` — licencias, dependencias y puertos de los 10 clones

## Seguridad y cumplimiento

- La llave maestra del carril privado **no vive en el repo**: se genera en runtime y se guarda envuelta en `media/.server-secret` (fuera de git, permisos 0600)
- Piezas privadas cifradas en disco (`.enc` + IV + tag AES-256-GCM)
- Auth admin opcional fail-closed: define `ADMIN_PASSWORD` en `.env` y toda acción que muta (POST/PUT/PATCH/DELETE) exige sesión httpOnly; sin la variable, el login responde 503 honesto
- Límite diario de consumo: `limiteDiario` (Ajustes) fija el techo de créditos comprometidos por día en el punto único de cobro
- Log de compliance append-only
- Registro de procedencia por medio: prompt, seed, checkpoint y hash de LoRA (prueba de originalidad)
- Filtro de edad aparente: los briefs con términos de menoría son rechazados antes de consumir créditos, con evento de compliance

## Puesta en marcha

```bash
bun install
npx prisma generate && npx prisma db push
cp .env.example .env   # ajusta DATABASE_URL; opcional: ADMIN_PASSWORD, COMFYUI_URL, ESTUDIO_PROVIDER
bun run dev            # http://localhost:3000
```

**Pruebas** (reproducir todo):
```bash
bun test test/unit/          # 18 unitarias del núcleo (crypto, compliance, flujos)
bash scripts/pruebas_api.sh  # 33 checks de API contra el servidor en marcha
bash scripts/benchmark_gpu.sh  # benchmark real SDXL (necesita ComfyUI; si no: SKIP honesto)
```

Variables de entorno: ver `.env.example`. Proveedores: `ESTUDIO_PROVIDER=simulador|comfyui` (misma interfaz; docs/MOTOR_GPU.md y docs/EVALUACION_GPU.md).

## Estructura interna de CHAT-X (el cuerpo)

```
src/
  app/api/          # rutas API (characters, studio, media, sets, compliance, kpi…)
  app/              # shell del panel
  components/estudio/  # vistas: Genoma, Estudio, Biblioteca, Panel, Compliance
  lib/
    provider/       # interfaz de proveedor generativo + simulador
    crypto.ts       # AES-256-GCM + scrypt
    clave-privada.ts# envoltura de llave maestra del carril privado
    compliance.ts   # log append-only + filtro de edad aparente
    worker.ts       # cola de trabajos
prisma/schema.prisma
docs/FICHA_Estudio_v1.md   # especificación (fuente única de la sala limpia)
```

## Reglas del repositorio

- No se versionan: `media/` (contenido generado + secreto del servidor), `db/` (datos), `.env`, ni artefactos de investigación locales
- Sin contenido real en git: el repo contiene solo código y especificación
- Cero deepfakes / cero personas reales: la identidad nace de atributos y seeds propias del estudio

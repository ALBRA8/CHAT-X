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

# EVOLUCIÓN DE ALBRA8 — barrido 2026-11-20 (puesta al día, D-015)
**Creado:** 2026-11-20 · **Estado:** FOTO DE MOVIMIENTO · **Método:** `ls-remote` + clones shallow de los 24 repos, SIN token (PAT de exilio ya revocada — repos públicos, git anónimo)
**Corte previo:** S-005/S-006 (2026-11-07). **Orden del fundador:** "hay cambios en los repos… quiero que te pongas al día"; los clones NO van a musestudio8 todavía (D-015).

## 1. Resumen

**12 de 24 repos movieron desde el corte** (≈340 commits en 12 días). CHAT-X sigue en `54081aa` (nada nuevo en la torre). La tendencia clara: el ecosistema ALBRA8 se está consolidando como **suite desplegable** (Docker/MSI/EEC vía INSTALADOR + PANEL-DE-CONTROL) y las herramientas de conversación (WHATSPOWER/ULTRA/CRM) alcanzaron paridad declarada con WhatsOn con compliance de difusión. Ningún repo nuevo, ninguno borrado (24/24 estables).

## 2. Detalle por repo (commits desde 2026-11-07)

| Repo | Commits | Qué hizo (evidencia de mensajes) | Impacto para nosotros |
|---|---|---|---|
| CRM-ALBRA | 80 | docs masivos: paridad 100% WhatsOn, webinar WhatsON, ingeniería inversa antispam, higiene (sanitización de teléfonos/nombres), E2E 3 servicios, matriz de producción con evidencia ejecutada | Referencia de sala limpia para F1 (antispam, higiene de datos). Upstream movió respecto a nuestro pin |
| INSTALADOR | 62 | MSI WiX 5.0.2 validado, despliegue Docker unificado (flujo 10 pasos), EEC V1 durable (anti-replay EecNonce, runs autenticados, gateway XFF por valor), homologación UI↔EEC, build-msi en CI | Ya caracterizado: es el instalador de despliegue de la casa vecina → PORTABILIDAD actualizada (sugerencia NO APLICA, pendiente OK del fundador) |
| WHATSPOWER-ULTRA | 43 | Auditorías ciclos 1-2 (152 pruebas verdes, tsc limpio), worker 2B persistente round-robin por organización, campañas con credenciales Meta POR organización (fin de credenciales globales), canal oficial Meta Cloud 24h, compliance fase 2 (consentimiento en difusión, bajas auditadas, hash de IP), healthcheck con métricas, dashboard único con paridad WhatsOn | P0 de auth y compliance de difusión: patrones de referencia para nuestro daemon F1 cuando toque difusión |
| YOUTUBE-AUTOMATION | 37 | MCP NotebookLM endurecido (sync dual de auth.json, fallback resiliente, CDP), Flow CDP con cookies resilientes y calentamiento en stage 3, NVENC + filter_complex unificado en ffmpeg, sonda HTTP del catálogo (`GET /api/mcp/catalogo`), oleadas Z/Y/X de fixes | Motor SFW de vídeo sigue sano y activo. Pin upstream `39b6bf9` → `298016e` |
| WHATSPOWER | 31 | Panel ManyChat-like propio con API protegida y auditoría, Flow Studio visual (drag-and-drop, addNode con borrador automático), plantillas HSM + 8 endpoints de panel, ejecutores de esperas/planificador/secuencias con pruebas | Su flow-engine sigue "código detrás de la puerta" para F1 (disparadores anotados en CLONAKIT_BRECHAS §veredicto WHATSPOWER) |
| PANEL-DE-CONTROL | 29 | EEC: contrato único de configuración (simulación OFF por defecto en producción), ciclo de vida de ManagedOperation reconciliado, `build-image` publica ghcr.io/albra8/panel-de-control | El control-plane de la casa vecina se productiza; CHAT-X sigue siendo EL control plane del negocio (D-013) |
| AGENTE-CHISMOSO | 28 | UI pro 2027, WhatsApp daemon automático, búsqueda Serper live con rutas de investigación dinámicas, settings saneados (solo Tavily/Serper/Brave), "CONTEXTO CHISMOSO" (memoria arquitectónica y operativa) | Nuestro radar de tendencias evolucionó mucho; la copia del fundador sigue POR_VERIFICAR al desbloqueo |
| AGENTE-LEADS | 16 | Dashboard+Bot unificados con lanzador completo, launchers .bat ASCII arreglados, WhatsApp daemon integrado al launcher, "CONTEXTO LEADS" (arquitectura y guías) | Ídem — POR_VERIFICAR sigue |
| CONTEXT | 16 | Specs de ciclo de vida EEC + auditorías de compatibilidad de heads + "arquitectura real del ecosistema ALBRA (orden maestra)" | Intel de la casa vecina; sin efecto directo en musestudio8 |
| COMUNITI-MANAGER | 9 | P17-P19: identidad "agente INDEPENDIENTE de redes sociales", conector WhatsApp PROPIO con sesión QR (protocolo WhatsApp Web, sin navegador), destripe sala limpia de browser-use + arnés QA agéntico, nav por misión | Su conector WhatsApp propio con QR valida EXACTAMENTE la vía CASA PROPIA (D-007) que ya adoptamos para F1 |
| NEX-SCOPE | 3 | Launchers tipo ALBRA (VBS + bat auto-reparador), SQLite local inicializada, devIndicators off | Sigue DEGRADADO (JWT); mejoró el hábito de arranque local |
| AGENTE-TRADING | 2 | "TIME MACHINE" — odds honestas del plan antes de arriesgar | NO APLICA (D-013) — sin cambio de carril |
| AGENTE-GENERAL | 1 | Parsing PDF/Word/Excel/TXT + fixes de CI | Sin efecto |

Sin movimiento: ABOGADO-BASE, AGENTE-KREA, BROWSER-FACTORY, CONTADOR-PUBLICO, DESPACHO-JURIDICO, ERP-ADMON, Extension-CAZADOR, MAXI-APP, PURO-PODER-CONOCIMIENTO, RADAR-SECOP2.

## 3. Consecuencias registradas

1. **Pins de `MOTORES_REGISTRO.md` quedaron viejos**: WHATSPOWER `85d7fcf`→`3b097f6` · ULTRA `8d00230`→`c7bf070` · YT-AUTOMATION `39b6bf9`→`298016e` · CRM y COMUNITI también movieron. No se re-anclan sin verificación: `scripts/reclonar_engines.sh` reconstruye y re-ancla cuando el fundador ordene (además `engines/` está vacío por reciclaje del sandbox, F-003).
2. **PORTABILIDAD_REPOS.md**: INSTALADOR caracterizado (sugerencia NO APLICA, pendiente de OK del fundador); MAXI-APP sigue POR_DEFINIR (0 commits, descripción vaga); carriles LLEVAR/SUBCONTRATAR/BRAZOS sin cambios.
3. **Las 3 copias del fundador (AGENTE-LEADS, AGENTE-CHISMOSO, NEX-SCOPE) siguen POR_VERIFICAR**: musestudio8 sigue listando 0 repos visibles; el acta de la vuelta (paso 1 del plan) lo resolverá. Nota: ambos agentes (leads y chismoso) tuvieron evolución fuerte del lado ALBRA8 — al verificar las copias hay que comparar contra ESTOS heads, no contra los del corte.
4. **D-015**: los clones NO van a musestudio8 todavía; el plan de vuelta queda **EN ESPERA DE ORDEN del fundador**, no solo de desbloqueo.
5. **PAT de exilio muerta confirmada** (401 Bad credentials, 2026-11-20): sin vía de push hasta PAT nueva fine-grained → los registros de esta sesión quedan committeados en local, pendientes de subir (F-001 actualizado).
6. Corrección honesta de fecha: el informe de auditoría entregado en el chat quedó fechado 2026-11-07; el barrido en vivo se hizo 2026-11-20 (informe regenerado con fecha correcta en `download/`).

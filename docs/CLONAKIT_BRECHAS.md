# ClonaKit — Análisis de brechas y mejoras (referentes del fundador)

Fuentes: research/clonakit/INFORME_BATCH0_8.md (8 originales: OmniBrain,
OmniMint, TokPrimeAI, Cinemation, Clientforce, BuzzAgentsAI, GPTVideos,
Synthesys Studio), INFORME_JVZOO_BATCH_A.md (11 generalistas),
INFORME_ADULTOS_BATCH_B.md (KINKU, LOVELAB, APATERO, MAGE) y
research/ia-influencer/ANALISIS.md (intel por dentro de "IA Influencer").
Fecha: 2026-10-28 — INTEL COMPLETA: 23/23 referentes documentados. CONFIDENCIAL (no sube a GitHub).

## Lo que YA supera CHAT-X a los referentes (no tocar, mantener)

1. **Compliance como producto**: log append-only, filtro de edad duro, etiquetado IA,
   procedencia por pieza, export de auditoría — KINKU/MAGE lo anuncian a medias; aquí es verificable.
2. **Ecosistema comercial real**: CRM + WhatsApp conversacional + difusión + leads.
   Ninguno de los 23 referentes tiene CRM real; venden "scrapers de leads" genéricos
   (Clientforce/BuzzAgentsAI venden agentes, pero sin canal de mensajería propio conectado).
3. **Consistencia verificable**: genoma + cara canónica + examen de identidad + LoRA versionada
   (MAGE lo resuelve bien; APATERO declara que NO garantiza identidad).
4. **Multi-motor honesto**: estados por sonda real vs. landing pages que prometen de todo.
5. **Reembolso de créditos por fallo**: YA existía en el worker (paridad con "IA Influencer" desde el día 1).

## Brechas cerradas en esta sesión (implementado, probado)

| Brecha | Origen | Implementación |
|---|---|---|
| Calendario de publicación exportable | "IA Influencer" (gated por plan) / APATERO InstaDump | `GET /api/publicacion/calendario` ICS+CSV desde Sets reales, botones en UGC — gratis, sin gate |
| Orquestador E2E con aprobación humana | OneManArmy / GramGenies / SuperAgentsAI (pipelines auto) | Módulo Automatización + lib/flujos.ts + 6 rutas API, probado E2E |
| Infra GPU real plugable | Todos los referentes dependen de créditos cloud | Provider ComfyUI real + /api/sistema + docs/MOTOR_GPU.md (ruta $0/mes) |
| Estado de GPU/sistema medible | (transversal) | /api/sistema (nvidia-smi, cola, proveedor) + scripts/detectar_gpu.sh |
| Registro de motores ampliado | AGENTE-GENERAL y CAZADOR añadidos como motores 7 y 8 con contratos reales | motores.ts + sondas + UI |

## Brechas PRIORIZADAS pendientes (roadmap con criterio de aceptación)

**P1 — directo a ingresos Fanvue:**
1. Motor GFE "Modo Novia" con **imágenes generadas dentro del chat** (LovLab #1, top-1 de toda la investigación). Aceptación: desde el chat, pedir foto a la modelo y recibir pieza del carril correcto con QA + compliance.
2. **Character card auto desde el genoma** (LovLab): export JSON/imagen de la tarjeta + prompt de sistema del companion en 1 clic desde el Panel. Aceptación: descargar tarjeta de Valentina.
3. **Voice notes GFE** (Fanvue tiene AI Voice Notes; Kinku/Mage bindean voz): integrar TTS cuando exista proveedor; contrato de voz guardada por personaje.

**P2 — fábrica más barata y rápida:**
4. **Escalera de calidad de vídeo draft→max** (Apatero): coste por escalón antes de gastar. Requiere proveedor de vídeo (Google Flow del motor YT o nodos de vídeo ComfyUI).
5. **InstaDump nativo**: 1 foto → lote multi-escena/outfit automático (hoy: lote con brief único + presets manuales).
6. **Outfit Swap / try-on** (Mage): variación de vestuario sin deriva facial — requiere img2img en provider (contrato ya documentado para ComfyUI).
7. **Trend-finder + espía de competidores para UGC** (TokPrimeAI): detectar formatos virales y feeds de competidores para alimentar briefs del carril social (hoy el módulo UGC publica, pero no descubre).
8. **Flujo URL→video en el orquestador** (GPTVideos): una URL → brief → video listo, como paso del motor de flujos cuando haya proveedor de vídeo real.

**P3 — monetización de la plataforma:**
9. Modelo Apatero de **suscripción con rollover + packs eternos** cuando CHAT-X abra a terceros.
10. Split **90/10 estilo marketplace** (Kinku) si se abre galería de creadores.
11. **Funnel FE + OTOs por módulos** (ZapAgent/OmniBrain: 8 OTOs) para lanzar como producto en JVZoo/Whop.
12. **White-label / marketplace de terceros** (OmniMint builder + Kinku 90/10): abrir CHAT-X como plataforma marcada con creadores externos (requiere multi-tenant y compliance reforzado).
13. **Agente de llamadas telefónicas IA** (Synthesys AI Calls / Clientforce): solo si abrimos venta consultiva B2B; NO núcleo Fanvue.

**No copiar:** deepfake de personas reales (NCII) — prohibido por Fanvue y por nuestra política de compliance; scraping agresivo estilo "10k leads en 1 segundo" (riesgo legal/ToS); automatización de publicación en Facebook (ToS Meta, riesgo de cuenta).

## Conclusión
CHAT-X ya tiene el núcleo que los referentes NO tienen (compliance + CRM + multi-motor + consistencia verificable). La brecha competitiva real está en el carril de chat GFE con media en contexto y en voz — ambas dependen del motor GFE (fase 2) y de proveedor real de imagen/vídeo/voz (GPU local desbloqueable con docs/MOTOR_GPU.md).

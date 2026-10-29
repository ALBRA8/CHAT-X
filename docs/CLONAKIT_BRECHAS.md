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
| **Voice notes GFE — contrato de voz por personaje** (P1.3) | Fanvue AI Voice Notes (2026: paridad obligatoria, no gap) | `src/lib/provider/voz.ts` (espeak-local OPERATIVO $0, piper-local NO_DISPONIBLE documentado) + `voiceContract` por Character + `GET/PUT/POST /api/characters/[id]/voz` (muestra WAV real, Media kind=voz, cifrado carril privado, etiqueta IA, compliance `voz_generada`, filtro de edad duro también en texto de voz) — 12 unitarias + 7 checks API |
| **Motor GFE "Modo Novia" — chat con media en contexto** (P1.1) | LovLab #1 del nicho (imágenes dentro del chat) | modelo `ChatMessage` + `POST/GET /api/chat`: intención foto → job REAL del Estudio (brief determinista desde genoma, carril público, QA + compliance del worker, reembolso por fallo heredado); intención voz → nota de voz del contrato P1.3 al vuelo; texto → LLM real (`src/lib/provider/llm.ts`, OpenAI-compatible/Groq) con el system prompt único del companion y filtro de edad TAMBIÉN en la salida; si la sonda no da OPERATIVO, plantilla del genoma declarada (`meta.modo=plantilla_genoma` + `llmEstado`/`llmFallo`) — nunca se finge LLM; módulo Chat en el Panel + WAV servido por `/api/media/[id]/archivo` (público claro / privado descifrado con sesión) |
| **Character card desde el genoma** (P1.2) | LovLab (tarjeta exportable) | `GET /api/characters/[id]/tarjeta`: JSON completo (genoma, signKit, seed, cara canónica, contrato de voz con estado real) + system prompt del companion + cara en `?formato=svg`; bloqueada por compliance si el genoma no declara adulta verificada; evento `exportacion` |
| **Cerebro LLM del chat — OpenAI-compatible honesto** (upgrade P1.1) | Todos los referentes venden "IA" sin declarar modelo ni fallback | `src/lib/provider/llm.ts`: sonda REAL (`GET {base}/models` → OPERATIVO/NO_CONFIGURADO/ERROR con detalle, p.ej. 403 de edge = bloqueo regional del egreso, no de la key); Groq por defecto con key del fundador (env: `LLM_API_KEY/LLM_BASE_URL/LLM_MODEL/LLM_PROVEEDOR`, base/modelo intercambiables a OpenRouter/Together/etc. sin tocar código); system prompt ÚNICO compartido con la tarjeta P1.2; evento compliance `llm_chat`; `/api/sistema` expone la sonda — 11 unitarias herméticas + checks API |
| Infra GPU real plugable | Todos los referentes dependen de créditos cloud | Provider ComfyUI real + /api/sistema + docs/MOTOR_GPU.md (ruta $0/mes) |
| Estado de GPU/sistema medible | (transversal) | /api/sistema (nvidia-smi, cola, proveedor) + scripts/detectar_gpu.sh |
| Registro de motores ampliado | AGENTE-GENERAL y CAZADOR añadidos como motores 7 y 8 con contratos reales | motores.ts + sondas + UI |

## Brechas PRIORIZADAS pendientes (roadmap con criterio de aceptación)

**P1 — directo a ingresos Fanvue:**
1. ~~Motor GFE "Modo Novia" con **imágenes generadas dentro del chat**~~ **CERRADA 2026-10-29** (chat con intención foto → pipeline real; cerebro: LLM real OpenAI-compatible con estados honestos — la sonda declara si el egreso de esta máquina llega o no al proveedor; plantilla del genoma como fallback declarado, jamás fingido).
2. ~~**Character card auto desde el genoma**~~ **CERRADA 2026-10-29** (JSON + system prompt + cara SVG en 1 clic; probado con Valentina).
3. ~~**Voice notes GFE**~~ **CERRADA 2026-10-29** (contrato por personaje + espeak-local $0 + notas de voz DENTRO del chat; voz natural = instalar piper, ver MOTOR_GPU.md).

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

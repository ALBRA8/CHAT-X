# ClonaKit — Análisis de brechas y mejoras (referentes del fundador)

Fuentes: research/clonakit/INFORME_BATCH0_8.md (8 originales: OmniBrain,
OmniMint, TokPrimeAI, Cinemation, Clientforce, BuzzAgentsAI, GPTVideos,
Synthesys Studio), INFORME_JVZOO_BATCH_A.md (11 generalistas),
INFORME_ADULTOS_BATCH_B.md (KINKU, LOVELAB, APATERO, MAGE),
research/ia-influencer/ANALISIS.md (intel por dentro de "IA Influencer") y
research/clonakit/INFORME_RECON_BATCH_C.md (lote 2026-10-30: Pykaso, Recraft,
Krea, Enhancor, Pikaso, Pyksel).
Fecha: 2026-10-28 — 23/23 referentes. Ampliado 2026-10-30: 29/29 (Batch C). Ampliado 2026-10-30 (2.ª): 30/30 (Adobe Firefly, propuesto por el fundador). CONFIDENCIAL (no sube a GitHub).

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

## Recon Batch C (2026-10-30) — referentes 24–29 y adopciones

Detalle completo en research/clonakit/INFORME_RECON_BATCH_C.md. Veredictos:
24 Pykaso (deep pendiente; face swap NCII no copiar) · 25 Recraft (patrón de
vectorización para cara canónica) · 26 Krea (paridad con nuestra arquitectura;
solo adopta multi-referencia) · **27 Enhancor (joya del lote: realismo de piel**
**para GFE)** · 28 Pikaso (descartado, avatares sobre rostros reales) ·
29 Pyksel (MUERTO 30-sep-2026 — lección de mortalidad SaaS).

Adopciones concretas del lote (integran al roadmap):

- **A1 — Objetivo de realismo de piel** (Enhancor): el provider real (GPU) debe
  producir piel sin look plástico (poros, textura, iluminación natural).
  Criterio: comparativa antes/después sobre el examen de identidad, sin deriva.
- **A2 — Biblioteca de presets con nombre** (Enhancor) — **IMPLEMENTADA 2026-10-30**:
  `src/components/estudio/biblioteca.ts` con 8 presets (Ethereal Light, Blinds Noir,
  Gobo Spotlight, Golden Hour Window + iPhone Selfie V1–V4) y fila "Biblioteca de
  iluminación" en el Brief del Estudio. Semántica de fragmento: rellena solo los
  campos no vacíos, no pisa el brief del usuario. $0, adoptada en ficha.
- **A3 — Control de intensidad en signKit** (Enhancor Freckle Control) — **IMPLEMENTADA 2026-10-30**:
  `RasgoFirmante.intensidad` (1 sutil … 5 dominante, ausencia = 3 media por compatibilidad);
  Select por rasgo en el paso 5 del Genoma; el kit firmante entra ahora al prompt real de
  generación (`rasgos firmantes: … (intensidad n/5)`) en lote y render final, con
  unitarias nuevas en nucleo.test.ts. Compatibilidad hacia atrás sin migración.
- **A4 — Post-proceso de voz sintética** (Enhancor UGC Audio Fixer): cuando la
  capa 3 de voz tenga síntesis, añadir pulido de audio para quitar artefactos
  robóticos (registra en la arquitectura de voz, no bloquea nada hoy).
- **A5 — Multi-referencia en imagen** (Krea Muse): alimenta la brecha P2 #6
  (outfit swap) — el contrato del provider real debe aceptar N imágenes de
  referencia, no solo una.
- **A6 — Créditos que nunca expiran** (Enhancor, igual que Apatero rollover):
  segunda validación del modelo de monetización P3 #9.
- **A7 — Vectorización como ruta futura de cara canónica** (Recraft):
  patrón para derivar SVG de cara canónica desde foto real del examen; hoy la
  cara canónica se dibuja, el patrón permite una vía alternativa local.

## Adobe Firefly (2026-10-30) — referente 30, veredicto NO VIABLE para el nicho

Propuesto por el fundador como opción "dado el caso que toque usar tokens".
Veredicto honesto tras verificar la política pública: **Adobe Generative AI User
Guidelines (rev. 2026-05-15) prohíben crear material pornográfico o desnudez
explícita** — el "commercially safe" de Firefly es incompatible con el carril 18+
incluso pagando ($9.99–$199.99/mo por créditos; tier gratis con límites diarios).
Solo serviría para activos SFW (portadas, marca, material no explícito) que el
pipeline local ya cubre a coste cero. **Decisión: no gastar tokens en Firefly.**
Si algún día hace falta un provider de pago por capacidad, debe ser adult-tolerant
y requerirá autorización explícita del fundador (regla $0). La lección Pyksel
(mortalidad SaaS) ya marcó la dirección: modelos locales primero.

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

**No copiar:** deepfake de personas reales (NCII) — prohibido por Fanvue y por nuestra política de compliance; **face swap sobre rostros de terceros (Pykaso) y avatares generados desde fotos de personas reales (pikaso.ai) — misma línea NCII**; scraping agresivo estilo "10k leads en 1 segundo" (riesgo legal/ToS); automatización de publicación en Facebook (ToS Meta, riesgo de cuenta).

## Conclusión
CHAT-X ya tiene el núcleo que los referentes NO tienen (compliance + CRM + multi-motor + consistencia verificable). La brecha competitiva real está en el carril de chat GFE con media en contexto y en voz — ambas dependen del motor GFE (fase 2) y de proveedor real de imagen/vídeo/voz (GPU local desbloqueable con docs/MOTOR_GPU.md).

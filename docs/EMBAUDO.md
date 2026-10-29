# Embudo FE + OTOs — CHAT-X como producto (P3.11 de CLONAKIT_BRECHAS)

Modelo ZapAgent/OmniBrain (front-end + 8 one-time-offers) aplicado a CHAT-X con
UNA regla constitucional: **cada OTO es un módulo que YA EXISTE y funciona**.
Nada de humo tipo "10k leads en 1 segundo" ni automatización que viole ToS.
Todo lo que se vende aquí está probado con baseline (lint/tsc/unit/API).

Estado honesto: este documento es la estructura del embudo. El LANZAMIENTO real
en JVZoo/Whop requiere cuenta de vendedor externa (bloqueado externamente —
decisión y credenciales del fundador).

## FE (front-end) — CHAT-X Core

**Promesa real**: plataforma de personajes IA 18+ con compliance verificable —
genoma + cara canónica + LoRA versionada, chat GFE con media en contexto,
voz por personaje, log de auditoría append-only. Lo que KINKU/MAGE anuncian a
medias, aquí es auditable.

- **Precio ancla FE**: $47 one-time (licencia operador único, 5.000 créditos incluidos).
- **Garantía**: 30 días (estándar JVZoo). El producto entrega lo que la demo muestra.
- **Demo de venta**: panel real — crear personaje → genoma → lote InstaDump →
  chat con foto y nota de voz → export de auditoría de compliance. Sin montajes.

## OTOs (8) — mapeados a módulos REALES

| # | OTO | Precio ancla | Módulo real que entrega | Estado del módulo |
|---|-----|--------------|--------------------------|-------------------|
| 1 | InstaDump PRO (lotes multi-escena ilimitados) | $67 | `POST /api/studio/instadump` (planificador determinista, pools curados) | OPERATIVO |
| 2 | Outfit Swap / try-on sin deriva facial | $67 | `POST /api/studio/outfit-swap` + img2img en adaptador ComfyUI | OPERATIVO (simulador; real con GPU) |
| 3 | Escalera de vídeo draft→max + URL→brief | $97 | `/api/studio/video-escalera` + paso `url_video_brief` | OPERATIVO (planificación; render exige GPU/proveedor — se declara) |
| 4 | Trend-finder UGC (tendencias → briefs) | $67 | `/api/trends` + sugerencias por personaje | OPERATIVO (manual+internas+RSS opt-in) |
| 5 | Voice notes naturales (piper-local $0) | $47 | `voiceContract` + piper/espeak locales | OPERATIVO $0/mes |
| 6 | Orquestador de flujos con aprobación humana | $97 | módulo Automatización + `url_video_brief` + calendario ICS/CSV | OPERATIVO |
| 7 | Motor GPU casero (guía + contratos ComfyUI) | $47 | `docs/MOTOR_GPU.md` + adaptador real + sondas honestas | OPERATIVO (ruta $0/mes) |
| 8 | Monetización white-label (planes+rollover+packs+split) | $197/año | `/api/monetizacion` (MODO_INTERNO→REAL cuando el comprador conecte su procesador) | OPERATIVO en simulación; cobros reales los pone el comprador |

Notas de honestidad para la página de ventas (OBLIGATORIAS, no negociables):
1. Etiqueta IA en todo el contenido generado (vendemos la etiqueta COMO VENTAJA legal).
2. Filtro de edad aparente duro: se menciona en el FE y en cada OTO de contenido.
3. El render de vídeo real requiere GPU/proveedor propio (OTO 3 lo dice en su página).
4. Sin scraping agresivo ni automatización ToS-violadora: el OTO 4 es RSS opt-in + entrada manual.
5. 18+ exclusivamente; sin NCII/deepfakes de personas reales (prohibido por Fanvue y por nuestra política).

## Ascensos del embudo (secuencia)

1. FE → gracias → OTO 1 ( Downsell: $37) → OTO 2 → OTO 3/4 (bundle "Fábrica de contenido" $127) → OTO 5/6/7 (bundle "Motor completo" $147) → OTO 8 (solo para quien abre a terceros).
2. Email follow-up (CRM propio de CHAT-X — el mismo producto es la demo del OTO).
3. Reembolsos: el crédito fallido ya se devuelve solo en el worker — citarlo como prueba de honestidad del motor.

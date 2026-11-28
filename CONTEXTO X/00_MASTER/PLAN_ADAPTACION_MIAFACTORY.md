# PLAN DE ADAPTACIÓN MIAFACTORY → MUSE/CHAT-X (D-015)
**Creado:** 2026-11-20 · **Estado:** VIGENTE · **Origen:** destripe del fundador a https://miafactory.app (fuente completa: `../09_KNOWLEDGE/MIAFACTORY_DESTRIPE_v1.5.md`)
**Orden del fundador (D-015):** "no lo tomes literal — adaptar únicamente lo que nos sirva para nuestro proyecto".
**Contexto cruzado:** `../03_FINDINGS/CLONAKIT_BRECHAS.md` (30 referentes ya analizados) · `../09_KNOWLEDGE/EMBAUDO.md` (funnel FE+8 OTOs) · `FICHA_Estudio_v1.md` (spec del Estudio) · `../03_FINDINGS/EVOLUCION_ALBRA8_2026-11-20.md` (puesta al día de los repos).

## 1. Qué es MIAFACTORY (5 líneas)

SaaS multiusuario de generación con IA: 33 herramientas (11 imagen · 13 vídeo · 4 audio · 5 director premium), cobro por créditos en paquetes SIN auto-renovación, pago discreto por link de WhatsApp (Binance Pay, USDT, Skrill, tarjeta), login solo-Google, es/en, tema oscuro. Un interruptor +18 desbloquea 15 herramientas NSFW y quita el difuminado. La GPU NO es suya: la compran a RunningHub (visible en su CSP) y los archivos resultantes viven en el CDN del proveedor, caducando a los 14 días. Su propio destripe marca la regla que también es nuestra: copiar el CONCEPTO y el FLUJO, jamás marca, textos, colores ni código.

## 2. Veredicto en una frase

MIAFACTORY no es un competidor del negocio (MUSE vende talento virtual; ellos venden herramientas genéricas) — es un **catálogo de patrones de operación maduros** que valida decisiones que ya tomamos y nos ahorra errores de diseño en el panel y el motor de trabajos.

## 3. Lo que ya tenemos y MIAFACTORY confirma (no tocar: mantener)

| Nuestro activo | Su equivalente observado | Lectura |
|---|---|---|
| Reembolso por fallo + claim atómico + reintentos con tope en el worker (paridad ClonaKit 29-oct) | `retry_max=2`, reembolso, estados QUEUE/SUCCESS/ERROR | Ya estamos a su nivel o encima |
| Sesión en cookie httpOnly (`privado.ts`) | SU token vive en localStorage (fallo documentado §10) | Nuestro patrón es el que ELLOS deberían copiar |
| Carril 18+ estructural (permisos, almacenamiento, destinos) | Toggle visual "modo adulto" por herramienta | La nuestra es más fuerte: no basta etiqueta (MUSE_BRIEF §5) |
| Separación calentar/cobrar (D-004) | FAQ: "los procesadores no aceptan NSFW de IA" → pagan por link discreto | Validación de mercado directa de la matriz del embudo |
| Escalera de costes ANTES de gastar (P2.4) | `calculate-cost` previo a cada generación | Mismo principio, ya implementado |
| Honestidad operativa | Aviso honesto de subida de costes (14-nov) compensando a los ya pagados | Práctica sana a imitar: la política, no el texto |

## 4. ADOPCIONES priorizadas (adaptadas, no literales)

| # | Patrón suyo | Adaptación a CHAT-X | Módulo MUSE_BRIEF §6 | Prioridad |
|---|---|---|---|---|
| A1 | **Formularios como datos** (§17.12): catálogo + campos + opciones en BD; un solo renderizador pinta todo | Las fichas del Estudio (E1-E7) y toda herramienta futura se declaran como esquema en BD: agregar herramienta = una fila, no código. Su `/api/workflows` (83 KB, `fields[]` con `options`, `show_when`) es el contrato de referencia | Producción · Biblioteca | **ALTA — la joya del destripe · EJECUTADA (S-009, 20-nov)** |
| A2 | **Jobs con coste real** (§19.3): `gpu_cost_time`, doble id (propio + proveedor), posición en cola visible, `media_expired` | Extender NUESTRO Job (ya con claim atómico y reembolso): posición en cola en la respuesta, coste presupuestado vs real por trabajo, caducidad de media declarada en casa | Producción · Ventas/métricas | **ALTA · EJECUTADA (S-010, 20-nov)**: `posicionCola` calculada sobre la cola COMPLETA (mismo orden del worker) en `GET /api/jobs` e `/[id]`; `duracionMs` medido en casa (análogo honesto de gpu_cost_time — el proveedor F1 es el simulador local) + veredicto de coste `resumenCoste` (pendiente/reembolsado/ajustado bajo/alto/exacto) en el Panel; `Media.caducaEn` con política permanente-por-defecto, declaración auditable (`PATCH accion=caducidad`, evento `caducidad` append-only) y estado derivado visible en Biblioteca — NUNCA purga automática. Smoke E2E en vivo: puesto #1/#2 por prioridad, duración 12.4 s, evento registrado. El doble id de proveedor llega con MOTOR_GPU (D-002), no antes |
| A3 | **Almacenamiento propio de resultados** (§19.6, recomendación explícita para su propia nueva app) | Casa propia (D-007): jamás enlazar el CDN del proveedor; copiar el resultado a storage propio con caducidad propia | Biblioteca | **ALTA — doctrina ya vigente; su riesgo la confirma · VERIFICADA (S-010): todo el media escribe en `process.cwd()/media` con AES-256-GCM en carril privado; cero enlaces a CDN ajeno en `src/lib/media.ts` y el worker; la caducidad ahora es DECLARADA en casa (A2) |
| A4 | **Estados vacíos que enseñan** (§17.8): 2-3 pasos numerados + botón que arranca el paso 1 + límite declarado ("hasta 20 imágenes") | Patrón UI oficial de TODAS las pantallas del panel del operador | Todas | **ALTA — barato y visible · EJECUTADA (S-009, 20-nov)** |
| A5 | **Catálogo de 4 niveles** (§17.9): grupo con frase → subgrupo en mayúsculas → tarjeta (imperativo + 1 línea de 60-140 chars + coste) → chapas (+18/PRO/BETA/GRATIS) | Estructura del catálogo del Estudio en el panel; frases en español neutro propio, nunca las suyas | Producción | MEDIA-ALTA · CUBIERTA (S-010): la vista Catálogo de S-009 ya renderiza los 4 niveles (grupo con frase → subgrupo MAYÚSCULAS → tarjeta con coste/limites → chapas); queda solo poblar `subgrupo` en el seed si el catálogo crece |
| A6 | **Saldo por proveedor + gastos** (AiBalances / AdminGastos) | Cuando haya proveedor de pago (D-002: RunningHub barato primero): saldo por proveedor, gasto por trabajo, tope por personaje/lote | Ventas y métricas · $0 | MEDIA (activa con proveedor de pago) |
| A7 | **"Mejorar con IA" del prompt, cobrada o limitada** (§19.5) | El enhancer de prompt del motor GFE/Estudio se contabiliza (job propio con coste), nunca gratis ilimitado | Producción | **MEDIA · EJECUTADA (S-011, 20-nov)**: `mejorar_prompt` como 4ª fila del catálogo declarativo (subgrupo BRIEF, salida tipo `texto` — nuevo en el contrato) → `/api/studio/enhance`: Job propio `mejora_prompt`, cobro por el punto único (saldo + techo diario), claim atómico, reembolso único si falla, duración en casa, compliance. Filtro de edad BIDIRECCIONAL (entrada antes de gastar; salida con salidaLLMSegura + reembolso). 4 estilos propios + parseo robusto (fences, comillas tipográficas, topes). Primer consumidor de la config EN CALIENTE del panel (BD > env > defecto). Sin key → 503 honesto SIN cobro (verificado en vivo). 14 tests nuevos; suite 233 PASS |
| A8 | **Política de cambio de coste**: avisar y compensar a los ya pagados | Política operativa documentada si algún coste variable cambia tras producirse material | Cumplimiento/ops | **BAJA · EJECUTADA (S-012, documental)**: `../00_MASTER/POLITICA_CAMBIO_COSTES.md` — principio propio (el estimate previo es el contrato del cobro), procedimiento de 4 pasos (registrar en compliance → avisar antes → compensar la diferencia al saldo → jamás retroactivo negativo silencioso) y reglas duras ($0 intacta, control humano, desvíos por trabajo los gobierna A2) |
| A9 | **Cobro discreto**: WhatsApp link + crypto + sin auto-renovación (su FAQ lo explica: los procesadores rechazan NSFW de IA) | Intel de mercado para el carril Fanvue/Telegram (D-004). No construimos cobro propio: Fanvue cobra; Telegram solo tras verificar términos | Canales | DOCUMENTAL |
| A10 | **LoRA semimanual** (§20): solicitud + cola interna, entrenado por el equipo ($5), sin trainer automático | Para identidad de personajes: el patrón "solicitud → cola → activación en cuenta" sirve para peticiones del operador; nuestro pipeline de identidad es interno | Personajes | BAJA · **CUBIERTA SIN OBRA EXTRA (S-016, verificación)**: el patrón ya vive nativo en el Estudio — el asistente Genoma ejecuta el ciclo completo `solicitud → cola → activación` con `/api/characters/[id]/lanzamientos` (dataset → entrenamiento LoRA con `Job` tipo `entrenamiento`, coste contabilizado + reintentos del worker → examen de identidad → activación explícita con `loraHash`/`LoraVersion` y nota auditable). Nada por construir: su SaaS de solicitudes pagadas NO se adopta (§5, no-SaaS) — el operador único ya tiene su cola interna con coste real (A2) |

## 5. Lo que NO adoptamos (y por qué)

- **SaaS multiusuario con créditos vendibles**: CHAT-X es plataforma privada del estudio (MUSE_BRIEF §4: usuarios = fundador/operador; NORTE §6: no es SaaS genérico). El motor de VENTA de créditos no se construye; el libro de costes internos (A2) sí.
- **Login Google-only**: operación privada con sesión propia httpOnly (ya mejor que la suya).
- **33 herramientas genéricas**: nuestro catálogo es del ESTUDIO y de los personajes (persona-first, no tool-first). Sus 33 validan categorías (imagen/vídeo/audio/director), no el contenido.
- **Panel de administración de 17 módulos**: operador único; admin ligero con auditoría append-only (ya la tenemos).
- **Enlazar el CDN del proveedor**: riesgo demostrado por ellos mismos (miniaturas rotas si el proveedor limpia; "la función más importante del producto se cae" si el dominio deja de responder). Casa propia (A3).
- **Sus 4 bugs** (§10): endpoint admin (`migration-info`) respondiendo 200 a cualquier cuenta, token en localStorage, claves de i18n sin traducir visibles, mezcla de idiomas por pantalla — **lista negra explícita** para nuestro panel.
- **Marca/colores/textos/videos**: identidad MUSE propia; su paleta solo como referencia de contraste de tema oscuro.

## 6. Cruce con la investigación IA Influencer (ClonaKit) — qué añade de NUEVO

La investigación de referentes (30 fichas en `CLONAKIT_BRECHAS.md`, nacida del destripe "IA Influencer" y los batches A/B/C) ya cubrió el terreno: chat GFE con media (cerrada), voz por personaje (cerrada), escalera de vídeo (parcial, bloqueo GPU externo), trend-finder honesto (cerrada), monetización simulada (lista). MIAFACTORY añade TRES cosas que ninguno de los 30 trajo:

1. **El esquema de formulario como contrato de datos completo** (§17.12) — patrón A1, con forma de campo verificada (`type`, `options[]` con badge/imagen/compare, `help_text`, `rules`).
2. **La anatomía completa de un job con proveedor externo, ejecutada punta a punta** (§19.1-19.8): doble identificador, `gpu_cost_time`, cola con posición, archivo en CDN ajeno caducando — patrón A2/A3 con evidencia ejecutada, no promesa de landing.
3. **La confirmación de mercado del cobro discreto** (§A9): el nicho paga por link/crypto porque los procesadores rechazan NSFW de IA — refuerza la matriz de D-004 (Meta/WhatsApp calientan SFW; Telegram/Fanvue cobran).

Lo que el destripe NO resuelve: proveedor de GPU en esta máquina (sigue `../02_PROCESSES/MOTOR_GPU.md`), la identidad de marca (aplazada por el fundador, FICHA §8) y el carril de cobro real (Fanvue primero). Y una pérdida honesta: el archivo fuente de la investigación "IA Influencer" original (`research/ia-influencer/ANALISIS.md`) nunca se committeó y no sobrevive al reciclaje — su intel sobrevive destilada en CLONAKIT_BRECHAS; si el fundador conserva el original, vale archivarlo en 09_KNOWLEDGE.

## 7. Condiciones de ejecución

- Nada se construye sin orden explícita del fundador (regla permanente) ni se toca el carril adulto fuera de CASA PROPIA (D-007).
- ~~Primera pieza natural cuando se autorice: **A1 + A4**~~ → **EJECUTADAS (S-009, 2026-11-20, orden "arranca A1+A4"):** modelo `Herramienta` + contrato zod (`src/lib/herramientas.ts`), renderizador único `FichaHerramienta`, vista Catálogo del Estudio, `GET /api/herramientas` (force-dynamic), seed idempotente con las 3 generadoras reales, `EstadoVacio` aplicado al panel. Prueba del patrón superada (editar BD → cambia en pantalla sin recompilar). No gastan, no arriesgan, no tocan canales.
- **A2 → EJECUTADA (S-010, 2026-11-20, orden "continúa la construcción, solo CHAT-X"):** posición en cola, coste presupuestado vs real, duración en casa y caducidad declarada de media — módulo puro `src/lib/cola.ts` + 16 tests, DTO y API extendidos, Panel/Biblioteca/Estudio alimentados, PATCH de caducidad auditable. De paso se REPARÓ el build roto desde f91a606 (la sesión sin registro dejó callers sin callees: `resetearProveedor`, capa de voz clon-local mal importada) y la ruta vozclon quedó conectada a la capa REAL de `src/lib/voz.ts` con estados honestos (clon-local NO cableado = NO_DISPONIBLE, sin fallback silencioso a espeak). Deuda tsc 52→13 (restante: media-commit de configuración, otro paquete). Smoke E2E en vivo de las 3 piezas: OK.
- A2/A3 se integran al worker existente, no como motor paralelo.
- A6 solo si hay proveedor de pago autorizado (regla $0).

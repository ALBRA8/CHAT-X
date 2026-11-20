# PROJECT_STATE — estado vivo de CHAT-X
**Última actualización:** 2026-11-20
**Identidad del negocio:** `00_MASTER/MUSE_BRIEF_MAESTRO.md` (MUSE = negocio; CHAT-X = plataforma que lo opera, D-014)
**Fase:** EXILIO TEMPORAL (musestudio8 BLOQUEADA por GitHub el 2026-11-07) · F1 sigue en cola; el código avanza en la torre de respaldo
**Torre viva (temporal):** `github.com/ALBRA8/CHAT-X` (main) — push de exilio con orden explícita del fundador, ver D-012
**Torre de destino al desbloqueo:** `github.com/musestudio8/CHAT-X` @ `9dcfa08` (congelada) + portar lo empujado desde el exilio
**Foto congelada de la fase anterior:** `00_MASTER/ESTADO_ACTUAL.md` (b5b210c, 2026-10-29)

---

## 1. Casas

| Casa | Qué vive ahí | Regla |
|---|---|---|
| **musestudio8** (CASA PROPIA, 31-oct) | `CHAT-X` (torre @ `9dcfa08`, congelada), `WHATSPOWER`, `WHATSPOWER-ULTRA`, `CRM` (copias espejo con historia completa) | **BLOQUEADA por GitHub el 2026-11-07** por actividad masiva en cuenta nueva (F-007); intocable hasta el desbloqueo |
| **ALBRA8** (biblioteca + torre temporal) | los repos originales + `CHAT-X` como torre de respaldo del exilio (D-012) | SOLO LECTURA en suspenso SOLO para CHAT-X y SOLO durante el exilio; jamás procesa el negocio 18+ (D-007) |
| Pendiente (requiere desbloqueo) | `video-studio` ← ALBRA8/YOUTUBE-AUTOMATION; re-portar a musestudio8 lo que sirva (D-012) | el fundador crea el repo destino; mudanza con `scripts/mudar_casa_nueva.sh video-studio` |

Verificación de la mudanza: SHA a SHA, sin `--force` — detalle en `00_MASTER/EMBUDO_MULTICANAL.md` §8.

## 2. Estado por motor (último sondeo real: sonda por capas, 2026-10-29 — no re-ejecutado desde entonces)

| Motor | Puerto | Estado reportado |
|---|---|---|
| whatspower | :3003 | OPERATIVO (4 capas verdes, BD real, flujo ManyChat activo) |
| whatspower-ultra | :3004 | OPERATIVO (difusión anti-ban apagada por diseño) |
| agentekrea | :3210 | OPERATIVO |
| cazador | :8787 | OPERATIVO |
| crm | :3100 | DEGRADADO — falta API key `albra_…` (decisión del fundador) |
| nexscope | :3300 | DEGRADADO — exige sesión JWT (el motor no ofrece API key m2m) |
| youtube | :8000 | NO_DISPONIBLE — corre en la máquina del fundador |
| agentegeneral | :9000 | NO_DISPONIBLE — ídem |
| leads | — | NO_CONFIGURADO (bot Telegram, long-polling) |
| comuniti | :3000 | NO_CONFIGURADO (colisión de puerto con CHAT-X) |

Detalle y evidencia: `00_MASTER/MOTORES_REGISTRO.md` + `04_AUDITS/evidencia/sonda_profunda.json`.
Taxonomía de 5 estados y regla "jamás operativo por un simple HTTP 200": `00_MASTER/MOTORES_REGISTRO.md`.

## 3. Capacidades ya implementadas en la torre (verificadas en fase b5b210c)

Resumen: suite API 33 PASS · unitarias 46 PASS; idempotencia E2E; gate humano WhatsApp E2E (0 envíos); recuperación de zombis; aislamiento de BD verificado por md5; cerrojos WhatsApp 401/403/503; escaneo de secretos 0 resultados. Lista completa con evidencia: `00_MASTER/ESTADO_ACTUAL.md` §2 y `05_TESTS/INFORME_PRUEBAS.md`.

Estudio (E1-E7): genoma 7 pasos + rasgos firmantes, fábrica de fotos con QA, carril privado AES-256-GCM, export Fanvue con etiqueta IA, panel, compliance append-only. Especificación de origen: `00_MASTER/FICHA_Estudio_v1.md`.

Catálogo declarativo (D-015 · A1, S-009 20-nov): las herramientas del Estudio viven en BD (modelo `Herramienta`, una fila = una herramienta con campos validados por zod); el renderizador único `FichaHerramienta` y la vista **Catálogo** las pintan sin código por herramienta; `GET /api/herramientas` (sin caché) y seed idempotente (`bun run db:seed`) con las 3 generadoras reales apuntando a sus endpoints. Estados vacíos que enseñan (A4): componente `EstadoVacio` (pasos numerados + CTA + límite declarado) en Panel, Estudio, Biblioteca, Genoma y Catálogo.

Jobs con coste real (D-015 · A2, S-010 20-nov): la cola se lee como el worker la trabaja — `posicionCola` por job en la API (calculada sobre la cola COMPLETA, mismo orden priority/createdAt), duración medida en casa (`duracionMs`, análogo honesto de gpu_cost_time) y veredicto de coste presupuestado vs real por trabajo (pendiente / reembolsado / ajustado bajo con devolución / ajustado alto / exacto) en el Panel. Caducidad de media DECLARADA en casa: `Media.caducaEn` (null = permanente, política por defecto de todo lo producido), declaración auditable del operador (`PATCH accion=caducidad` → evento `caducidad` append-only), estado derivado visible en Biblioteca; "caducada" NUNCA borra — decidir es del operador. Lógica pura en `src/lib/cola.ts` (16 tests). Storage propio verificado (A3): todo el media escribe en `media/` local con AES-256-GCM; cero enlaces a CDN de proveedor.

Panel de Configuración montado (S-011 20-nov): el módulo «Configuración» del shell conecta APIs y parámetros con un click — catálogo de 25 claves definido en `src/lib/configuracion.ts`, resolución DECLARADA (panel BD > .env > defecto), secretos enmascarados (un secreto vacío NUNCA borra; borrar es explícito con Restaurar), sondas reales (llm/voz/imagen/video) vía `POST /api/configuracion/probar` y todo cambio en el log de compliance. Modelo `Configuracion` en schema (el valor vive en BD local `db/`, fuera de git). Primer consumidor cableado en caliente: el enhancer A7.

Mejorar prompt con IA, CONTABILIZADA (D-015 · A7, S-011 20-nov): 4ª herramienta del catálogo declarativo (`mejorar_prompt`, subgrupo BRIEF, salida tipo `texto`) → `/api/studio/enhance`: Job propio `mejora_prompt` con cobro por el punto único (saldo + techo diario), claim atómico, reembolso único si falla, duración medida en casa y compliance append-only. Filtro de edad BIDIRECCIONAL (entrada bloqueada antes de gastar; salida vía salidaLLMSegura con reembolso). Parseo robusto del LLM (fences, comillas tipográficas, topes por campo). Sin API key del LLM → 503 NO_CONFIGURADO honesto, sin cobro (verificado en vivo).

Política de cambio de costes (D-015 · A8, S-012 20-nov): `00_MASTER/POLITICA_CAMBIO_COSTES.md` — el estimate previo es el contrato del cobro; registrar en compliance → avisar antes → compensar la diferencia al saldo → jamás retroactivo negativo silencioso. Activación inmediata cuando llegue proveedor de pago (A6).

F1 — daemon WhatsApp propio, ESPECIFICADA + W1 (S-012 20-nov): especificación de sala limpia en `02_PROCESSES/F1_DAEMON_WHATSAPP.md` (sesión propia, pacing propio, BD propia del carril adulto; WhatsApp SOLO SFW). W1 ejecutado: módulo puro `src/lib/whatsapp/pacing.ts` — gate `decidirEnvio` (circuito abierto → horas silencio 22–8 → techos diarios por tipo 60 resp/8 iniciativas → calentamiento de chats nuevos máx 2/24 h), disyuntor `temperatura` (3 fallos de riesgo en 30 min pausan iniciativas 2 h) y `retardoConJitter` obligatorio. 18 tests deterministas PASS. W2+ (sesión QR, conversación, panel) espera orden explícita del fundador.

## 4. Directrices vigentes del fundador

Ver `01_DECISIONS/DECISION_LOG.md` (D-001 → D-015). Las que gobiernan HOY:
- **ADAPTACIÓN MIAFACTORY (D-015):** del destripe del fundador se adoptan SOLO patrones operativos (formularios como datos, jobs con coste real, storage propio, estados vacíos que enseñan); NO se construye su SaaS de créditos ni se copia su marca. Clones se quedan en ALBRA8: la vuelta espera ORDEN del fundador, no solo el desbloqueo.
- **IDENTIDAD (D-014):** MUSE es el negocio; CHAT-X es su plataforma. Brief maestro + cartera de 5 proyectos gestionados (documentar ≠ migrar).
- **CASA PROPIA (D-007/D-008):** los 10 clones jamás procesan el negocio 18+; cuartos nativos en CHAT-X.
- **PORTABILIDAD (D-013):** triage de los 24 repos de ALBRA8 — qué se lleva a musestudio8, qué se subcontrata, qué no aplica (`00_MASTER/PORTABILIDAD_REPOS.md`); norte del proyecto: `00_MASTER/NORTE_PROYECTO.md`.
- **Vídeo (D-002):** vestido → carril YT-AUTOMATION/Flow (SFW); desnudos → GPU local (sin filtro) o RunningHub (técnicamente sí, ToS sin verificar — probar barato antes de pagar).
- **Embudo multicanal (D-004):** WhatsApp/Meta calientan (SFW); **Telegram y Fanvue cobran**.
- **$0 y push solo con orden explícita** (reglas permanentes).

## 5. Bloqueadores y próximos hitos (en orden)

| # | Hito | Dueño | Estado |
|---|---|---|---|
| 1 | **Higiene de PATs**: `ghp_mbYK…` (exilio) CONFIRMADA MUERTA (401, 20-nov) ✓ · `ghp_w2tw…` (20-nov) recibida con orden "SUBE LOS CAMBIOS" → **PUSH REANUDADO (S-012)**: S-008→S-012 en ALBRA8/CHAT-X, fast-forward verificado · **REVOCAR en el navegador**: `ghp_pMCQ…` (31-oct) y `ghp_w2tw…` (al confirmar este push) | Fundador | **PUSH AL DÍA** — quedan DOS revocaciones pendientes del fundador (`ghp_pMCQ…` y `ghp_w2tw…`) |
| 2 | Esperar desbloqueo de musestudio8 → **LA VUELTA** según el plan de `00_MASTER/PORTABILIDAD_REPOS.md` (D-012/D-013): acta del estado real, re-sincronizar CHAT-X, verificar las 3 copias del fundador (leads/chismoso/nexscope), portar el carril LLEVAR, subcontratos quedan en ALBRA8 | Fundador desbloquea; agente ejecuta el plan | **BLOQUEADO POR GITHUB** |
| 2b | Crear `video-studio` en musestudio8 y mudarlo | Fundador crea; agente muda | BLOQUEADO POR GITHUB (antes: PENDIENTE) |
| 3 | **F1 reescrita**: daemon WhatsApp PROPIO del negocio (carril adulto) — sesión propia, pacing anti-ban propio, BD propia; patrones de los clones como referencia de sala limpia | Agente (código) | **ESPECIFICADA + W1 EJECUTADO (S-012)** — spec en `02_PROCESSES/F1_DAEMON_WHATSAPP.md`, pacing probado (18 tests); W2+ espera orden explícita del fundador |
| 4 | F2 tono modo novia nativo (ya lo es: Chat GFE) — cablear el daemon F1 al cerebro `/api/chat` | Agente | COLA |
| 5 | Decidir destino del repo `borrador` de musestudio8 (borrar o dejar) | Fundador | PENDIENTE |
| 6 | API key CRM / QR WhatsApp / JWT nexscope / claves LEADS-GENERAL | Fundador | OPCIONAL — cada una con procedimiento documentado |

Nada de lo anterior bloquea código de CHAT-X.

## 6. Riesgos abiertos

- El PAT del 31-oct sigue vivo hasta que el fundador lo revoque (F-001 en `07_FAILURES/`).
- `engines/` no sobrevive al reciclaje del sandbox: se reconstruye con `scripts/reclonar_engines.sh` (F-003).
- Los estados de motores de la §2 son del 29-oct: re-ejecutar `bun scripts/sonda_profunda.ts` antes de declarar cualquier cambio de estado.
- **musestudio8 bloqueada (2026-11-07)**: GitHub frenó la casa nueva por recibir demasiada actividad de golpe. Solo el fundador puede apelar el desbloqueo; mientras tanto la torre vive en ALBRA8/CHAT-X (D-012) y no se perdió ni un commit (lección F-006 aplicada).
- El PAT del exilio (`ghp_mbYK…`) está CONFIRMADO MUERTO (401 Bad credentials, 2026-11-20) — buena higiene del fundador. El 20-nov el fundador entregó PAT nueva (`ghp_w2tw…`) con orden "SUBE LOS CAMBIOS": push de S-008→S-012 reanudado en ALBRA8/CHAT-X con el protocolo de higiene completo (fast-forward, token por env, verificación SHA). Quedan DOS revocaciones en manos del fundador: `ghp_pMCQ…` (31-oct) y `ghp_w2tw…` (revocar al confirmar el push).
- Los pins de `MOTORES_REGISTRO.md` quedaron viejos: 12 repos de ALBRA8 movieron desde el 07-nov (ver `../03_FINDINGS/EVOLUCION_ALBRA8_2026-11-20.md`); re-anclar exige reclon con orden del fundador.
- Deuda tsc **LIMPIA** (S-011): los 13 errores del media-commit de configuración se repararon con orden del fundador (modelo `Configuracion` + hooks de UI + módulo montado en el shell) — tsc 0, build verde, suite 233 PASS. Quedan SOLO los 4 tests piper-local fallando en este entorno (voz local, preexistente: el sandbox no tiene el paquete piper ni los modelos onnx).

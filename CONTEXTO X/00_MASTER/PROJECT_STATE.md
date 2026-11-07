# PROJECT_STATE — estado vivo de CHAT-X
**Última actualización:** 2026-11-07
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

## 4. Directrices vigentes del fundador

Ver `01_DECISIONS/DECISION_LOG.md` (D-001 → D-011). Las que gobiernan HOY:
- **CASA PROPIA (D-007/D-008):** los 10 clones jamás procesan el negocio 18+; cuartos nativos en CHAT-X.
- **Vídeo (D-002):** vestido → carril YT-AUTOMATION/Flow (SFW); desnudos → GPU local (sin filtro) o RunningHub (técnicamente sí, ToS sin verificar — probar barato antes de pagar).
- **Embudo multicanal (D-004):** WhatsApp/Meta calientan (SFW); **Telegram y Fanvue cobran**.
- **$0 y push solo con orden explícita** (reglas permanentes).

## 5. Bloqueadores y próximos hitos (en orden)

| # | Hito | Dueño | Estado |
|---|---|---|---|
| 1 | **REVOCAR los 2 PAT expuestos en chat**: `ghp_pMCQ…` (31-oct, musestudio8) y `ghp_mbYK…` (07-nov, exilio ALBRA8) | Fundador | **PENDIENTE** — 5 min en github.com/settings/tokens |
| 2 | Esperar desbloqueo de musestudio8 → **portar lo que sirva** desde ALBRA8 (CHAT-X exiliada + lo útil de la evolución del ecosistema) y dejar el resto en ALBRA8 (D-012) | Fundador desbloquea; agente porta | **BLOQUEADO POR GITHUB** |
| 2b | Crear `video-studio` en musestudio8 y mudarlo | Fundador crea; agente muda | BLOQUEADO POR GITHUB (antes: PENDIENTE) |
| 3 | **F1 reescrita**: daemon WhatsApp PROPIO del negocio (carril adulto) — sesión propia, pacing anti-ban propio, BD propia; patrones de los clones como referencia de sala limpia | Agente (código) | SIGUIENTE |
| 4 | F2 tono modo novia nativo (ya lo es: Chat GFE) — cablear el daemon F1 al cerebro `/api/chat` | Agente | COLA |
| 5 | Decidir destino del repo `borrador` de musestudio8 (borrar o dejar) | Fundador | PENDIENTE |
| 6 | API key CRM / QR WhatsApp / JWT nexscope / claves LEADS-GENERAL | Fundador | OPCIONAL — cada una con procedimiento documentado |

Nada de lo anterior bloquea código de CHAT-X.

## 6. Riesgos abiertos

- El PAT del 31-oct sigue vivo hasta que el fundador lo revoque (F-001 en `07_FAILURES/`).
- `engines/` no sobrevive al reciclaje del sandbox: se reconstruye con `scripts/reclonar_engines.sh` (F-003).
- Los estados de motores de la §2 son del 29-oct: re-ejecutar `bun scripts/sonda_profunda.ts` antes de declarar cualquier cambio de estado.
- **musestudio8 bloqueada (2026-11-07)**: GitHub frenó la casa nueva por recibir demasiada actividad de golpe. Solo el fundador puede apelar el desbloqueo; mientras tanto la torre vive en ALBRA8/CHAT-X (D-012) y no se perdió ni un commit (lección F-006 aplicada).
- El PAT del exilio (`ghp_mbYK…`) viajó por el chat el 07-nov: usado una vez por variable de entorno y **a revocar ya** (F-001).

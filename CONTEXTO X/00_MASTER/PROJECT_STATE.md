# PROJECT_STATE — estado vivo de CHAT-X
**Última actualización:** 2026-11-07
**Fase:** POST-MUDANZA · preparación F1 (daemon WhatsApp modo novia en casa nueva)
**Torre viva:** `github.com/musestudio8/CHAT-X` @ `9dcfa08` (main)
**Foto congelada de la fase anterior:** `00_MASTER/ESTADO_ACTUAL.md` (b5b210c, 2026-10-29)

---

## 1. Casas

| Casa | Qué vive ahí | Regla |
|---|---|---|
| **musestudio8** (CASA PROPIA, 31-oct) | `CHAT-X` (torre), `WHATSPOWER`, `WHATSPOWER-ULTRA`, `CRM` (copias espejo con historia completa) | aquí se trabaja y aquí se adapta a modo novia; las copias divergen a propósito |
| **ALBRA8** (biblioteca, congelada) | los 10 repos originales + `CHAT-X` @ `34e5aa1` (2 commits atrás, histórico) | SOLO LECTURA para siempre; jamás procesa el negocio 18+ (D-007) |
| Pendiente | `video-studio` ← ALBRA8/YOUTUBE-AUTOMATION | el fundador crea el repo destino; mudanza con `scripts/mudar_casa_nueva.sh video-studio` |

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
| 1 | **REVOCAR el PAT `ghp_pMCQ…`** (viajó por chat el 31-oct; tras la mudanza ya no es necesario) | Fundador | **PENDIENTE** — 5 min en github.com/settings/tokens |
| 2 | Crear `video-studio` en musestudio8 y mudarlo | Fundador crea; agente muda | PENDIENTE |
| 3 | **F1 reescrita**: daemon WhatsApp PROPIO del negocio (carril adulto) — sesión propia, pacing anti-ban propio, BD propia; patrones de los clones como referencia de sala limpia | Agente (código) | SIGUIENTE |
| 4 | F2 tono modo novia nativo (ya lo es: Chat GFE) — cablear el daemon F1 al cerebro `/api/chat` | Agente | COLA |
| 5 | Decidir destino del repo `borrador` de musestudio8 (borrar o dejar) | Fundador | PENDIENTE |
| 6 | API key CRM / QR WhatsApp / JWT nexscope / claves LEADS-GENERAL | Fundador | OPCIONAL — cada una con procedimiento documentado |

Nada de lo anterior bloquea código de CHAT-X.

## 6. Riesgos abiertos

- El PAT del 31-oct sigue vivo hasta que el fundador lo revoque (F-001 en `07_FAILURES/`).
- `engines/` no sobrevive al reciclaje del sandbox: se reconstruye con `scripts/reclonar_engines.sh` (F-003).
- Los estados de motores de la §2 son del 29-oct: re-ejecutar `bun scripts/sonda_profunda.ts` antes de declarar cualquier cambio de estado.

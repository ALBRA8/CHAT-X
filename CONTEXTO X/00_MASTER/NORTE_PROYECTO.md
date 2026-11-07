# NORTE DEL PROYECTO — qué es CHAT-X y qué queremos lograr
**Creado:** 2026-11-07 (petición del fundador: "ya podemos documentar de qué se trata este proyecto, qué es lo que queremos lograr") · **Estado:** VIGENTE
Este documento es la brújula. Si un trabajo futuro no empuja hacia acá, no se hace.

---

## 1. En una frase

CHAT-X es la **torre de control del negocio de modelos sintéticos 18+ para Fanvue**: un solo sistema donde se crean los personajes (100% IA, cero personas reales), se produce su contenido (foto, vídeo, voz), se conversa con los clientes en modo novia por WhatsApp/Meta/Telegram, se cobra en Telegram/Fanvue, y todo deja auditoría en un único lugar.

## 2. Qué es (piezas reales de hoy, no promesas)

| Pieza | Qué es | Dónde está documentado |
|---|---|---|
| **Cerebro modo novia** | Chat GFE (`/api/chat`): genoma de 7 pasos + rasgos firmantes + voz + media en contexto. Nativo desde el día 1 | `FICHA_Estudio_v1.md`, `ARQUITECTURA.md` |
| **Estudio de producción (E1-E7)** | Fábrica del personaje: genoma → foto con QA → carril privado AES-256-GCM → export a Fanvue con etiqueta IA | `FICHA_Estudio_v1.md` |
| **Compliance** | Log append-only, age-gate, gate humano para envíos WhatsApp, límites de gasto | `SEGURIDAD.md`, `05_TESTS/` |
| **Cuartos de canal PROPIOS** | F1 daemon WhatsApp propio, F3 bot Telegram propio, F4 conector Meta — nunca los repos del vecino corriendo el negocio | `EMBUDO_MULTICANAL.md` §7 |
| **Embudo multicanal** | Calentar SFW en WhatsApp/Meta → cobrar en Telegram (18+) y Fanvue (principal) | `EMBUDO_MULTICANAL.md` §1-§4 |
| **Copias de negocio en musestudio8** | WHATSPOWER (conversación), ULTRA (difusión), CRM (memoria) — mudadas el 31-oct; divergen a propósito al adaptarse a modo novia | `EMBUDO_MULTICANAL.md` §8 |

## 3. Qué queremos lograr (objetivos, en orden de caja)

1. **Primer ingreso con $0 de gasto.** La regla $0 manda: nada se paga antes de caja. F1 (WhatsApp) → F2 (tono en flujos) → F3 (Telegram cobra) → F4 (Meta conserva). Fanvue es la caja principal.
2. **Todo desde la plataforma (D-001).** Crear el modelo desde cero: genoma, consistencia, imagen, vídeo (vestido por carril SFW/Flow; explícito por GPU local — D-002) y voz — sin depender de herramientas externas de pago.
3. **Escala honesta del embudo.** Calentar sin quemar números (pacing anti-ban propio), cobrar solo donde los términos lo permiten (matriz de canales §4 del embudo).
4. **Defendibilidad total.** NCII jamás (cero rostros/voces de personas reales), etiqueta IA en todo el contenido, auditoría del negocio 18+ en UN solo lugar (CHAT-X). Eso es lo que hace al negocio sostenible, no un capricho moral.
5. **Casa propia ordenada.** musestudio8 = casa del negocio (copias que divergen a propósito). ALBRA8 = biblioteca de referencia + proveedor de subcontratos SFW. Nada del carril adulto toca jamás ALBRA8 (D-007).

## 4. Qué NO es CHAT-X (para no perdernos)

- **No es trading** — AGENTE-TRADING no sirve para este proyecto (veredicto del fundador, D-013).
- **No es despacho jurídico ni consultorio contable** — eso se SUBCONTRATA a ALBRA8 (ABOGADO-BASE, CONTADOR-PÚBLICO; D-013).
- **No es un CRM genérico ni un SaaS multi-cliente** — es mono-operador (el fundador), sin login multi-usuario por diseño actual.
- **No toca personas reales** — ni rostros, ni voces, ni datos de gente verdadera. 100% sintético.
- **No es un panel de agentes genérico** — CHAT-X gobierna SU negocio; el ecosistema ALBRA tiene su propio norte.

## 5. Cómo se mide el avance (sin auto-engaño)

- **Hitos vivos:** `PROJECT_STATE.md` §5 (F1 es el siguiente hito de código).
- **Estados honestos de 5 valores** (OPERATIVO / DEGRADADO / NO_CONFIGURADO / ERROR / NO_DISPONIBLE) — jamás declarar operativo por un simple HTTP 200 (`MOTORES_REGISTRO.md`).
- **Pruebas con alcance real:** `05_TESTS/INFORME_PRUEBAS.md` (suite API + unitarias + E2E).
- **Ley del proyecto:** `01_DECISIONS/DECISION_LOG.md` — una directriz VIGENTE no se discute: se ejecuta o se consulta.

## 6. La cadena de mando documental

`NORTE_PROYECTO.md` (este doc: el porqué) → `EMBUDO_MULTICANAL.md` (el cómo mandante) → `PROJECT_STATE.md` (el dónde estamos hoy) → `DECISION_LOG.md` (la ley que cambia el rumbo). Toda sesión nueva empieza leyendo PROJECT_STATE y termina escribiendo en `08_SESSIONS/`.

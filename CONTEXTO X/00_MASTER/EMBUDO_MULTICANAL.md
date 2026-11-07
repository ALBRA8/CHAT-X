# EMBUDO MULTICANAL — directriz del fundador (2026-10-30)

> **Origen:** decisión explícita del fundador en chat 2026-10-30. Este documento
> es la arquitectura MANDANTE del embudo de calentamiento y cobro. No es una
> propuesta: es el rumbo. Cualquier trabajo futuro de canal/embudo se valida
> contra este documento, no contra interpretaciones propias.

## 1. La tesis del fundador

CRM-ALBRA, WHATSPOWER y WHATSPOWER-ULTRA son **3 repos que en últimas se
convierten en UNO SOLO**: la máquina de calentamiento. Se traen al orbita de
CHAT-X y se adaptan para que su comunicación sea **modo novia** (Chat GFE):
calientan al cliente y después lo pasan a la plataforma de pago.

Canales objetivo a evolucionar: **Facebook, Instagram y Telegram**.
- En **Meta (FB/IG)** calentamos.
- En **Telegram** podemos cobrar (18+ permitido).
- En **WhatsApp** conversamos y retenemos (SFW — sus términos prohíben adulto).
- En **Fanvue** se cobra el contenido explícito (etiqueta IA obligatoria).

## 2. Los 3 motores = una sola máquina (estado real verificado)

Fuente: `CONTEXTO X/00_MASTER/MOTORES_REGISTRO.md` (commits fijados) + sonda profunda de 4 capas
(`CONTEXTO X/00_MASTER/ESTADO_ACTUAL.md` §1, `CONTEXTO X/04_AUDITS/evidencia/sonda_profunda.json`).

| Motor | Commit fijado | Rol en la máquina | Puerto | Estado real |
|---|---|---|---|---|
| WHATSPOWER | `f4f7fc9` | **Conversación** — flujos ManyChat-like (ya tiene el "Flujo Completo de Calificación ManyChat" activo) | :3003 | OPERATIVO |
| WHATSPOWER-ULTRA | `e6ef56d` | **Difusión** — campañas anti-ban step-driven (re-contacto/retención a escala) | :3004 | OPERATIVO (`ALLOW_REAL_DISPATCH` apagado, 0 campañas) |
| CRM-ALBRA | `ea87cc2` | **Memoria del embudo** — récord comercial, etapas, seguimiento, cuándo re-contactar | :3100 | DEGRADADO → solo falta la API key `albra_…` (genera en Settings → API keys del propio CRM) |

Regla permanente de aislamiento de BD y puertos: ver `CONTEXTO X/00_MASTER/MOTORES_REGISTRO.md`
(cada engine con su `DATABASE_URL` absoluta propia; re-clonado con
`scripts/reclonar_engines.sh`, repos ALBRA8 jamás se modifican — solo lectura).

## 3. Arquitectura del puente "modo novia"

El cerebro de la conversación es CHAT-X (Chat GFE — Modo Novia, `/api/chat` con
genoma, media en contexto y voz). Los motores son extremos de canal y memoria.
**Nadie re-implementa al novia dentro de los motores; todos le hablan al
cerebro.**

```
META (FB/IG) · WHATSAPP · TELEGRAM
        │ (mensajes entrantes)
        ▼
  Extremo de canal: WHATSPOWER (WA/flujo) · conector Meta · conector Telegram
        │ webhook
        ▼
  CHAT-X /api/chat — el CEREBRO modo novia (genoma + contexto + media + voz)
        │ respuesta (gate humano para lo sensible; auto para rutina)
        ▼
  Extremo de canal envía
        │
        ▼
  CRM-ALBRA registra etapa de calentamiento → handoff a pago
        │
        ▼
  COBRO: Fanvue (principal, explícito) · Telegram (secundario, 18+)
```

## 4. Matriz de canales (calentar vs cobrar)

| Canal | Calentar (modo novia) | Cobrar | Límite duro (diseño, no traba) |
|---|---|---|---|
| WhatsApp | ✅ puerta y retención | ❌ | ToS de WhatsApp prohíbe adulto → solo SFW; el número es el activo, no se quema |
| Facebook / Instagram | ✅ (trafico frío) | ❌ | Meta banea adulto Y automatización ToS-violadora → conector conservador, calentamiento SFW, sin spam |
| Telegram | ✅ | ✅ | 18+ permitido; cobro por Stars/procesador que acepte adulto — verificar proveedor al activar |
| Fanvue | — | ✅ principal | Contenido explícito vive aquí; etiqueta IA obligatoria; compliance de CHAT-X alimenta la provenance |

## 5. Fases (alineadas a la regla $0: nada de gasto antes de caja)

- **F1 — Puente conversacional WhatsApp**: whatspower webhook → `/api/chat`
  (modo novia) → gate → envío → registro CRM. Piezas que faltan: el pegamento
  webhook↔cerebro; QR de WhatsApp del fundador
  (`CONTEXTO X/02_PROCESSES/WHATSAPP_QR_ACTIVACION.md`); API key del CRM o, si no, libro interno
  de CHAT-X como memoria provisional.
- **F2 — Modo novia en los flujos**: adaptar el "Flujo de Calificación" de
  WHATSPOWER y las campañas de ULTRA para que el tono/respuestas salgan del
  contrato del personaje (genoma + voz), no de plantillas frías.
- **F3 — Conector Telegram** (canal de cobro): desarrollo nuevo en la máquina
  del fundador; bot que calienta y cobra (Stars/procesador adulto-friendly).
- **F4 — Conector Meta** (el más delicado): entrada SFW conservadora;
  manual-first, automatización mínima que respete ToS de Meta.

## 6. Anclas constitucionales (una línea, no repetición)

Persona **100% sintética** desde el genoma (cero rostros/voz de personas
reales — NCII jamás) y **etiqueta IA** donde el canal/plataforma la exige.
Eso es lo que hace defendible todo el embudo.

## 7. ENMIENDA del fundador (2026-10-30, misma sesión): CASA PROPIA

> Palabra del fundador: CHAT-X es un proyecto completamente independiente que no
> debe cruzarse con los repos originales. Si le pedimos a la casa del vecino
> (YOUTUBE-AUTOMATION, WHATSPOWER, ULTRA, CRM-ALBRA) que produzca nuestro negocio,
> se la dejamos vuelta un desorden. CHAT-X necesita CASA PROPIA con un cuarto para
> cada agente.

**Regla mandante:** los 10 clones quedan como **BIBLIOTECA DE REFERENCIA** (solo
lectura) y para sus propósitos originales SFW. **Jamás procesan estado, datos,
sesiones ni contenido del negocio 18+.** Ni flujos, ni campañas, ni registros de
fans, ni nada.

### Cuartos de la casa propia (nativos de CHAT-X)

1. **Cerebro modo novia** — YA nativo: Chat GFE (`/api/chat`) + genoma + voz + compliance.
2. **Canal WhatsApp** — daemon PROPIO del negocio (patrón Baileys espejado en sala
   limpia desde lo aprendido de los clones: sesión propia, pacing anti-ban propio,
   BD propia del carril adulto).
3. **Canal Telegram** — bot PROPIO ($0, librería open-source) con cobro directo.
4. **Memoria del embudo** — libro interno de CHAT-X (ChatMessage, LedgerMonetizacion,
   que ya existen). CRM-ALBRA NO recibe jamás registros del negocio adulto.
5. **Vídeo** — escalera + proveedores del Estudio (adaptadores propios en
   `src/lib/provider/`). YOUTUBE-AUTOMATION solo para productos YouTube/SFW genuinos.

### Cadena de auditoría en UN solo lugar

Todo el compliance del negocio 18+ vive en CHAT-X (log append-only + cifrado de
carril privado + gate humano). Repartir estado entre motores que no comparten ese
contrato rompería la auditoría — por eso la casa propia no es un capricho: es la
única forma de que la auditoría sea completa.

### Efecto en las fases

- **F1 reescrita**: el puente ya no es whatspower→CHAT-X; es el **daemon propio de
  CHAT-X** escuchando WhatsApp. Los patrones de los clones (flujos conversacionales
  ManyChat-like, difusión step-driven anti-ban) se usan como REFERENCIA de diseño
  en sala limpia, no como runtime.
- F2 (tono modo novia) ahora es trivial: el tono ya es nativo, no hay que adaptar
  plantillas de nadie.
- F3 (Telegram) y F4 (Meta) se construyen directos como cuartos propios.
- Los motores hermanos siguen vivos para lo suyo: YouTube products, CRM general,
  cualquier línea SFW futura del ecosistema. Cada casa con su norte.

## §8 MUDANZA A LA CASA NUEVA — musestudio8 (decisión 30-oct-2026)

El fundador decidió: **la casa propia no va empaquetada dentro de CHAT-X**; vive
en una cuenta GitHub nueva aparte. Esa cuenta ya existe.

### Estado verificado de musestudio8 (31-oct-2026, solo lectura, $0)

- Es una **cuenta de usuario** (no organización). Funciona igual para repos; si
  algún día se quiere forma de organización, GitHub permite transferir sin
  perder historia.
- Contiene 1 repo público: **`borrador`** (creado 30-oct). Comprobado con
  `git ls-remote`: **completamente vacío** (sin commits ni ramas). El fundador
  decide si lo borra o lo deja; la mudanza no lo toca.

### Mapa de mudanza (5 repos, copia espejo completa con historia)

| Repo nuevo en musestudio8 | Origen | Rol |
| --- | --- | --- |
| `WHATSPOWER` | ALBRA8/WHATSPOWER (`f4f7fc9`) | daemon WhatsApp modo novia |
| `WHATSPOWER-ULTRA` | ALBRA8/WHATSPOWER-ULTRA (`e6ef56d`) | difusión anti-ban |
| `CRM` | ALBRA8/CRM-ALBRA (`ea87cc2`) | CRM del negocio |
| `CHAT-X` | copia local viva (`9dcfa08`) | torre del negocio |
| `video-studio` | ALBRA8/YOUTUBE-AUTOMATION (`7709007`) | vídeo SFW / YouTube — PENDIENTE |

Las copias se hacen con `git clone --mirror` → **historia completa preservada
como procedencia**; después divergen a propósito al adaptarse a modo novia.
Nada se pierde y nada se toca en ALBRA8.

### Resultado de la mudanza (31-oct-2026, con orden explícita del fundador)

- `WHATSPOWER` → espejo completo; ramas IDÉNTICAS al origen (verificado).
- `WHATSPOWER-ULTRA` → espejo completo; ramas IDÉNTICAS al origen (verificado).
- `CRM` → espejo completo; ramas IDÉNTICAS. Única diferencia en `ls-remote`:
  `refs/pull/1/*` — refs internas de GitHub de un PR, no son contenido del repo;
  los espejos no las traen por diseño.
- `CHAT-X` → empujada desde la COPIA LOCAL VIVA, no desde ALBRA8: la local iba
  2 commits adelante (`5c32c30`, `9dcfa08`, nunca subidos) y el espejo desde
  ALBRA8 los habría perdido. Verificada SHA a SHA con historia completa.
  ALBRA8/CHAT-X quedó en `34e5aa1` (2 atrás): **la torre viva pasó a ser
  musestudio8/CHAT-X** (hasta el bloqueo del 07-nov — ver más abajo).
- `video-studio`: pendiente de que el fundador cree el repo destino.
- **Seguridad**: el PAT usado llegó pegado en el chat → REVOCAR ya confirmada
  la mudanza. Futuros push: `GITHUB_TOKEN=<nuevo PAT> bash scripts/subir_repo.sh
  musestudio8/CHAT-X main` (token solo por variable de entorno).

### Procedimiento

1. El fundador crea a mano en musestudio8 los 5 repos **vacíos** (sin README,
   sin licencia) — así el token de escritura no necesita permiso de creación.
2. Con tokens por variable de entorno (jamás en disco ni en chat):
   `export RECLONAR_TOKEN=<lectura ALBRA8>` y `export MUSE_TOKEN=<escritura
   musestudio8>` → `bash scripts/mudar_casa_nueva.sh`.
3. El script es idempotente y sin `--force`: verifica SHA a SHA cada rama y
   etiqueta tras el push; si algo difiere, aborta ese repo y no toca el resto.
4. Desde ese momento se trabaja clonando de musestudio8. ALBRA8 queda como
   biblioteca de referencia inalterada.

### Regla permanente

**Push solo con orden explícita del fundador.** La mudanza del 31-oct se
 ejecutó con orden explícita. Toda futura subida (CHAT-X, cuartos nuevos,
video-studio) sigue la misma regla: orden primero, token después. Si un PAT
llega pegado en el chat, se usa una vez y se revoca al confirmar el resultado.

### 2026-11-07 — musestudio8 BLOQUEADA → exilio temporal de CHAT-X a ALBRA8 (D-012)

GitHub suspendió la cuenta musestudio8 por recibir demasiada actividad de
golpe en una cuenta recién creada ("mucha información de trancazo", palabras
del fundador). La casa propia queda inaccesible hasta el desbloqueo. Con orden
explícita del fundador de ese día:

- **Torre temporal**: `ALBRA8/CHAT-X` vuelve a recibir push — excepción puntual
  a D-006, SOLO CHAT-X y SOLO durante el exilio; los demás repos originales
  siguen intocables. Se empuja en fast-forward y sin `--force` todo lo
  acumulado desde `34e5aa1`, con token solo por variable de entorno.
- **Al desbloquear**: portar a musestudio8 lo que nos sirva (CHAT-X avanzada +
  lo útil de la evolución de ALBRA8) y dejar el resto en ALBRA8. El espejo
  musestudio8/CHAT-X @ `9dcfa08` queda congelado como punto de retoma.
- El PAT del exilio viajó por el chat → usado una vez y a revocar al confirmar
  el push (junto con el del 31-oct, que sigue pendiente).

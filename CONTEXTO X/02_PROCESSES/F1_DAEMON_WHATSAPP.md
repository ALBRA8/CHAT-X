# F1 — DAEMON WHATSAPP PROPIO DEL NEGOCIO (especificación de sala limpia)
**Creado:** 2026-11-20 (S-012) · **Estado:** ESPECIFICADA · W1 EJECUTADO (S-012) · W2 EJECUTADO (S-013) · W3 EJECUTADO (S-014, mitad CHAT-X del bucle) · W4 EJECUTADO (S-015, iniciativas + panel Canal) · **W5 EJECUTADO (S-016, código del daemon REAL)** · **Origen:** `../00_MASTER/EMBUDO_MULTICANAL.md` §7 (enmienda CASA PROPIA) · hito 3 de `PROJECT_STATE.md`
**Regla madre:** no se construye sin orden explícita del fundador. W1 a W5 se ejecutaron con orden del fundador (S-012→S-016); **el bucle ya está COMPLETO en código por ambos lados**: la mitad CHAT-X vive en `src/` y la mitad REAL (el lado que toca WhatsApp) en `daemon/whatsapp/` — el daemon corre en la MÁQUINA DEL FUNDADOR y solo espera su orden + QR.

## 1. Qué es y qué NO es

- **Es** el cuarto nativo de CHAT-X que conversa por WhatsApp con los clientes del negocio: recibe mensajes, le habla al cerebro modo novia (`/api/chat`), respeta el gate humano y registra todo en casa. Patrón espejado en sala limpia desde conceptos generales: **sesión propia, pacing anti-ban propio, BD propia** del carril adulto.
- **No es** whatspower ni whatspower-ultra corriendo nada del negocio: los clones quedan como biblioteca de referencia solo-lectura (D-007). Ninguna importación de código, contrato o constante de `engines/`.
- **No es** un canal de cobro ni de contenido explícito: WhatsApp es canal SFW del embudo (matriz `EMBUDO_MULTICANAL.md` §4). El contenido 18+ vive solo en Fanvue (y Telegram cuando su activación se verifique). El daemon decide **cuándo** se envía; el QUÉ lo decide el cerebro + gate humano.

## 2. Sala limpia — qué se espeja y cómo

| Concepto general observado en el ecosistema | Reimplementación propia en CHAT-X |
|---|---|
| Sesión de WhatsApp con QR propio, persistida y rotable | `sesion.ts`: sesión del negocio, cifrada en reposo (AES-256-GCM, carril privado), logout/rotación documentados |
| Ritmo de envío conservador (anti-ban) | `pacing.ts` (**W1 EJECUTADO**, §4) — lógica pura con disyuntor, topos y calentamiento |
| Estado del mensaje por chat (cola, enviado, leído, fallo) | Tabla propia del daemon (§5) con estados honestos; sin reusar tablas de otros motores |
| Webhook del canal autenticado con secreto compartido | `conversacion.ts` + `/api/whatsapp/conversacion` (**W3 EJECUTADO**): firma HMAC-SHA256 de `${ts}.${cuerpo}` con ventana anti-replay de 5 min; fail-closed (sin secreto → 503, firma mala/vencida → 401); idempotencia por id del daemon |
| Mensajes programados del propio negocio (el contacto abrió primero, consentimiento 1:1) | `iniciativas.ts` + `/api/whatsapp/iniciativas` (**W4 EJECUTADO**): el operador agenda por contacto; el texto final lo escribe el cerebro al entregar (el breve del operador es intención, jamás texto libre sin filtro); el poll firmado del daemon recoge lo vencido con goteo (tope 5/poll, tope 3 pendientes/chat); disyuntor en vivo: circuito abierto frena INICIATIVAS y jamás respuestas |
| Flujos conversacionales step-driven | NO se copian: el cerebro es el genoma del personaje vía `/api/chat`; el gate humano decide lo sensible |

La referencia es conceptual (sala limpia): se escribió la especificación y el código sin portar archivos de los clones. Si alguna vez se necesita inspeccionar un patrón concreto, se documenta aquí qué se miró y qué se tomó, y nunca se pega código.

## 3. Arquitectura

```
WhatsApp (número del negocio, QR propio)
   │ mensajes entrantes
   ▼
DAEMON F1 (proceso aparte en la máquina del fundador, $0)
   ├─ sesion.ts      → sesión QR propia, cifrada en reposo
   ├─ pacing.ts      → CUÁNDO se puede enviar (W1, ya probado)
   ├─ cola/envio.ts  → topos, jitter, reintentos, estados de mensaje
   │      ▼ webhook interno firmado (mismo cerrojo 401/503 de la casa)
   │ CHAT-X /api/chat — CEREBRO modo novia (genoma + contexto + media + voz)
   │      ▼ respuesta (gate humano para lo sensible; auto para rutina)
   ├─ envío con pacing → WhatsApp
   └─ registro: BD propia + libro interno (ChatMessage) + compliance append-only
```

- El daemon corre en la máquina del fundador (como el motor YT): el sandbox no mantiene sesiones de WhatsApp. CHAT-X le habla por HTTP con firma; el daemon habla al cerebro, jamás a los clones.
- **Memoria del embudo:** libro interno de CHAT-X (ChatMessage, LedgerMonetizacion). CRM-ALBRA NO recibe registros del negocio adulto (CASA PROPIA).

## 4. W1 — módulo de pacing (EJECUTADO, S-012)

`src/lib/whatsapp/pacing.ts` · 18 tests (`test/unit/whatsapp-pacing.test.ts`) · lógica pura, determinista (fechas y aleatorio inyectados).

| Pieza | Comportamiento | Defecto |
|---|---|---|
| `decidirEnvio()` | Gate de envío: circuito → horas silencio → techo diario por tipo → calentamiento → ok | — |
| Horas silencio | Ventana LOCAL que cruza medianoche; bloquea respuestas e iniciativas | 22:00 → 08:00 |
| Techos diarios por tipo | Respuestas e iniciativas se cuentan por separado, por chat y por día LOCAL | 60 respuestas · 8 iniciativas |
| Calentamiento | Iniciativas a chats jóvenes: techo desde la PRIMERA iniciativa; las respuestas nunca se bloquean por calentamiento | máx 2 en 24 h |
| `temperatura()` | Disyuntor: fallos de riesgo de cualquier chat (un bloqueo afecta al número entero) abren el circuito; SOLO frena iniciativas | 3 fallos en 30 min → pausa 2 h |
| `retardoConJitter()` | Retardo entre envíos con jitter uniforme — un metrónomo exacto es firma de autómata; proporción saturada a [0,1], sin negativos | — |

Garantías del módulo: no envía nada (decide cuándo); no toca BD, red ni reloj propio; los defectos son conservadores y se ajustan por configuración en caliente (BD panel > env > defecto) — **hecho en W3 (S-014): claves `whatsapp.pacing.silencio_desde/silencio_hasta/max_respuestas_dia/max_iniciativas_dia`; calentamiento y disyuntor quedan en código como líneas de seguridad.** Compatibilidad con A2: mismas lecciones de honestidad — decisión con motivo y `reintentarEn` explícitos, nunca bloqueo silencioso.

## 5. Datos (BD propia del cuarto)

| Tabla | Qué guarda | Estado |
|---|---|---|
| `WhatsAppSesion` | UNA fila (id "unica"): estado de la sesión (NO_CONFIGURADO \| ESPERANDO_QR \| CONECTADA \| DESCONECTADA), huella SHA-256 del número (jamás el número en claro) + máscara •••••1234, reto QR con caducidad de ~1 min, fechas y contador de rotaciones | **EJECUTADA (S-013)** — el secreto de sesión descansa SOLO cifrado (AES-256-GCM, clave dedicada derivada del secreto del servidor con separación de dominio); el API lo reporta como `secretoPresente`, jamás en claro |
| `WhatsAppMensaje` | chatId, dirección, tipo (respuesta/iniciativa), estado (recibido/programada/en_cola/enviado/fallado/bloqueado_pacing), marca de pacing (motivo + reintentarEn), id del mensaje del cerebro | **EJECUTADA (S-014)** — memoria POR CHAT (dos contactos jamás comparten contexto entre sí ni con el GFE del operador); las marcas `MarcaEnvio` del pacing salen desde aquí; idempotencia de la casa `@@unique([chatId, dirección, idEntrada])` (un reenvío no duplica ni re-cobra el cerebro); `errorRiesgo` solo en fallos con señal de riesgo alimenta el disyuntor; `cerebroMensajeId` queda enlazado a futuro para media/voz. **W4 (S-015):** `programadaEn` + `programadaPor` para las iniciativas programadas (estado `programada` solo vive en tipo=iniciativa) |

Principio A2/A3 aplicado desde el día uno: estados derivados calculados, no inventados; media y sesiones en casa; nada se borra en silencio.

## 6. Plan por tajadas (cada una con tests y smoke en vivo)

| Tajada | Contenido | Estado |
|---|---|---|
| **W1 — pacing** | módulo puro `pacing.ts` + tests | **EJECUTADO (S-012)** |
| **W2 — sesión** | modelo `WhatsAppSesion` (BD propia), módulo puro `sesion.ts` (máquina de estados, reto QR con caducidad, huella+máscara del número, cifrado AES-256-GCM del secreto con clave dedicada), API honesta `GET/POST /api/whatsapp/sesion` (iniciar_espera_qr / confirmar_conexion / rotar / desconectar / caducar_qr), compliance `sesion_whatsapp` append-only | **EJECUTADO (S-013)** — 14 tests unitarios + smoke en vivo de 11 caminos (503-ish 400/409 honestos, borrado explícito, secreto jamás en respuestas); fixtures limpiados; tsc 0, suite 265 PASS, build verde |
| **W3 — conversación** | webhook de entrada firmado → `/api/chat` → gate humano → envío con pacing; tabla `WhatsAppMensaje`; daemon real con librería open-source en la MÁQUINA DEL FUNDADOR (aquí no hay sesión real de WhatsApp y no se finge) | **EJECUTADO (S-014) — mitad CHAT-X del bucle completa:** tabla `WhatsAppMensaje` (idempotente) + módulo puro `conversacion.ts` (firma HMAC anti-replay, validaciones, marcas, transiciones) + `/api/whatsapp/conversacion` (POST firmado fail-closed con acciones `entrante`/`marcar_envio` + GET panel honesto): filtro de edad en ENTRADA y SALIDA (mismos estándar que /api/chat; plantilla segura con rechazo auditado), pacing W1 ANTES del cerebro (si bloquea, el LLM no se gasta — regla $0), memoria POR CHAT sin mezcla con el GFE, pedidos de media NO crean jobs ni tocan créditos del operador, idempotencia por id del daemon, fallos con señal de riesgo alimentan el disyuntor (verificado en vivo: 3 fallos → enfriando), config en caliente de pacing y del canal (claves `whatsapp.*` con nueva categoría en el panel). 36 tests unitarios + smoke en vivo TODO OK (firmas 4 caminos, estados honestos 503/401/404/409, cola fría con reintentarEn, 0 jobs/0 créditos, contradicciones 409, limpieza explícita) |
| **W4 — iniciativas + panel** | iniciativas programadas con disyuntor en vivo; vista Canal en el panel (estado de sesión, temperatura, envíos del día) | **EJECUTADO (S-015) — bucle completo del lado CHAT-X:** módulo puro `iniciativas.ts` (validación con horizonte 30 días, veredicto con disyuntor en vivo, cancelación solo en programada, plantilla del genoma) + superficie del OPERADOR `/api/whatsapp/iniciativas` (programar con sesión CONECTADA y personaje asignado, tope 3 pendientes por chat — consentimiento 1:1, jamás cola de difusión; cancelar explícito con compliance; en_cola no se des-instruye → 409) + poll firmado `iniciativas_vencidas` en el webhook (goteo 5/poll, el texto final lo escribe el cerebro con salida segura, el breve del operador es intención) + **vista Canal en el panel** (`CanalWhatsAppView`: estado honesto de sesión con acciones QR/rotar/desconectar, webhook presente/fuente, pacing efectivo, temperatura del disyuntor, envíos del día, iniciativas programadas con breve, historial y últimos mensajes con chatId SIEMPRE enmascarado). 27 tests unitarios + smoke en vivo TODO OK (~60 verificaciones: 400/409/503/404 honestos, fail-closed 503/401 para el nuevo poll, horas silencio → sigue_programada con reintentarEn, ventana abierta → en_cola con texto, marcar_envio → enviado, circuito en vivo frena iniciativas y jamás respuestas, tope por chat, cancelación, 0 jobs/0 créditos, limpieza explícita). Suite 328 PASS, tsc 0, build verde |
| **W5 — código del daemon REAL** | el lado del bucle que corre en la MÁQUINA DEL FUNDADOR: módulo puro `daemon.ts` + runner `daemon/whatsapp/index.ts` (librería open-source $0, import dinámico honesto) + docs de activación (`WHATSAPP_QR_ACTIVACION.md` §0) | **EJECUTADO (S-016):** módulo puro `src/lib/whatsapp/daemon.ts` (25 tests) — clasificación de fallos con señal de riesgo (alimenta el disyuntor W1), plan de reintentos con backoff exponencial + jitter y TOPE 3, parseo HONESTO de las instrucciones del webhook (jamás improvisa texto), plan de arranque (registrar/continuar/parar_operador — huella del número, nada se sobreescribe en silencio), constructores de payloads firmados con drift-guard contra la huella de la casa. Runner `daemon/whatsapp/index.ts` — fail-closed desde el ARRANQUE (sin `WHATSAPP_WEBHOOK_SECRETO` ≥24 chars no arranca), sesión por QR propio con espera FRESH + `confirmar_conexion` (número + blob cifrado), entrantes → webhook firmado → obediencia al cerebro, envíos con retardo+jitter y resultado VERDADERO en `marcar_envio`, poll de iniciativas con goteo, pulso vivo. **Activación documentada** en `WHATSAPP_QR_ACTIVACION.md` §0 (procedimiento para la máquina del fundador); aquí no hay sesión real de WhatsApp y NO se finge — el runner jamás se ejecuta en sandbox/CI |

## 7. Riesgos y límites declarados

- **El número es el activo.** Los defectos de pacing son la línea mínima; ni el operador puede sobrepasarlos desde el panel sin cambiar configuración explícita (que queda en el log de compliance).
- **Sin campañas masivas.** F1 es conversación 1:1 y retención; la difusión a escala ni se especifica (la lección de ULTRA se tomó como concepto, no como producto).
- **ToS de WhatsApp:** canal SFW únicamente; cualquier señal de bloqueo abre el circuito y exige revisión humana antes de reanudar iniciativas.
- **0 envíos hasta activación explícita:** sin QR del fundador y sin destinatarios consentidos, el daemon queda NO_CONFIGURADO y no existe fallback silencioso.

## 8. Condiciones de activación

1. Orden explícita del fundador para W2. **Cumplida (S-013) — y la orden "continua implementando el plan" completó W3 del lado CHAT-X (S-014), W4 iniciativas + panel Canal (S-015) y W5 el código del daemon REAL (S-016).**
2. QR de WhatsApp del fundador en su máquina (procedimiento: `WHATSAPP_QR_ACTIVACION.md` §0) + daemon propio corriendo (`cd daemon/whatsapp && bun install && WHATSAPP_WEBHOOK_SECRETO=<el-del-panel> bun index.ts`) + `whatsapp.webhook_secreto` + `whatsapp.personaje_id` configurados en el panel. Sin esas piezas el canal responde honesto (503/409) y NADA viaja por WhatsApp — ni respuestas ni iniciativas.
3. Regla $0 intacta: el daemon no requiere servicios pagados (librería open-source para la sesión).
4. Push a la torre con PAT nueva (igual que el resto del exilio). El push de S-015 espera orden de subida como el resto de sesiones sin orden.

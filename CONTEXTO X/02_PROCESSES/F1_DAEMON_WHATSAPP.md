# F1 — DAEMON WHATSAPP PROPIO DEL NEGOCIO (especificación de sala limpia)
**Creado:** 2026-11-20 (S-012) · **Estado:** ESPECIFICADA · W1 EJECUTADO · **Origen:** `../00_MASTER/EMBUDO_MULTICANAL.md` §7 (enmienda CASA PROPIA) · hito 3 de `PROJECT_STATE.md`
**Regla madre:** no se construye sin orden explícita del fundador. Esta ficha deja F1 lista para construir; la construcción del daemon (W2+) espera orden.

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

Garantías del módulo: no envía nada (decide cuándo); no toca BD, red ni reloj propio; los defectos son conservadores y se ajustarán por configuración en caliente (BD panel > env > defecto) cuando el daemon se cablee. Compatibilidad con A2: mismas lecciones de honestidad — decisión con motivo y `reintentarEn` explícitos, nunca bloqueo silencioso.

## 5. Datos (BD propia del cuarto)

| Tabla nueva | Qué guarda | Notas |
|---|---|---|
| `WhatsAppSesion` | estado de la sesión (desconectada / esperando_qr / conectada), huella del número, fechas | el SECRETO de sesión se guarda cifrado en carril privado, jamás en texto |
| `WhatsAppMensaje` | chatId, dirección, tipo (respuesta/iniciativa), estado (en_cola/enviado/fallado), marca de pacing (motivo + reintentarEn), id del mensaje del cerebro | las marcas `MarcaEnvio` salen de aquí; alimenta compliance |

Principio A2/A3 aplicado desde el día uno: estados derivados calculados, no inventados; media y sesiones en casa; nada se borra en silencio.

## 6. Plan por tajadas (cada una con tests y smoke en vivo)

| Tajada | Contenido | Estado |
|---|---|---|
| **W1 — pacing** | módulo puro `pacing.ts` + tests | **EJECUTADO (S-012)** |
| W2 — sesión | modelo `WhatsAppSesion`, sesión cifrada en reposo, QR propio, rotación; endpoint de estado honesto (NO_CONFIGURADO sin QR) | listo para construir con orden |
| W3 — conversación | webhook de entrada firmado → `/api/chat` → gate humano → envío con pacing; tabla `WhatsAppMensaje`; compliance | cola |
| W4 — iniciativas + panel | iniciativas programadas con disyuntor en vivo; vista Canal en el panel (estado de sesión, temperatura, envíos del día) | cola |

## 7. Riesgos y límites declarados

- **El número es el activo.** Los defectos de pacing son la línea mínima; ni el operador puede sobrepasarlos desde el panel sin cambiar configuración explícita (que queda en el log de compliance).
- **Sin campañas masivas.** F1 es conversación 1:1 y retención; la difusión a escala ni se especifica (la lección de ULTRA se tomó como concepto, no como producto).
- **ToS de WhatsApp:** canal SFW únicamente; cualquier señal de bloqueo abre el circuito y exige revisión humana antes de reanudar iniciativas.
- **0 envíos hasta activación explícita:** sin QR del fundador y sin destinatarios consentidos, el daemon queda NO_CONFIGURADO y no existe fallback silencioso.

## 8. Condiciones de activación

1. Orden explícita del fundador para W2.
2. QR de WhatsApp del fundador en su máquina (procedimiento: `WHATSAPP_QR_ACTIVACION.md`).
3. Regla $0 intacta: el daemon no requiere servicios pagados (librería open-source para la sesión).
4. Push a la torre con PAT nueva (igual que el resto del exilio).

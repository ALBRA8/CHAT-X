# Daemon F1 REAL — canal WhatsApp PROPIO (CASA PROPIA)

**Este proceso corre en la MÁQUINA DEL FUNDADOR.** Jamás en el sandbox, CI o
servidor compartido: el sandbox no mantiene sesiones de WhatsApp y no se finge.
Es el único componente del bucle que toca la red de WhatsApp — librería
open-source ($0, regla permanente), sin servicios pagados.

## Qué hace y qué NO hace

| Hace | No hace |
|---|---|
| Empareja el número del negocio con QR propio y registra la sesión en CHAT-X (cifrada AES-256-GCM) | Decide QUÉ responder (eso es el cerebro en CHAT-X) |
| Trae los mensajes entrantes por webhook FIRMADO (HMAC-SHA256 anti-replay) | Decide CUÁNDO al fondo (eso es el pacing W1 en CHAT-X) |
| Envía las respuestas/iniciativas que el cerebro+pacing instruyen, con retardo + jitter | Improvisa texto propio o reenvía sin instrucción |
| Reporta el resultado VERDADERO de cada envío (los fallos con señal de riesgo alimentan el disyuntor) | Toca tablas de otros motores o de los clones (BD propia del carril adulto) |

## Requisitos (máquina del fundador)

1. CHAT-X corriendo y alcanzable (`CHATX_URL`, defecto `http://127.0.0.1:3000`).
2. El secreto del webhook configurado en el panel de CHAT-X
   (`whatsapp.webhook_secreto`) — el MISMO valor va por env aquí:
   `WHATSAPP_WEBHOOK_SECRETO`. **Nunca en el chat, commits ni screenshots.**
   Sin ese secreto (≥24 chars) este daemon NO ARRANCA (fail-closed).
3. El personaje del canal asignado (`whatsapp.personaje_id` en el panel).
4. Un teléfono autorizado para escanear el QR (WhatsApp → Dispositivos
   vinculados → Vincular un dispositivo).

## Arranque

```bash
cd daemon/whatsapp
bun install                      # librería open-source, $0
CHATX_URL=http://127.0.0.1:3000 \
WHATSAPP_WEBHOOK_SECRETO=<el-mismo-del-panel> \
bun index.ts
```

- El QR aparece en la terminal (y por el evento de la librería); escanéalo en
  ~1 minuto. Cada conexión pasa por una espera FRESH en CHAT-X
  (`iniciar_espera_qr` → `confirmar_conexion` con el número + **identificador
  de credenciales**) — así el estado de la casa siempre es HONESTO.
- **Credenciales reales SOLO en `./.wa-auth`** (fuera de git, permisos del
  dueño): lo que viaja a CHAT-X es la huella canónica `wa-cred-v1:<sha256>`
  (F0.1) — la casa la guarda cifrada (AES-256-GCM, clave dedicada) para
  detectar drift de re-emparejamiento, jamás las credenciales utilizables.
- Los reinicios no piden QR de nuevo salvo logout o revocación desde el
  teléfono (la autenticación es MULTI-FILE: `useMultiFileAuthState`).
- Si CHAT-X ya está CONECTADA con el mismo número (huella igual), el daemon
  continúa sin re-emparejar; si la huella NO coincide o el secreto falta, SE
  DETIENE y lo declara — nada se sobreescribe en silencio.

## Variables de entorno

| Variable | Defecto | Qué es |
|---|---|---|
| `CHATX_URL` | `http://127.0.0.1:3000` | Casa base de CHAT-X |
| `WHATSAPP_WEBHOOK_SECRETO` | — (OBLIGATORIO) | El mismo secreto del panel; firma HMAC |
| `DAEMON_AUTH_DIR` | `./.wa-auth` | Dónde persisten las credenciales de la librería |
| `DAEMON_POLL_MS` | `20000` | Intervalo del poll de iniciativas (mín 5 s) |
| `DAEMON_RETARDO_MS` | `1500` | Retardo base entre envíos (jitter aplicado encima) |
| `DAEMON_LIB` | `baileys` | Módulo de la librería (import dinámico honesto) |

## Bajar la sesión (logout)

- Rotación desde el panel de CHAT-X (`rotar` = logout explícito) + revocar el
  dispositivo desde el teléfono + borrar `./.wa-auth` local.
- `desconectar` en el panel borra el secreto de sesión de la BD de la casa
  (explícito, jamás en silencio).

## Límites honestos

- Sin QR escaneado ni destinatario consentido, NADA viaja por WhatsApp —
  ni respuestas ni iniciativas (el canal responde 409/503 honestos).
- WhatsApp es canal SFW del embudo (EMBUDO §4): el filtro de edad aplica en
  entrada y salida ANTES de que el daemon reciba cualquier texto.
- Los reintentos tienen TOPE (3) con backoff exponencial + jitter; después,
  el fallo se reporta tal cual y queda para revisión humana.

## Librería y versión — decisión (S-017 F0.1)

- **baileys fijado a `6.7.24`** (sin `^`): la última estable de la línea 6.x
  (dist-tag `legacy` en npm). La autenticación usa `useMultiFileAuthState` /
  `saveCreds` — `useSingleFileAuthState` NO existe en 6.7.x y era el bug que
  mataba el arranque real (verificado con la librería real por
  `test/unit/baileys-lib.test.ts`, sin conectarse a WhatsApp).
- **Por qué NO 7.x**: la 7.0.0 sigue en release candidate (`7.0.0-rc*`) y el
  canal es producción. Migrar una RC sin un ciclo real de QR que la valide
  viola el fail-closed de la casa. Criterio de migración: 7.0.0 estable +
  ciclo QR real (FASE 3) en una sesión de prueba + regresión completa.

## Supervisión (F0.5)

- El daemon sale con `process.exit(2)` al perder conexión reconectable y con
  `exit(1)` en logout — se apoya en un SUPERVISOR externo, no se auto-resucita:
  ver `systemd/chatx-whatsapp-daemon.service` y `ecosystem.config.cjs` (pm2)
  en este directorio, y `CONTEXTO X/02_PROCESSES/WHATSAPP_QR_ACTIVACION.md`.
  Regla: `Restart=always` con `RestartSec=5` (systemd) o `max_restarts` alto
  con backoff (pm2); jamás dos instancias con el mismo `DAEMON_AUTH_DIR`.

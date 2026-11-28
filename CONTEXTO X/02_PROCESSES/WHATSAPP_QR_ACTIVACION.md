# Activación controlada de WhatsApp (daemon Baileys :3002)

> **2026-11-20 (S-016, F1-W5):** el negocio tiene AHORA su **daemon PROPIO** (F1,
> sala limpia, $0) — código en `daemon/whatsapp/` con activación en la **§0 de
> abajo**. Las secciones 1-6 de este documento describen el daemon BAILEYS VIEJO
> de CRM-ALBRA (:3002), que queda como **referencia histórica** — los clones
> jamás procesan el negocio 18+ (D-007/CASA PROPIA). Para el canal propio del
> negocio usa SOLO la §0.

## §0 — Daemon PROPIO del negocio (F1 · sala limpia · recomendado)

**Procedimiento real de activación del canal WhatsApp de MUSE** (componente
`daemon/whatsapp/`, librería open-source $0, BD y sesión PROPIAS del carril
adulto — cero código de los clones).

1. **CHAT-X arriba** (`bun run dev` o el standalone) y alcanzable desde la
   máquina del fundador (`CHATX_URL`, defecto `http://127.0.0.1:3000`).
2. **Secreto del webhook**: genera ≥32 caracteres aleatorios, guárdalo en el
   panel de CHAT-X (`whatsapp.webhook_secreto`) y expórtalo en la máquina del
   daemon como `WHATSAPP_WEBHOOK_SECRETO`. El mismo valor en ambos lados; el
   receptor de CHAT-X está APAGADO sin él (fail-closed 503) y el daemon NO
   ARRANCA sin él (fail-closed). Nunca en chat, commits ni screenshots.
3. **Personaje del canal**: `whatsapp.personaje_id` en el panel (personaje
   ACTIVO — sin genoma no hay cerebro y el canal responde 503 honesto).
4. **Arranque del daemon** en la máquina del fundador:
   ```bash
   cd daemon/whatsapp && bun install   # librería open-source, $0
   CHATX_URL=http://127.0.0.1:3000 \
   WHATSAPP_WEBHOOK_SECRETO=<el-mismo-del-panel> \
   bun index.ts
   ```
5. **QR**: el daemon pide espera FRESH en la casa (`iniciar_espera_qr`), muestra
   el QR en terminal (vence ~1 min, un solo uso) y al escanear llama
   `confirmar_conexion` con el número + **identificador de credenciales**
   (`wa-cred-v1:<sha256>`, S-017 F0.1 — las credenciales utilizables viven
   SOLO en `daemon/whatsapp/.wa-auth`, fuera de git, y la casa custodia la
   huella cifrada AES-256-GCM). El número queda como huella SHA-256 + máscara.
6. **Prueba con destinatario consentido** (obligatoria antes de cualquier uso
   real): número de prueba con consentimiento explícito → conversa por el
   canal → verificar fila `WhatsAppMensaje` con estado `enviado` en el panel
   Canal (chatId enmascarado) y recepción real en el teléfono. Registrar el
   resultado en `../05_TESTS/INFORME_PRUEBAS.md`.
7. **Bajar la sesión**: `rotar` (logout explícito, panel) + revocar el
   dispositivo desde el teléfono + borrar `.wa-auth` local. `desconectar`
   borra el secreto de la BD de la casa (explícito).
8. **Supervisión del proceso (S-017 F0.5 — OBLIGATORIA en uso real)**: el
   daemon no se auto-resucita — sale con `exit(2)` en caída reconectable y
   `exit(1)` en logout real, y un SUPERVISOR externo decide:
   - **systemd** (recomendado): `daemon/whatsapp/systemd/chatx-whatsapp-daemon.service`
     — `Restart=on-failure` + `RestartSec=5` + `SuccessExitStatus=1` (el logout
     NO se reintenta en bucle: rotar desde el panel y re-emparejar con QR).
     El secreto va por `EnvironmentFile` (600, root) — jamás inline en la
     unidad. Logs: `journalctl -u chatx-whatsapp-daemon -f`.
   - **pm2** (alternativa): `daemon/whatsapp/ecosystem.config.cjs`
     (`stop_exit_codes: [1]`, `restart_delay: 5000`, `max_restarts: 20`).
   - **Regla dura**: JAMÁS dos instancias con el mismo `DAEMON_AUTH_DIR`
     (las credenciales multi-file no toleran dos dueños simultáneos).

**Honestidad del arranque**: si CHAT-X dice CONECTADA con la MISMA huella del
número, el daemon continúa sin re-emparejar; si la huella NO coincide o el
secreto falta, el daemon SE DETIENE y lo declara — nada se sobreescribe en
silencio. Sin QR escaneado ni destinatario consentido, NADA viaja por
WhatsApp (ni respuestas ni iniciativas).

## 1. Arquitectura y responsabilidades (HISTÓRICO — daemon viejo de CRM-ALBRA)

Procedimiento real verificado contra el código del daemon (`engines/CRM-ALBRA/src/whatsapp-daemon/daemon.mjs`, 846 líneas, leído en auditoría 2026-10-28). Este documento vive en CHAT-X; los repos de terceros no se modifican.

| Componente | Puerto | Rol | Estado del código |
|---|---|---|---|
| Daemon Baileys (en CRM-ALBRA) | 3002 | Sesión WhatsApp, QR, envío `POST /send`, bandeja/persistencia | REAL (código auditable) |
| WHATSPOWER 2A | 3003 | Conversación 1-a-1 agéntica, no difusión | REAL Y PROBADO (tests sala limpia 19/19 + arranque + flujo en vivo) |
| WHATSPOWER-ULTRA 2B | 3004 | Difusión masiva con throttling, supresión y fail-closed | REAL Y PROBADO (tests 1/1 + arranque; envío real no ejecutado) |
| Puente CRM→2A | — | `auto-reply` del CRM delega en 2A con fallback 3.5s | PARCIAL (requiere CRM-ALBRA corriendo) |

El daemon es fail-closed por diseño: **sin `INTERNAL_API_SECRET` de ≥24 caracteres no arranca** (auditado en línea 37-41 del daemon).

## 2. Prerrequisitos (máquina del operador)

1. CRM-ALBRA instalado y con su `.env` en la raíz del proyecto (el daemon lo carga automáticamente con `process.loadEnvFile`).
2. En ese `.env`:
   - `INTERNAL_API_SECRET` — mínimo 24 caracteres, compartido con el servidor Next.js del CRM. **Nunca en el chat ni en commits.**
   - `DATABASE_URL` — el daemon persiste conversaciones y mensajes salientes en la misma BD.
3. Puerto 3002 libre (o `WHATSAPP_DAEMON_PORT` distinto y `WHATSAPP_DAEMON_URL` apuntando a él).

## 3. Arranque y vinculación por QR

```bash
cd engines/CRM-ALBRA
node src/whatsapp-daemon/daemon.mjs
# El log imprime el QR también en terminal (qrcode-terminal) como respaldo
```

Secuencia de estados real del daemon: `disconnected → connecting → waiting_qr → connected`.

1. Abrir el visor **http://127.0.0.1:3002/qr** (JSON con `status` y `qr` en base64) o el visor HTML auto-refrescable del 2A: **http://127.0.0.1:3003/qr** (refresca cada 1.5s para evitar expiración del QR).
2. En el teléfono **autorizado**: WhatsApp → Configuración → **Dispositivos vinculados** → **Vincular un dispositivo** → escanear el QR.
3. Verificar: `GET http://127.0.0.1:3002/qr` debe devolver `{"status":"connected", "qr":null, "phone":"<número>"}`. El teléfono queda registrado en `connectedPhone` y la sesión queda asociada a la organización (`linkedOrgId`, multi-tenant).
4. La sesión persiste en `src/whatsapp-daemon/.wa-auth/` (directorio AUTH_DIR del daemon): los reinicios NO piden QR de nuevo, salvo logout o revocación desde el teléfono.

⚠️ El QR solo se activa al escanearlo y es de un solo uso. Nunca compartir capturas del QR: quien lo escanee vincula el número.

## 4. Prueba con destinatario consentido (obligatoria antes de cualquier uso real)

1. Elegir un número de prueba **que haya dado consentimiento explícito** (idealmente un segundo número propio del operador).
2. Verificar sesión conectada (paso 3.3).
3. Enviar el mensaje de prueba:

```bash
curl -X POST http://127.0.0.1:3002/send \
  -H "Authorization: Bearer $INTERNAL_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"to":"<numero_consentido>","text":"Mensaje de prueba CHAT-X (consentido)"}'
# Éxito: {"success":true,"messageId":"..."}  — el daemon persiste el saliente en la BD
```

4. Confirmar recepción en el teléfono y aparición en `GET /conversations` del daemon.
5. Registrar el resultado en `CONTEXTO X/05_TESTS/INFORME_PRUEBAS.md` (fecha, destinatario consentido, messageId).

**Estado actual: BLOQUEADO en sandbox** — requiere el teléfono del operador para escanear el QR (intervención humana). Ningún envío real fue ejecutado ni debe ejecutarse sin este procedimiento.

## 5. Protecciones anti-abuso (verificadas en código y en vivo)

- **Firma HMAC + anti-replay en 2A**: `POST /api/inbound` exige `X-Signature-SHA256` válida y rechaza timestamps con desfase >300s. Probado EN VIVO (2026-10-28): firma inválida → HTTP 401; timestamp expirado → HTTP 401 "replay protection".
- **Fail-closed de despacho 2B**: sin secreto interno válido no se despacha (`execute-pilot-single-dispatch.ts`, gate paridad daemon). Cubierto por su suite de tests.
- **Supresión y consentimiento revocado**: `src/safety/suppression.ts` + `lock-checker.ts` en ULTRA — un contacto dado de baja no recibe difusión.
- **Throttling de difusión**: `src/queue/throttler.ts` + `broadcast-worker.ts` — cola con ritmo controlado, no ráfagas.
- **Aprobación humana**: los flujos de CHAT-X (`/api/flujos/[id]/ejecutar` + `aprobar/cancelar`) requieren acción humana explícita en pasos marcados HITL antes de despachos.
- **ALLOW_REAL_DISPATCH=false por defecto**: los motores arrancan sin capacidad de envío real hasta que el operador la active conscientemente.

## 6. Cierre de sesión y rotación de credenciales

- **Desvincular**: desde el teléfono (Dispositivos vinculados → Cerrar sesión) o `POST /logout` del daemon (borra QR, sesión y estado; queda `disconnected`).
- **Borrar sesión local**: detener daemon y eliminar `src/whatsapp-daemon/.wa-auth/`.
- **Rotar `INTERNAL_API_SECRET`**: definir nuevo valor (≥24 chars) en el `.env` del CRM y reiniciar daemon + CRM + 2A/2B en cascada. El daemon no arranca con el secreto ausente o corto. La rotación se hace solo en archivos locales del operador — nunca pegar el secreto en chats, issues o commits.
- Si el número quedó vinculado en una máquina comprometida: revocar primero desde el teléfono (cierra la sesión remota), luego rotar el secreto, luego revincular.

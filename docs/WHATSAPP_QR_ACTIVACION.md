# Activación controlada de WhatsApp (daemon Baileys :3002)

Procedimiento real verificado contra el código del daemon (`engines/CRM-ALBRA/src/whatsapp-daemon/daemon.mjs`, 846 líneas, leído en auditoría 2026-10-28). Este documento vive en CHAT-X; los repos de terceros no se modifican.

## 1. Arquitectura y responsabilidades

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
5. Registrar el resultado en `docs/INFORME_PRUEBAS.md` (fecha, destinatario consentido, messageId).

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

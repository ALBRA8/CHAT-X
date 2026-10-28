# Informe de seguridad (sección 10 del prompt maestro)

Fecha: 2026-10-28 · Alcance: CHAT-X como plataforma central.

## Implementado y verificado

| Control | Estado | Evidencia |
|---|---|---|
| Cifrado carril privado | ✔ previo + verificado | AES-256-GCM archivo+miniatura, llave envuelta 2 veces (scrypt + secreto servidor 0600) |
| Age-gate modo privado | ✔ previo | scrypt + cookie de sesión corta (src/app/api/private/session) |
| Filtro edad aparente | ✔ previo | rechazo duro ANTES de gastar créditos + evento compliance |
| Webhook AGENTE-LEADS fail-closed | ✔ endurecido HOY | auth Bearer PRIMERO; sin secreto → 503; mismatch → 401 + evento webhook.rechazado (route.ts) |
| Validación de entradas PUT motores | ✔ añadido HOY | URL solo http(s), máx 300 chars, sin user:pass@ en URL, apiKey máx 500 |
| Validación definición de flujos | ✔ añadido HOY | whitelist de tipos de paso, máx 20 pasos, nombre 3-120 (lib/flujos.ts validarDefinicion) |
| Límites de uso | ✔ añadido HOY | máx 3 ejecuciones simultáneas por flujo (429); reintentos con techo 4 por paso; espera con tope (youtube 600s, estudio 300s) |
| Idempotencia/anti-duplicado ejecuciones | ✔ | set global de ejecuciones en curso (EJECUCIONES_EN_CURSO) |
| Límite diario de consumo | ✔ añadido 2026-10-29 | punto único de cobro (asegurarSaldo): techo de gasto comprometido/día configurable (limiteDiario), contador conservador (reembolsos no liberan el día). Verificado: rechazo con techo 883/gasto 882+8cr, aceptación con techo 5000 |
| Auth admin opcional | ✔ añadido 2026-10-29 | middleware fail-closed SOLO con ADMIN_PASSWORD definida: POST/PUT/PATCH/DELETE exigen cookie httpOnly (SHA-256 con pepper, comparación por hash); sin cookie → 401; sin env → 503 honesto en login. Verificado en ambos modos |
| Rate limit | parcial | límites estructurales (concurrencia, reintentos); rate limit por IP pendiente si se expone a Internet |
| Secretos fuera del repo | ✔ | .env, media/, db/, engines/, research/ en .gitignore; token de push one-off NO persistido en .git/config |
| Logs sin credenciales | ✔ | registro de flujos/eventos guardan mensajes y payloads de negocio, nunca apiKey (la config devuelve '••••'+últimos 4) |
| Originales intactos | ✔ | clones en engines/ sin modificaciones; cero push a originales (docs/MOTORES_REGISTRO.md) |

## Riesgos aceptados y documentados (no ocultos)

1. **CHAT-X hoy no tiene login propio**: es una herramienta de operador único pensada para localhost/red privada del fundador. Si se expone a Internet hay que añadir delante un reverse proxy con auth (Caddy basic_auth) o login en la app. Queda registrado como tarea de despliegue, no como funcionalidad falsa.
2. **Motores vecinos con superficie abierta**: WHATSPOWER (gestión sin auth por diseño), CAZADOR (CORS *, sin auth), COMUNITI (panel abierto). Regla operativa: mantenerlos SOLO en 127.0.0.1 y nunca redirigirlos con Caddy al exterior.
3. **Baileys (sesión WhatsApp no oficial)**: riesgo de ban propio del daemon del CRM — decisión de producto, no técnica.
4. **Sandbox sin GPU**: la generación real requiere la máquina del fundador (docs/MOTOR_GPU.md con el desbloqueo exacto).

## Pendientes explícitos

- Login/roles multi-usuario y aislamiento por organización (cuando CHAT-X deje de ser mono-operador).
- Rate limiting por IP persistente (hoy en memoria).
- Backup cifrado off-site (el backup local existe: scripts/backup.sh).


## Revocación y rotación del token de GitHub expuesto (pendiente del fundador)

> **Estado 2026-10-28 (validación d131124)**: el fundador confirmó que **la revocación la hará él mismo** — nunca más se mostró ni copió el token en esta fase, y no hace falta: la revocación es 100% en su navegador (github.com/settings/tokens). Re-escaneo ejecutado hoy: 0 secretos en el árbol versionado y en el historial completo (`bash scripts/escaneo_secretos.sh`), sin remotos git (push imposible desde este entorno), y el único `.env` de engine modificado (AGENTE-KREA) contiene solo `DATABASE_URL` (ruta de fichero, sin secreto). El procedimiento completo queda documentado abajo para cuando ejecute la revocación.

Un token clásico (`ghp_…`) quedó expuesto en el chat en una sesión anterior y **no se ha confirmado su revocación**. Protocolo (sin copiar el token nunca):
1. GitHub → Settings → Developer settings → Personal access tokens → localizar el token creado el 2026-10-28 → **Revoke** (o Delete). Si aparece en "Recently used" con push a ALBRA8/CHAT-X, es ese.
2. Comprobar actividad: Settings → Security log, filtrar por token — cualquier push que no reconozcas = investigar.
3. Crear un **fine-grained PAT** nuevo: solo repository access = ALBRA8/CHAT-X, permissions: Contents: Read and write. Caducidad corta (30-90 días).
4. Usarlo solo en el comando puntual (`git push https://<TOKEN>@github.com/ALBRA8/CHAT-X.git main`) sin guardarlo en .git/config ni en el chat; o mejor, `git credential` del sistema operativo.
5. GitHub escanea secretos filtrados automáticamente (push protection): si el token viejo se usara, llegaría alerta por email.

### Evaluación del riesgo (2026-10-29)

- **Por qué es grave**: el token apareció íntegro en el historial del chat. Cualquiera que lea esa sesión podría usarlo. No depende de que el repo lo contenga: el secreto viajó por el canal de conversación, no por git.
- **Por qué el daño es contenido (si se revoca ya)**: el repo de CHAT-X **no tiene remoto configurado** (`git remote -v` vacío — verificado), así que el token no pudo ser usado para push desde este entorno; los 10 clones de engines/ son de solo lectura y nunca se pushean.
- **Ventana de exposición**: desde que se pegó en el chat (2026-10-28) hasta que el fundador lo revoque. Cada hora sin revocar amplía el riesgo de que alguien enumere repos de la cuenta o haga push con contenido malicioso.
- **Acción del fundador (5 min, solo en su navegador)**: revocar el token (paso 1) y revisar el security log (paso 2). Nada de esto requiere el propio token ni el chat.
- **Rotación posterior**: al generar el nuevo fine-grained PAT (pasos 3-4), que caduque en 30-90 días y solo cubra ALBRA8/CHAT-X.

### Comprobación de otras credenciales expuestas (2026-10-29, sin revelar valores)

Herramienta: `bash scripts/escaneo_secretos.sh` (solo imprime archivos/líneas/conteos, nunca el valor).

| Superficie | Resultado |
|---|---|
| Árbol versionado (git grep en HEAD, 15 patrones de alto señal: ghp_/github_pat_/gho_/sk-/AIza/xox/AKIA/PRIVATE KEY/gsk_/npm_/glpat-/hf_…) | **0 coincidencias** |
| Historial completo de git (todos los commits, diffs completos) | **0 secretos reales**; única coincidencia = el propio texto del escaneo documentado en INFORME_PRUEBAS.md (falso positivo documental) |
| Ficheros .env en disco (raíz + engines) | Solo `DATABASE_URL` (rutas de fichero, no secretos). **Ninguna API key guardada en disco** |
| BD (MotorConfig.apiKey) | 0 claves guardadas (crm/nexscope/krea configurados sin apiKey; leads/ultra sin secreto → webhook fail-closed activo) |
| Remotos git | **Ninguno** (push imposible desde este entorno) |
| Clones engines/ | Sin cambios de código fuente: solo lockfiles por `npm install`, directorios runtime sin trackear (.next/, db/) y el `.env` del aislamiento de BD (documentado en MOTORES_REGISTRO.md) |

Conclusión: la única credencial comprometida sigue siendo el PAT del chat, que vive SOLO en el canal de conversación — su revocación es manual y pertenece al fundador.

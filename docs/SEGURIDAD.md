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

### Sincronización del remoto autorizada por el fundador (2026-10-29)

- **Autorización**: el fundador respondió «si a todo» a las tres acciones propuestas (actualizar remoto, rotar token, reconstruir research/). El push estaba prohibido por defecto en la constitución; queda registrado que aquí se ejecutó por instrucción explícita del fundador.
- **Ejecución**: `git push --force-with-lease=refs/heads/main:fa2fffc...` — sobrescribió el snapshot antiguo del remoto (2 commits del 2026-10-28, historia no relacionada, sin ningún archivo exclusivo salvo `.env.example`, ya recuperado en f2939ce) con la línea autoritativa local completa. Verificado post-push: remoto `main = f2939ce` idéntico al local.
- **Higiene del token**: usado solo transitoriamente en la URL del comando (patrón ya documentado arriba); NO configurado como remote persistente (`git remote -v` sigue vacío), NO guardado en `.git/config`, ni en archivos, ni en la BD.
- **Pendiente del fundador**: rotar el PAT en GitHub (apareció íntegro en el chat el 2026-10-28 y se re-usó hoy); el reemplazo recomendado es fine-grained, caducidad 30–90 días, scope solo ALBRA8/CHAT-X.
- **Política vigente**: ningún push futuro sin instrucción explícita del fundador en el chat.

### Push Protection bloqueó el secreto antes de salir (2026-10-29)

- **Qué pasó**: al empujar los commits del día (voz GFE + recuperación), GitHub rechazó el push — «repository rule violations». Causa real: Push Protection detectó el PAT dentro de `scripts/reclonar_engines.sh`, capturado por un auto-commit intermedio del entorno (mensaje UUID). El token fue escrito por el agente en el archivo, violando la propia regla de higiene (transitorio, nunca en archivos).
- **Contención**: historia local reescrita desde `be91025` (reset --soft + re-commit) con el token eliminado de los bytes reales del archivo (ahora exige `RECLONAR_TOKEN` por entorno, efímero); verificación con `git grep` en staged y en HEAD. El PAT nunca llegó al remoto.
- **Lección operativa**: los scrubbers de vista del entorno pueden ocultar el secreto al agente mientras los bytes reales lo conservan — la verificación válida es `git grep` sobre el árbol, no la lectura visual. Push Protection funcionó como última línea: la higiene previa (no escribir el token nunca) sigue siendo la única defensa real.
- **Pendiente vigente**: rotación del PAT por el fundador (apareció íntegro en el chat el 2026-10-28; sigue en el canal aunque el repo está limpio).
- **Pushes de hoy (autorizados por el fundador con «sí a todo»)**: `be91025→0914c56` (recuperación + voz GFE) y `0914c56→0a4cc15` (motor GFE P1.1 + tarjeta P1.2), ambos con `--force-with-lease` anclado al SHA esperado y verificación post-push con `ls-remote`.

### Push fast-forward con PAT nueva del fundador (2026-10-29)

- **Autorización**: el fundador pegó en el chat el mensaje «subelo al repo» seguido de un PAT nueva (la anterior del 2026-10-28 quedó en el canal y su revocación sigue pendiente de su navegador). Push por instrucción explícita — la política de prohibido por defecto se mantiene.
- **Ejecución**: escaneo de secretos previo (`scripts/escaneo_secretos.sh`: 0 coincidencias en árbol versionado e historial completo), lectura del remoto con `ls-remote` (tip `56bb175` — los dos pushes anteriores ya estaban), verificación de linaje con `git merge-base --is-ancestor` (fast-forward puro, sin force ni lease) y `git push` puntual `56bb175..5f6db99` (cerebro LLM del chat). Verificación post-push: remoto `main = 5f6db99` idéntico al local.
- **Higiene del token**: usado solo en la URL del comando (patrón documentado); NO persistido como remote, en `.git/config`, archivos ni BD (`git remote -v` verificado vacío tras el push). La key de Groq del cerebro LLM sigue solo en `.env` (gitignored); al repo subió únicamente el placeholder `gsk_xxx` de `.env.example`.
- **Pendiente vigente del fundador**: revocar el PAT del 2026-10-28 y planificar rotación de esta PAT nueva (también apareció íntegra en el chat).

### Push fast-forward con la misma PAT del fundador (2026-10-29, tarde)

- **Autorización**: el fundador escribió «subelo al repo y continua con (P2.4/2.8), trend-finder, P3». Push por instrucción explícita; la política de prohibido por defecto se mantiene para pushes futuros sin instrucción.
- **Ejecución**: doble escaneo de secretos sobre el rango `5f6db99..HEAD` (filtrado y CRUDO — 0 coincidencias reales; solo `.env.example` con placeholders en el diff, `.env` real gitignored y ausente del diff), `ls-remote` con la PAT inline (tip remoto `5f6db99` = padre exacto del HEAD local) y push fast-forward `5f6db99..0bed6a2` (3 commits: registro de seguridad, cerebro LLM con NVIDIA NIM, mejoras sin bloqueos externos — piper/InstaDump/Outfit Swap). Verificación post-push: remoto `main = 0bed6a2` idéntico al local.
- **Nota de URL**: el primer intento usó el remoto de memoria equivocado (`SuperAgentsAI/chat-x` → «Repository not found»); se corrigió con el registrado en este documento (`ALBRA8/CHAT-X`). El error no expuso nada (la PAT iba inline en ambos).
- **Higiene del token**: solo en la URL del comando puntual; `git remote -v` verificado vacío tras el push; nada escrito en `.git/config`, archivos ni BD.
- **Pendiente vigente del fundador**: revocar el PAT del 2026-10-28 y rotar la actual (ambas aparecieron íntegras en el canal).

### Push fast-forward de la tanda P2.4/2.7/2.8 + P3 (2026-10-29, noche) — registro diferido

- **Aclaración**: este push salió en su momento bajo la misma instrucción del fundador («subelo al repo y continua con (P2.4/2.8), trend-finder, P3»), pero su registro en este documento quedó pendiente; se completa hoy tras la reconfirmación explícita del fundador («Yo autorice esto»).
- **Contenido**: 1 commit `0bed6a2..6018a57` — escalera de vídeo P2.4, URL→brief con blindaje SSRF P2.8, trend-finder honesto P2.7 y motor de monetización MODO_INTERNO (P3.9/10/11/12 pieza mínima).
- **Verificación ejecutada hoy (2026-10-29, noche)**: escaneo de secretos del árbol (`scripts/escaneo_secretos.sh` — sin remotos, engines limpios) y del diff CRUDO del rango `0bed6a2..HEAD` (0 coincidencias de patrones ghp_/gsk_/nvapi_/sk-), `.env` ausente del diff (gitignored), `ls-remote` con la PAT inline: tip remoto `6018a57` **idéntico al HEAD local** — remoto al día, sin nada pendiente de subir. Linaje verificado con `git merge-base --is-ancestor` (fast-forward puro, sin force).
- **Higiene del token**: solo en la URL de los comandos de verificación puntual (`ls-remote`); `git remote -v` sigue vacío, nada en `.git/config`, archivos ni BD.
- **Baseline re-verificado hoy**: lint ✓ · tsc 0 ✓ · unit 144 pass + 1 skip hermético ✓ · API 77/77 (de la tanda del commit, árbol intacto).
- **Pendiente vigente del fundador**: revocar el PAT del 2026-10-28 y rotar la actual.

### Merge + push fast-forward de la línea local sobre la remota (2026-10-30) — registro diferido

- **Instrucción del fundador**: «y cuando termines subelo al repo» + PAT aportada en el chat.
- **Divergencia detectada y resuelta sin destrucción**: el remoto había avanzado a `b63eb0a`
  (línea P1.1–P1.3 + P2.4–P2.8 + P3 + lápida IA HUB, 12 commits) mientras la línea local
  avanzaba con voz clon-local `94e520b`, recon Batch C `a4963a3` y adopciones A2/A3 `20ae1b1`.
  Integración por merge `6f0e54c` con resolución honesta de conflictos (ruta voz en tres
  capas, dedupe de helpers binarios, unión de schema, numeración de referentes unificada).
- **Validación pre-push del árbol fusionado**: lint ✓ · tsc 0 ✓ · unitarias 190 pass + 1 skip ✓ ·
  regresión API 77/77 con server reiniciado sobre el código fusionado ✓.
- **Push**: fast-forward `b63eb0a..6f0e54c` vía `scripts/subir_repo.sh` (sin remote persistente,
  sin --force); verificación `ls-remote`: tip remoto `6f0e54c` idéntico al HEAD local.
- **Higiene del token**: viajó SOLO por variable de entorno del comando puntual; nada escrito
  en disco, `.git/config`, remotos ni BD.
- **Pendiente URGENTE del fundador**: la PAT aportada hoy en el chat queda EXPUSTA en el
  historial del canal — ROTAR inmediatamente tras este push y revocar la anterior (2026-10-28,
  sigue pendiente). Regla reafirmada: los tokens al chat mueren; cada aparición = rotación.

### Push de sincronización 6f0e54c→7a810b5 (2026-10-30) — registro diferido

- **Contenido subido**: `bbee7d0` (registro de seguridad del push anterior), `905f402`
  (chore ux: ocultar indicador dev de Next.js a petición del fundador) y `7a810b5`
  (directriz del embudo multicanal: CRM-ALBRA + WHATSPOWER + ULTRA como una sola
  máquina de calentamiento modo novia; matriz Meta/WA calientan SFW, Telegram/Fanvue cobran).
- **Nueva PAT aportada en el chat** tras la anterior dejar de funcionar (rotate o revocación
  del fundador — confirmado en operación: push con la PAT vieja → «Invalid username or token»,
  ls-remote anónimo de repo público seguía funcionando; coherente con la rotación).
- **Push**: fast-forward `6f0e54c..7a810b5` vía `scripts/subir_repo.sh` (sin remote persistente,
  sin --force, token SOLO en variable de entorno del comando puntual); verificación `ls-remote`:
  tip remoto `7a810b5` idéntico al HEAD local.
- **Pendiente URGENTE del fundador**: esta segunda PAT TAMBIÉN quedó expuesta en el historial
  del canal — ROTAR inmediatamente. Regla reafirmada: los tokens al chat mueren; cada
  aparición = rotación. Futura alternativa: token por canal privado o fine-grained PAT de
  vida corta solo para `contents:write` de ALBRA8/CHAT-X.

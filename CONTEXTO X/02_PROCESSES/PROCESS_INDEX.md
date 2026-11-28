# PROCESS_INDEX — procesos operativos
Cómo se hacen las cosas en la casa. Cada proceso tiene script o procedimiento documentado.

| Proceso | Documento / Script | Estado | Propósito |
|---|---|---|---|
| Desbloqueo de GPU local | `MOTOR_GPU.md` + `scripts/benchmark_gpu.sh` + `scripts/detectar_gpu.sh` | VERIFIED | instalar ComfyUI en la máquina del fundador; carril NSFW sin filtro (D-002) |
| Activación de WhatsApp | `WHATSAPP_QR_ACTIVACION.md` | VERIFIED (doc) | §0 daemon PROPIO del negocio (F1, `daemon/whatsapp/`) · secciones 1-6 históricas del daemon viejo de CRM-ALBRA |
| Daemon WhatsApp del negocio (F1) | `F1_DAEMON_WHATSAPP.md` + `src/lib/whatsapp/{pacing,sesion,conversacion,iniciativas,daemon}.ts` + `daemon/whatsapp/` | W1-W5 EJECUTADOS (S-012→S-016) | pacing anti-ban (18 tests) + sesión propia cifrada con QR/rotación honesta (14 tests) + bucle de conversación del lado CHAT-X (36 tests) + iniciativas programadas 1:1 y vista Canal (27 tests) + **código del daemon REAL** (módulo puro 25 tests + runner `daemon/whatsapp/index.ts` con librería open-source $0, fail-closed desde el arranque, reintentos con tope, reporte VERDADERO de envíos); BD propia del carril adulto — sala limpia, D-007; **solo espera la máquina del fundador + QR** |
| Cuarto Telegram del negocio (F3) | `EMBUDO_MULTICANAL.md` §7 + `src/lib/telegram/telegram.ts` + `src/app/api/telegram/*` + `CanalTelegramView` | LADO CHAT-X EJECUTADO (S-016) | bot propio $0: sesión honesta por identidad pública firmada (el token SOLO en la máquina del fundador), webhook fail-closed (cerrojo compartido `src/lib/canales.ts`), BD propia `TelegramMensaje` idempotente, mismo cerebro/pacing/filtro que WhatsApp, iniciativas 1:1, panel; 21 tests + smoke F3 TODO OK; el cobro 18+ espera verificación de términos (NORTE §2) |
| Mesa Meta FB/IG (F4, manual-first) | `EMBUDO_MULTICANAL.md` §7 + `src/lib/meta/mesa.ts` + `src/app/api/meta/mesa` + `MesaMetaView` | EJECUTADO (S-016) | cero automatización ToS-violadora: operador pega la entrada → cerebro escribe el borrador (filtros de la casa) → envío MANUAL desde la app de Meta; estados honestos (borrador→usado/descartado, historia no se re-estructura), compliance `mensajes_meta`; 14 tests + smoke F4 TODO OK (cazó y corrigió un bug real del patrón de edad) |
| Mudanza de repos a musestudio8 | `scripts/mudar_casa_nueva.sh` | EJECUTADA 31-oct | espejo completo con historia, sin --force, verificación SHA a SHA |
| Push autorizado | `scripts/subir_repo.sh` | VIGENTE | `GITHUB_TOKEN=<PAT> bash scripts/subir_repo.sh musestudio8/CHAT-X main` — token solo por env, fast-forward only |
| Re-clonado de un brazo dañado | `scripts/reclonar_engines.sh` | VIGENTE | repara UNA carpeta de engines/ a su commit fijado sin tocar el resto |
| Validación consolidada | `scripts/validacion_consolidacion.sh` | VERIFIED fase b5b210c | suite API + idempotencia + gate humano + aislamiento BD en una corrida |
| Sondeo de motores | `scripts/sonda_profunda.ts` | VIGENTE | taxonomía de 5 estados por capas; evidencia a `../04_AUDITS/evidencia/` |
| Escaneo de secretos | `scripts/escaneo_secretos.sh` | VIGENTE | 0 secretos en árbol e historial; correr antes de cada push |
| Revocación de PAT | `../00_MASTER/SEGURIDAD.md` § Revocación | PROCEDIMIENTO | 5 min en el navegador del fundador; única exposición conocida del 31-oct |

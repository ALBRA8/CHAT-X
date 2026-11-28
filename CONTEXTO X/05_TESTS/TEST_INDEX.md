# TEST_INDEX — pruebas
Alcance real, no humo. Los conteos se citan "reportados" de su fase hasta re-ejecutarlos.

| Prueba | Documento / Comando | Resultado reportado | Alcance |
|---|---|---|---|
| Informe de la fase b5b210c (validación profunda) | `INFORME_PRUEBAS.md` | API 33 PASS · unitarias 46 PASS · 0 FAIL | E2E: idempotencia, gate humano (0 envíos), recuperación de zombis, aislamiento BD por md5, cerrojos WhatsApp |
| Suite unitaria actual | `bun test test/unit/` | **400 PASS / 5 skip / 0 FAIL (S-017)** — los 4 piper-local que asumen paquete se SALTAN con causa si el entorno no tiene piper (regla de entrega F0) · tsc 0 · eslint 0/0 | nucleo, chat-gfe, comfyui-adaptador, saneo, video-escalera, monetizacion, provider-localcpu, qa-forense, voz (piper honesto), youtube-estado, idempotencia, flujos-brief, llm-proveedor, instadump, trends, herramientas, cola, enhance, whatsapp-{pacing,sesion,conversacion,iniciativas,daemon}, telegram-canal, meta-mesa, **baileys-lib** (librería real sin red), **middleware-webhooks** (tabla de decisión cookie vs HMAC) |
| Smokes en vivo de los cuartos propios | `bun scripts/smoke_{w3,w4,f3,f4}.ts` | **TODO OK los 4 (S-016)** — contra la API real con limpieza explícita y ledgers intactos | bucle WhatsApp (firmas, fail-closed, idempotencia, disyuntor en vivo), cuarto Telegram, mesa Meta manual-first |
| Suite API | `bash scripts/pruebas_api.sh` | 33 PASS (fase b5b210c) | contratos REST de la torre |
| Validación consolidada | `bash scripts/validacion_consolidacion.sh` | fase b5b210c | corre todo en secuencia con evidencia |

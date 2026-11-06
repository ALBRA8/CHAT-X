# TEST_INDEX — pruebas
Alcance real, no humo. Los conteos se citan "reportados" de su fase hasta re-ejecutarlos.

| Prueba | Documento / Comando | Resultado reportado | Alcance |
|---|---|---|---|
| Informe de la fase b5b210c (validación profunda) | `INFORME_PRUEBAS.md` | API 33 PASS · unitarias 46 PASS · 0 FAIL | E2E: idempotencia, gate humano (0 envíos), recuperación de zombis, aislamiento BD por md5, cerrojos WhatsApp |
| Suite unitaria actual | `bun test test/unit/` | 46 PASS (fase b5b210c) | nucleo, chat-gfe, comfyui-adaptador, saneo, video-escalera, monetizacion, provider-localcpu, qa-forense, voz, youtube-estado, idempotencia, flujos-brief, llm-proveedor, instadump, trends |
| Suite API | `bash scripts/pruebas_api.sh` | 33 PASS (fase b5b210c) | contratos REST de la torre |
| Validación consolidada | `bash scripts/validacion_consolidacion.sh` | fase b5b210c | corre todo en secuencia con evidencia |

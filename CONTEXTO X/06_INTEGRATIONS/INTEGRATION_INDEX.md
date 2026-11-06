# INTEGRATION_INDEX — integraciones
Regla de honestidad: solo se lista lo que CHAT-X invoca por contrato real.

| Integración | Contrato | Estado | Nota |
|---|---|---|---|
| Motor YT (YOUTUBE-AUTOMATION) | 7 contratos HTTP (`manifest`, `execute`, `validate`, `projects`, `production_json/contrato`, `mcp` JSON-RPC 25 tools, `jobs/{id}/events` SSE) | IMPLEMENTADO en el motor; NO_INVOCABLE desde sandbox (corre en la máquina del fundador) | arranque seguro: `YOUTUBE_AUTOMATION_ARRANQUE_LOCAL.md` |
| WHATSPOWER (:3003) | webhook firmado + contratos de flujo | OPERATIVO (sonda 29-oct) | canal que calienta; cerrojos 401/503 probados |
| WHATSPOWER-ULTRA (:3004) | contratos de difusión/spintax | OPERATIVO (sonda 29-oct) | anti-ban step-driven, apagado por diseño |
| CRM-ALBRA (:3100) | API m2m de escritura | DEGRADADO — falta API key | por enmienda D-007 NO recibe registros del negocio 18+ |
| Proveedores de generación del Estudio | `src/lib/provider/` (comfyui, localcpu, voz) | OPERATIVO en CPU real; ComfyUI activable | GPU local = carril NSFW; API cloud descartada por ToS |
| Gemini / Google Flow | — | **NO es integración de CHAT-X** | capacidad interna del motor YT (H-004); jamás NSFW (D-002) |
| RunningHub | — | CANDIDATO (no integrado) | técnicamente posible para NSFW; ToS SIN VERIFICAR — probar barato antes de pagar (D-002) |
| Fanvue | export con etiqueta IA | OPERATIVO (export) | etiqueta IA obligatoria; ancla del cobro |

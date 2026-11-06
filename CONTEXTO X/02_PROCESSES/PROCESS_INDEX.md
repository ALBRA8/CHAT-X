# PROCESS_INDEX — procesos operativos
Cómo se hacen las cosas en la casa. Cada proceso tiene script o procedimiento documentado.

| Proceso | Documento / Script | Estado | Propósito |
|---|---|---|---|
| Desbloqueo de GPU local | `MOTOR_GPU.md` + `scripts/benchmark_gpu.sh` + `scripts/detectar_gpu.sh` | VERIFIED | instalar ComfyUI en la máquina del fundador; carril NSFW sin filtro (D-002) |
| Activación de WhatsApp | `WHATSAPP_QR_ACTIVACION.md` | VERIFIED (doc) | QR, destinatario consentido, logout/rotación — base del canal que calienta |
| Mudanza de repos a musestudio8 | `scripts/mudar_casa_nueva.sh` | EJECUTADA 31-oct | espejo completo con historia, sin --force, verificación SHA a SHA |
| Push autorizado | `scripts/subir_repo.sh` | VIGENTE | `GITHUB_TOKEN=<PAT> bash scripts/subir_repo.sh musestudio8/CHAT-X main` — token solo por env, fast-forward only |
| Re-clonado de un brazo dañado | `scripts/reclonar_engines.sh` | VIGENTE | repara UNA carpeta de engines/ a su commit fijado sin tocar el resto |
| Validación consolidada | `scripts/validacion_consolidacion.sh` | VERIFIED fase b5b210c | suite API + idempotencia + gate humano + aislamiento BD en una corrida |
| Sondeo de motores | `scripts/sonda_profunda.ts` | VIGENTE | taxonomía de 5 estados por capas; evidencia a `../04_AUDITS/evidencia/` |
| Escaneo de secretos | `scripts/escaneo_secretos.sh` | VIGENTE | 0 secretos en árbol e historial; correr antes de cada push |
| Revocación de PAT | `../00_MASTER/SEGURIDAD.md` § Revocación | PROCEDIMIENTO | 5 min en el navegador del fundador; única exposición conocida del 31-oct |

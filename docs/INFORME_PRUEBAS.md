# Informe de pruebas (sección 7 de la orden maestra) — actualizado 2026-10-29

Herramienta: `scripts/pruebas_api.sh` (peticiones HTTP reales contra el servidor local) + `bun test test/unit/` (unitarias del núcleo) + verificación E2E con navegador (agent-browser).

**Resultado 2026-10-29: 33 PASS · 0 FAIL · 0 SKIP (API) + 18 PASS · 0 FAIL (unitarias) + 0 errores de página/consola (E2E navegador).**

Reproducción:
```bash
bun install && bunx prisma db push && bun run dev        # terminal 1
bash scripts/pruebas_api.sh                              # terminal 2 — 33 checks
bun test test/unit/                                      # unitarias — 18 checks
# benchmark GPU (solo con ComfyUI corriendo): bash scripts/benchmark_gpu.sh
```

## Añadido en esta sesión (2026-10-29) — verificado con evidencia

1. **Motores 9-10 (AGENTE-KREA, COMUNITI-MANAGER)**: sondas honestas PASS en el suite; UI de Operaciones los renderiza con estado real (captura e2e-01-ops.png).
2. **Límite diario de consumo (consumption cap)**: PATCH /api/settings limiteDiario=883 con gastoHoy=882 → lote de 8 cr RECHAZADO con mensaje del techo; techo 5000 → mismo lote ACEPTADO (job real creado). Contador conservador: reembolsos no liberan el contador del día.
3. **Auth admin opcional (fail-closed cuando se activa)**:
   - Con `ADMIN_PASSWORD`: POST sin cookie → 401 · cookie falsa → 401 · login mal → 401 · login bien → cookie httpOnly + POST autenticado pasa (llega al handler) · GET de lectura libre por diseño.
   - Sin `ADMIN_PASSWORD`: login → **503 honesto** ("auth no activada") y la plataforma queda en modo operador único.
4. **Plantilla E2E "Plan → Estudio → Calendario"**: ejecutada por API (suite) y por UI → gate humano → aprobada → **completada**; el Set real de Valentina quedó programado a +2 días y aparece en el CSV del calendario (fila 2026-10-30T19:00Z, fecha_propuesta=no).
5. **Plantilla "Leads → CRM → WhatsApp autorizado"**: sembrada y disponible; crea cliente en CRM real (omitido con aviso si el CRM no corre), exige autorización humana explícita ANTES de cualquier contacto y solo entonces pasa un paso real de campaña ULTRA (su guard anti-ban decide). Nada se envía sin tu sí.
6. ** Nuevos pasos del orquestador**: `programar_publicacion` (Set real → calendario ICS/CSV) y `ultra_step` (contrato real de ULTRA) — con whitelist actualizada y unit tests.
7. **Unitarias bun:test (18)**: crypto (scrypt, wrap/deswrap clave maestra, AES-256-GCM roundtrip + clave errónea = null), filtro de edad aparente, composición de prompt con procedencia, whitelist del orquestador, determinismo de semillas.
8. **Correcciones de calidad**: 5 errores de TypeScript en src/ (verde: `tsc --noEmit` sin errores en src/) · duplicado en pruebas_api.sh · tsconfig excluye clones/plantillas del entorno.
9. **Benchmark GPU reproducible**: `scripts/benchmark_gpu.sh` (SDXL semilla fija, N corridas, $/imagen a tarifa dada). En sandbox sin ComfyUI → **SKIP honesto exit 2** (no simula números). Evaluación completa: docs/EVALUACION_GPU.md.


## Ejecutadas y aprobadas (27)

**Datos base (5):** GET /api · characters · jobs · compliance · kpi → 200 con datos reales.

**Motores (9):** registro completo + sondas honestas de youtube, crm, whatspower, ultra, nexscope, leads, agentegeneral, cazador → 200; estados INALCANZABLE reales (ningún motor corre en el sandbox: correcto, no se simula disponibilidad).

**Seguridad (3):** PUT motores rechaza URL no-http (400) · rechaza user:pass@ en URL (400) · webhook leads fail-closed sin credencial (rechaza).

**Orquestador (7):** GET /api/flujos (siembra demo) · rechazo de paso con tipo no permitido (422) · rechazo de nombre corto (422) · ejecutar → 202 · estado válido · **gate humano: esperando_aprobacion → aprobar → completada** (con lote real del Estudio encolado y procesado por el worker) · cancelación disponible.

**Sistema y publicación (3):** /api/sistema (GPU honesta: none en sandbox, proveedor simulador, cola real 19 listos) · calendario ICS válido · calendario CSV válido.

**UI (1):** GET / shell 200.

**E2E navegador (agent-browser):** shell con 7 módulos y 8 motores renderizados sin errores de página · módulo Automatización: botón Ejecutar → gate de aprobación visible con nota → "Aprobar y continuar" → estado **completada** en UI (captura: work-assets/e2e-flujo-completada.png) · tarjeta GPU en Ops · botones ICS/CSV en UGC.

## Simuladas / omitidas (marcadas como tales)

- Las pruebas de sonda NO validan conexión real a los motores (no corren en el sandbox): validan que CHAT-X los sondea y reporta honesto.
- El lote del Estudio usó el proveedor simulador (sin GPU aquí): la lógica de cola/QA/créditos es real, los píxeles no.
- No se enviaron campañas ni mensajes reales (regla del prompt maestro: nada a personas sin autorización).

## Bloqueadas (requieren intervención del fundador)

- Producción audiovisual E2E real con GPU → máquina del fundador (docs/MOTOR_GPU.md).
- Producción de video vía Google Flow → requiere Chrome con sesión Google + FFmpeg en la máquina del fundador (motor YT).
- Envío real de WhatsApp/campañas → requiere daemon Baileys con sesión QR y piloto confirmado (ULTRA).
- LLM de agentes (AGENTE-GENERAL ejecución real) → requiere API key del proveedor LLM y arranque del servicio.

## Bugs encontrados y corregidos durante las pruebas

1. Dev server con Prisma client viejo tras db:push → reinicio del servidor (cache global).
2. Receptor de webhooks validaba el evento ANTES de la credencial → reordenado fail-closed (auth primero, 503 sin secreto).
3. Script de pruebas: funciones no exportadas a subshells → `export -f` y grep sin cerrar corregidos.

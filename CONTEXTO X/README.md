# CONTEXTO X
## Memoria documental de continuidad de CHAT-X
**Estado:** POPULATED BASELINE — IN_PROGRESS
**Última actualización:** 2026-11-07
**Propósito:** conservar decisiones del fundador, auditorías, hallazgos, pruebas, integraciones, fallos, sesiones y conocimiento necesario para continuar el proyecto sin repetir investigaciones y sin perderse.

Adaptado del principio de orden de `CONTEXTO YOUTUBE` (ALBRA8/YOUTUBE-AUTOMATION): una sola puerta de entrada, carpetas numeradas por tipo de conocimiento, cada documento con estado y propósito declarados.

## Naturaleza de esta memoria
Esta carpeta es Markdown versionado + índices. No es base de datos vectorial ni tiene búsqueda semántica. La BD operativa vive en Prisma/SQLite (`prisma/schema.prisma`); no confundir ambos sistemas.

## Regla de fuente de verdad
- **Código + tests + evidencia de ejecución** son la fuente de verdad técnica.
- `00_MASTER/PROJECT_STATE.md` es el estado vivo; `00_MASTER/ESTADO_ACTUAL.md` es la foto congelada de la fase b5b210c (2026-10-29) — no confundirlos.
- `01_DECISIONS/DECISION_LOG.md` es la ley del fundador: nada contradice una directriz vigente.
- No elevar PROPOSED/PLANNED/NOT_DEMONSTRATED a VERIFIED sin evidencia.
- Los estados de motores se copian "reportados" del último sondeo real hasta re-ejecutarlo.

## Estructura
```text
CONTEXTO X/
├── README.md  INDEX.md
├── 00_MASTER/        (PROJECT_STATE, ARCHITECTURE, EMBUDO_MULTICANAL, ESTADO_ACTUAL [fase], MOTORES_REGISTRO, SEGURIDAD, FICHA_Estudio_v1, GLOSSARY)
├── 01_DECISIONS/     (DECISION_LOG — directrices del fundador)
├── 02_PROCESSES/     (MOTOR_GPU, WHATSAPP_QR_ACTIVACION)
├── 03_FINDINGS/      (CLONAKIT_BRECHAS)
├── 04_AUDITS/        (EVALUACION_GPU, evidencia/sonda_profunda.json)
├── 05_TESTS/         (INFORME_PRUEBAS)
├── 06_INTEGRATIONS/  (YOUTUBE_AUTOMATION_ARRANQUE_LOCAL)
├── 07_FAILURES/      (fallos registrados con su lección)
├── 08_SESSIONS/      (bitácora de sesiones de trabajo)
└── 09_KNOWLEDGE/     (CLONES_LICENCIAS, EMBAUDO)
```

## Cómo mantenerla
Después de cada auditoría, prueba, integración, fallo o cambio importante:
1. Actualizar `00_MASTER/PROJECT_STATE.md` si cambia fase/bloqueadores/próximo hito.
2. Registrar toda directriz del fundador en `01_DECISIONS/DECISION_LOG.md` (una fila, con fecha y consecuencia).
3. Añadir hallazgos en `03_FINDINGS/`, auditorías en `04_AUDITS/`, pruebas con su alcance real en `05_TESTS/`.
4. Registrar fallos con su lección en `07_FAILURES/` — un fallo sin lección se repite.
5. Cerrar cada sesión de trabajo con una fila en `08_SESSIONS/`.
6. Actualizar `INDEX.md` para que ningún documento útil quede invisible.
7. Citar commits, archivos y resultados cuando existan.
8. **No registrar secretos, cookies, tokens ni credenciales** (regla `00_MASTER/SEGURIDAD.md`).

## Documento nuevo: ¿dónde nace?
Todo documento nuevo nace DENTRO de la carpeta numerada que corresponda y se registra en `INDEX.md` el mismo día. Prohibido crear carpetas de documentos fuera de esta estructura.

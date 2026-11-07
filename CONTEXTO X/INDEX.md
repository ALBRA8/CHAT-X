# INDEX — CONTEXTO X (CHAT-X)
**Estado del proyecto:** OPERATIVO EN EXILIO TEMPORAL / IN_PROGRESS — musestudio8 BLOQUEADA por GitHub (2026-11-07); torre viva de respaldo `ALBRA8/CHAT-X` (D-012)
**Última actualización:** 2026-11-07

## Tabla maestra

| Área | Archivo | Estado | Propósito |
|---|---|---|---|
| Master | `00_MASTER/PROJECT_STATE.md` | IN_PROGRESS | estado vivo: fase actual, bloqueadores, próximo hito |
| Master | `00_MASTER/ARQUITECTURA.md` | VERIFIED | torre de control, contratos HTTP, aislamiento de motores |
| Master | `00_MASTER/NORTE_PROYECTO.md` | VIGENTE | qué es CHAT-X, qué queremos lograr, qué NO es — la brújula (D-013) |
| Master | `00_MASTER/PORTABILIDAD_REPOS.md` | VIGENTE | triage de los 24 repos de ALBRA8 (llevar/subcontratar/no aplica) + plan de la vuelta (D-013) |
| Master | `00_MASTER/EMBUDO_MULTICANAL.md` | VIGENTE | directriz del fundador: embudo multicanal + CASA PROPIA (§7) + mudanza musestudio8 (§8) + exilio (07-nov) |
| Master | `00_MASTER/ESTADO_ACTUAL.md` | SNAPSHOT fase b5b210c | foto congelada 2026-10-29: motores por sonda, implementado vs pendiente |
| Master | `00_MASTER/MOTORES_REGISTRO.md` | POPULATED | registro de los 10 motores: commits fijados, puertos, BD, contratos |
| Master | `00_MASTER/SEGURIDAD.md` | VIGENTE | higiene de tokens, push solo fast-forward, protocolo de revocación |
| Master | `00_MASTER/FICHA_Estudio_v1.md` | VERIFIED | especificación de sala limpia del Estudio (origen de todo el código E1-E7) |
| Master | `00_MASTER/GLOSSARY.md` | POPULATED | glosario del proyecto: qué significa cada término de la casa |
| Decisions | `01_DECISIONS/DECISION_LOG.md` | POPULATED | TODAS las directrices del fundador en orden (D-001 → D-011) |
| Processes | `02_PROCESSES/MOTOR_GPU.md` | VERIFIED | desbloqueo exacto de GPU local (ComfyUI) para el carril sin filtro |
| Processes | `02_PROCESSES/WHATSAPP_QR_ACTIVACION.md` | VERIFIED (doc) | activación de WhatsApp: QR, destinatario consentido, rotación |
| Processes | `02_PROCESSES/PROCESS_INDEX.md` | POPULATED | índice de procesos operativos + scripts que los ejecutan |
| Findings | `03_FINDINGS/CLONAKIT_BRECHAS.md` | POPULATED | brechas vs referentes del mercado; qué ya nos distingue |
| Findings | `03_FINDINGS/FINDINGS_INDEX.md` | POPULATED | índice de hallazgos |
| Audits | `04_AUDITS/EVALUACION_GPU.md` | VERIFIED | CPU medido vs GPU local vs cloud; por qué la API quedó descartada |
| Audits | `04_AUDITS/evidencia/sonda_profunda.json` | EVIDENCE | salida real de la sonda por capas (5 estados) de los 10 motores |
| Audits | `04_AUDITS/AUDIT_INDEX.md` | POPULATED | índice de auditorías |
| Tests | `05_TESTS/INFORME_PRUEBAS.md` | VERIFIED fase b5b210c | suite API 33 PASS · unitarias 46 PASS, alcance real de cada prueba |
| Tests | `05_TESTS/TEST_INDEX.md` | POPULATED | índice de pruebas + cómo correrlas hoy |
| Integrations | `06_INTEGRATIONS/YOUTUBE_AUTOMATION_ARRANQUE_LOCAL.md` | VERIFIED (doc) | arranque local del motor YT en la máquina del fundador (modo seguro) |
| Integrations | `06_INTEGRATIONS/INTEGRATION_INDEX.md` | POPULATED | integraciones reales vs capacidades internas de motores |
| Failures | `07_FAILURES/FAILURE_INDEX.md` | POPULATED | fallos registrados con su lección (PAT, BD compartida, engines/, etc.) |
| Sessions | `08_SESSIONS/SESSION_INDEX.md` | POPULATED | bitácora: qué pasó en cada sesión de trabajo |
| Knowledge | `09_KNOWLEDGE/CLONES_LICENCIAS.md` | VIGENTE | procedencia y licencias de los clones; reglas de uso |
| Knowledge | `09_KNOWLEDGE/EMBAUDO.md` | DOCUMENTADO | funnel FE + 8 OTOs mapeados a módulos REALES (producto) |
| Knowledge | `09_KNOWLEDGE/KNOWLEDGE_INDEX.md` | POPULATED | índice de conocimiento base + matriz de canales |

## Anclas que nunca se mueven
- **NCII:** jamás rostros ni voces de personas reales. Personajes 100% sintéticos.
- **Etiqueta IA** obligatoria en todo el contenido generado.
- **$0** mientras el fundador no autorice gasto.
- **Push solo con orden explícita** del fundador; token solo por variable de entorno.
- **Los 10 clones jamás procesan el negocio 18+** (enmienda CASA PROPIA, `EMBUDO_MULTICANAL.md` §7).

# AUDIT_INDEX — auditorías
| Auditoría | Documento / Evidencia | Estado | Alcance real |
|---|---|---|---|
| Evaluación de GPU (CPU medido vs GPU local vs RunPod vs API) | `EVALUACION_GPU.md` | VERIFIED | API cerrada descartada para 18+ por ToS; CPU lento pero real; GPU local es la vía del carril NSFW |
| Sonda profunda de motores (5 capas, taxonomía 5 estados) | `evidencia/sonda_profunda.json` + `../00_MASTER/MOTORES_REGISTRO.md` | EVIDENCE 2026-10-29 | 10 motores: 4 OPERATIVOS, 2 DEGRADADOS (causa exacta), 2 NO_DISPONIBLES (máquina del fundador), 2 NO_CONFIGURADOS. 0 ERROR. No re-sondeado desde entonces |
| Verificación de mudanza musestudio8 | `../00_MASTER/EMBUDO_MULTICANAL.md` §8 | VERIFICADA 31-oct | 4 repos: SHA a SHA, sin --force; CRM solo difiere en refs/pull internas de GitHub (no es contenido) |

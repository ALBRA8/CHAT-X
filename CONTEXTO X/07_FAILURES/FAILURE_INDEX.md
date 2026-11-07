# FAILURE_INDEX — fallos y su lección
Un fallo sin lección se repite. Ninguno de estos se esconde.

| ID | Fallo | Qué pasó | Lección / cerrojo | Estado |
|---|---|---|---|---|
| F-001 | PAT de GitHub expuesto en chat | PATs viajados por el canal de chat: 29-oct, 31-oct (mudanza) y 07-nov (exilio a ALBRA8, D-012) | Revocación en el navegador del fundador (`../00_MASTER/SEGURIDAD.md` § Revocación); el token SOLO por variable de entorno; usar una vez y revocar al confirmar | **REVOCACIÓN PENDIENTE del fundador (2 tokens)** |
| F-002 | BD compartida entre motores (incidente 2026-10-28) | Un motor tocó datos que no eran suyos | Aislamiento absoluto: cada motor arranca con SU `DATABASE_URL` absoluta propia; verificación por md5 en la validación consolidada | CERROJO VIGENTE |
| F-003 | `engines/` no sobrevive al reciclaje del sandbox | Los clones se pierden al reciclar el entorno | Por diseño está gitignoreado; se reconstruye brazo a brazo con `scripts/reclonar_engines.sh` | RESUELTO (procedimiento) |
| F-004 | NEX-SCOPE murió en silencio al cerrarse el shell del sandbox | El primer re-arranque murió sin error visible (dmesg limpio) | Procedimiento de doble fork `( … & )` documentado y validado | RESUELTO |
| F-005 | Falsos 404 en sondeos (leads, comuniti) | Un long-polling sin HTTP y una colisión de puerto se reportaban como caídos | Taxonomía honesta de 5 estados: NO_CONFIGURADO es distinto de ERROR; jamás operativo por un simple 200 | RESUELTO |
| F-006 | 2 commits de CHAT-X vivieron solo en el sandbox | `5c32c30` y `9dcfa08` no estaban en ALBRA8; el reciclaje los habría borrado | Detectado en la mudanza: CHAT-X salió de la copia local viva, no del espejo. Lección: empujar pronto (con orden explícita) los cambios confirmados | RESUELTO 31-oct |
| F-007 | musestudio8 BLOQUEADA por GitHub (2026-11-07) | La casa nueva recibió demasiada actividad de golpe en una cuenta recién creada ("mucha información de trancazo") y GitHub la suspendió | Calentar cuentas nuevas de a poco: actividad y repos graduales. El daño quedó contenido porque F-006 ya nos tenía empujando pronto: cero commits perdidos, exilio ordenado a ALBRA8/CHAT-X (D-012) | ESPERANDO DESBLOQUEO |

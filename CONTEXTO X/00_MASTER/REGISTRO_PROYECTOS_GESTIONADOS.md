# REGISTRO DE PROYECTOS GESTIONADOS POR CONTEXTO X

**Fecha:** 2026-11-07  
**Estado:** VIGENTE · ALCANCE INICIAL DEFINIDO POR EL FUNDADOR  
**Ámbito:** gobierno documental, trazabilidad, coordinación y seguimiento; no implica por sí solo migración de código ni despliegue.

## 1. Propósito

CONTEXTO X es la memoria de gobierno del conjunto de proyectos que participan en la operación de MUSE y CHAT-X. Debe permitir entender qué hace cada proyecto, qué repositorio lo contiene, cómo se relaciona con los demás, quién depende de quién, qué decisiones lo afectan, cuál es su estado comprobado y qué queda pendiente.

CONTEXTO X aprovecha la infraestructura documental heredada de YouTube Automation (índices, decisiones, procesos, hallazgos, auditorías, pruebas, integraciones, fallos, sesiones y conocimiento). Esa infraestructura es el método de memoria; no convierte a los proyectos registrados en partes de YouTube Automation.

## 2. Alcance inicial confirmado

El fundador definió inicialmente estos cinco proyectos/repositorios para seguimiento dentro de CONTEXTO X:

| Proyecto | Repositorio conocido | Responsabilidad que se documenta | Relación prevista |
|---|---|---|---|
| CRM | `CRM-ALBRA` | Memoria comercial, contactos, oportunidades y seguimiento del embudo | Capa de gestión comercial; respetar CASA PROPIA y la separación SFW/18+ |
| YouTube Automation | `YOUTUBE-AUTOMATION` | Producción y operación de vídeo para YouTube, carril SFW | Subsistema/proyecto de vídeo; documentar contratos, estado y límites |
| Agente Leads | `AGENTE-LEADS` | Prospección y captación de leads B2B mediante sus flujos y APIs autorizadas | Captación; documentar entradas, salidas y contrato con otros agentes |
| Agente Chismoso | `AGENTE-CHISMOSO` | Inteligencia de señales, tendencias y oportunidades con scoring | Investigación/radar; puede alimentar a Leads según el contrato documentado |
| Nexscope | `NEX-SCOPE` | Investigación y análisis de nichos rentables de YouTube/SFW | Investigación de nichos y oportunidades de contenido |

**CHAT-X** es la plataforma central y repositorio que aloja CONTEXTO X; no se cuenta como uno de los cinco proyectos satélite, pero su arquitectura, módulos, decisiones y estado son parte esencial de esta memoria.

## 3. Qué significa “gestionar” desde CONTEXTO X

Para cada proyecto incluido, CONTEXTO X debe mantener, según aplique:

1. Identificación del repositorio, propósito y responsable/propietario conocido.
2. Resumen funcional y límites de alcance.
3. Arquitectura, módulos, tecnologías y contratos relevantes, respaldados por evidencia.
4. Dependencias y relaciones con los otros proyectos.
5. Decisiones, cambios de alcance y razones.
6. Estado real, con fecha y evidencia: IMPLEMENTADO, INVOCABLE, OPERATIVO, DEGRADADO, NO_CONFIGURADO, NO_DISPONIBLE, ERROR o POR_VERIFICAR.
7. Procesos, integraciones, auditorías, pruebas, fallos y lecciones.
8. Riesgos, permisos, seguridad, costes y próximos hitos.
9. Historial de cambios y enlaces a la documentación específica del proyecto.

No es obligatorio duplicar todos los documentos de cada repositorio. CONTEXTO X debe conservar el mapa, el resumen y las referencias necesarias para navegar la fuente correspondiente.

## 4. Límites: documentación no equivale a migración ni ejecución

La inclusión de un proyecto en este registro significa que CONTEXTO X lo documenta y le da seguimiento. **No autoriza ni implica**:

- copiar, transferir, fusionar o cambiar de propietario a su repositorio;
- incorporar su código al repositorio CHAT-X;
- desplegarlo, iniciarlo o conectarlo a servicios;
- compartir credenciales, sesiones, bases de datos o contenido;
- habilitar gastos, publicar, enviar mensajes o ejecutar acciones externas.

La ubicación física, portabilidad y forma de consumo de cada proyecto se rigen por las decisiones vigentes y por `00_MASTER/PORTABILIDAD_REPOS.md`. Si hay diferencia entre el alcance documental aquí registrado y el carril de portabilidad, no se deben confundir: este archivo define qué proyectos debe conocer y seguir CONTEXTO X; el plan de portabilidad define dónde vive cada código y cómo se mueve, si se autoriza.

En particular, la clasificación actual de YOUTUBE-AUTOMATION como SUBCONTRATAR “por ahora” en PORTABILIDAD_REPOS no lo excluye de la memoria: debe quedar documentado y monitoreado como proyecto gestionado.

## 5. Reglas transversales

- CHAT-X es la plataforma privada que opera MUSE; MUSE es el negocio.
- CASA PROPIA (D-007) prevalece: los repositorios o motores externos no procesan el negocio adulto ni reciben sus datos, sesiones o contenido.
- Los proyectos de investigación, prospección, CRM y YouTube deben operar dentro de sus permisos, políticas y contratos aplicables.
- Separar datos y flujos SFW de cualquier operación privada 18+; no asumir que un proyecto externo está autorizado para manejar información sensible.
- No registrar credenciales, tokens, cookies, secretos ni datos personales innecesarios en la memoria.
- No declarar un proyecto operativo solo porque exista código o un README; exigir evidencia fechada.
- No alterar repositorios, servicios o cuentas externas sin autorización expresa.

## 6. Incorporaciones futuras

Este alcance es inicial y deliberadamente abierto. El fundador podrá agregar, retirar o cambiar la prioridad de proyectos. Cada cambio debe registrarse con fecha, motivo, repositorio identificado y efecto sobre dependencias/portabilidad. No incorporar proyectos por inferencia.

## 7. Mantenimiento

- Mantener este registro como índice de cartera.
- Crear o actualizar fichas por proyecto en las áreas numeradas de CONTEXTO X, evitando duplicación innecesaria.
- Registrar decisiones de alcance en `01_DECISIONS/DECISION_LOG.md`.
- Registrar estado operativo y bloqueadores con evidencia en `00_MASTER/PROJECT_STATE.md`.
- Registrar contratos concretos en `06_INTEGRATIONS/`.
- Actualizar `INDEX.md` cuando cambie la cartera o se agreguen documentos.

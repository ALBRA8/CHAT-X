# MUSE — documento maestro del negocio y de CHAT-X

**Estado:** BASE CONCEPTUAL VIGENTE · 2026-11-07

## 1. Resumen ejecutivo

**MUSE es un estudio de talento virtual creado con inteligencia artificial.** Diseña, desarrolla y comercializa personajes ficticios adultos, con identidad visual, personalidad, historia y estilo propios. Produce fotografía, vídeo y voz sintéticos; organiza contenido público y privado para adultos; construye audiencia y administra distribución, monetización, calidad y cumplimiento.

**CHAT-X es la plataforma privada que permite operar MUSE.** No es la marca pública ni un SaaS genérico: es el espacio de trabajo y sistema de gestión del estudio. Debe reunir en una experiencia clara la creación de personajes, producción, biblioteca, canales, conversaciones, ventas, métricas, automatizaciones y controles de cumplimiento.

En breve: **MUSE es el negocio; CHAT-X es el sistema que lo hace funcionar.**

## 2. Identidad y propuesta de valor

MUSE desarrolla personajes digitales como activos creativos y comerciales consistentes. Cada personaje debe tener identidad ficticia y explícitamente adulta, apariencia coherente, rasgos reconocibles, nombre, personalidad, intereses, historia, tono conversacional y biblioteca propia. También debe contar con reglas de comunicación, límites y configuración de publicación.

La propuesta es ofrecer talento virtual consistente desde su creación hasta la relación con la audiencia y la comercialización de contenido, con operación centralizada y trazabilidad.

## 3. Cómo funciona el negocio

1. **Diseño de talento virtual:** concepto, audiencia, personalidad, identidad visual y elementos distintivos.
2. **Producción creativa:** fotografía, vídeo y, cuando corresponda, voz sintética; revisión de identidad, calidad y adecuación.
3. **Construcción de audiencia:** contenido apto para cada canal, atracción de público y comunicación transparente.
4. **Relación y monetización:** experiencias conversacionales y contenido premium para adultos, únicamente en plataformas que permitan ese uso.
5. **Gestión y optimización:** ventas, costes, rendimiento, inventario, calidad y cumplimiento.

Fanvue es la plataforma primaria prevista para monetización. Telegram es una opción secundaria sujeta a verificación de términos, edad y pagos. WhatsApp, Instagram y Facebook se consideran canales de descubrimiento, atención o retención solo dentro de sus políticas y con contenido permitido. Ningún canal se considera habilitado hasta verificar sus reglas, permisos y capacidades vigentes.

## 4. MUSE y CHAT-X no son lo mismo

| Elemento | MUSE | CHAT-X |
|---|---|---|
| Naturaleza | Negocio y marca comercial | Plataforma privada de operación |
| Propósito | Crear, posicionar y monetizar talento virtual | Administrar procesos y activos |
| Usuarios | Audiencia y clientes adultos | Inicialmente el fundador/operador |
| Experiencia | Personajes, contenido, canales y ofertas | Panel, producción, biblioteca y control |
| Resultado | Audiencia, experiencia y ventas | Operación organizada, segura, medible y auditable |

La interfaz de CHAT-X debe hablar el lenguaje del estudio y sus tareas, no el de la infraestructura. La complejidad técnica puede existir detrás, pero no debe imponerse al operador en cada pantalla.

## 5. Ciclo operativo

**Concepto → personaje → identidad aprobada → producción → control de calidad → biblioteca → publicación/distribución → conversación → oferta/venta → análisis → nueva producción.**

Cada pieza debe estar asociada a un personaje, un carril (público/SFW o privado/18+), un estado de aprobación, sus datos de procedencia y sus destinos permitidos. No se publica automáticamente si falta una aprobación o comprobación requerida.

### Personajes

El Genoma define audiencia, rasgos visuales, atributos, personalidad, historia y rasgos distintivos. La identidad se valida con referencias y pruebas de consistencia; una semilla por sí sola no garantiza identidad. El detalle funcional está en FICHA_Estudio_v1.md.

### Producción y biblioteca

El operador prepara un brief, estima el coste, genera vistas previas, selecciona piezas, ejecuta el render final y revisa calidad. Los activos aprobados pasan a una biblioteca ordenada. Se conserva la procedencia disponible: brief/prompt, semilla, proveedor/modelo, versión y aprobaciones.

### Carriles de contenido

- **Público / SFW:** material apto para público general y para los canales concretos cuyas políticas lo permitan.
- **Privado / 18+:** material restringido a adultos y solo a través de servicios que permitan expresamente ese contenido. Requiere control de acceso, separación de almacenamiento y publicación, protección de datos y cumplimiento legal.

La separación debe ser real en permisos, flujos, almacenamiento, interfaz y destinos; no basta una etiqueta visual. Nunca se envía contenido adulto a canales que lo prohíban.

### Conversación

Los personajes pueden tener una voz conversacional definida por personalidad y lore. El modo GFE es entretenimiento ficticio, no una persona real ni una promesa de relación humana. No debe ocultar la naturaleza sintética del personaje, manipular vulnerabilidades ni ignorar límites del usuario. Las acciones sensibles conservan aprobación humana cuando corresponda.

### Distribución y monetización

Fanvue es la plataforma primaria prevista para contenido premium, con divulgación de IA conforme a sus reglas. Telegram es una opción secundaria que requiere verificar términos, edad, pagos y restricciones del proveedor antes de habilitar cobros. Meta y WhatsApp se limitan a usos compatibles con sus políticas. El estado de cada integración se documenta en 06_INTEGRATIONS.

## 6. CHAT-X: responsabilidades del producto

CHAT-X debe ser el centro operativo de MUSE y ofrecer progresivamente:

- **Inicio / centro de operaciones:** tareas pendientes, trabajos en curso, alertas, estado real de servicios y resumen del negocio.
- **Personajes:** crear, editar, pausar y consultar fichas e identidad.
- **Producción:** preparar briefs, generar, comparar, revisar y aprobar contenido.
- **Biblioteca:** localizar activos, sets, versiones, estados y procedencia.
- **Canales y conversaciones:** administrar conexiones autorizadas, conversaciones, reglas y aprobaciones.
- **Ventas y métricas:** registrar ingresos, ofertas, costes y rendimiento por personaje/canal.
- **Automatizaciones:** ejecutar flujos con estados claros, reintentos controlados y aprobación humana.
- **Cumplimiento y seguridad:** permisos, control de edad, trazabilidad, protección de activos y evidencias.
- **Configuración:** proveedores, límites, preferencias y conexiones, sin activar gastos por defecto.

La experiencia debe ser simple, visual, consistente y móvil-amigable. Cada pantalla debe responder: **qué estoy viendo, qué puedo hacer y qué ocurrirá si lo hago**. Los errores explican el problema y el siguiente paso en lenguaje claro.

## 7. Principios no negociables

1. **Personajes ficticios y adultos:** todos deben ser inequívocamente adultos. No se usan ni imitan rostros, voces o identidades de personas reales.
2. **Transparencia de IA:** identificar contenido y personajes como generados por IA donde corresponda y cumplir requisitos de cada plataforma.
3. **Separación SFW/18+:** permisos, activos, canales y publicaciones separados; nunca enviar contenido adulto a plataformas que lo prohíban.
4. **Cumplimiento primero:** respetar leyes, términos, edad mínima, derechos de imagen, privacidad, protección de datos y reglas de pagos. Si no se verifica que un servicio permite un uso, ese uso permanece deshabilitado.
5. **Privacidad y seguridad:** proteger datos de clientes, credenciales, sesiones y material privado; acceso mínimo, cifrado y auditoría.
6. **Control humano:** el fundador conserva decisión sobre gastos, publicaciones, envíos sensibles y cambios con efectos externos, salvo autorización específica.
7. **Economía $0 por defecto:** no contratar servicios, comprar créditos ni activar infraestructura pagada sin autorización expresa.
8. **Honestidad operativa:** diferenciar lo implementado, probado, disponible, degradado, pendiente y planificado. Código existente no equivale a integración operativa.
9. **Casa propia:** datos, sesiones y contenido del negocio adulto se gestionan en módulos nativos de CHAT-X. Los repos externos son referencias o servicios separados dentro de los límites vigentes.

## 8. Arquitectura y motores

La visión del negocio no reemplaza los contratos técnicos. CHAT-X mantiene arquitectura modular; los motores externos son componentes independientes y no equivalen a funciones nativas. La enmienda CASA PROPIA (D-007) limita el uso de los clones: no procesan el negocio 18+ ni reciben sus datos, sesiones o contenido. Cualquier documento histórico que describa un uso anterior debe leerse subordinado a esa decisión posterior.

- ARQUITECTURA.md: diseño técnico y contratos.
- EMBUDO_MULTICANAL.md: estrategia de canales, subordinada a CASA PROPIA y a los términos vigentes.
- MOTORES_REGISTRO.md: procedencia y estado de motores.
- PROJECT_STATE.md: estado operativo con fecha de evidencia.
- DECISION_LOG.md: decisiones explícitas del fundador.

## 9. Cartera de proyectos bajo seguimiento de CONTEXTO X

El alcance inicial definido por el fundador incluye cinco proyectos/repositorios que CONTEXTO X debe documentar y mantener relacionados: **CRM (CRM-ALBRA), YouTube Automation (YOUTUBE-AUTOMATION), Agente Leads (AGENTE-LEADS), Agente Chismoso (AGENTE-CHISMOSO) y Nexscope (NEX-SCOPE)**. CHAT-X es la plataforma central que aloja esta memoria. La inclusión en la cartera significa gobierno documental, trazabilidad y seguimiento; no significa que los repositorios deban fusionarse, migrarse, desplegarse o ejecutarse dentro de CHAT-X. La ubicación y portabilidad de cada código se rigen por PORTABILIDAD_REPOS.md y las decisiones vigentes. En particular, YouTube Automation permanece documentado aunque su carril de portabilidad actual sea SUBCONTRATAR por ahora. El detalle y las reglas de mantenimiento están en REGISTRO_PROYECTOS_GESTIONADOS.md.

## 10. Qué está hecho y qué es objetivo

Este documento define el norte; no certifica que todas las funciones estén terminadas.

- **Implementado o probado:** consultar informes y pruebas fechados; no extrapolar resultados sin repetir pruebas.
- **En desarrollo o pendiente:** consultar PROJECT_STATE y los índices de procesos e integraciones.
- **Objetivo de producto:** lo descrito aquí que aún no tenga evidencia de implementación.
- **No autorizado:** gastos, conexiones, publicaciones, envíos o acciones externas que requieran permiso y no lo tengan.

No asumir disponibilidad de Fanvue, Telegram, Meta, WhatsApp, proveedores generativos ni APIs sin revisar condiciones y verificar la integración concreta.

## 11. Fuente de verdad y mantenimiento

Ante diferencias entre documentos, aplicar este orden:

1. Decisiones vigentes del fundador en 01_DECISIONS/DECISION_LOG.md.
2. Este documento para identidad y propósito del negocio.
3. NORTE_PROYECTO.md para la brújula resumida.
4. PROJECT_STATE.md para el estado actual comprobado.
5. Fichas, arquitectura, procesos, auditorías y pruebas para el detalle.

Una contradicción no se resuelve inventando: se registra y se consulta al fundador cuando cambie rumbo, alcance, gasto o riesgo. Todo documento debe indicar fecha, estado y fuente.

## 12. Próximas etapas

1. Validar este mapa maestro y resolver decisiones comerciales abiertas.
2. Alinear la ficha funcional del Estudio y el alcance real de CHAT-X.
3. Ordenar canales y embudo bajo CASA PROPIA, sin instrucciones obsoletas.
4. Derivar requisitos de interfaz desde las tareas reales del operador.
5. Actualizar el estado técnico únicamente con pruebas recientes.

**Regla para constructores y agentes:** primero entender MUSE y las decisiones vigentes; después leer arquitectura y estado; solo entonces proponer o ejecutar cambios. No inventar funciones, duplicar módulos ni alterar repositorios originales.
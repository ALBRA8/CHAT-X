# Ficha: EL ESTUDIO (nombre de trabajo interno — marca final pendiente)

> **Fase 2 del método ClonaKit** — especificación escrita con nuestras palabras a partir de los informes 01–05. El constructor en sala limpia leerá SOLO esta ficha.
>
> **Estado:** v1 para aprobación del fundador · 2026-10
> **Decisiones ya tomadas:** Fanvue como plataforma primaria de venta · GPU cloud alquilada (RunPod/RunningHub) en F1, GPU propia cuando el volumen lo justifique · UNA modelo virtual piloto de extremo a extremo antes de escalar roster.
> **Pendiente deliberada:** el NOMBRE de marca (aplazado por el fundador). No bloquea nada: el código usa la etiqueta interna neutra `estudio` y el dossier de naming se hace al final en una sola sesión.

## 1. En una frase

Un estudio privado que crea modelos virtuales IA con identidad bloqueada, produce su contenido (SFW de embudo y 18+ de venta) con control de calidad y compliance integrados, lo publica en Fanvue, y en su segunda fase añade un motor de chat estilo novia que convierte conversaciones en el principal ingreso.

## 2. Para quién y para qué

**Para quién:** un operador único (el fundador) que maneja un roster pequeño de modelos virtuales adultas. El software piensa como un estudio de una persona con agentes: cada pantalla debe poder usarse sin equipo, sin saber de IA por dentro y desde el celular para las revisiones rápidas.

**Para qué:** hoy montar una modelo virtual rentable exige encadenar a mano 5–8 herramientas sueltas: generar cara consistente, entrenar una LoRA, producir fotos y vídeo, editar, etiquetar, publicar, y chatear horas al día. Cada salto suelto rompe la identidad, quema créditos o incumple una regla de plataforma. El Estudio empaqueta ese circuito completo en un pipeline con tres cosas que ninguna herramienta suelta da juntas:

1. **Identidad bloqueada de fábrica** — el personaje vive en un objeto propio (genoma + cara canónica + LoRA + ficha), no en prompts improvisados. Regla del sector aprendida: una seed fija NO garantiza identidad; la identidad se garantiza con LoRA entrenada o referencias inyectadas por modelos de edición, y nunca se encadena desde salidas derivadas.
2. **Puertas de calidad automáticas** — nada sale al público sin pasar el examen (5 escenas de identidad válidas antes de escalar; stills aprobados antes de animar; inspección de inicio/medio/fin en vídeo).
3. **Compliance como rutina, no como remedio** — filtro de edad aparente con rechazo duro, cero rostros y voces de personas reales, etiquetado IA, registro de procedencia de cada pieza (Fanvue puede pedir prueba de originalidad y congelar pagos).

**Regla arquitectónica que el constructor debe respetar:** los repositorios vivos del fundador NO se modifican. YOUTUBE-AUTOMATION se bifurca (fork) como esqueleto de la cola de trabajos (su orquestación sirve, su stack generativo se reemplaza completo). CRM-ALBRA se consumirá por API en la fase 2 (su motor de arquetipos/neuromarketing alimenta el chat). Todo lo demás de este proyecto es código nuevo desde cero.

## 3. Funciones de la primera versión (MVP)

| # | Función | Qué hace (comportamiento, no implementación) |
|---|---------|----------------------------------------------|
| 1 | **Genoma** — crear personaje | Asistente paso a paso que diseña la modelo hacia atrás desde la audiencia: público y estilo → rasgo ancla visual → atributos de cara/cuerpo/estilo con semilla propia → aficiones y lore (la ficha de personalidad que usará el chat) → kit de rasgos firmantes (tatuajes, piercings, lunares, con ubicación exacta). Genera la cara canónica por atributos con aleatorizador (jamás rostros de personas reales), arma un dataset de 30–50 fotos, dispara el entrenamiento de la LoRA en la GPU cloud y aplica el examen de identidad (5 escenas distintas) antes de marcar al personaje como ACTIVO. |
| 2 | **Fábrica de fotos** | El operador escribe un brief (escena, outfit, pose, encuadre, luz) o elige un preset; el sistema muestra el coste estimado ANTES de generar; produce un lote de hasta 32 fotos en dos carriles: vista previa barata para elegir, render final caro solo de las elegidas. Toda pieza pasa por la puerta de QA: coherencia de identidad (cara, cuerpo, kit de rasgos), anatomía/manos, edad aparente adulta — si falla, se rechaza con motivo visible. |
| 3 | **Estudio privado 18+** | La misma fábrica, en modo privado: corre con pesos abiertos sin censura auto-alojados, tras un control de acceso real (puerta de edad + acceso solo local/red propia), y cifra automáticamente cada pieza aprobada hasta su venta. Nada de este carril sale jamás al carril público. Cada pieza guarda su metadata de procedencia completa. |
| 4 | **Exportar a Fanvue** | Empaqueta un set aprobado con su leyenda (caption), la etiqueta de contenido IA, el precio PPV sugerido y las miniaturas; sube por API oficial cuando esté disponible, o entrega el paquete listo para carga manual guiada. Registra qué se publicó, dónde, cuándo y a qué precio, para alimentar KPIs. |
| 5 | **Panel del Estudio** | Vista única del negocio: roster de personajes con estado de su LoRA, créditos/GPU gastados por modelo, colas de trabajos con estado, KPIs de ingresos por modelo (en F1 se pegan a mano o por CSV desde Fanvue), y el registro de compliance consultable. |

**Fuera del MVP (va a la sección 7):** vídeo y lipsync, motor de chat GFE completo, voz propia, distribución programada multi-plataforma, TikTok Shop, modo agencia, detección de tendencias.

## 4. Pantallas

**4.1 Panel (inicio).** Tarjetas por personaje: cara canónica, nombre, estado (borrador / entrenando / ACTIVO / pausada), set en curso, ingresos del mes, coste GPU del mes. Debajo, la cola global de trabajos (tipo, estado, coste, tiempo) y alertas de QA. En móvil, las tarjetas se apilan y la cola se colapsa.

**4.2 Asistente Genoma.** Un asistente de 7 pasos con barra de progreso: (1) audiencia y estilo, (2) rasgo ancla visual, (3) atributos con semilla y vista previa de cara canónica regenerable, (4) aficiones y lore, (5) kit de rasgos firmantes con ubicación, (6) dataset y entrenamiento LoRA (progreso, coste, historial de versiones), (7) examen de identidad: 5 escenas propuestas, cada una con veredicto visual y botón de reprobar/regenerar. Al aprobar las 5, el personaje pasa a ACTIVO.

**4.3 Estudio (fábrica de fotos).** Tres columnas: izquierda el brief (escena, outfit, pose, cámara, luz, presets guardados); centro la cuadrícula de vistas previas con selección múltiple y comparación lado a lado con la cara canónica; derecha el coste estimado en vivo, el botón de render final y el historial del lote. Un interruptor claro separa modo público / modo privado (18+).

**4.4 Estudio privado.** Idéntico al 4.3 con tres diferencias visibles: al entrar pide la contraseña del modo privado (y lo recuerda por sesión corta), un candado permanente indica cifrado de las piezas aprobadas, y las miniaturas del carril privado no salen jamás de esa pantalla.

**4.5 Biblioteca y sets.** Piezas con estados en pipeline: borrador → QA → aprobado → cifrado → publicado. Filtros por personaje, fecha, tipo y carril. Vista de detalle de cada pieza con su metadata completa y botones de acción según estado.

**4.6 Compliance.** Tabla auditable: cada pieza con su prompt completo, semilla, checkpoint, hash de LoRA, fecha, veredicto de QA, filtros disparados (edad aparente, personas reales), etiquetas IA aplicadas y destinos de publicación. Exportable para responder a una solicitud de prueba de originalidad.

## 5. Flujos paso a paso

### Flujo A — Nace una modelo (de cero a ACTIVA)
1. El operador abre el asistente Genoma y describe a la audiencia deseada (p. ej. "hombres 21–34 de LATAM que siguen fitness y anime") y el estilo estético.
2. Elige el rasgo ancla visual (p. ej. "pelo rosado + pecas") y ajusta atributos de cara y cuerpo con una semilla; regenera la cara canónica hasta que le guste.
3. Escribe aficiones, tono y lore con sus palabras (esto alimentará el chat en fase 2); marca el kit de rasgos firmantes con ubicación.
4. Lanza dataset + entrenamiento LoRA; ve el progreso y el coste en vivo.
5. Aplica el examen: 5 escenas distintas generadas con la LoRA; aprueba o reprueba cada una.
6. Con 5 aprobadas, el personaje pasa a ACTIVO y aparece en el Panel.

### Flujo B — Primer dinero (set PPV en Fanvue)
1. Desde un personaje ACTIVO, el operador abre el Estudio en modo privado y escribe el brief del set.
2. Revisa el coste estimado; genera el lote de vistas previas; elige 12–20 piezas.
3. La puerta de QA revisa cada pieza (identidad, anatomía, edad aparente); corrige lo rechazado.
4. Aprueba el set → se cifra → el sistema arma el paquete de exportación: piezas cifradas, caption, etiqueta IA, precio PPV sugerido, miniaturas.
5. Sube el set a Fanvue (API o carga guiada); el sistema registra publicación, precio y estado.
6. El Panel muestra el set como publicado y suma sus ingresos cuando el operador pega el CSV de Fanvue.

### Flujo C — Embudo SFW (feed público)
1. Desde el mismo personaje, el operador produce 3–6 fotos cotidianas en modo público.
2. QA + etiqueta de perfil generado con IA aplicada automáticamente en el paquete.
3. Exporta para su feed público (en F1, descarga organizada; la publicación programada es fase 2).
4. Regla dura del sistema: ninguna pieza del carril público puede contener contenido del carril privado, y viceversa.

### Flujo D — Auditoría
1. Desde cualquier pieza (Panel → Biblioteca → detalle), el operador abre su ficha de procedencia.
2. Ve la cadena completa: prompt, semilla, checkpoint, LoRA, fecha, veredicto QA, cifrado, publicaciones.
3. Exporta el registro como evidencia de originalidad si la plataforma la pide.

## 6. Datos

**Personajes** — por cada modelo: genoma (atributos, semilla, rasgo ancla, kit de rasgos firmantes, lore, tono de voz futuro), cara canónica, dataset de entrenamiento, versiones de su LoRA (cada una con hash y nota de por qué se re-entrenó) y estado del personaje.

**Trabajos** — la cola: tipo (dataset, entrenamiento, lote de fotos, render final, cifrado), personaje, prioridad, coste estimado y real, estado, marcas de tiempo. El panel consume esta tabla.

**Medios** — cada pieza generada con su metadata completa: prompt final, semilla, checkpoint, hash de LoRA, fecha, veredicto de QA con motivo si falló, carril (público/privado), estado del pipeline y destinos de publicación. Los archivos van al sistema de archivos organizados por personaje/fecha; la metadata a base de datos.

**Sets** — agrupaciones de piezas aprobadas y cifradas: llave de cifrado, caption, etiqueta IA, precio sugerido y real, estado de publicación, ingresos reportados.

**KPIs** — por personaje y por mes: ingresos (pegados de Fanvue en F1), desglose suscripción vs mensajes pagados vs PPV, coste GPU, piezas publicadas, tasa de rechazo de QA.

**Compliance** — registro de solo-adición (append-only) de eventos: filtros disparados, rechazos con motivo, etiquetas aplicadas, exportaciones. Nunca se borra.

**Dónde vive:** base de datos ligera (SQLite en F1, Postgres al escalar) + sistema de archivos para medios cifrados. La memoria de fans (base vectorial para el chat) es fase 2 y se diseñará junto con el motor GFE.

## 7. Para más adelante (orden por valor)

1. **Motor GFE "Modo Novia" (E4)** — LA gran pieza: memoria por fan (base vectorial), clasificación de arquetipos consumiendo el motor de arquetipos del CRM del fundador por API, playbooks de venta semana 1 (bienvenida día 1 → detalle día 3 → oferta día 7), detección de ballenas (whales), resúmenes de conversación por turno, traspaso a humano (takeover) y notas de voz con la voz de la modelo. Justificación: en Fanvue ~60% del ingreso de creadores nuevos son mensajes pagados y solo ~10% la suscripción — el chat es el producto.
2. **Vídeo**: imagen-a-vídeo (Wan 2.2 como base Apache 2.0, alternativas según caso), presets de movimiento clicables, lipsync por audio, transferencia de movimiento de reels virales (alimentada por la recolectora de tendencias del fundador).
3. **Voz propia por modelo** — consistencia auditiva como parte del personaje (saltó de parasocialidad demostrado en 2025).
4. **Distribuidor programado** — calendario editorial semanal, publicación multi-cuenta, link-in-bio propio.
5. **TikTok Shop / merch** en el carril SFW (la modelo también vende).
6. **Modo agencia** — múltiples rosters, avatares B2B para marcas.
7. **Detección de nichos** — adaptar el concepto de nichos rentables del arsenal a "estéticas que convierten en Fanvue".
8. **Videollamada GFE en tiempo real** — horizonte lejano, requiere infraestructura de streaming de avatar.

## 8. Identidad propia — PENDIENTE (aplazada por el fundador)

**Estado:** el nombre de marca se decide AL FINAL, en una sola sesión de naming. El fundador está atascado en esto y NO debe bloquear la construcción. Mientras tanto:

- El proyecto usa internamente la etiqueta neutra `estudio` (técnicamente válida: minúsculas, sin marca ajena). Esa etiqueta NUNCA será pública.
- **Fijado ya, sin esperar naming:** jamás usar nombres, logos, mascotas ni colores de marca de las plataformas investigadas (fanv.ai, Fanvue, Affogato, Creomify, TheInfluencer.ai, Higgsfield, HeyGen, Creatify, iainfluencerapp) en producto, repositorio, dominio o marketing. En descripciones se permite únicamente "inspirado en prácticas del sector de influencers IA", nunca afiliación ni respaldo.
- El dominio, la paleta, la tipografía y el icono se definen en la sesión de naming al final.
- **Compromiso de esa sesión:** una sola propuesta de 5–7 nombres con dominio disponible y revisión rápida de marca, para elegir de una y cerrar.

## 9. Checklist de sala limpia

- [ ] El código se escribe desde cero; no se copia código, pseudocódigo ni scripts de fanv.ai, Fanvue, Affogato/RenderNet, Creomify, TheInfluencer.ai, Higgsfield, HeyGen, Creatify ni de iainfluencerapp. Los informes de investigación describen IDEAS y comportamientos observables, no implementaciones — la ficha traduce esas ideas con palabras propias.
- [ ] No se usan textos, imágenes, iconos, sonidos ni tipografías propietarios de las plataformas investigadas.
- [ ] El nombre, el logo y los colores son propios (se cierran en la sesión de naming; mientras, etiqueta interna neutra y cero marca ajena).
- [ ] El producto no se presenta como afiliado ni respaldado por ninguna plataforma investigada.
- [ ] No se saltan controles de acceso, age-gates, logins ni protecciones de terceros; los age-gates propios son reales, con contraseña, y se prueban.
- [ ] Los datos personales de fans solo entran desde lo que Fanvue expone al creador, se usan con fin operativo interno, no se publican ni revenden, y el chat jamás promete encuentros reales ni comparte datos personales "de la modelo" (la modelo no tiene vida real fuera del personaje).
- [ ] La carpeta de investigación en bruto (informes detallados de terceros) no se publica ni se comparte.
- [ ] Compliance activo desde el día 1: filtro de edad aparente con rechazo duro, cero rostros y voces de personas reales, etiquetado IA en todo paquete exportado, registro de procedencia por pieza, endpoints de administración siempre autenticados.

---

## Anexo A — Reglas de construcción para el constructor

1. **Lee solo esta ficha.** No consultes las plataformas investigadas ni sus informes; si algo no está aquí, decídelo tú y anótalo en "Decisiones".
2. **Stack orientado:** núcleo de generación auto-alojado tipo ComfyUI con modelos abiertos (SDXL/Illustrious o Flux según escena), LoRA por personaje para identidad, modelos de edición con referencia para correcciones puntuales; vídeo posterior con Wan 2.2. GPU en la nube por cola de trabajos; nada generativo corre en la laptop del operador.
3. **Los pesos del carril privado y el cifrado corren en infraestructura propia del operador** (self-hosted); ningún proveedor externo ve las piezas del carril 18+.
4. **Fork permitido:** la cola de trabajos puede partir del fork del esqueleto de orquestación del fundador (YOUTUBE-AUTOMATION congelado en su tag), reemplazando todo su contenido generativo. El resto, desde cero.
5. **Toda pieza lleva metadata de procedencia desde su creación** — no es opcional ni posterior.
6. **Móvil primero en el Panel y las revisiones** (el operador aprueba desde el teléfono); escritorio completo en Estudio y Genoma.
7. **El cifrado del carril privado bloquea la pieza completa** (archivo + miniatura) hasta que el operador la desbloquea al venderla o publicarla.
8. **Coste siempre visible antes de generar** y guardado por trabajo para calibrar el margen por pieza.

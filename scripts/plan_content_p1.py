# -*- coding: utf-8 -*-
"""Contenido del Plan Estratégico - Parte 1 (caps 1-7).
Bloques: ('h1', t) ('h2', t) ('body', t) ('bullet', [items]) ('quote', t)
         ('table', caption, ratios, header, rows) ('callout', stat, label)
         ('figure', path, caption)
Idioma: español con ortografía completa (FreeSerif soporta á é í ó ú ñ).
"""

P1 = []

# ------------------------------------------------------------------
# CAPÍTULO 1 - RESUMEN EJECUTIVO
# ------------------------------------------------------------------
P1 += [
    ('h1', '1. Resumen Ejecutivo'),
    ('body',
     'fanv.ai acaba de demostrar que existe un mercado dispuesto a pagar por '
     'plataformas que empaquetan la producción de contenido con inteligencia '
     'artificial en un solo studio: crear una identidad digital consistente, '
     'generar contenido con ella y publicarlo de forma automática en múltiples '
     'redes, todo por una suscripción mensual de entre 29 y 119 dólares. Ese '
     'modelo, sin embargo, está construido sobre contenido adulto y sobre '
     'fotos y reels. La oportunidad que este documento organiza es distinta: '
     'construir la versión limpia, centrada en video y latinoamericana de ese '
     'concepto, apoyándose en un activo que ningún competidor tiene: el '
     'ecosistema de herramientas ALBRA ya está construido.'),
    ('body',
     'La auditoría de los 19 repositorios publicados en github.com/ALBRA8 '
     'confirma que las piezas centrales del modelo ya existen y funcionan: '
     'YOUTUBE-AUTOMATION es una fábrica de video completa (guion, imágenes, '
     'voz, render, subtítulos, música y autopublicación) que opera a costo '
     'marginal cercano a cero; NEX-SCOPE encuentra nichos rentables de YouTube '
     'con IA; y CRM-ALBRA aporta un chasis SaaS multi-tenant maduro con '
     'autenticación, roles y motor de automatización. Las herramientas '
     'verticales que no encajan en este proyecto, como el despacho jurídico y '
     'el ERP contable, quedan deliberadamente fuera del alcance, tal como se '
     'decidió desde el inicio.'),
    ('body',
     'La propuesta se resume en tres decisiones. Primera: el producto v1 es '
     'una fábrica de video con IA para creadores de América Latina, con el '
     'pipeline de YOUTUBE-AUTOMATION convertido en servicio web y NEX-SCOPE '
     'como módulo de descubrimiento de nichos. Segunda: el modelo de negocio '
     'es SaaS de suscripción con precios por créditos en tres niveles '
     '(19, 49 y 99 dólares), posicionados por debajo del referente de fanv.ai '
     'para captar el mercado hispanohablante. Tercera: el lanzamiento es '
     'incremental en tres fases de 90 días, sin reescribir código: se '
     'empaqueta lo que ya funciona. Las secciones siguientes desarrollan cada '
     'decisión, sus supuestos y su plan de ejecución.'),
    ('callout', '19 repos', 'herramientas propias auditadas y listas para empaquetar'),
]

# ------------------------------------------------------------------
# CAPÍTULO 2 - LA REFERENCIA: FANV.AI
# ------------------------------------------------------------------
P1 += [
    ('h1', '2. La referencia: qué hace fanv.ai y qué aprender de él'),
    ('body',
     'fanv.ai es un studio de inteligencia artificial para crear y monetizar '
     'influencers virtuales. Su producto se apoya en cuatro pilares. El '
     '"Genoma Humano Digital" bloquea la identidad de un personaje (rostro, '
     'cuerpo, vestuario y estilo) para que todo el contenido mantenga '
     'consistencia visual entre plataformas. La fábrica de contenido genera '
     'fotos y reels con modelos de IA de última generación. La autopublicación '
     'programa y publica de forma nativa en Fanvue, Instagram, TikTok, '
     'YouTube y X, lo que convierte el calendario semanal en un flujo '
     'autónomo. Y las herramientas de agencia permiten operar varios '
     'personajes a la vez con generación por lotes y múltiples cuentas, '
     'dirigidas a operadores que administran rosters completos.'),
    ('body',
     'Su monetización es una suscripción por créditos en tres niveles: '
     'Starter a 29 dólares con un modelo y 850 créditos mensuales; Creator a '
     '59 dólares con cinco modelos y 1.800 créditos; y Agency a 119 dólares '
     'con modelos ilimitados, 3.900 créditos, descuento del 10 por ciento y '
     'publicación multi-cuenta. La economía interna es clara: 850 créditos '
     'equivalen aproximadamente a 212 fotos o 56 reels, lo que permite '
     'inferir que un crédito cubre cerca de un cuarto de imagen generada. La '
     'figura 1 resume la asignación de créditos por nivel.'),
    ('figure', '/home/z/my-project/work-assets/fig1_fanv_credits.png',
     'Figura 1. Créditos mensuales por nivel en fanv.ai (investigación propia, octubre de 2026).'),
    ('body',
     'Hay tres lecciones que conviene copiar tal cual. La primera es el '
     'empaquetado: ningún cliente compra "un pipeline"; compran un studio con '
     'créditos, calendario y botón de publicar. La segunda es el genoma como '
     'ancla de consistencia, que es lo que justifica la suscripción mes tras '
     'mes: el activo del usuario vive en la plataforma. La tercera es el '
     'nivel Agency, que multiplica el ticket promedio atendiendo a quien '
     'opera varios personajes a la vez.'),
    ('body',
     'Hay una decisión que no se copia: el contenido adulto. fanv.ai se '
     'define como plataforma 18+ y su studio privado es su diferenciador; '
     'nuestra versión será 100 por ciento limpia y orientada a monetización '
     'corriente (publicidad, afiliados, patrocinios y ventas), lo que abre '
     'puertas que el mercado adulto mantiene cerradas: pasarelas de pago sin '
     'fricción, publicidad, marcas y una relación sana con YouTube y Meta. '
     'Además, el foco de contenido es distinto: donde fanv produce fotos y '
     'reels cortos, nuestra fábrica produce video largo automatizado, un '
     'formato que fanv no atiende.'),
]

# ------------------------------------------------------------------
# CAPÍTULO 3 - AUDITORÍA DEL ECOSISTEMA ALBRA
# ------------------------------------------------------------------
P1 += [
    ('h1', '3. Auditoría del ecosistema ALBRA: 19 repos, cuatro familias'),
    ('body',
     'Antes de decidir qué se empaqueta, hace falta saber qué se tiene. La '
     'auditoría de los 19 repositorios públicos del perfil ALBRA8 arroja '
     'cuatro familias claras: producción de contenido (fábrica de video y '
     'nicho), motor de ventas (CRM y WhatsApp), inteligencia (scraping y '
     'análisis de oportunidades) y núcleo de agentes (orquestación y control). '
     'Cada repositorio se clasificó con un veredicto: núcleo de la versión 1, '
     'fase posterior, utilitario o fuera del proyecto. Esta clasificación es '
     'la base del roadmap de la sección 11.'),
    ('table',
     'Tabla 1. Inventario de los 19 repositorios ALBRA8 con veredicto de empaquetado.',
     [0.28, 0.47, 0.25],
     ['Repositorio', 'Función verificada', 'Veredicto'],
     [
         ['YOUTUBE-AUTOMATION', 'Fábrica de video IA local: guion, imágenes, voz dual, render Ken Burns, subtítulos, música con ducking y autopublicación en YouTube', 'NÚCLEO v1'],
         ['NEX-SCOPE', 'SaaS de nichos rentables de YouTube: tendencias, keywords, brechas de contenido y planes con IA', 'NÚCLEO v1'],
         ['CRM-ALBRA', 'CRM SaaS multi-tenant (CHALECO) con WhatsApp real, motor de automatización, equipos y auditoría', 'NÚCLEO v1 (chasis)'],
         ['WHATSPOWER-ULTRA', 'Campañas masivas con escudo anti-ban de 5 capas, spintax y acortador con atribución', 'Fase 3'],
         ['WHATSPOWER', 'Suite de WhatsApp de nivel 2 con candados de atención humana', 'Fase 3'],
         ['AGENTE-LEADS', 'Bot de Telegram para prospección B2B con LLM y pipeline determinista de 10 etapas', 'Fase 3'],
         ['Extension-CAZADOR', 'Extensión de Chrome que extrae datos de cualquier web con IA en 2 clicks', 'Fase 3'],
         ['AGENTE-CHISMOSO', 'Análisis de inteligencia con puente de oportunidades de dolor en YouTube', 'Fase 3'],
         ['AGENTE-GENERAL', 'ADN universal de agentes ALBRA: seguridad, memoria, ejecución y auditoría', 'Fase 3'],
         ['PANEL-DE-CONTROL', 'EEC: plano de control de agentes con aprobaciones humanas y auditoría de eventos', 'Fase 3'],
         ['AGENTE-KREA', 'Motor de producto comercial con blueprint y empaquetado', 'Fase 3'],
         ['AGENTE-TRADING', 'Agente de trading', 'Fuera (vertical propio)'],
         ['RADAR-SECOP2', 'Radar de licitaciones SECOP II de Colombia con análisis y redacción de proyectos', 'Fuera (vertical B2G)'],
         ['DESPACHO-JURIDICO', 'Automatización de despacho jurídico', 'Fuera (el abogado no entra)'],
         ['ERP-ADMON', 'Marsella ERP contable con facturación DIAN y NIIF', 'Fuera (el contador no entra)'],
         ['MAXI-APP', 'Documentación técnica y política de privacidad para cumplimiento de Meta Developers', 'Referencia (cumplimiento)'],
         ['INSTALADOR', 'Instalador del ecosistema', 'Utilitario'],
         ['CONTEXT', 'Documentación y contexto del ecosistema', 'Referencia'],
         ['PURO-PODER-<br/>CONOCIMIENTO', 'Proyecto de conocimiento y contenido', 'Referencia'],
     ], 8.5),
    ('body',
     'Dos lecturas salen de la tabla. La primera: el paquete v1 definido en '
     'la planificación (fábrica de video) queda cubierto con solo tres '
     'repositorios en producción activa, lo que reduce el riesgo técnico del '
     'arranque. La segunda: lo que queda fuera no se desecha. El despacho '
     'jurídico y el ERP contable siguen siendo productos verticales '
     'independientes con su propio mercado, y la familia de ventas, '
     'inteligencia y agentes queda alineada como material de las fases 2 y 3, '
     'donde los contratos REST y MCP que ya trae CRM-ALBRA permitirán '
     'integrarlos sin reescribir nada.'),
]

# ------------------------------------------------------------------
# CAPÍTULO 4 - EL CONCEPTO
# ------------------------------------------------------------------
P1 += [
    ('h1', '4. El concepto: de herramientas dispersas a una plataforma'),
    ('body',
     'El ecosistema ALBRA sufre hoy el problema clásico del artesano '
     'talentoso: cada herramienta es potente por separado, pero exige '
     'instalación local, configuración manual y saltos entre ventanas. El '
     'valor de un studio estilo fanv.ai no está en inventar tecnología nueva '
     'sino en empaquetar la que ya existe detrás de un login, un precio y un '
     'botón de publicar. El usuario deja de instalar Python o FFmpeg: '
     'elige un nicho, diseña su personaje, paga sus créditos y recibe videos '
     'publicados. Esa conversión de "herramienta local" a "servicio '
     'administrado" es, exactamente, el salto de fanv.ai.'),
    ('body',
     'La correspondencia entre el modelo de fanv.ai y el arsenal ALBRA es '
     'prácticamente uno a uno, y donde no lo es, la diferencia favorece a '
     'nuestra propuesta. La tabla 2 muestra el mapeo capa por capa.'),
    ('table',
     'Tabla 2. Mapeo entre las capas de fanv.ai y los activos del ecosistema ALBRA.',
     [0.28, 0.44, 0.28],
     ['Capa del modelo fanv.ai', 'Equivalente en el ecosistema ALBRA', 'Estado'],
     [
         ['Genoma digital bloqueado', 'Sistema Avatar PRO: 15 desplegables y 89 opciones de caracterización', 'Existe; requiere exponerse como asistente web'],
         ['Fábrica de fotos y reels', 'Pipeline de video de YOUTUBE-AUTOMATION a costo marginal casi cero', 'Existe; requiere multi-tenancy y colas'],
         ['Autopublicación nativa', 'Autopublicación en YouTube con OAuth y salidas multiplataforma', 'Existe en YouTube; ampliar TikTok, Instagram y Facebook'],
         ['Planificación de nichos', 'NEX-SCOPE: nichos, tendencias y planes de contenido con IA', 'Ventaja propia (fanv.ai no la tiene)'],
         ['Herramientas de agencia', 'PANEL-DE-CONTROL (EEC) con aprobaciones humanas y multi-cuenta', 'Fase 3'],
         ['Motor de monetización', 'CRM-ALBRA, WHATSPOWER-ULTRA y AGENTE-LEADS', 'Fase 3 (fanv.ai tampoco la integra)'],
     ]),
    ('body',
     'El posicionamiento resultante es preciso. fanv.ai atiende a operadores '
     'de contenido adulto que monetizan pagos por suscripción; nosotros '
     'atendemos a creadores y emprendedores latinoamericanos que quieren un '
     'canal de YouTube, TikTok o Instagram produciendo solo, y luego vender: '
     'cursos, afiliados, servicios o productos. La frase de posicionamiento '
     'que condensa la propuesta es directa: tu canal se produce y se publica '
     'solo, y cuando llegue la fase 3, también se vende solo.'),
    ('quote', 'fanv.ai vende "ella publica sola". Nuestra plataforma vende "tu canal '
     'produce, publica y, con el tiempo, vende solo": sin contenido adulto y en español.'),
]

# ------------------------------------------------------------------
# CAPÍTULO 5 - ARQUITECTURA
# ------------------------------------------------------------------
P1 += [
    ('h1', '5. Arquitectura de la plataforma'),
    ('body',
     'La arquitectura reutiliza lo construido en lugar de reemplazarlo. El '
     'chasis de la plataforma es CRM-ALBRA: ya resuelve multi-tenancy, '
     'autenticación JWT, roles y permisos, motor de automatización con '
     'ejecución durable, reportes y auditoría, y fue diseñado para aceptar '
     'contratos externos vía REST y MCP. Sobre ese chasis se monta el motor '
     'de video: el pipeline Python de YOUTUBE-AUTOMATION se convierte en un '
     'servicio con workers que ejecutan las cinco etapas de producción, y el '
     'módulo de NEX-SCOPE se integra como panel de descubrimiento de nichos '
     'dentro del mismo dashboard. El usuario final ve una sola aplicación; '
     'por debajo conviven un backend TypeScript y workers de Python, un '
     'patrón que ambos repositorios ya manejan.'),
    ('table',
     'Tabla 3. Mapeo técnico: módulo de la plataforma, repositorio fuente y rol.',
     [0.26, 0.26, 0.48],
     ['Módulo de la plataforma', 'Repositorio fuente', 'Rol técnico en el producto'],
     [
         ['Chasis y cuentas', 'CRM-ALBRA', 'Multi-tenancy, JWT, roles, suscripciones, motor de créditos, auditoría y buscador global'],
         ['Motor de video', 'YOUTUBE-AUTOMATION', 'Workers Python con FastAPI: guion, imágenes (Gemini), TTS, render FFmpeg, subtítulos y música'],
         ['Descubrimiento de nichos', 'NEX-SCOPE', 'Análisis de tendencias, keywords y brechas de contenido; alimenta el plan editorial del canal'],
         ['Genoma del personaje', 'YOUTUBE-AUTOMATION (Avatar PRO)', 'Asistente web de 4 pasos que produce la ficha de consistencia del personaje'],
         ['Publicación', 'YOUTUBE-AUTOMATION y extendidos', 'OAuth de YouTube en v1; conectores de TikTok, Instagram y Facebook en fase 2'],
         ['Facturación y créditos', 'CRM-ALBRA (extendido)', 'Pasarela (Stripe o Wompi), saldos de créditos, tope por plan y recargas'],
     ]),
    ('body',
     'Tres decisiones técnicas de arranque merecen mención explícita. La '
     'primera: base de datos PostgreSQL en producción (Prisma ya soporta el '
     'cambio desde SQLite) para soportar tenancy real y concurrencia. La '
     'segunda: cola de trabajo con prioridad por plan, de modo que Agency '
     'salte la fila sin romper la justicia del sistema. La tercera: '
     'almacenamiento de objetos compatible con S3 para videos, miniaturas y '
     'audios, con ciclo de vida que archive videos antiguos y controle el '
     'costo de almacenamiento. Nada de esto toca el núcleo del pipeline; son '
     'decisiones de caja alrededor del motor.'),
]

# ------------------------------------------------------------------
# CAPÍTULO 6 - PRODUCTO MVP
# ------------------------------------------------------------------
P1 += [
    ('h1', '6. Producto MVP: la fábrica de video en cuatro pasos'),
    ('body',
     'El producto mínimo viable condensa la experiencia en un flujo que un '
     'creador sin conocimientos técnicos completa en su primera sesión. Paso '
     'uno: descubrir el nicho; NEX-SCOPE propone tres nichos rentables con '
     'sus tendencias y brechas de contenido, y el usuario elige uno o trae '
     'el propio. Paso dos: crear el genoma; el asistente de cuatro pasos '
     'convierte los 15 desplegables de Avatar PRO en una ficha visual del '
     'personaje (estilo, tono de voz, paleta y formato de canal). Paso tres: '
     'generar; el usuario entrega una idea, un guion o un video viral de '
     'referencia, y la cola de producción devuelve el video con escenas '
     'editables. Paso cuatro: publicar; el calendario programa la '
     'autopublicación en YouTube con título, descripción y miniatura.'),
    ('bullet', [
        'Asistente de genoma con previsualización en vivo y plantillas de canal (educativo, historias, reseñas, finanzas).',
        'Modos de entrada: desde idea, desde guion, desde URL (recreación original) y desde audio con la voz del usuario.',
        'Editor de escenas para regenerar imagen o voz por escena sin reprocesar el video completo.',
        'Modo fábrica: programación semanal de producción por lote para mantener el canal lleno.',
        'Panel de créditos con consumo estimado antes de confirmar cada generación.',
        'Autopublicación en YouTube con OAuth, y exportación manual a TikTok, Instagram y Facebook en v1.',
    ]),
    ('body',
     'Los criterios de aceptación del MVP se definen antes de escribir '
     'código para no negociar calidad en caliente. Un video de 8 a 12 '
     'minutos debe completarse en menos de 30 minutos de cola en plan '
     'normal. El personaje debe mantener consistencia visual entre videos '
     'gracias al genoma, verificada por muestreo humano semanal. El costo de '
     'API por video largo debe quedar bajo 2 dólares para proteger el margen '
     'de la sección 8. Y el onboarding completo, desde el registro hasta el '
     'primer video publicado, debe caber en 10 minutos de esfuerzo del '
     'usuario. Si cualquiera de los cuatro criterios falla, la fase 1 no '
     'considera cumplida su salida.'),
]

# ------------------------------------------------------------------
# CAPÍTULO 7 - NAMING
# ------------------------------------------------------------------
P1 += [
    ('h1', '7. Naming: cinco caminos para bautizar la plataforma'),
    ('body',
     'El nombre debe funcionar en dos mundos: sonar natural en español para '
     'el mercado latinoamericano y no estorbar si el negocio crece hacia el '
     'mercado angloparlante. Se evaluaron cinco candidatos con criterios de '
     'fonética, disponibilidad probable de dominio y riesgo de colisión de '
     'marca. Ninguno ha pasado todavía por verificación jurídica formal, de '
     'modo que esta sección es una decisión pendiente del fundador, con una '
     'recomendación explícita.'),
    ('table',
     'Tabla 4. Cinco candidatos de naming con origen, ventaja y riesgo.',
     [0.19, 0.31, 0.28, 0.22],
     ['Nombre', 'Origen e idea', 'Ventaja principal', 'Riesgo'],
     [
         ['VIREON', 'Inventado de "video" más el sufijo "-eon" (tiempo)', 'Global, corto, registrable, evoca video sin limitar la categoría', 'Marca nueva: exige construir significado'],
         ['FORJA AI', 'Español puro: donde se forjan personajes y canales', 'Alma latinoamericana, fuerte y memorable, une artesanía y tecnología', '"Forja" tiene usos en cripto y fintech'],
         ['QUIMERA STUDIO', 'Criatura mitológica compuesta: cara, voz y estilo ensamblados', 'Metáfora exacta del genoma digital', 'Colisiones frecuentes en gaming y cripto'],
         ['MORFEO AI', 'Dios griego que da forma a los sueños', 'Poético, corto, evoca transformación', 'Morpheus está saturado en IA y cine'],
         ['KIPU STUDIO', 'Quipu andino: datos tejidos en cuerdas', 'Identidad latinoamericana única', 'Kipu Health existe como marca en EE. UU.'],
     ]),
    ('body',
     'La recomendación es VIREON como nombre principal, con FORJA AI como '
     'alternativa si se prefiere un nombre con raíz en español desde el día '
     'uno. VIREON se pronuncia igual en los dos idiomas, registra pocas '
     'colisiones graves para la categoría de software de video, y su '
     'construcción inventada permite asegurar dominio y perfiles sociales '
     'homogéneos. Con el nombre elegido, los pasos inmediatos son verificar '
     'la disponibilidad del dominio y el registro de marca ante la autoridad '
     'competente, y reservar los perfiles sociales principales aunque el '
     'lanzamiento tarde 90 días.'),
]

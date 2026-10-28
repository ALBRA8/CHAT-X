# -*- coding: utf-8 -*-
"""Contenido del Plan Estratégico - Parte 2 (caps 8-13)."""

P2 = []

# ------------------------------------------------------------------
# CAPÍTULO 8 - MODELO DE NEGOCIO Y PRECIOS
# ------------------------------------------------------------------
P2 += [
    ('h1', '8. Modelo de negocio: suscripción por créditos en tres niveles'),
    ('body',
     'El modelo es el mismo que ya validó fanv.ai: una suscripción mensual '
     'que asigna créditos consumibles por generación de contenido. La '
     'ventaja del esquema de créditos es doble: protege el margen cuando el '
     'uso se dispara (cada generación consume créditos medibles) y al mismo '
     'tiempo hace tangible el valor (el usuario ve exactamente qué compra y '
     'qué le queda). Sobre esa base, la propuesta posiciona los tres niveles '
     'entre un 35 y un 40 por ciento por debajo del referente norteamericano, '
     'un descuento deliberado para captar velocidad en América Latina sin '
     'regalar el producto.'),
    ('table',
     'Tabla 5. Estructura de niveles y precios propuesta para el lanzamiento.',
     [0.16, 0.14, 0.16, 0.16, 0.38],
     ['Plan', 'Precio', 'Créditos', 'Personajes', 'Límites y extras'],
     [
         ['STARTER', '19 USD/mes', '850', '1', 'Un canal conectado, publicación en YouTube, nichos básicos, cola normal'],
         ['CREATOR', '49 USD/mes', '1.800', '5', 'Tres canales, YouTube más TikTok e Instagram, modo fábrica y calendario, cola prioritaria'],
         ['AGENCY', '99 USD/mes', '3.900', 'Ilimitados', 'Canales ilimitados, publicación multi-cuenta, acceso API, soporte prioritario y 10 por ciento de descuento en recargas'],
     ]),
    ('body',
     'La economía interna parte de supuestos de diseño que la fase 1 debe '
     'calibrar con datos reales. Con la regla de consumo heredada del '
     'referente (cuatro créditos por imagen generada), un video largo de 8 a '
     '12 minutos, que consume entre 300 y 340 créditos entre escenas, '
     'narración y render, cuesta a la plataforma entre 2 y 3.4 dólares en '
     'API, mientras que un video corto vertical queda en torno a los 60 u 80 '
     'créditos. La voz con edge-tts es gratuita, y el render FFmpeg se '
     'amortiza en los workers. Bajo esos supuestos, el margen bruto objetivo '
     'por suscripción se ubica en el 70 por ciento o más, con el plan '
     'Starter operando como puerta de entrada y los planes Creator y Agency '
     'aportando la mayor parte del ingreso.'),
    ('callout', '≥ 70%', 'margen bruto objetivo por suscripción (supuesto de diseño a calibrar en la fase 1)'),
    ('body',
     'Tres palancas protegen ese margen sin tocar el precio. La primera es '
     'la cola con prioridad por plan, que cobra el costo real de la espera y '
     'empuja la actualización de plan en horas pico. La segunda es el caché '
     'de imágenes y guiones parciales, que evita regenerar escenas ya '
     'pagadas por el mismo usuario. La tercera son las recargas de créditos '
     'avulsas, un ingreso complementario que atiende picos de uso sin '
     'obligar a cambiar de nivel.'),
]

# ------------------------------------------------------------------
# CAPÍTULO 9 - MERCADO OBJETIVO
# ------------------------------------------------------------------
P2 += [
    ('h1', '9. Mercado objetivo: creadores de América Latina'),
    ('body',
     'El cliente inicial es el creador y el emprendedor hispanohablante que '
     'quiere un canal profesional sin equipo de producción: youtubers de '
     'nicho educativo o de historias, tiktokers que necesitan volumen diario, '
     'emprendedores con canal de marca, y agencias pequeñas de contenido que '
     'operan varios canales a la vez. Es un cliente sensible al precio, '
     'conectado a WhatsApp, con demanda probada de herramientas de '
     'automatización y, sobre todo, con una barrera de entrada clara que la '
     'plataforma elimina: la producción audiovisual.'),
    ('body',
     'Empezar por América Latina no es una concesión sino una ventaja '
     'competitiva. Primero, el stack ya habla español: los prompts, las voces '
     'hispanas de edge-tts y la interfaz propuesta eliminan la fricción de '
     'idioma que las plataformas globales aún arrastran en español. Segundo, '
     'el precio de entrada (19 dólares) cruza el umbral de decisión de '
     'millones de creadores regionales que hoy no pagan por herramientas. '
     'Tercero, la fase 3 cierra el círculo comercial: la familia de WhatsApp '
     '(CRM-ALBRA, WHATSPOWER-ULTRA y AGENTE-LEADS) convierte a la plataforma '
     'en la única del segmento que no solo produce el contenido, sino que '
     'también vende con él.'),
    ('body',
     'El plan de adquisición empieza por la propia fábrica. Los primeros '
     'canales operados con la plataforma se convierten en vitrina y caso de '
     'estudio: cada video publicado lleva la marca del método, y cada '
     'resultado alimenta el material de marketing. A eso se suman tres '
     'canales complementarios: comunidades de creadores y emprendedores '
     'latinoamericanos (grupos de Telegram, Discord y redes), un programa de '
     'afiliados con comisión recurrente, y contenido demostrativo del tipo '
     '"cómo hicimos este canal", que es a la vez marketing y prueba social. '
     'La métrica norte del negocio es simple: videos publicados por usuario '
     'por semana.'),
]

# ------------------------------------------------------------------
# CAPÍTULO 10 - COMPETENCIA
# ------------------------------------------------------------------
P2 += [
    ('h1', '10. Competencia y diferenciación'),
    ('body',
     'El competidor más peligroso no es el que hace video con IA, sino el '
     'que empaqueta el flujo completo. Hoy nadie combina las cuatro piezas '
     'que la plataforma ofrece juntas: descubrimiento de nicho, genoma de '
     'personaje, fábrica de video largo a costo marginal bajo y '
     'autopublicación. La tabla 6 posiciona a los rivales más visibles '
     'frente a ese criterio.'),
    ('table',
     'Tabla 6. Comparación frente a alternativas visibles del mercado.',
     [0.22, 0.38, 0.40],
     ['Plataforma', 'Foco principal', 'Límite frente a nuestra propuesta'],
     [
         ['Synthesia / HeyGen', 'Avatares hablantes para video corporativo y formación', 'Orientadas a video empresarial con licencias caras; no automatizan canales completos'],
         ['InVideo / Pictory', 'Edición asistida con plantillas y texto a video', 'Exigen trabajo humano por video; sin genoma de personaje ni autopublicación programada'],
         ['fanv.ai', 'Studio de influencers virtuales, nativo NSFW', 'Sin versión limpia, centrado en fotos y reels; no atiende video largo ni mercado LATAM'],
         ['Labsia', 'Generación de videos con IA', 'Comparado directamente en la documentación de YOUTUBE-AUTOMATION: el pipeline propio opera a costo cercano a cero'],
     ]),
    ('body',
     'Los diferenciadores sostenibles son cinco. Uno: costo marginal cercano '
     'a cero por diseño propio del pipeline, que permite precios LATAM con '
     'margen sano. Dos: el flujo nicho-plan-producción-publicación en un '
     'solo lugar, que ninguno de los rivales cierra de punta a punta. Tres: '
     'español nativo en producto, voces y soporte. Cuatro: precio de entrada '
     'que dobla la base instalada potencial de la región. Y cinco, el foso '
     'más profundo: cuando la fase 3 conecte la fábrica con el motor de '
     'ventas por WhatsApp, el producto dejará de ser "una herramienta de '
     'contenido" y pasará a ser "el canal que se vende solo", una categoría '
     'que, hasta donde alcanza la investigación, nadie ocupa todavía en '
     'español.'),
]

# ------------------------------------------------------------------
# CAPÍTULO 11 - ROADMAP
# ------------------------------------------------------------------
P2 += [
    ('h1', '11. Roadmap por fases: 90 días hasta el lanzamiento'),
    ('body',
     'El roadmap traduce las decisiones anteriores en cuatro fases con '
     'criterio de salida explícito. El principio rector es no reescribir: '
     'cada fase empaqueta repositorios existentes, y ninguna fase comienza '
     'si la anterior no demostró su criterio de salida con datos. La fase 0 '
     'monta la fundación; la fase 1 construye el MVP de fábrica de video; '
     'la fase 2 lo distribuye y lo llena de nichos; la fase 3 abre los '
     'módulos extendidos de ventas, inteligencia y agencia.'),
    ('table',
     'Tabla 7. Roadmap con entregables y criterios de salida por fase.',
     [0.16, 0.12, 0.42, 0.30],
     ['Fase', 'Semanas', 'Entregables principales', 'Criterio de salida'],
     [
         ['F0. Fundación', '1 a 2', 'Nombre y dominio verificados; monorepo unificado; chasis multi-tenant sobre CRM-ALBRA; landing con lista de espera; definición de créditos y checkout en sandbox', '200 registros en la lista de espera'],
         ['F1. MVP de fábrica', '3 a 8', 'Asistente de genoma; generación con colas y editor de escenas; motor de créditos y pasarela real; autopublicación en YouTube', '10 beta testers produciendo semanalmente y costos por video calibrados'],
         ['F2. Distribución', '9 a 14', 'NEX-SCOPE integrado al dashboard; conectores TikTok, Instagram y Facebook; calendario y modo fábrica multi-personaje', '100 usuarios activos y conversión a pago igual o mayor al 5 por ciento'],
         ['F3. Módulos extendidos', '15 o más', 'Motor de ventas por WhatsApp (CRM-ALBRA más WHATSPOWER-ULTRA); inteligencia (CAZADOR y CHISMOSO); modo agencia (EEC); API pública', 'Primer cliente de nivel Agency operativo'],
     ]),
    ('body',
     'El diseño de las fases tiene una propiedad importante: cada una '
     'entrega valor standalone incluso si la siguiente se retrasa. Tras la '
     'fase 1 la plataforma ya se puede vender; tras la fase 2 ya retiene; '
     'tras la fase 3 ya se diferencia de forma estructural. Esa propiedad '
     'reduce el riesgo de proyecto muerto y permite ajustar prioridades con '
     'datos de usuarios reales en cada frontera, en lugar de apostar 90 días '
     'a ciegas.'),
]

# ------------------------------------------------------------------
# CAPÍTULO 12 - RIESGOS
# ------------------------------------------------------------------
P2 += [
    ('h1', '12. Riesgos y consideraciones'),
    ('body',
     'Un plan honesto nombra sus riesgos antes de que ellos nombren al plan. '
     'Los seis identificados cubren dependencias técnicas, políticas de '
     'plataforma, economía unitaria, competencia, cobranza regional y uso '
     'indebido. Cada uno tiene una mitigación concreta ya disponible en el '
     'ecosistema o en el diseño propuesto.'),
    ('table',
     'Tabla 8. Matriz de riesgos con probabilidad, impacto y mitigación.',
     [0.30, 0.12, 0.12, 0.46],
     ['Riesgo', 'Prob.', 'Impacto', 'Mitigación'],
     [
         ['Cambios de precio o límites en las APIs de IA (Gemini u otras)', 'Media', 'Alto', 'Capa de proveedores intercambiables; edge-tts gratuito como voz base; caché agresivo de imágenes y guiones'],
         ['Políticas de YouTube y Meta sobre contenido sintético', 'Media', 'Alto', 'Transparencia y etiquetado de contenido generado; contenido original; base de cumplimiento en la documentación de MAXI-APP'],
         ['Costos de render y workers en la nube', 'Alta', 'Medio', 'Workers con escalado automático; límites de consumo por nivel; prioridad de cola como palanca comercial'],
         ['Competencia global con más capital', 'Alta', 'Medio', 'Nicho LATAM, español nativo, precio regional y foso de ventas por WhatsApp de la fase 3'],
         ['Disposición de pago y medios de cobro en la región', 'Media', 'Medio', 'Pasarelas locales (Wompi o Mercado Pago) además de Stripe; precios en USD con equivalencia local; nivel gratuito limitado'],
         ['Uso indebido: deepfakes o contenido engañoso', 'Baja', 'Alto', 'Política 100 por ciento SFW; términos de uso; verificación de identidad; bitácora de auditoría por generación'],
     ]),
    ('body',
     'Queda una consideración legal adicional que conviene explicitar: la '
     'propuesta no copia marca, código ni contenido de fanv.ai; toma su '
     'modelo de negocio como referente de mercado, que es práctica estándar '
     'de la industria. La arquitectura de empaquetar pipelines de generación '
     'con créditos es común a docenas de plataformas. La diferencia legal '
     'relevante está en la originalidad del código (100 por ciento propio), '
     'en la ausencia de contenido adulto y en el registro oportuno de la '
     'propia marca, tres condiciones que este plan deja contempladas.'),
]

# ------------------------------------------------------------------
# CAPÍTULO 13 - PRÓXIMOS PASOS
# ------------------------------------------------------------------
P2 += [
    ('h1', '13. Próximos pasos: plan 30/60/90'),
    ('body',
     'Los próximos 90 días convierten este documento en un producto vivo. '
     'El plan está dividido en tres bloques de 30 días, cada uno con '
     'entregables verificables y una decisión de go o no-go al final, de '
     'modo que el fundador controle el ritmo del gasto y del alcance.'),
    ('bullet', [
        'Días 1 a 30: elegir nombre y verificar dominio y marca; montar el monorepo unificado; activar el chasis multi-tenant con autenticación; publicar la landing con lista de espera; dejar definido el motor de créditos con checkout en sandbox.',
        'Días 31 a 60: operar el MVP de fábrica de punta a punta (nicho, genoma, generación y publicación); reclutar 10 beta testers de comunidades de creadores; medir el costo real por video y calibrar la tabla de créditos; conectar la pasarela definitiva.',
        'Días 61 a 90: lanzamiento público del nivel Starter; alcanzar 100 usuarios activos; validar la conversión a pago; decidir con datos el arranque de la fase 2 (conectores sociales y nichos integrados).',
    ]),
    ('h2', 'Decisiones que este plan deja sobre la mesa'),
    ('body',
     'Ningún plan de 90 días cierra todas las preguntas, y pretenderlo sería '
     'fingir certeza que no existe. Lo que sí se puede es dejar cada decisión '
     'abierta con sus opciones sobre la mesa, su recomendación inicial y el '
     'momento en que debe resolverse. La tabla 9 reúne las cuatro que el '
     'fundador debe atender, con su ventana natural de decisión dentro del '
     'calendario propuesto.'),
    ('table',
     'Tabla 9. Decisiones pendientes del fundador con recomendación y ventana de decisión.',
     [0.24, 0.34, 0.28, 0.14],
     ['Decisión', 'Opciones sobre la mesa', 'Recomendación', 'Ventana'],
     [
         ['Nombre y dominio', 'VIREON (global) o FORJA AI (alma latinoamericana)', 'VIREON, tras verificar dominio y registro de marca', 'Fase 0'],
         ['Pasarela de cobro', 'Stripe (global) o Wompi y Mercado Pago (regional)', 'Wompi para pesos colombianos más Stripe para USD', 'Fase 1'],
         ['Tabla de créditos inicial', '850, 1.800 y 3.900 créditos propuestos', 'Calibrar con el costo real por video al cierre de la fase 1', 'Fase 1'],
         ['Primer nicho vitrina', 'Finanzas personales, historias o reseñas', 'El que mejor rinda en el canal operado con la propia fábrica', 'Fase 1'],
     ], 8.5),
    ('body',
     'La tesis final es corta. La plataforma no se construye desde cero: se '
     'empaqueta. La auditoría demostró que cada pieza del modelo que fanv.ai '
     'cobra entre 29 y 119 dólares ya existe, funcionando, dentro del '
     'ecosistema ALBRA, y que además hay dos ventajas que el referente no '
     'tiene: el descubrimiento de nichos y el motor de ventas por WhatsApp. '
     'La tarea de los próximos 90 días es unir esas piezas detrás de un '
     'login, un precio y un nombre, y ponerlas a trabajar para los creadores '
     'de América Latina.'),
]

# MIAFACTORY — destripe completo (fuente v1.5, aportada por el fundador)
**Recepción:** 2026-11-20 · **Estado:** FUENTE DE INTEL (no es especificación de construcción) · **Objeto:** https://miafactory.app
**Regla de uso (D-015, orden del fundador):** NO construir literal. Adaptar únicamente lo que sirva a MUSE/CHAT-X → destilado en `../00_MASTER/PLAN_ADAPTACION_MIAFACTORY.md`.
Marcas del documento fuente: [OBSERVADO] evidencia directa · [DEDUCIDO] se desprende · [DESCONOCIDO] no verificado (no inventar).

---

===============================================================================
PROMPT MAESTRO DE CONSTRUCCION — "PROMPT CONSTRUCTOR HERRAMIENTA MIAFACTORY"
===============================================================================
Version: 1.5
  v1.0 = solo la parte publica.
  v1.1 = añade el PANEL PRIVADO observado (seccion 17).
  v1.2 = añade COMO FUNCIONA UNA GENERACION POR DENTRO y quien pone la GPU (19).
  v1.3 = añade donde vive el archivo terminado, la sesion y el ciclo completo.
  v1.4 = añade las cinco pantallas secundarias y el catalogo por dentro (17.8-17.11).
  v1.5 = añade EL ESQUEMA DE CAMPOS QUE DESCRIBE CADA FORMULARIO (17.12 y 17.13),
         es decir, como se construye una ficha de herramienta sin programarla una
         a una, y corrige la ruta desconocida de una herramienta (13.1).
Objeto analizado: https://miafactory.app  (producto "MIA Factory")
Entregable: instrucciones para que OTRO constructor desarrolle una aplicacion
equivalente en funcionalidad y parecido visual, con identidad propia.
Este archivo NO contiene codigo de la aplicacion. NO se construyo nada.

COMO USAR ESTE ARCHIVO
  - Copialo entero y entregaselo a un constructor (ChatGPT, Claude, Gemini,
    Codex, DeepSeek, Cursor, un agente con acceso a archivos, etc.).
  - Debe leer TODO antes de escribir codigo y trabajar por etapas (seccion 13).
  - Marcas de cada afirmacion:
      [OBSERVADO]  visto directamente en el sitio, con evidencia.
      [DEDUCIDO]   se desprende de lo observado.
      [DESCONOCIDO] no se pudo verificar. NO inventar: decidir y documentar.
  - REGLA ABSOLUTA: no copiar marca, logo, textos largos literales, videos,
    imagenes ni codigo del original. Se copia el CONCEPTO y el FLUJO, con
    identidad, recursos y codigo nuevos. Las frases del original que aparecen
    aqui entre comillas son EVIDENCIA para medir tono y longitud: NO se copian.
  - Privacidad: el analisis se hizo con una cuenta real del solicitante. Sus
    datos personales NO se reproducen aqui y no deben aparecer en la nueva app.

===============================================================================
1. QUE ES EL PRODUCTO
===============================================================================
[OBSERVADO] Aplicacion web (SaaS) de generacion de contenido con IA: imagenes,
videos, voces, avatares y "producciones completas" (videoclips, escenas con
director automatico, noticieros, publicidad de producto e inmueble). Se vende
por paquetes de creditos. Entrada con cuenta de Google. Detras del acceso hay un
panel con 33 herramientas, cada una con su coste en creditos. El pago se cierra
por WhatsApp con link de pago. Español e ingles, tema oscuro.

  Propuesta de valor (portada, [OBSERVADO]):
  - "Tu idea. Nuestra IA. Resultado en minutos."
  - "Crea publicidad para productos e inmuebles, videoclips, imagenes y voces
    con IA. Sin software. Sin conocimientos tecnicos. Sin censura."
  - Metricas: "15+ Herramientas de IA", "1 click Automatizaciones".
  - Botones: "Comenzar con Google", "Ver planes", "Registrarme gratis",
    "Comprar paquete".

===============================================================================
2. IDENTIDAD PROPIA DE LA NUEVA APLICACION (obligatorio)
===============================================================================
Nombre propuesto: "NEXO STUDIO" (alternativas: "FORJA IA", "PRISMA LAB").
Nada de "MIA", "Factory" ni el logo del original.

Identidad visual propia:
  - Paleta: fondo #0B0F1A, superficie #141B2D, linea #223049,
    acento principal #7C5CFF (violeta), secundario #22D3EE (cian),
    exito #34D399, aviso #FBBF24, error #F87171,
    texto #F5F7FF / #A9B4CC / #6B7794.
  - Tipografia: familia variable propia (Sora o Manrope) cargada de verdad con
    @font-face (el original declara "Outfit" y NO la carga [OBSERVADO]).
  - Formas: radios 8 / 12 / 16 / 24 y pastillas 9999 px.
  - Iconos: set propio (lucide o similar), nunca combinados igual.
  - Graficos: videos e imagenes generados para el proyecto. Nunca reutilizar
    /home-carousel/*.mp4, /previews/*.webp, logo-full.webp ni logo-192.png.

===============================================================================
3. MAPA DE RUTAS
===============================================================================
[OBSERVADO] Publicas:
  /home                      portada comercial
  /pricing                   planes y precios
  /app-pricing               alias de /pricing
  /login                     inicio de sesion (solo Google)
  /account/confirm-deletion  confirmacion de borrado de cuenta
  /galeria-mf7k9x2p          galeria publica (hoy DESACTIVADA: "Galeria no
                             activada")
[OBSERVADO] Redirigen a /home: "/", /register, /ejemplos, /app-showcase.
  No hay pantalla de registro aparte: el registro es el mismo boton de Google.
[OBSERVADO] Privadas (requieren sesion), CONFIRMADAS una por una:
  /dashboard           catalogo de herramientas (pantalla principal)
  /workflow/<slug>     FICHA de una herramienta con su formulario
  /gallery             historial de generaciones
  /credits             saldo, lotes y libro de movimientos
  /settings            ajustes y zona de peligro
  /loras               "Mis LoRAs"
  /personajes          "Mis personajes" (elenco)
  /images              "Mis Fotos"
  /voices              "Mis Voces"
  /styles              "Mis Estilos" (bloqueada sin plan Creator o Pro)
  Admin (trozos presentes en el codigo): clientes, pagos, actividad, usuarios,
  auditoria, precios, suscripciones, gastos, seguridad, correo, onboarding,
  codigos promocionales, analitica, ingresos y un laboratorio.
[OBSERVADO] El id de cada herramienta es un slug en ingles snake_case
  (confirmados image_generator y upscaler). Una direccion /workflow/<id que no
  existe muestra su propia pantalla "Workflow no encontrado" con el enlace
  "Volver al dashboard": NO cae al panel. Probados y NO existentes:
  text_to_speech, music_generator, image_to_video, lipsync_pro.
[OBSERVADO] Otras rutas privadas desconocidas SI terminan en /dashboard (ruta
  comodin). Se probaron y no existen como pantalla propia: /subscription,
  /subscribe, /subscription/plans, /billing, /checkout, /plan, /suscripcion,
  /mi-suscripcion, /my-subscription, /account, /characters, /my-characters,
  /my-photos, /photos, /my-voices, /my-loras, /plans, /packages, /lora,
  /lora-training, /train, /entrenar, /automation. OJO: el menu lateral SI
  muestra los rotulos "My Characters", "My Photos", "My Voices" y
  "Subscription", pero apuntan a las rutas de 17.11.
[DESCONOCIDO] La ruta exacta de la pantalla "Subscription" del menu (no se
  alcanzo por prueba directa); lo mas probable es que enlace a /pricing
  [DEDUCIDO]. En la nueva app conviene una ruta propia y clara: /mi-plan.

  Reglas de comportamiento:
  - Cabecera fija (sticky) translucida con desenfoque.
  - Selector de idioma: menu, guarda el idioma, ?lng=es / ?lng=en.
  - La portada declara versiones es/en con hreflang.

===============================================================================
4. INVENTARIO MAESTRO (publico)
===============================================================================
PANTALLAS PUBLICAS  [OBSERVADO]
  P-01 Portada /home · P-02 Planes /pricing · P-03 Login /login
  P-04 Confirmar eliminacion /account/confirm-deletion
  P-05 Galeria publica desactivada · P-06 Menu de idioma
  P-07 Aviso de precios (marca localStorage para no repetirlo) [DEDUCIDO]

PORTADA P-01 (10 secciones, en orden) [OBSERVADO]
  S-01 Cabecera fija: logo, "Ejemplos", "Precios", idioma, "Iniciar sesion",
       "Comenzar con Google".
  S-02 Hero: etiqueta "Tu estudio de IA. Sin limites.", titular de 3 lineas con
       degradado, parrafo, dos botones, fila de 4 metricas, videos e imagenes
       difuminadas de fondo con halos de color.
  S-03 Publicidad creada con IA: dos casos en video (inmueble y producto).
  S-04 "Esto lo hicieron nuestros usuarios": rejilla de videos verticales y
       horizontales con "100% generado con IA".
  S-05 "No usas una herramienta. Usas un equipo completo de IA.": 4 tarjetas.
  S-06 "Un click. Multiples IAs. Video terminado.": 3 pasos.
  S-07 "Tan simple que da rabia no haberlo encontrado antes": Elige un plan /
       Ejecuta un workflow / Descarga tu resultado.
  S-08 "Lo que nos hace diferentes": 4 tarjetas.
  S-09 Cierre: "Deja de imaginar. Empieza a crear."
  S-10 Pie: logo, Ejemplos, Precios, Contacto (WhatsApp), idioma, legales.
  Accesibilidad del original: 0 controles sin nombre, 0 imagenes sin alt
  [OBSERVADO]. Mantener esa vara.
  Videos de portada: /home-carousel/ (motion_face, baile_motion,
  cantando_con_escenas, cosplaybaile, lypsync, noticia, lypsinc_pidiendo,
  canto_con_esneas2) [OBSERVADO].

PLANES P-02 [OBSERVADO]
  Chapa: "Pago por WhatsApp · Sin renovacion automatica".
  Titulo "Tu estudio de IA personal"; subtitulo sobre generar imagenes, video y
  avatares y usar los creditos "hasta que se venzan".
  4 sellos: "Proba gratis al registrarte", "Activacion en minutos", "Pago
  discreto y privado", "Soporte humano real".
  Banda de regalo: "Registrate y recibe 1.000 creditos de regalo. Sin tarjeta."
  Selector 1 mes / 1 ano (-20%).
  Tarjetas: STARTER 40.000 creditos $14.9 (ano $11.9 / $143);
  CREATOR 75.000 $24.9 (ano $19.9 / $239) [MAS POPULAR];
  PRO 160.000/190.000 $49.9 (ano $39.9 / $479) [MEJOR VALOR];
  con "≈ N videos cantando de 12 s".
  Bloque "Necesitas menos?" (paquetes chicos, creditos 1 mes).
  "METODOS DE PAGO ACEPTADOS": Binance Pay, USDT, Skrill, Tarjeta,
  Transferencia + "Como funciona el pago".
  FAQ 6: sin renovacion automatica; los paquetes se suman y cada uno mantiene su
  fecha (se gasta antes el que vence antes); 3 pasos de pago por WhatsApp; por
  que link y no tarjeta (los procesadores no aceptan NSFW de IA); los creditos
  duran 1 mes; pago por link al instante.
  JSON-LD con precios 9.90 / 49.90 USD y 3 ofertas.

LOGIN P-03 [OBSERVADO]
  Panel centrado (max 448 px), logo, "Iniciar sesion", UN boton "Continuar con
  Google", selector de idioma. Sin campos de correo ni contrasena.
  OAuth2 con PKCE (S256), redirect_uri https://miafactory.app/api/auth/google/
  callback, scopes "openid email profile".

BORRAR CUENTA P-04 [OBSERVADO]
  Pantalla estrecha, titulo "Confirmar eliminacion de cuenta", advertencia y
  boton de confirmacion.

GALERIA PUBLICA P-05 [OBSERVADO]
  Interruptor apagado: "Galeria no activada" + "Esta galeria no se encuentra
  disponible en este momento." Trae comparador antes/despues.

===============================================================================
5. SISTEMA DE DISEÑO OBSERVADO (publico, medido)
===============================================================================
  Fondos: #030712 fondo; #111827 y #1f2937 superficies; capas blancas al 3-10 %.
  Texto: #ffffff, #d1d5db, #9ca3af, #6b7280; acentos #38bdf8, #fdba74,
    #7dd3fc, #34d399. Acento primario azul (#0284c7) y halos #0ea5e9;
    degradado de titulares azul -> violeta (#a855f7) -> rosa.
  Tipografia declarada "Outfit" 400-800, no cargada; en uso real pila del
  sistema (-apple-system, "Segoe UI", Roboto…).
  Tamaños: 12/14/16/18/20/24/30/36/48/72 px (hero 72 escritorio, 48 movil).
  Pesos: 400, 500, 600, 700, 800.
  Radios: 8/12/16/24/9999 px.
  Sombra: 0 10px 15px -3px rgba(0,0,0,.1) + 0 4px 6px -4px.
  Anchos de contenido: 1152 px principal; 1024, 896, 768, 672, 576, 512.
  Ritmo vertical: secciones 96 px (algunas 64), hero 128/80, pie 48.
  Espaciados: 4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 64, 96 px.
  Cortes: 420, 640, 768, 1024, 1280, 1536, 2500 px.
  Rejillas: hero 2, ejemplos 2, equipo 2 (3 en movil), pasos 3, diferencias 4,
  pie 4.
  Planes: #1f2937 y #374151, tarjeta destacada con borde y brillo, precio 48 px,
  pastillas "MAS POPULAR"/"MEJOR VALOR", listas de 7-9 beneficios con iconos.
  Color del tema del navegador: #0f172a.
REGLA: igualar estructura, ritmo, proporciones y cortes; NO igualar colores ni
tipografia (ver seccion 2).

===============================================================================
6. STACK TECNICO OBSERVADO Y ARQUITECTURA PROPUESTA
===============================================================================
[OBSERVADO] Cliente: Vite; React; react-router 6.30.3; lucide-react 0.460.0;
  i18next (es/en); estilos tipo Tailwind; codigo de negocio ofuscado
  (_0x...); carga por trozos con nombres legibles, entre ellos: index, router,
  utils, icons, Login, Dashboard, WorkflowExecute, LoraSelector, RichSelect,
  VoiceSelector, TTSVoiceSelector, mediaUtils, ImageCompare, RatioPicker,
  ActionBar, Gallery, Plegable, VideoModal, studioMedia, MyLoras, LoraTraining,
  Step, MyStyles, MyVoices, VoiceDesign, MyImages, CreditModal, ListaPaquetes,
  Pricing, Automation, chunkedUpload, LipsyncPro, apiError, Trans,
  SingerMultiScene, AvatarCantantePro, AnimeBatch, VideoReferencias,
  CambiarPersona, MotionEscenaV2, RecrearVideo, Performance, EstudioVoz,
  Lipsync, AudioStory, Videoclip, ListaVideoclips, DirectorStudioV2,
  VideoclipV2, WelcomeModal, CryptoMigrationModal, SupportUI, manualPayments,
  PaymentFields, ImageSelector, AudioFieldInput, LoraTrainingLink, videoUtils,
  VoiceOriginBadge, rangedDownload, media, automation, SongVideo,
  AutomationCostPreview, RecreateAdultLoras, Characters, Segmented, LookReal.
  Admin: AdminCustomers, AdminClient, AdminPayments, AdminActivity, AdminLab,
  AdminUsers, AdminAudit, AdminMonitor, AiBalances, AdminPricing,
  AdminSubscriptions, AdminGastos, AdminSecurity, AdminEmail, AdminOnboarding,
  AdminPromoCodes, AdminAnalytics, AdminRevenue.
  Guardian en linea que recarga hasta 3 veces si un trozo falla tras desplegar
  (usa sessionStorage "_inline_chunk_reload" y borra las cache).
  Cabeceras: CSP (script-src 'self' 'unsafe-inline' + cloudflareinsights;
  style-src 'self' 'unsafe-inline'; img-src 'self' https: blob: data:;
  media-src 'self' https: blob:; connect-src 'self' blob:
  https://www.runninghub.ai https://*.xiaoyaoyou.com
  wss://www.runninghub.ai https://cloudflareinsights.com;
  frame-ancestors 'self'), HSTS con includeSubDomains, X-Frame-Options,
  nosniff, Referrer-Policy strict-origin-when-cross-origin,
  Permissions-Policy, X-XSS-Protection.
  Cloudflare (Insights + RUM /cdn-cgi/rum, speculation rules), PWA
  (manifest.json, iconos 32/180/192/512, theme-color #0f172a).
  Recursos: /logo-full.webp?v=2 (preload), /previews/<slug>().webp(?vN),
  /home-carousel/*.mp4, /og-image.png.
  HTML con "caparazon" pre-renderizado visible antes de que React arranque
  (logo + "Tu idea. Nuestra IA." sobre #030712) y CSS critico en linea.
  Index estatico: 401 KB de JavaScript + trozos por ruta (WorkflowExecute solo
  pesa 186 KB).
  Cache: "no-cache, no-store, must-revalidate" en el HTML (los despliegues se
  ven al instante; el guardian de trozos cubre el hueco de las 2-3 s).
[DEDUCIDO] Backend propio bajo /api en el mismo dominio (Node/Fastify o similar,
  base relacional). La generacion real ocurre fuera (seccion 19).
[OBSERVADO, clave] El catalogo y los formularios son DATOS, no codigo: el
  servidor entrega el esquema de cada herramienta y el cliente lo pinta
  (17.12). Esto es lo primero que hay que reproducir bien: cambia todo el
  diseño del proyecto.

ARQUITECTURA PROPUESTA
  - Front: React 18 + TypeScript + Vite + Tailwind + react-router 6 + i18next,
    trozos por ruta con import() dinamico y Suspense.
  - Back: Node 20 + Fastify (o Next.js route handlers). API JSON en /api/*.
  - DB: PostgreSQL + Prisma. Creditos y dinero en enteros.
  - Sesion: OAuth 2.0 Google (PKCE) -> MEJOR que el original: cookie httpOnly,
    Secure, SameSite=Lax, con token corto + refresco (ver 19.7).
  - Trabajos largos: tabla jobs + worker + cola. Sondeo corto o SSE/WebSocket;
    reintentos limitados (el original usa 2) e idempotencia.
  - Archivos: S3 compatible propio con URLs firmadas y caducidad, o enlace
    directo al proveedor (el original hace lo segundo; ver 19.6).
  - Pagos: link de pago externo + panel de conciliacion + webhook firmado.
  - Analitica: endpoint propio /api/analytics/events con lista blanca.
  - Observabilidad: logs con id de peticion, panel de errores.
  - FORMULARIOS: un solo componente "Renderizador de formulario" que recibe la
    lista de campos y sabe pintar cada tipo (seccion 17.12). Sin esto, cada
    herramienta nueva cuesta un dia; con esto, cuesta una fila en la base.

===============================================================================
7. MODELO DE DATOS PROPUESTO (adaptar a lo observado)
===============================================================================
users(id, google_sub, email, name, avatar_url, locale, role, adult_content,
      nsfw_previews, use_character_loras, plan, created_at, deleted_at)
credit_lots(id, user_id, source[welcome|package|admin], credits_total,
      credits_left, expires_at NULL = sin vencimiento, created_at)
credit_ledger(id, user_id, lot_id, delta, reason, ref_type, ref_id, created_at)
packages(id, code, name, credits, price_usd, period_months, badge, active)
orders(id, user_id, package_id, amount_usd, method, status, external_ref,
      paid_at, created_by)
workflows(id_slug PK, name, description, category, icon, preview_image,
      instance_type, output_type, output_count, includes_zip,
      includes_original, base_cost, is_nsfw, has_nsfw_mode, is_beta, is_legacy,
      admin_only, enabled, sort)
workflow_fields(id, workflow_id, name, kind, label, help_text, info_detail,
      required, default_value, options_json, rules_json (show_when/hide_when),
      slider, improvable, sort)
jobs(id, user_id, workflow_id, status[QUEUE|RUNNING|SUCCESS|ERROR|EXPIRED],
      inputs_json, params_readable_json, cost_credits, provider,
      provider_job_id, progress, error_code, error_message, retry_count,
      retry_max, gpu_cost_time, is_test, is_nsfw, is_public, batch_group_id,
      result_url, result_type, created_at, started_at, completed_at,
      expires_at, applied_enhancements_json)
job_outputs(id, job_id, kind[image|video|audio], url, thumb_url, meta_json)
casts(id, user_id, name, description, source_kind[photo|words], created_at)
cast_members(id, cast_id, person_index, label, thumb_url)      -- "Nuevo elenco"
character_photos(id, user_id, character_name, tag, url, created_at) -- Mis Fotos
character_loras(id, user_id, character_name, base_model, status, trained_by,
      created_at)                                            -- Mis LoRAs
voices(id, user_id, name, origin[designed|cloned_imported], model, sample_url,
      created_at)                                            -- Mis Voces
saved_styles(id, user_id, name, prompt_json, created_at)      -- Mis Estilos
galleries(id, owner_user_id, slug, title, active)
gallery_items(id, gallery_id, job_output_id, sort, caption, visible)
onboarding(id, user_id, welcome_shown_at, heard_from, attribution_json)
provider_accounts(id, provider, label, balance_usd, checked_at) -- AiBalances
expenses(id, provider, concept, amount_usd, job_id NULL, created_at)
audit_log(id, actor_user_id, action, target, meta_json, created_at)
REGLAS: se gasta primero el lote que vence antes (FIFO por expires_at, NULL al
final); todo movimiento deja fila en credit_ledger; un job cobra al aceptar y
devuelve si falla por causa del sistema; los resultados caducan (14 dias).

===============================================================================
8. API OBSERVADA Y API PROPUESTA
===============================================================================
[OBSERVADO] del cliente real:
  GET  /api/auth/me                            usuario de la sesion
  POST /api/auth/attribution                   atribucion de origen
  GET  /api/auth/heard-from                    como nos conocio
  GET  /api/workflows                          CATALOGO CON LOS FORMULARIOS
  POST /api/credits/calculate-cost             precio antes de generar
  GET  /api/credits/balance                    saldo
  GET  /api/credits/history?limit=30&offset=0  movimientos paginados
  GET  /api/tasks?limit=20&offset=0&include_expired=false&collection=normal
  GET  /api/tasks/meta/etas                    estimaciones de duracion
  POST /api/workflows/<slug>/execute           lanza la generacion (multipart)
  GET  /api/avatar/videos?limit=20&offset=0    avatares
  GET  /api/studio/videos?limit=20&offset=0    videos del estudio
  GET  /api/onboarding/state
  POST /api/onboarding/welcome-shown
  POST /api/analytics/checkout-event
  GET  /api/admin/revenue/migration-info/{id}  (ver aviso de seguridad)
  OJO: al abrir /api/* directamente en el navegador el servidor responde
  401 con cabecera www-authenticate: Bearer. El token no viaja en cookie, lo
  pone el JavaScript en la cabecera Authorization.
API PROPUESTA (añadir, con nombres propios):
  POST /api/auth/google · POST /api/auth/logout · DELETE /api/me
  POST /api/account/confirm-deletion
  GET  /api/workflows/:slug (esquema del formulario)
  POST /api/jobs  (body {workflow, inputs[]}, cabecera Idempotency-Key)
  GET  /api/jobs/:id · DELETE /api/jobs/:id · POST /api/jobs/:id/retry
  GET  /api/packages · POST /api/orders
  CRUD /api/casts (elenco) · CRUD /api/character-photos · /api/character-loras
  CRUD /api/voices · CRUD /api/styles
  GET  /api/galleries/:slug · PUT /api/galleries/:slug
  GET/PATCH /api/settings (idioma, adulto, previews, LoRAs)
  (admin) GET/POST /api/admin/orders · /api/admin/workflows · /api/admin/users ·
          /api/admin/balances · /api/admin/expenses
Todas: JSON, error {code, message}, 401 sin sesion, 403 por rol, paginacion
limit/offset, y las de administracion cerradas por rol EN EL SERVIDOR.

===============================================================================
9. REGLAS DE NEGOCIO QUE HAY QUE RESPETAR
===============================================================================
[OBSERVADO] 1. No hay renovacion automatica: se paga una vez.
[OBSERVADO] 2. Los creditos comprados duran 1 mes; lo no usado se pierde.
  OJO: los creditos de bienvenida aparecen "sin vencimiento".
[OBSERVADO] 3. Dos compras se suman, cada lote con su fecha; se consume antes el
  que vence antes.
[OBSERVADO] 4. Regalo de bienvenida: 1.000 creditos, sin tarjeta.
[OBSERVADO] 5. Pago por WhatsApp con link; metodos Binance Pay, USDT, Skrill,
  tarjeta, transferencia; activacion "en minutos".
[OBSERVADO] 6. Subida de precios del 14 de noviembre: cada generacion cuesta el
  DOBLE de creditos; a los planes pagados vigentes se les duplicaron los
  creditos. Aviso leido completo: "Subio el costo de procesamiento, asi que
  desde el 14 de noviembre cada generacion usa el doble de creditos. Si tenias
  un plan pagado vigente, sus creditos se duplicaron automaticamente: te
  alcanzan para lo mismo que antes. Los planes y paquetes nuevos traen la
  cantidad que ves en Planes."
[OBSERVADO] 7. Cada herramienta muestra su coste antes de ejecutar y el servidor
  recalcula el precio al cambiar opciones (POST /api/credits/calculate-cost).
[OBSERVADO] 8. Resultados guardados 14 dias y luego borrados. Se comprobo que
  el archivo no esta en su servidor, sino en el del proveedor: por eso caduca.
[OBSERVADO] 9. Contenido +18 opcional: un interruptor hace visibles 15
  herramientas NSFW y otro quita el difuminado de las miniaturas.
[OBSERVADO] 10. Un trabajo de imagen cuesta 120 creditos con las opciones por
  defecto del Generador de Imagen (motor Krea 2, 2K, vertical 9:16, 1 imagen);
  el precio de catalogo (base_cost) es 94 y el Upscaler cuesta 400.
[OBSERVADO] 11. El catalogo tiene funciones escalonadas por plan: Mis Estilos
  solo esta para Creator y Pro; varias herramientas llevan chapa PRO o PREMIUM;
  el plan gratuito ve un banner "Activate your subscription" (en ingles).
[DEDUCIDO] 12. Idioma es/en (el español usa forma rioplatense: "Subís", "Elegí",
  "Contá"). Elegir un español neutro propio y aplicarlo en TODO.
[DEDUCIDO] 13. Los creditos son la unidad de cobro; el precio "$" de los
  paquetes y el coste por generacion deben cuadrar entre si. OJO: 94 creditos
  de catalogo frente a 120 cobrados por defecto => el precio depende de las
  opciones marcadas (Realism V2, gestos, refinar piel +15 cr/imagen, cantidad).

===============================================================================
10. SEGURIDAD OBSERVADA Y ENDURECIMIENTO
===============================================================================
[OBSERVADO] Bien puesto: CSP, HSTS con includeSubDomains, X-Frame-Options,
  nosniff, Referrer-Policy, Permissions-Policy, X-XSS-Protection, hashes de
  integridad en scripts de terceros, iconos en tamaño real (comentario en el
  HTML: antes se servia un logo de 934 KB).
[OBSERVADO] Cuatro cosas a NO repetir:
  - Un endpoint de administracion (/api/admin/revenue/migration-info/{id})
    llamado desde el cliente en TODAS las pantallas del panel y respondiendo
    200 a una cuenta normal sin plan. En la nueva app, todo /api/admin/* se
    cierra por rol en el servidor.
  - Claves de traduccion sin traducir visibles en la interfaz
    ("filters.director"). En la nueva app: prueba automatica que falla si
    aparece una clave cruda.
  - La sesion vive en localStorage (clave "auth-storage") y se envia como
    cabecera Authorization. Cualquier inyeccion de codigo en la pagina puede
    leerla. En la nueva app: cookie httpOnly + Secure + SameSite=Lax.
  - Mezcla de idiomas en la misma pantalla (saludo y descripciones de grupo en
    ingles, tarjetas en español). En la nueva app: un solo idioma por pantalla.
[DESCONOCIDO] Sin comprobar: duracion de la sesion, permisos por rol, validacion
  en servidor, limites de subida, proteccion contra abuso.
[RECOMENDADO] Validar todo en servidor; limitar tamaño y tipo de archivo; rate
  limit por usuario al lanzar trabajos; auditar acciones sensibles; borrado de
  cuenta en 2 pasos con correo y purga de archivos. Y como el formulario es
  multipart con archivos (imagenes y audios), comprobar tipo real, tamaño y
  nombre antes de guardar nada.

===============================================================================
11. TEXTOS DE REFERENCIA (reescribir con voz propia)
===============================================================================
No copiar parrafos. Intencion a reproducir:
  - Portada: resultado rapido sin saber tecnico; prueba social con ejemplos;
    3 pasos; 4 diferencias; cierre con accion.
  - Planes: quitar el miedo ("sin renovacion automatica"), explicar el
    vencimiento sin letra chica, resolver 6 dudas.
  - Panel: nombres de herramienta en imperativo y en cristiano ("Quitar Fondo",
    "Copiar Pose", "Texto a Voz"), una linea de que hace y el coste al lado.
    Ver 17.9: la frase de cada tarjeta explica QUE cambia y PARA QUE sirve, no
    como esta hecho. Mantener esa longitud (una linea, 60-140 caracteres).
  - Errores y vacios: cortos, en el idioma del usuario, con salida.

===============================================================================
12. (reservado)
===============================================================================
En la v1.0 esta seccion proponia un panel de diseño propio porque no se podia
ver. Ya NO aplica: manda la seccion 17.

===============================================================================
13. PLAN DE CONSTRUCCION POR ETAPAS
===============================================================================
E0 Preparacion (0,5 dia): repo, TypeScript estricto, lint, entornos, .env de
   ejemplo, sistema de diseño propio. Prueba: pagina de muestra a 390/768/1440.
E1 Cascaron y navegacion (0,5 dia): rutas publicas y privadas, redireccion de
   "/" y de rutas desconocidas, 404 PROPIA (no comodin silencioso), cabecera
   fija, pie, idioma es/en persistido, SEO por pagina + hreflang.
E2 Portada (1-2 dias): las 10 secciones con videos e imagenes propias; imagenes
   con width/height, video con preload none y poster, carga diferida.
   Prueba: sin errores de consola ni peticiones fallidas; sin scroll lateral.
E3 Planes (1 dia): tres paquetes con periodo mes/año, sellos, metodos, FAQ,
   JSON-LD de ofertas. Prueba: importes y creditos cuadran con packages.
E4 Cuentas (1-2 dias): OAuth Google, sesion con cookie httpOnly, /api/me,
   cierre de sesion, confirmacion de borrado. Prueba: sin sesion /api/* = 401.
E5 Creditos y pedidos (1-2 dias): lotes (incluido el de bienvenida sin
   vencimiento), libro, FIFO por vencimiento, pedidos y acreditacion.
   Prueba: dos compras con fechas distintas se consumen en el orden correcto.
E6 Motor de trabajos (3-4 dias): POST /api/jobs idempotente, calculo de coste
   previo, cola con posicion, worker, estados, progreso, reintentos limitados,
   resultados con caducidad, devolucion de creditos al fallar. Prueba: dos
   peticiones con la misma Idempotency-Key no cobran dos veces.
E7 Panel (4-5 dias): catalogo desde base de datos con grupos, subgrupos y
   filtros por categoria (el original NO tiene buscador en el catalogo: solo
   chips de filtro; si tiene buscador "Buscar workflow" en la galeria); el
   RENDERIZADOR DE FORMULARIOS (17.12) con coste en vivo; galeria; creditos; y
   las pantallas de apoyo (elenco, fotos, LoRAs, voces, estilos).
   Prueba: cambiar una fila de workflow_fields en la base cambia el formulario
   sin recompilar.
E8 Administracion (2-3 dias): pedidos por conciliar, acreditar creditos, activar
   herramientas y costes, usuarios, saldos de proveedores, gastos, auditoria.
E9 Remate (1-2 dias): accesibilidad (foco visible, nombres, contraste AA),
   textos de error, estados vacios, correo transaccional, copias, despliegue.
Dependencias: E0 antes que todo; E4 antes que E5/E7; E5 y E6 antes que E7;
E8 despues de E5.

13.1 Correccion respecto a versiones anteriores
  En v1.0-v1.4 se dijo que TODA ruta privada desconocida cae al panel. Es
  cierto para rutas de pantalla, pero NO para /workflow/<id>: si el id no
  existe, aparece una pantalla propia "Workflow no encontrado" con "Volver al
  dashboard" [OBSERVADO]. Es decir: el catalogo si distingue "herramienta
  inexistente" de "ruta inexistente". En la nueva app, hacerlo bien en los dos
  casos.

===============================================================================
14. COMO MEDIR LA PARIDAD
===============================================================================
Funcional (se prueba ejecutando, no vale "se ve bien"): tabla flujo -> estado
(OK / ROTO / FALTA) con la prueba que lo demuestra. Recorrido completo, que en el
original YA SE COMPROBO de punta a punta: portada -> planes -> login -> ficha de
herramienta -> generar -> cola -> estado SUCCESS -> aparece en galeria con fecha
-> creditos descontados (1000 -> 880) -> archivo descargable desde el CDN del
proveedor -> caduca a los 14 dias.
Visual (capturas, no a ojo): capturas a 1440, 768 y 390 px de cada pantalla y
estado (menu abierto, modal, error, vacio). Comparar por zonas: estructura,
tamaño de titulares, relleno de secciones, ancho del contenido, elementos por
fila. Aceptar diferencias de color de marca; no aceptar cambios de estructura ni
de ritmo vertical. Comprobar: sin scroll horizontal, sin errores de consola, sin
peticiones fallidas, nombres accesibles en todos los controles.
Limites honestos a declarar:
  - Se vio el formulario de UNA herramienta en pantalla (Generador de Imagen) y
    se siguio UNA generacion hasta el final.
  - Del resto de herramientas se tiene el ESQUEMA COMPLETO de dos
    (Generador de Imagen y Upscaler) leido en la respuesta del servidor, y la
    FORMA del esquema de las 33 (17.12). Las otras 31 no se abrieron en
    pantalla: sus campos exactos no estan transcritos.
  - Se vieron las pantallas de apoyo (galeria, creditos, ajustes, LoRAs,
    personajes, fotos, voces, estilos) pero solo en estado VACIO.
  - No se probo un trabajo fallido ni uno caducado (habria que esperar 14 dias).
  - La pantalla "Subscription" no se alcanzo; 25 rutas candidatas acabaron en
    /dashboard.
  - Nada de "100 % igual" sin captura que lo respalde.

===============================================================================
15. RIESGOS Y COMO EVITARLOS
===============================================================================
  - Copiar marca o recursos: prohibido. Logo, videos e imagenes propias.
  - Presentar como observado lo que es diseño nuevo: marcar siempre.
  - Coste descontrolado de IA: tope por usuario, coste visible, registro y
    panel de saldo por proveedor (asi se ve cuanto queda antes de quedarse seco).
  - Cola lenta: el original muestra "posicion en la cola" (se vio la 6) y aun
    asi tardo; conviene estimar tiempo (/api/tasks/meta/etas) y avisar.
  - Enlazar archivos del proveedor (lo que hace el original) ahorra
    almacenamiento y ancho de banda, pero si el proveedor borra o cambia la URL
    el usuario pierde el trabajo. Alternativa: copiar el archivo a
    almacenamiento propio con fecha de caducidad propia.
  - Trabajos que pierden estado al recargar: estado en servidor.
  - Creditos sin trazabilidad: todo al libro; nunca un UPDATE suelto.
  - Vencimientos mal calculados: fecha por lote, nunca una por usuario.
  - Pagos manuales sin conciliacion: pedido con estado y auditoria.
  - Pantallas de apoyo vacias que parecen rotas: en la nueva app, cada estado
    vacio debe explicar los 2-3 pasos para llenarlo (el original lo hace bien:
    ver 17.8) y ofrecer un boton que empiece el primero.
  - Rutas inventadas: el original resuelve casi cualquier ruta privada
    desconocida con un comodin a /dashboard, asi que un enlace mal escrito
    "parece" funcionar. En la nueva app: 404 propia y aviso claro.
  - Bugs vistos en el original (clave sin traducir, endpoint admin abierto,
    token en localStorage, mezcla de idiomas): no heredarlos.
  - Depender de un solo proveedor de GPU: tener segundo proveedor y tope.
  - Formularios escritos a mano uno por uno: el original los genera desde datos.
    Hacerlo igual o cualquier cambio de precio/campo obliga a tocar codigo.

===============================================================================
16. ANEXO A: EVIDENCIA Y ARCHIVOS EN DISCO (parte publica)
===============================================================================
Carpetas junto a este archivo:
  captura-home\              screenshot-1440.png, screenshot-390.png,
                             page.html, capture.json, README.md
  captura-pricing\           idem para planes
  captura-login\             idem para login
  captura-eliminar-cuenta\   idem para confirmar borrado
  estados-home\              state-1.png + states.json (menu de idioma)
IDs de evidencia de la parte publica: ev_27e5a8fd, ev_09b1f20a, ev_396f6c45,
ev_b37c2998, ev_625f9b2a, ev_ccb66d49, ev_739bf82b, ev_be4acf25, ev_28111365,
ev_305a5f5d, ev_5bc43e53, ev_2850c402, ev_675edd2b, ev_2541cd7c, ev_79a4bc26,
ev_633cebb6, ev_17066973, ev_c0b26cea, ev_90a669a9, ev_e0efc83d, ev_5197f158,
ev_f1c8f6e1, ev_a55c11a3, ev_5dd390d0, ev_a8050f45, ev_2072cd77, ev_ba467ac5,
ev_f2b9cea8, ev_99b49dea, ev_6b37fa4c.

===============================================================================
17. ANEXO B: EL PANEL PRIVADO, YA OBSERVADO
===============================================================================
[OBSERVADO] con una cuenta real, salvo lo marcado. Evidencia: ev_a16b001f (panel),
ev_fe06dae7 (catalogo completo), ev_83247fe8 (captura), ev_ff6739c3 (creditos),
ev_5fdb9f60 (galeria), ev_c47946fc / ev_864055ee / ev_4d142ef3 (red),
ev_e99e295b (ajustes), ev_f96b89d4 (flujo OAuth), ev_38d41a4a (galeria con un
trabajo terminado), ev_051beb8c (recursos y almacenamiento), ev_9890066f
(captura de la galeria), ev_86e7b6b1 (catalogo leido entero, 1.381 nodos),
ev_2906bfed (LoRAs), ev_56c87dfe (personajes), ev_337ad19c (fotos),
ev_abfbfdb4 (voces), ev_31641019 (estilos), ev_398ecbe8 (respuesta completa de
/api/workflows), ev_c35fad04 (pantalla de herramienta inexistente).

17.1 Estructura de la pantalla
  Cabecera fija: logo; enlace "Subscribe"; enlace "Credits" con el saldo;
  avatar con la inicial; nombre y correo; boton "Language" (ES/EN); boton
  "Log out".
  Menu lateral: Dashboard, Gallery, My Characters, Entrena tu personaje,
  My Photos, My Voices, Credits, Subscription, Settings (los rotulos estan en
  ingles aunque el contenido este en español).
  Aviso superior descartable ("Cerrar aviso") con el cambio de creditos del
  14 de noviembre.
  Al entrar: modal "Bienvenido a MIA Factory" y, si no se respondio, la
  pregunta "¿Cómo nos conociste? (opcional)" con 8 botones (TikTok, YouTube,
  Instagram / Facebook, ChatGPT u otra IA, Google, Un amigo, Comunidad / curso,
  Otro) y un boton Cerrar. Se marca como vista (POST /api/onboarding/
  welcome-shown).

17.2 Dashboard (catalogo)
  Saludo personal + "Pick a tool to get started" [OBSERVADO, en ingles].
  Bloque superior: banner "Entrena tu personaje" ("¿Todavia no tienes un LoRA?
  Lo preparamos con tus fotos y lo activamos en tu cuenta." + "LoRA para Krea 2"
  + "US$5" + "Ver requisitos") y, si no hay plan, "Activate your subscription /
  Get 40,000 credits/mo and access to every AI tool." + "See plans".
  Filtros con contador: All 33 · [filters.director sin traducir] 5 · Image 11 ·
  Video 13 · Audio 4 · +18 15. NO hay buscador en el catalogo [OBSERVADO: no
  existe ni campo de texto ni rol searchbox]. El buscador "Buscar workflow"
  esta en la galeria.
  Cada tarjeta: miniatura (/previews/<preview>.webp), etiqueta de categoria,
  chapas (+18, ✨ PRO, BETA, 🎬 TOP, GRATIS, Compare, Multiple), nombre,
  descripcion de una linea y COSTE en creditos. La tarjeta entera es un enlace
  a /workflow/<id>.
  Tarjetas que admiten "Show older models (2) — previous versions; we recommend
  the ones above" (desplegable de versiones anteriores).
  Grupos y herramientas (nombre · coste):
   AI Director Studio (PREMIUM, 5): Lipsync Escenas Pro 23600 · Historia Visual
   5600 · Video con Referencias 1120 · Performance 1536 · Primera y Ultima Foto
   880.
   Image (11): Generador de Imagen 94 · Generador de Poses 364 · Editor de
   Imagen 100 · Edicion avanzada 850 · Aumentar Pecho 144 · Face Swap 128 ·
   Copiar Pose 150 · Quitar Fondo 68 · Cambiar Fondo 308 · Look Real 0
   (corre en el navegador) · Upscaler de Imagenes 400.
   Video (13): Una foto que habla o canta (variable) · Imagen a Video 400 ·
   Efecto Digicam 200 · Foto a Video 300 · Animar Foto +18 240 · Motion Escena
   1526 · Motion Escena V2 · Recrear video · Motion Transfer (variable) ·
   Motion Transfer v3 +18 466 · Quitar Marca de Agua 600 · Talking Avatar Anime
   2D · Talking Avatar Anime 3D.
   Audio (4): Generar Musica 100 · Diseñar una voz 80 · Texto a Voz 138 ·
   Cambiar Voz 62.
  REGLA: el catalogo se genera desde la base de datos, no escrito a mano.

17.3 Creditos (/credits)
  Saldo grande, "N paquete activo", lotes con barra consumido/total, origen
  ("Creditos de bienvenida") y caducidad ("sin vencimiento").
  Botones "Historial" y "Comprar Creditos". Filtro: Todos / Usos /
  Automatizaciones / Paquetes / Ajustes / Vencidos, con contador.
  Libro: concepto, fecha y hora, cantidad con signo y "Saldo: N" despues.

17.4 Galeria (/gallery)
  "Historial de tus generaciones", boton "Actualizar pendientes", aviso fijo de
  que los archivos se borran a los 14 dias, filtros Todos / Imagen / Video /
  Audio / Pipeline / Ver vencidos con contadores, buscador "Buscar workflow".
  Vacio: "Aun no has generado nada / Ejecuta un workflow para ver tus creaciones
  aqui".
  Con un trabajo hecho [ev_38d41a4a]: tarjeta con miniatura, nombre del
  workflow, fecha y hora ("19 nov, 04:37"), chapa de estado ("SUCCESS"),
  botones "Ver" y "Descargar", y al final "— Eso es todo, no hay mas
  resultados —".

17.5 Ajustes (/settings)
  "Mostrar contenido adulto (workflows 18+)" y "Mostrar previews NSFW sin
  difuminado"; "Avanzado": "Usar LoRAs de personaje"; ficha de perfil (nombre,
  correo, "Cuenta vinculada con Google", Plan, Creditos, "Miembro desde");
  legal; "Zona de peligro": "Eliminar cuenta".

17.6 Flujos y estados
  1) Entrar: /login -> Google -> /login?google_auth=1 -> /dashboard, con modal
     de bienvenida la primera vez, pregunta de origen y banner de aviso arriba.
  2) Elegir herramienta: filtro -> tarjeta -> ficha -> formulario -> "Generar"
     -> "¡Tarea encolada! Sera procesada automaticamente." con posicion en cola
     -> resultado en galeria.
  3) Saldo insuficiente: aviso con saldo, coste y boton "Comprar Creditos".
  4) Contenido +18: apagado por defecto; 15 herramientas ocultas o difuminadas.
  5) Casos raros: coste "Variable" (mostrar horquilla), herramienta gratis que
     corre en el navegador, trabajo fallido (devuelve creditos), resultado
     caducado, funcion bloqueada por plan (Mis Estilos), herramienta inexistente
     ("Workflow no encontrado").

17.7 Sin ver (no inventar)
  [DESCONOCIDO] Los campos exactos de las otras 31 herramientas (se tiene la
  forma del esquema, no cada campo).
  [DESCONOCIDO] Las pantallas de apoyo CON CONTENIDO (solo se vieron vacias).
  [DESCONOCIDO] Un trabajo fallido y uno caducado.
  [DESCONOCIDO] La pantalla "Subscription"; duracion de la sesion; permisos por
  rol; administracion.

17.8 Las cinco pantallas secundarias
  Las cinco comparten cabecera y menu, un titulo grande, un parrafo corto de
  para que sirven y un boton principal a la derecha. Es un patron muy repetible.
  [OBSERVADO]
  a) /loras — "Mis LoRAs". Texto: los personajes entrenados "los administra el
     equipo" y aparecen directo en los modulos que los usan; si hace falta uno
     nuevo, se escribe al soporte. Enlace al entrenamiento (US$5).
     Lectura de producto: la funcion esta SEMI-MANUAL; el usuario no entrena,
     pide. No hace falta construir un entrenador para tener paridad.
  b) /personajes — "Mis personajes". Boton "Nuevo elenco". Explicacion: guardar
     un personaje una vez y usarlo en varias historias para que salga igual de
     un video a otro sin volver a describirlo. Dos caminos de entrada:
     "Soltá una foto — Si salen varios, los detecta a todos" y
     "...o describirlo con palabras en vez de una foto".
     Implica deteccion de caras y fichas reutilizables por historia.
  c) /images — "Mis Fotos". Libreria de referencias para personajes. 3 pasos:
     1 Crea un personaje (ejemplos de nombre: "aylia", "maria"); 2 Sube sus
     fotos (con etiquetas como "playa" o "estudio"); 3 Usalas en workflows
     ("Selecciona desde Mi Libreria"). Boton "Crear mi primer personaje".
     Aviso: "Puedes guardar hasta 20 imagenes".
  d) /voices — "Mis Voces". Subtitulo: guardar voces originales o muestras y
     reutilizarlas en los textos. Boton "Agregar Voz". Enlace a "Diseñar una voz
     original" (describir timbre, acento y estilo, escuchar muestra y guardarla,
     SIN subir audio). Filtro "Filtrar por origen de voz": Todas 0 / Diseñadas
     con IA 0 / Clonadas o importadas 0, con una nota que explica la diferencia.
     Vacio: "No tienes voces guardadas / Diseña una voz desde una descripcion o
     agrega una muestra de audio." + "Agregar mi primera voz".
  e) /styles — "Mis Estilos". BLOQUEADA por plan: "Los estilos guardados son
     parte de Historia Visual, disponible con los planes Creator y Pro."
     Es el unico muro de plan visible de forma explicita en el panel.
  Reglas a copiar: cada pantalla vacia ENSEÑA a llenarse (2-3 pasos numerados,
  ejemplos concretos, un boton que arranca el paso 1) y dice el limite
  ("hasta 20 imagenes").

17.9 El catalogo por dentro: rotulos y frases
  [OBSERVADO] Estructura de cuatro niveles, y es lo que da sensacion de orden:
   grupo (con nombre y una frase) -> subgrupo (rotulo en mayusculas con una
   frase corta) -> tarjeta (nombre + una frase + coste) -> chapas.
  Grupos y su frase:
   "AI Director Studio" (PREMIUM) — "The extra value lives here: AI directors
     for songs, stories, ads and more, directing your whole video instead of
     just generating it".
   "Image" — "Generate, edit, and upscale images with AI".
   "Video" — "Animate images, create videos, and boost quality".
   "Audio" — "Clone voices, generate music, and sync audio".
  Subgrupos de Image, en orden, con su frase:
   FROM SCRATCH — "you write it, it appears"
   EDIT THE PHOTO — "change something in an image you already have"
   FACE & POSE — "swap a face or a pose"
   BACKGROUND — "remove or replace what's behind"
   ENHANCE IMAGE — "higher resolution or a more realistic finish"
  Subgrupos de Video, en orden, con su frase:
   TALKS OR SONGS — "add a voice or a song and the mouth follows"
   ANIMATE A PHOTO — "one photo, you describe the movement"
   COPY MOVEMENT — "give it a video: copy the movement, or swap who appears"
   FIX A VIDEO — "clean up or upscale an existing video"
  Subgrupos de Audio: MUSIC ("songs from an idea") y VOICE ("design, use or
   change a voice").
  Frases de tarjeta (muestra de tono y longitud, NO copiar):
   Generador de Imagen: "Genera imagenes a partir de texto. Opcionalmente aplica
     tu LoRA de personaje."
   Quitar Fondo: "Elimina el fondo de tus imagenes con IA. Puedes procesar una
     sola imagen o un lote."
   Cambiar Fondo: "Reemplaza el fondo blanco de tus fotos con escenarios
     realistas. IA analiza el estilo y genera el fondo perfecto."
   Look Real: "Grano y color de pelicula para que tus imagenes se vean menos IA.
     Gratis, en tu navegador."
   Upscaler: "Aumenta la resolucion y nitidez de tus imagenes con Upscaler
     Optimo."
   Imagen a Video: "Genera un video a partir de una imagen y un prompt. 3 modos:
     manual, auto-animacion o cinematico."
   Efecto Digicam: "Anima tu foto con flash y textura de camara digital. Hasta
     15 segundos, con dialogo opcional."
   Motion Escena V2: "Cambia a la persona de un video conservando su movimiento,
     audio y entorno."
   Recrear video: "Reinterpreta las acciones y planos de un video con tu persona
     o producto."
   Quitar Marca de Agua: "Elimina marcas de agua y subtitulos incrustados de un
     video con IA... La salida se entrega en ~720p."
   Generar Musica: "Genera musica instrumental o con letra a partir de tags de
     estilo. Multiples variaciones."
   Texto a Voz: "Dale voz a tus historias. Elige una voz del sistema o una de
     tus voces, escribe el texto y genera tu audio."
  Patron de redaccion que hay que imitar: verbo en imperativo + QUE hace + un
  detalle practico (cuantas imagenes, que duracion, que calidad, si es gratis).
  Chapas vistas: +18, ✨ PRO, BETA, 🎬 TOP, GRATIS, Compare (tiene comparador
  antes/despues), Multiple (varias salidas).
  [DEDUCIDO] "Compare" y "Multiple" NO son adornos: se corresponden con datos
  reales del esquema (ver 17.12): el servidor dice si la salida es un comparador
  (type "compare", con original incluido) o varias salidas (count). Contarlas
  al planificar.

17.10 Mapa de rutas privadas, verificado
  Existen y cargan pantalla propia: /dashboard · /workflow/<id> · /gallery ·
  /credits · /settings · /loras · /personajes · /images · /voices · /styles.
  /workflow/<id> con id inexistente -> pantalla "Workflow no encontrado".
  Probadas y NO existen como pantalla (terminan en /dashboard):
  /subscription, /subscribe, /subscription/plans, /billing, /checkout, /plan,
  /suscripcion, /mi-suscripcion, /my-subscription, /account, /characters,
  /my-characters, /my-photos, /photos, /my-voices, /my-loras, /plans,
  /packages, /lora, /lora-training, /train, /entrenar, /automation.
  Consecuencia de diseño a no repetir: el comodin hace que un enlace roto de
  pantalla "parezca" funcionar. La nueva app necesita 404 propia en todos los
  casos.
  [DESCONOCIDO] La ruta de "Subscription" (probablemente /pricing) [DEDUCIDO].

17.11 Traduccion de rotulos del menu a rutas (para el constructor)
  Dashboard -> /dashboard
  Gallery -> /gallery
  My Characters -> /personajes
  Entrena tu personaje -> /loras (y desde ahi el enlace de entrenamiento US$5)
  My Photos -> /images
  My Voices -> /voices
  Credits -> /credits
  Subscription -> [DESCONOCIDO] (probablemente /pricing)
  Settings -> /settings

17.12 COMO SE DESCRIBE UN FORMULARIO (el hallazgo mas util)
  [OBSERVADO] GET /api/workflows devuelve 83.252 bytes con la lista completa de
  herramientas. Cada una se describe asi (campos exactos del original):
    id                 texto, es ADEMAS la ruta: /workflow/<id>  ("upscaler")
    name               nombre visible ("Upscaler de Imágenes")
    description        una linea, la misma que se ve en la tarjeta
    category           "imagen" | "video" | "audio" | (director)
    icon               emoji
    is_nsfw            la tarjeta lleva +18
    has_nsfw_mode      admite el interruptor "Modo adulto (+18)"
    is_beta / is_legacy / admin_only
    preview_image      "/previews/<fichero>.webp?v=2"
    instance_type      "default"
    output_info        {type: "image"|"compare"|..., count, includes_zip,
                        includes_original}  -> decide la pantalla de resultado
    enabled            si se muestra
    base_cost          coste en creditos (94 el generador de imagen, 400 el upscaler)
    fields[]           LA LISTA DE CAMPOS DEL FORMULARIO
  Y cada campo de fields[] trae:
    name          clave que viaja al servidor ("engine", "prompt", "format"…)
    type          QUE CONTROL PINTAR: select, switch, textarea, image, number,
                  audio, y tipos propios: qwen_generator_options,
                  zimage_refinement, krea_personaje_styles, lora_selector,
                  ratio_picker…
    label         texto visible ("Formato", "Intensidad del realismo")
    required      obligatorio o no
    default       valor inicial ("krea2_realism", "false", "9:16", 1.0)
    options[]     para los desplegables y botones de motor: value, label,
                  description, badge ("RECOMENDADO", "NUEVO"), image y
                  compare_image (miniatura Y foto grande del motor), legacy
    placeholder   ejemplo dentro del campo de texto
    help_text     una linea de ayuda ("0.07 recomendado para la mayoria…")
    info_detail   explicacion larga (para un "mas informacion")
    slider        se pinta como deslizador (intensidad)
    improvable    lleva boton "Mejorar con IA" (solo el prompt)
    show_when     el campo solo aparece si otro vale X (o esta en una lista)
    hide_when     el campo desaparece si otro vale X
    display       "cards" = se pinta como tarjetas con foto, no como desplegable
  Ejemplo real (Generador de Imagen, resumido) [OBSERVADO]:
    engine       select, por defecto "krea2_realism", opciones:
                 krea2_realism "Krea 2 Personaje" (RECOMENDADO PARA MODELOS)
                 desirex3 "DesireX · Foto natural" (RECOMENDADO)
                 krea2 "Krea 2" (RECOMENDADO ANIME)
                 moss "MOSS · Chicas reales" (NUEVO)
                 flux_klein "Flux Klein"
                 qwen21 "Qwen Image 2.1"
                 z-imagen "Z-Imagen" (legacy) · wan22 "Wan 2.2" (legacy)
                 con foto de muestra y foto grande para el comparador
    adult_mode   switch, se oculta con el motor "krea2"
    prompt       textarea, obligatorio, improvable (boton "Mejorar con IA")
    moss_style   select de 6 estilos con foto, solo si engine = moss
    qwen_config  tipo propio (calidad, aspecto, lote, loras)
    checkpoint   select de 4 modelos, solo si engine = z-imagen y adulto = false
    checkpoint_nsfw  select de 6 modelos, solo si z-imagen y adulto = true
    format       select 9:16 / 16:9 / 1:1, si engine es z-imagen o flux_klein
    quality      select 720p / 1080p, oculto en los motores modernos
    krea2_format select 9:16 / 16:9 para krea2, krea2_realism, desirex3, moss
    krea2_realism_enabled   switch "LoRA Realism V2", por defecto true
    krea2_realism_strength  number con slider 0 a 1, por defecto 1
    krea2_styles tipo propio "Estilos fotograficos"
    krea2_gestos switch "Manos y gestos sueltos", oculto si adulto
    krea2_quality select 1080p / 2K / 4K
    zimage_refine tipo propio (refinar piel, +15 cr por imagen)
    (y siguen: cantidad, LoRA de personaje, etc.)
  Ejemplo real (Upscaler, resumido) [OBSERVADO]:
    engine      select "Tipo de mejora" (Upscaler Optimo)
    adult_mode  switch con aviso de usarlo solo con desnudos
    image       campo de imagen obligatorio ("Arrastra o selecciona una imagen")
    strength    numero 0,01-0,5, por defecto 0,07, con explicacion larga
    denoise     select de 4 niveles, si engine = realismo
    resolution  select 768 / 1024 / 1536, si engine = realismo
    klein_resolution select 2K / 4K / 5K, si engine = klein_4k
    salida: output_info type "compare", 2 resultados, incluye el original
   LO QUE ESTO SIGNIFICA PARA LA NUEVA APP
    - Un solo componente "Renderizador de formulario" que recorre fields[] y
      pinta cada type. Un registro por tipo (texto, numero, deslizador, switch,
      desplegable, tarjetas con foto, subida de imagen, subida de audio,
      selector de LoRA, subidor de calidad).
    - Las reglas show_when / hide_when se evaluan en el cliente y se vuelven a
      validar en el servidor.
    - El coste se calcula en el servidor a partir de los campos marcados
      (calculate-cost) y NUNCA se confia en el numero que manda el cliente.
    - Añadir una herramienta = insertar filas (workflow + fields), no programar
      una pantalla. Ese es el ahorro real.
    - Test obligatorio: cambiar base_cost o el label de un campo en la base y
      ver el cambio en pantalla sin recompilar.

17.13 Lo que ya se sabe de cada herramienta sin abrirla
  [OBSERVADO del catalogo] nombre, grupo, subgrupo, chapas, coste y frase de
  las 33.
  [OBSERVADO del esquema] formulario completo de 2: Generador de Imagen
  (17.12) y Upscaler.
  [DEDUCIDO] Las 31 restantes siguen el mismo patron: 1) elegir motor (tarjetas
  con foto y chapa), 2) subir material (imagen, video o audio) si hace falta,
  3) escribir la instruccion, 4) ajustes (formato, duracion, cantidad), 5) ver
  el coste y pulsar Generar. No inventar campos concretos que no se hayan
  visto: si el constructor necesita el detalle exacto, tendra que decidirlo el.

===============================================================================
18. PRIMER MENSAJE QUE DEBE RECIBIR EL CONSTRUCTOR
===============================================================================
"Vas a construir una aplicacion web nueva llamada [NOMBRE] descrita en el
documento adjunto. No es una copia: no uses el nombre, logo, colores,
tipografias, textos ni archivos del original. Reproduce la estructura de
pantallas, los flujos, el esquema de campos y las reglas de negocio
documentadas. Trabaja por etapas (seccion 13) y no pases a la siguiente sin que
la prueba de la anterior pase. Antes de escribir codigo, devuelveme: (1) tu
plan de datos, (2) la lista de pantallas con su ruta, (3) como vas a gestionar
creditos y trabajos, (4) como vas a pintar los formularios desde datos
(seccion 17.12) y (5) que proveedor de GPU vas a usar y a que precio. Empieza
por E0 y E1."

===============================================================================
19. ANEXO C: COMO FUNCIONA UNA GENERACION POR DENTRO
===============================================================================
Se ejecuto UNA generacion real (imagen, 120 creditos) con permiso del
solicitante y se siguio hasta el final. Evidencia: ev_32270511 (peticion y
respuesta completas), ev_98781c46 (los POST de la sesion), ev_7cc59aef (la
corrida), ev_0f10c106 y ev_ff7ebddd (formulario y accesibilidad), ev_f31b8403 y
ev_29ea1c69 (estado en /api/tasks), ev_633a8d1a (HTML y CSP), ev_8230ecad (red
de la galeria), ev_92db6328 (analisis del JavaScript), ev_38d41a4a (galeria con
el trabajo terminado), ev_051beb8c (recursos cargados y claves de
almacenamiento).

19.1 La ficha de herramienta (ruta real: /workflow/<id>) [OBSERVADO]
  Cabecera: "Volver", titulo con emoji ("Generador de Imagen"), una linea de
  descripcion y, si hay algo en marcha, el aviso "¡Tarea encolada! Sera
  procesada automaticamente." + enlace "Ver en Galeria".
  Bloque "Motor": botones de modelo con etiquetas RECOMENDADO, RECOMENDADO
  PARA MODELOS, RECOMENDADO ANIME, NUEVO. En el Generador de Imagen:
    Krea 2 Personaje — prioriza tu LoRA de personaje, rapido, 2K
    DesireX · Foto natural — "Modelo fotografico de BSS / black snowskill"
    Krea 2 — hasta 4K
    MOSS · Chicas reales — "fotos de celular muy reales sin LoRA"
    Flux Klein — hasta 2K
    Qwen Image 2.1 — desde texto, estilos fotograficos combinables
    desplegable "Modelos anteriores · Z-Imagen y Wan 2.2"
  Interruptor "Modo adulto (+18)" ("Disponible para este workflow").
  Campos:
    "Prompt*" (texto libre) + boton "Mejorar con IA"
    "Formato": Vertical 9:16 / Horizontal 16:9
    "LoRA Realism V2" (interruptor) + "Intensidad del realismo" (deslizador,
      1,00 por defecto) + "Restablecer intensidad habitual"
    "Estilos fotograficos · opcional" (desplegable con contador)
    "Manos y gestos sueltos" (interruptor)
    "Refinar piel y detalle · +15 cr / imagen" (casilla; aplica Z-Image)
    "Cantidad de imagenes" (1 a 8)
    "LoRA de personaje" ("LoRAs de Krea 2 · N disponibles" + "Seleccionar LoRA")
    Enlace "¿Necesitas un LoRA para tu personaje? Lo entrenamos y activamos en
    tu cuenta. US$5 · Ver requisitos"
  Pie fijo: coste ("120 creditos") + boton "Generar" + aviso "El resultado
  aparecera en tu galeria cuando este listo."
  El coste se recalcula al cambiar opciones; el boton no lanza si falta el
  prompt o el saldo.
  Si el id no existe: "Workflow no encontrado" + "Volver al dashboard"
  [ev_c35fad04].

19.2 El envio [OBSERVADO]
  POST /api/workflows/image_generator/execute
  Content-Type: multipart/form-data (admite archivos: imagenes y audios)
  Campos observados:
    engine=krea2_realism · adult_mode=false
    checkpoint=z-imagen-turbo · checkpoint_nsfw=creative-studio-v7
    format=vertical-9:16 · quality=1080p
    krea2_format=9:16 · krea2_quality=2k · krea2_realism_enabled=true
    krea2_realism_strength=1 · krea2_styles=[] · krea2_gestos=true
    qwen_config={"quality":"1","aspect":"9:16","batch":1,"loras":[]}
    zimage_refine={"enabled":false,"denoise":0.2}
    batch_size=1 · lora_strength=1.0 · prompt=<texto del usuario>
  Respuesta (200):
    {"success":true,"message":"¡Tarea encolada! Sera procesada
     automaticamente.","task_id":"q-8343d269231c463d","queued":true,
     "queue_position":6,"trial_image_gens":null,"trial_video_gens":null,
     "credit_cost":120,"credit_balance":880}
  Antes del envio hay un POST /api/credits/calculate-cost; despues, el saldo
  del cliente se actualiza sin recargar la pagina.
  [DEDUCIDO] Los nombres internos (checkpoint "z-imagen-turbo", "creative-
  studio-v7", "krea2_realism") son los de los modelos de Stable Diffusion o
  Flux que corre el proveedor externo; el usuario no los ve, ve "Krea 2
  Personaje" o "DesireX".

19.3 El registro del trabajo [OBSERVADO]
  GET /api/tasks?... devuelve, por cada tarea:
    id (35993, entero de la base), task_id ("2123319798687690754", numero de 19
    digitos = identificador del proveedor externo), workflow_id, workflow_name,
    workflow_category ("imagen"), status, result_url, result_type, outputs[],
    input_image_url, input_files, params (los campos ya traducidos al español
    legible: "Motor":"Krea 2 Personaje", "Formato":"Vertical 9:16",
    "Cantidad de imagenes":"1"…), error_msg, is_nsfw, is_public, is_test,
    batch_group_id, retry_count 0, retry_max 2, applied_enhancements,
    created_at (ISO con microsegundos), completed_at, gpu_cost_time,
    media_expired.
  Secuencia vista: al encolar, posicion 6 en la cola y estado QUEUE; unos 20
  minutos despues, estado SUCCESS con la miniatura visible en /gallery.
  Lectura: hay DOS identificadores (uno propio y otro del proveedor), un tope de
  2 reintentos, un campo que mide el tiempo de GPU consumido y marcas de
  vencimiento. Eso es lo que hace falta para cobrar por coste real y auditar.

19.4 ¿Quien pone la GPU? ¿Pagan a terceros? [OBSERVADO + DEDUCIDO]
  Si: la generacion no la hace su propio servidor, la compran fuera.
   a) [OBSERVADO] La CSP solo permite conexiones a https://www.runninghub.ai,
      wss://www.runninghub.ai y https://*.xiaoyaoyou.com [ev_633a8d1a].
      RunningHub es una plataforma de GPU bajo demanda que ejecuta flujos de
      ComfyUI en la nube; xiaoyaoyou.com es su dominio/CDN en China. Si
      generaran en casa, no haria falta abrir la red a un tercero.
   b) [OBSERVADO] El task_id de 19 digitos no lo genera su base de datos (que
      usa enteros cortos como 35993): es el del proveedor [ev_29ea1c69].
   c) [OBSERVADO] El registro guarda "gpu_cost_time" y "retry_max": se mide
      cuanto GPU consume cada trabajo [ev_29ea1c69].
   d) [OBSERVADO] El panel de administracion tiene trozos llamados "AiBalances"
      (saldos con cada proveedor de IA), "AdminGastos" (gastos), "AdminPricing"
      (precios y margenes) y "AdminMonitor" (monitor de trabajos) [ev_8230ecad].
      Ese conjunto es el de alguien que COMPRA capacidad y la revende.
   e) [OBSERVADO] El archivo terminado se sirve desde
      rh-hk-images.xiaoyaoyou.com, es decir, del CDN del proveedor (19.6).
   f) [DEDUCIDO] El modelo economico cuadra: paga por uso de GPU, lo revende en
      creditos con margen y avisa a los usuarios cuando sube su coste
      (aviso del 14 de noviembre) [ev_7cc59aef].
  [DESCONOCIDO] Cuanto paga exactamente por generacion y con que cuenta. La
  llamada al proveedor sale de SU servidor, no del navegador, asi que no es
  visible desde fuera.
  [CONSECUENCIA PARA LA NUEVA APP] Reproducir esto es legitimo y normal: la
  nueva app tambien necesita un proveedor de GPU. Opciones: (1) la misma clase
  de servicio (RunningHub y similares, con API y pago por uso), (2) Replicate,
  fal.ai, RunPod o Modal para modelos sueltos, (3) GPU propia si el volumen lo
  justifica. En los tres casos hay que implementar: saldo por proveedor, coste
  real por trabajo (gpu_cost_time), reintentos limitados, cola con posicion y
  traspaso del coste al precio en creditos con margen visible.
  NOTA DE COSTE: si se usan servicios de terceros, la nueva app paga por uso. El
  precio en creditos debe cubrir ese coste mas margen, y conviene un tope diario
  por usuario para no perder dinero con un abuso.

19.5 Lo que hay que construir distinto
  - Los nombres de motor visibles ("Krea 2 Personaje", "DesireX", "MOSS") son
    los suyos: usar nombres propios de los modelos reales que elija la nueva app.
  - Los campos del formulario son la lista de lo que su comunidad pide
    (realismo, gestos, LoRA de personaje, cantidad, mejorar prompt con IA). Se
    pueden reproducir como CONCEPTO, con etiquetas propias.
  - "Mejorar con IA" del prompt es una llamada a un modelo de texto: hay que
    cobrarla o limitarla, o se convierte en una via de gasto gratis.
  - El aviso de subida de precio demuestra una practica sana: comunicar el
    cambio y compensar a quien ya pago. Copiar esa practica, no el texto.

19.6 DONDE VIVE EL ARCHIVO TERMINADO [OBSERVADO]
  Al terminar, la imagen NO se guarda en miafactory.app. El navegador la carga
  desde el CDN del proveedor:
    https://rh-hk-images.xiaoyaoyou.com/1453c814eed81714b7b402f5c022b49c/
            output/iastudios_00001_shzak_1795073903.png
  Evidencia: ev_051beb8c (lista de recursos de la pagina) y ev_38d41a4a.
  Como leerlo:
   - "rh-hk-images" = imagenes de RunningHub, nodo de Hong Kong.
   - El primer tramo largo (1453c814…) es un identificador de espacio de
     trabajo; "output/iastudios_00001_shzak_1795073903.png" es el nombre que
     genera el flujo de ComfyUI del proveedor ("iastudios" es el nombre de su
     flujo).
   - Por tanto NO copian el resultado a almacenamiento propio: enlazan el
     archivo del proveedor. Eso ahorra disco y ancho de banda, y explica el
     aviso de "se borra a los 14 dias": quien borra es el proveedor.
   - Riesgo de este atajo: si el proveedor limpia el archivo antes, cambia la
     URL o cierra la cuenta, el usuario pierde el trabajo y la galeria muestra
     miniaturas rotas. No hay copia de respaldo.
  [DEDUCIDO] El boton "Descargar" pide el archivo directamente a ese CDN; si ese
  dominio deja de responder, la funcion mas importante del producto se cae.
  [RECOMENDACION PARA LA NUEVA APP] Copiar el archivo a almacenamiento propio
  (S3 o similar) al terminar, servir URLs firmadas y aplicar la caducidad en
  casa. Cuesta poco mas y no dependes de la politica del proveedor.

19.7 DONDE SE GUARDA LA SESION [OBSERVADO]
  Claves de almacenamiento del navegador en miafactory.app: "auth-storage" y
  "mia_lang" (ev_051beb8c). Al abrir /api/tasks directamente, el servidor
  responde 401 "Not authenticated" con cabecera www-authenticate: Bearer
  (ev_002a5d08). Lectura: la sesion NO esta en una cookie httpOnly; el
  JavaScript la guarda en el almacenamiento local y la manda en una cabecera
  Authorization. Ventaja: es simple y funciona con Cloudflare. Desventaja:
  cualquier codigo malicioso que se cuele en la pagina puede leer el token.
  [RECOMENDACION] En la nueva app: cookie httpOnly + Secure + SameSite=Lax,
  rotacion de token, y cerrar sesion en el servidor (invalidar), no solo borrar
  el almacenamiento del navegador.

19.8 Ciclo completo comprobado (resumen de una linea)
  Elegir herramienta -> formulario -> calcular coste -> enviar (multipart) ->
  "tarea encolada" con posicion -> cola del proveedor -> SUCCESS -> miniatura y
  botones Ver/Descargar en /gallery -> saldo descontado (1000 -> 880) ->
  archivo servido desde rh-hk-images.xiaoyaoyou.com -> caduca a los 14 dias.
  Todo esto esta observado; lo unico que no se puede ver desde fuera es la
  tarifa que paga MIA Factory al proveedor.

===============================================================================
20. QUE FALTA Y QUE NO HACE FALTA (cierre honesto)
===============================================================================
  Cubierto con evidencia: portada, planes, login, borrado de cuenta, galeria
  publica, panel completo (catalogo, galeria, creditos, ajustes), las cinco
  pantallas de apoyo en estado vacio, el formulario de UNA herramienta en
  pantalla, el esquema completo de DOS herramientas leido del servidor, el envio
  y la respuesta de una generacion, el registro del trabajo, el archivo final y
  el proveedor externo de GPU.
  Sin cubrir: los campos exactos de las otras 31 herramientas; las pantallas de
  apoyo con contenido; un trabajo fallido o caducado; la pantalla
  "Subscription"; el panel de administracion.
  Para el constructor, lo que NO hace falta reconstruir tal cual:
   - Entrenamiento de LoRAs: el original lo hace a mano por el equipo (US$5).
     Basta con un formulario de solicitud y una cola de trabajo interna.
   - Comparador antes/despues: solo lo piden algunas herramientas (chapa
     "Compare" y output_info type "compare").
   - Multiples salidas: solo algunas (chapa "Multiple"); el resto devuelve una.
   - Galeria publica desactivada: se puede omitir en la version 1 propia.
   - Las 33 pantallas: no se programan, se generan desde datos (17.12).

FIN DEL PROMPT MAESTRO.
===============================================================================

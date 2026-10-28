// Registro REAL de los motores del ecosistema ALBRA8.
// Los metadatos provienen de la inspección de los repos clonados (fase de
// inspección); los estados NUNCA se inventan: se derivan de (a) configuración
// guardada en BD y (b) sondas HTTP reales con timeout corto.
// CHAT-X es el host central: consume los contratos de cada motor, no los reimplementa.

import { db } from '@/lib/db'

export type MotorId = 'youtube' | 'crm' | 'whatspower' | 'ultra' | 'nexscope' | 'leads' | 'agentegeneral' | 'cazador' | 'agentekrea' | 'comuniti'

export interface ContratoRuta {
  metodo: 'GET' | 'POST'
  ruta: string
  que: string
}

export interface MotorDef {
  id: MotorId
  nombre: string
  modulo: 2 | 3 | 4 | 5 | 6
  rol: string
  stack: string
  puertoPorDefecto: string
  urlPorDefecto: string
  healthPath: string
  datosReales?: { descripcion: string; ruta: string; metodo: 'GET' | 'POST' }
  capacidades: string[]
  contratos: ContratoRuta[]
  envRequeridas: string[]
  notasIntegracion: string[]
  estadoNota: string
}

export const MOTORES: MotorDef[] = [
  {
    id: 'youtube',
    nombre: 'YOUTUBE-AUTOMATION',
    modulo: 2,
    rol: 'Motor de producción audiovisual: guion → imágenes → TTS → render → QA → publicación, con generación real en Google Flow vía MCP.',
    stack: 'Python 3.10+ · FastAPI (backend/main.py) · SQLite · FFmpeg · Chrome/CDP :9333',
    puertoPorDefecto: '8000',
    urlPorDefecto: 'http://127.0.0.1:8000',
    healthPath: '/api/harness/v1/health',
    datosReales: {
      descripcion: 'Manifest del arnés m2m: operaciones youtube.* reales disponibles',
      ruta: '/api/harness/v1/manifest',
      metodo: 'GET',
    },
    capacidades: [
      'Pipeline v2.0 completo: guion Gemini (4 modos), imágenes, TTS dual edge-tts/Gemini, render FFmpeg, subtítulos ASS, música con ducking, autopublish YouTube OAuth',
      'Contrato Production JSON machine-readable (validate → submit → launch → QA → publish)',
      'Avatares: CRUD + retrato IA, 15 menús (89 opciones), PiP, lipsync MuseTalk, face tracking',
      'Catálogo de voces con preview de audio',
      'Cola flow_jobs en SQLite: claim atómico, leases, heartbeats, reintentos, recuperación de zombies',
      'QA forense de video (ffprobe/PIL), Production Doctor A-I, métricas JSONL',
      'Modo fábrica cron + viral clipper + UGC hooks/ads + multilang dubber + trends research',
      'Google Flow real vía GoogleFlowMCP (stdio + CDP): Gates A/C.0/C.1/C.2 en LIVE PASS',
    ],
    contratos: [
      { metodo: 'GET', ruta: '/api/harness/v1/manifest', que: '19 operaciones youtube.* con nivel de riesgo (arnés m2m recomendado)' },
      { metodo: 'POST', ruta: '/api/harness/v1/execute', que: 'Ejecutar operación con execution_id del host, idempotente' },
      { metodo: 'POST', ruta: '/api/production_json/validate', que: 'Validar envelope Production JSON sin ejecutar' },
      { metodo: 'POST', ruta: '/api/projects', que: 'Crear proyecto (mode: production_json)' },
      { metodo: 'GET', ruta: '/api/production_json/contrato', que: 'Spec completo machine-readable del envelope' },
      { metodo: 'POST', ruta: '/mcp', que: 'Servidor MCP JSON-RPC: 25 tools (crear_video, production_doctor, flow_encolar…)' },
      { metodo: 'GET', ruta: '/api/jobs/{id}/events', que: 'SSE de progreso en vivo' },
    ],
    envRequeridas: ['MASTER_API_KEY (producción)', 'GEMINI_API_KEY (opcional, degrada)', 'FLOW_MCP_ENABLED=1 (para Flow real)', 'FLOW_MCP_VIDEO_ENABLED=1 (para video Flow)'],
    notasIntegracion: [
      'Runtime local: exige FFmpeg en PATH, Chrome con sesión Google autenticada y CDP :9333 — corre en TU máquina, no en la nube',
      'Flags FLOW_MCP_ENABLED=0 y FLOW_MCP_VIDEO_ENABLED=0 por defecto (activación controlada)',
      'CHAT-X consume el arnés como host externo: NUNCA reimplantar el pipeline (regla de frontera del propio repo)',
      'HARD E2E (INT-012): parte Flow 4/4 PASS; fix burn_subtitles publicado, re-run pendiente',
      'Estado de producción se lee en GET /api/projects/{pid} (status: ready|failed|paso) — GET /api/jobs/{id} NO existe (verificado en clon 2589e4e)',
    ],
    estadoNota: 'E2E Google Flow validado por gates; flags apagados por defecto.',
  },
  {
    id: 'crm',
    nombre: 'CRM-ALBRA',
    modulo: 3,
    rol: 'Sistema de récord comercial: clientes, pipeline, cotizaciones, reservas, WhatsApp real, automatizaciones. El "chaleco" — la inteligencia vive en el host (CHAT-X) y lo opera vía contratos.',
    stack: 'Next.js 16 + Prisma 6 SQLite + Baileys 7 (wa-daemon :3002) · JWT propio · CI verde',
    puertoPorDefecto: '3000',
    urlPorDefecto: 'http://127.0.0.1:3000',
    healthPath: '/api/health',
    datosReales: {
      descripcion: 'Catálogo auto-descriptivo crm-actions/v1 (acciones sin riesgo destructivo)',
      ruta: '/api/crm/actions',
      metodo: 'GET',
    },
    capacidades: [
      'CRM multi-tenant completo: 33 modelos (clients, opportunities, quotes, reservations, transactions…)',
      'Contrato chaleco: create_client, create_opportunity, schedule_reservation, add_note, quote_summary, list_recent_clients (destructivas omitidas por diseño)',
      'Servidor MCP propio con 16 tools (list_clients … get_dashboard_stats)',
      'Daemon WhatsApp Baileys (:3002) con QR/connect/send/conversations',
      'Bridge hacia WHATSPOWER (HMAC SHA-256) para inbound y stage-changes',
      'MemoryDV (/api/memory, /api/memory/vector) — contrato de memoria agéntica',
    ],
    contratos: [
      { metodo: 'GET', ruta: '/api/crm/actions', que: 'Catálogo crm-actions/v1 auto-descriptivo' },
      { metodo: 'POST', ruta: '/api/crm/actions', que: 'Ejecutar acción de negocio (Authorization: Bearer albra_…). SIN idempotencia servidor-side en v0.2.1 (sin X-Idempotency-Key): CHAT-X no reintenta escrituras ambiguas por esto' },
      { metodo: 'POST', ruta: '/api/mcp', que: 'MCP JSON-RPC 2.0 streamable stateless (16 tools)' },
      { metodo: 'GET', ruta: '/api/health', que: 'Liveness con check de BD' },
      { metodo: 'GET', ruta: '/api/doctor', que: 'Diagnóstico profundo' },
    ],
    envRequeridas: ['APP_SECRET', 'APP_ENCRYPTION_KEY', 'INTERNAL_API_SECRET', 'WHATSAPP_DAEMON_URL (:3002)', 'API key albra_… (creada en Settings → API keys del CRM)'],
    notasIntegracion: [
      'El motor más maduro del ecosistema (funcional, Docker, CI, auditoría pre-venta)',
      'Conflicto de puerto: usa 3000 por defecto — fijar PORT distinto si convive con CHAT-X',
      'SQLite de un solo escritor: no escalar horizontal',
      'API key albra_… se genera desde el propio CRM; se guarda en la configuración del motor aquí',
    ],
    estadoNota: 'Funcional y endurecido. Integración de riesgo bajo.',
  },
  {
    id: 'whatspower',
    nombre: 'WHATSPOWER',
    modulo: 3,
    rol: 'Capa 2A — motor conversacional tipo ManyChat: flujos 1-a-1 con builder visual, A/B split, drip sequences, handoff humano con locks atómicos, bajas.',
    stack: 'Node 22+ · TypeScript strip-types · node:sqlite · zero-dependencias',
    puertoPorDefecto: '3003',
    urlPorDefecto: 'http://127.0.0.1:3003',
    healthPath: '/api/health',
    datosReales: {
      descripcion: 'Flujos conversacionales guardados',
      ruta: '/api/flows',
      metodo: 'GET',
    },
    capacidades: [
      'Flow Studio visual (/studio) estilo ManyChat',
      'Flujos con A/B split, secuencias drip, session variables',
      'Handoff humano: locks atómicos por teléfono + round-robin/least-loaded de agentes',
      'Circuito de bajas (suppression list) consumible por ULTRA (fail-closed)',
      'Growth tools: links de captura con tracking (/ref/:slug)',
      'Payment links (wompi/mercadopago/stripe/simulator)',
    ],
    contratos: [
      { metodo: 'GET', ruta: '/api/flows', que: 'Listar flujos guardados' },
      { metodo: 'POST', ruta: '/api/flows/simulate', que: 'Simular paso de flujo sin WhatsApp real' },
      { metodo: 'POST', ruta: '/api/inbound', que: 'Webhook inbound del CRM (HMAC X-Signature-SHA256 + ventana 300s anti-replay)' },
      { metodo: 'GET', ruta: '/api/internal/locks/:phone', que: 'Lock JIT — consumido por ULTRA (fail-closed)' },
      { metodo: 'GET', ruta: '/api/internal/suppression/:phone', que: 'Circuito de bajas compartido' },
    ],
    envRequeridas: ['CRM_BASE_URL', 'CRM_API_KEY (albra_…)', 'WHATSAPP_DAEMON_URL', 'AGENTIC_2A_WEBHOOK_SECRET', 'ALLOW_REAL_DISPATCH=false'],
    notasIntegracion: [
      'Endpoints de gestión SIN auth por diseño: mantener en localhost, nunca exponer a red',
      'Transport real (HttpAlbraTransportSender) existe pero el server usa Mock por defecto — wiring pendiente en el repo',
      'No duplica la BD del CRM: datos comerciales permanecen en Capa 1 (separación de responsabilidades respetada)',
    ],
    estadoNota: 'Funcional con 13 suites de test. Puerto 3003, proceso propio.',
  },
  {
    id: 'ultra',
    nombre: 'WHATSPOWER-ULTRA',
    modulo: 3,
    rol: 'Capa 2B — difusión masiva anti-ban: Campaign Studio, spintax recursivo, audiencias CSV/webhook, escudo de 5 capas, atribución de clicks, neuromarketing determinista.',
    stack: 'Node 22+ · TypeScript strip-types · node:sqlite · step-driven',
    puertoPorDefecto: '3004',
    urlPorDefecto: 'http://127.0.0.1:3004',
    healthPath: '/api/health',
    datosReales: {
      descripcion: 'Campañas existentes con estado real',
      ruta: '/api/campaigns',
      metodo: 'GET',
    },
    capacidades: [
      'Campaign Studio UI (/campaigns) y API de campañas',
      'Motor step-driven con throttling (jitter, cooldown por lotes, horario comercial, fatiga 7 días)',
      'Escudo anti-ban 5 capas + pre-dispatch JIT consultando locks/suppression de WHATSPOWER (fail-closed 1.5s)',
      'Ingesta de leads por webhook (facebook_ads, tiktok_ads, typeform, custom) con idempotencia',
      'Acortador con tracking y reporte de atribución (CTR)',
      'Motor de neuromarketing determinista (sin LLM externo): analyze / generate-spintax / master-prompt',
    ],
    contratos: [
      { metodo: 'GET', ruta: '/api/campaigns', que: 'Listar campañas' },
      { metodo: 'POST', ruta: '/api/campaigns/:id/step', que: 'Procesar 1 item (polling step-driven)' },
      { metodo: 'POST', ruta: '/api/audiences/webhook-lead', que: 'Ingesta de leads con idempotencia' },
      { metodo: 'GET', ruta: '/api/attribution/report/:campaignId', que: 'CTR y clicks por campaña' },
      { metodo: 'POST', ruta: '/api/ai/neuromarketing/generate-spintax', que: 'Variantes spintax de mensaje' },
    ],
    envRequeridas: ['WHATSAPP_DAEMON_URL (:3002)', 'AGENTIC_2A_URL (:3003)', 'INTERNAL_API_SECRET', 'TRANSPORT_ENGINE=meta_cloud (alternativa)', 'META_ACCESS_TOKEN + META_PHONE_NUMBER_ID (canal Meta)'],
    notasIntegracion: [
      'Guard físico: allowRealDispatch=false hardcodeado — la única vía real documentada es el piloto con CONFIRMED_PILOT_EXECUTION=true',
      'Motor step-driven: el host debe hacer polling de /step (no hay worker interno)',
      '.env.example del repo tiene nombres de variables que no coinciden con el código (usar los del README)',
      'Dispatch real exige decidir canal: daemon Baileys (guard) o Meta Cloud (credenciales META_*)',
    ],
    estadoNota: 'Funcional con 8 suites de test + piloto real documentado (2026-10-24).',
  },
  {
    id: 'nexscope',
    nombre: 'NEX-SCOPE',
    modulo: 6,
    rol: 'Investigación de nichos: keywords, tendencias, brechas de contenido, planes de 30 videos, monetización RPM/CPM, competidores, ad-spy, product-spy, agente con streaming.',
    stack: 'Next.js 16 + Prisma SQLite + JWT cookie + proveedores LLM configurables (Groq/NVIDIA/OpenAI/Z.ai)',
    puertoPorDefecto: '3000 (Caddy :81)',
    urlPorDefecto: 'http://127.0.0.1:81',
    healthPath: '/api/health',
    capacidades: [
      'Finder de nichos completo con guardado de nichos/canales/planes',
      'Planes de contenido de 30 videos y reportes de monetización',
      'Automations con dispatch directo al motor YOUTUBE-AUTOMATION (:8000/api/quick-create)',
      'MCP propio (/api/mcp): analyze_niche, monetization_report, channel_audit, dashboard_summary',
      'Agente conversacional con SSE y memoria con provenance',
    ],
    contratos: [
      { metodo: 'POST', ruta: '/api/automations/dispatch', que: 'Dispara producción hacia YouTube-AUTOMATION o webhooks externos' },
      { metodo: 'POST', ruta: '/api/keywords', que: 'Investigación de keywords' },
      { metodo: 'POST', ruta: '/api/content-plan', que: 'Plan de contenido' },
      { metodo: 'POST', ruta: '/api/mcp', que: 'MCP autenticado por cookie de sesión' },
    ],
    envRequeridas: ['JWT_SECRET', 'YOUTUBE_API_KEY (opcional)', 'credenciales del proveedor LLM elegido'],
    notasIntegracion: [
      'MCP y endpoints protegidos por cookie de sesión JWT (no API key): el acceso server-to-server requiere login programático o añadir contrato con API key en el repo',
      'dispatch automations responde "mock éxito" si el webhook falla: entrega NO garantizada — verificar en el motor destino',
      'Sin relación de datos con el CRM hoy',
    ],
    estadoNota: 'App completa y funcional (PM2 en producción).',
  },
  {
    id: 'leads',
    nombre: 'AGENTE-LEADS',
    modulo: 6,
    rol: 'Prospección B2B: bot de Telegram con pipeline determinístico de 10 etapas + dashboard con CRM de prospectos, propuestas IA y closed-loop learning.',
    stack: 'Bot: TypeScript + grammy (long-polling, SIN HTTP) + better-sqlite3 · Dashboard: Next.js 16 + NextAuth',
    puertoPorDefecto: 'bot sin puerto · dashboard 3000',
    urlPorDefecto: '', // sin URL por defecto: el bot NO expone HTTP y su dashboard (:3000, NextAuth) colisiona con CHAT-X — sondearla aquí producía un falso "404" contra CHAT-X mismo
    healthPath: '/api/dashboard',
    capacidades: [
      'Pipeline: discovery → research → validation → evidence → dedup → scoring → intelligence → storage → report → CRM hook',
      'LLM GLM 5.3 Flash vía NVIDIA NIM · outreach SendGrid/WhatsApp Cloud con DRY RUN por defecto',
      'Webhooks salientes hacia el host con eventos tipados (lead.created, lead.scored, lead.intelligenced, lead.outreach_sent, execution.completed)',
      'Dashboard con prospectos (tier A/B/C/F), propuestas, insights y outcomes',
    ],
    contratos: [
      { metodo: 'POST', ruta: '/api/motores/agent-leads/webhook (CHAT-X)', que: 'CHAT-X es el receptor natural: X-AGENTE-LEADS-Event + Bearer secret' },
      { metodo: 'POST', ruta: '/api/search (dashboard)', que: 'Pipeline completo de búsqueda de leads' },
      { metodo: 'GET', ruta: '/api/dashboard (dashboard)', que: 'Métricas agregadas de prospectos' },
    ],
    envRequeridas: ['NVIDIA_API_KEY', 'TELEGRAM_BOT_TOKEN', 'ALLOWED_IDS', 'CRM_ALBRA_WEBHOOK_URL (apuntando a CHAT-X)', 'CRM_ALBRA_SECRET'],
    notasIntegracion: [
      'El bot NO expone HTTP (long-polling): hoy solo es invocable su dashboard (NextAuth con cookies) — no hay URL sondeable por defecto; configura la URL del dashboard solo si lo levantas en otro puerto',
      'El contrato de webhooks hacia CRM está definido pero CRM-ALBRA aún no tiene receptor — CHAT-X lo recibe aquí',
      'Outreach WhatsApp sale directo a Graph API de Meta, no por el daemon ALBRA',
    ],
    estadoNota: 'Bot "V2 stable" con 31 suites de test. Auditoría interna: funcional pero incompleto para producción.',
  },
  {
    id: 'agentegeneral',
    nombre: 'AGENTE-GENERAL (ALBRA AGENT SEED)',
    modulo: 6,
    rol: 'Runtime agéntico del ecosistema: ejecución de tareas con memoria, firewall default-deny, HITL approvals y auditoría. Capa de especialización YouTube que habla el MISMO contrato Harness que YOUTUBE-AUTOMATION.',
    stack: 'Python 3.10+ · FastAPI (serve.py) · pydantic · optional Vault · dashboard Next.js aparte',
    puertoPorDefecto: '9000',
    urlPorDefecto: 'http://127.0.0.1:9000',
    healthPath: '/api/v1/health',
    datosReales: {
      descripcion: 'Info y capacidades del agente (contratos auto-descriptivos)',
      ruta: '/api/v1/agent/info',
      metodo: 'GET',
    },
    capacidades: [
      'POST /api/v1/execution: ejecutar tareas del agente con Bearer + política (firewall default-deny)',
      'HITL: approvals/pending, decision y resume — gate humano real para acciones sensibles',
      'A2A 1.0: JSON-RPC message/send + agent-card.json (solo si se monta explícitamente)',
      'Memoria MemoryDV, provenance/evidencia, auditoría tamper-evident, scheduler',
      'Especialización YouTube: cliente del Harness /api/harness/v1/execute (mismo contrato que CHAT-X ya opera)',
    ],
    contratos: [
      { metodo: 'GET', ruta: '/api/v1/health', que: 'Liveness público' },
      { metodo: 'POST', ruta: '/api/v1/execution', que: 'Ejecutar tarea agéntica (Bearer albra-dev-token en local; en producción exige authenticator propio)' },
      { metodo: 'GET', ruta: '/api/v1/approvals/pending', que: 'Aprobaciones humanas pendientes (HITL)' },
      { metodo: 'POST', ruta: '/api/v1/approvals/{id}/decision', que: 'Decidir una aprobación' },
    ],
    envRequeridas: ['ALBRA_CORS_ORIGINS (obligatoria en producción)', 'ALBRA_DEV_TOKEN (solo local)', 'NVIDIA_API_KEY / GROQ_API_KEY / OPENAI_API_KEY (proveedor LLM)'],
    notasIntegracion: [
      'Estado autodeclarado del repo: CODE_GATES_PASS — PRODUCTION_NOT_VERIFIED (no lo certifiquemos nosotros)',
      'En APP_ENV=production SIN authenticator propio responde 503 fail-closed: correcto, no lo desactivamos',
      'Dashboard propio en :3000 y WA daemon :3002 — fijar PORT si conviven; NO exponer a Internet',
      'Usar SOLO el token dev en red local; para m2m serio registrar un authenticator propio en el repo del motor',
    ],
    estadoNota: 'Integrado como motor del módulo 6. Ejecución agéntica real cuando el operador lo arranque en su máquina.',
  },
  {
    id: 'cazador',
    nombre: 'EXTENSION-CAZADOR (backend)',
    modulo: 5,
    rol: 'Captador de oportunidades y tendencias: backend de extracción IA (GLM) con extractores estructurales Hotmart/JVZoo/Muncheye y interceptor Dropi. CHAT-X lo usa como microservicio de scraping para briefs UGC.',
    stack: 'Node HTTP puro + z-ai-web-dev-sdk (server/) · la extensión Chrome es herramienta de escritorio, no se integra',
    puertoPorDefecto: '8787',
    urlPorDefecto: 'http://127.0.0.1:8787',
    healthPath: '/api/health',
    datosReales: {
      descripcion: 'Salud del backend de scraping (modelo GLM activo)',
      ruta: '/api/health',
      metodo: 'GET',
    },
    capacidades: [
      'POST /api/suggest-fields: sugiere columnas de extracción para una página',
      'POST /api/scrape: extrae filas con score de confianza por columna',
      'Extractores estructurales con 135 tests: Hotmart (__NEXT_DATA__), JVZoo (review cards), Muncheye (schema.org), Dropi (JWT SPA)',
      'Salida StructuredProduct normalizada (nombre, precio, moneda, URL, imágenes) — input directo para briefs UGC',
    ],
    contratos: [
      { metodo: 'GET', ruta: '/api/health', que: 'Liveness del backend (ok, model)' },
      { metodo: 'POST', ruta: '/api/scrape', que: 'Extracción IA de filas {url, title, maxRows, fields, pageText}' },
      { metodo: 'POST', ruta: '/api/suggest-fields', que: 'Sugerencia de campos {url, title, detectedItems, pageText}' },
    ],
    envRequeridas: ['PORT (default 8787)', 'la clave del LLM la gestiona z-ai-web-dev-sdk internamente'],
    notasIntegracion: [
      'El backend NO tiene auth y su CORS es *: mantener en localhost y, si se expone, detrás de un proxy con token',
      'La extensión Chrome tiene host_permissions <all_urls y captura el JWT de Dropi a chrome.storage: solo para la máquina del operador',
      'El dashboard incluido en el repo es 100% mock: NO se integra (no confundir copia de código con servicio)',
    ],
    estadoNota: 'Backend integrable de riesgo bajo-medio como microservicio local. La extensión queda fuera de CHAT-X.',
  },
  {
    id: 'agentekrea',
    nombre: 'AGENTE-KREA',
    modulo: 2,
    rol: 'Estudio de generación creativa: imágenes, texto, voces, subtítulos, ebooks y prompts desde ADN creativo (/api/adn). CHAT-X lo usa como proveedor alternativo de medios cuando corre en la máquina del operador.',
    stack: 'Next.js 16 + Prisma · rutas /api/generate/* · vitest configurado · Caddyfile incluido',
    puertoPorDefecto: '3000',
    urlPorDefecto: 'http://127.0.0.1:3000',
    healthPath: '/api/doctor',
    datosReales: {
      descripcion: 'Diagnóstico del estudio (rutas de generación y estado)',
      ruta: '/api/doctor',
      metodo: 'GET',
    },
    capacidades: [
      'POST /api/generate/image · text · voice · subtitle · ebook · prompt (6 carriles de generación)',
      'GET /api/generations: historial de generaciones con métricas (/api/metrics)',
      'ADN creativo (/api/adn): perfil de identidad reutilizable por personaje',
      'Doctor (/api/doctor) y auth (/api/auth) propios',
    ],
    contratos: [
      { metodo: 'GET', ruta: '/api/doctor', que: 'Diagnóstico del estudio' },
      { metodo: 'POST', ruta: '/api/generate/image', que: 'Generar imagen (payload propio del motor)' },
      { metodo: 'POST', ruta: '/api/generate/text', que: 'Generar texto' },
      { metodo: 'POST', ruta: '/api/generate/voice', que: 'Generar voz' },
      { metodo: 'GET', ruta: '/api/generations', que: 'Historial de generaciones' },
    ],
    envRequeridas: ['credenciales del proveedor LLM que el motor use internamente (revisar .env.example del repo)'],
    notasIntegracion: [
      'Sin capa de API key m2m visible en las rutas: mantener en localhost, nunca exponer a Internet',
      'Puerto 3000 por defecto: fijar PORT distinto si convive con CHAT-X (mismo conflicto que CRM/NEX)',
      'El payload exacto de /api/generate/image se toma del código del motor al integrar cada carril (no inventado aquí)',
    ],
    estadoNota: 'Registrado con contrato real de rutas. Integración de carriles uno a uno cuando el operador lo arranque.',
  },
  {
    id: 'comuniti',
    nombre: 'COMUNITI-MANAGER (Social Autopilot AI)',
    modulo: 5,
    rol: 'Arnés de community management: calendario editorial multi-marca, redacción con memoria de marca, adaptación multirred y gestión de comentarios públicos. Orquesta a los demás motores en vez de duplicarlos.',
    stack: 'Next.js 16 + Prisma (app/) · construido con método ClonaKit sala limpia (FICHA.md)',
    puertoPorDefecto: '3000 (conflicto con CHAT-X: usar PORT distinto)',
    urlPorDefecto: '', // sin URL por defecto: su :3000 colisiona con CHAT-X y sondearla aquí producía un falso "404" contra CHAT-X mismo — configura la URL real cuando lo levantes
    healthPath: '/api/audit',
    capacidades: [
      'Calendario editorial multi-marca con dependencias y recurrentes (/api/scheduler)',
      'Memoria de marca por marca aislada (identidad, tono, vocabulario, prohibidos, FAQs) (/api/brands)',
      'Adaptación multirred: IG, FB, TikTok, X, LinkedIn, YouTube',
      'Gestión de comentarios públicos: clasificación FAQ/lead/soporte/crisis/spam + derivación humana',
      'Webhooks (/api/webhooks) y harness (/api/harness) para coordinación con el ecosistema',
    ],
    contratos: [
      { metodo: 'GET', ruta: '/api/brands', que: 'Marcas con memoria de marca' },
      { metodo: 'GET', ruta: '/api/scheduler', que: 'Calendario editorial programado' },
      { metodo: 'GET', ruta: '/api/analytics', que: 'Métricas de publicación' },
      { metodo: 'POST', ruta: '/api/webhooks', que: 'Receptor de eventos del ecosistema' },
    ],
    envRequeridas: ['(revisar app/.env.example del repo) credenciales de proveedor LLM y canales'],
    notasIntegracion: [
      'Solapa parcialmente con el módulo UGC de CHAT-X: usar como especialista multi-marca, NO duplicar calendario',
      'Puerto 3000 por defecto: fijar PORT distinto si convive con CHAT-X',
      'Incluye modulo-fb-groups y especializacion-albra como subproyectos: auditar aparte antes de activar',
    ],
    estadoNota: 'Registrado como motor 10. Panel sin auth m2m: solo localhost. Integración tras auditoría de rutas una a una.',
  },
]

export const MOTOR_IDS = MOTORES.map((m) => m.id)

export function defMotor(id: string): MotorDef | undefined {
  return MOTORES.find((m) => m.id === id)
}

// ───────────────────────── Sondas reales ─────────────────────────

export type EstadoMotor = 'NO_CONFIGURADO' | 'INALCANZABLE' | 'NO_AUTORIZADO' | 'OPERATIVO'

export interface SondaResultado {
  estado: EstadoMotor
  latenciaMs: number | null
  detalle: string // explicación real de lo que pasó en la sonda
  verificadoEn: string
}

async function fetchConTimeout(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs = 2500, ...rest } = init
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(url, { ...rest, signal: ctrl.signal, cache: 'no-store' })
  } finally {
    clearTimeout(t)
  }
}

/** Sonda HTTP real contra el health del motor. Devuelve lo que pasó, sin adornos. */
export async function sondearMotor(motor: MotorId, url: string, apiKey: string): Promise<SondaResultado> {
  const def = defMotor(motor)
  if (!def || !url) {
    return { estado: 'NO_CONFIGURADO', latenciaMs: null, detalle: 'Sin URL configurada: define la dirección del motor en su configuración.', verificadoEn: new Date().toISOString() }
  }
  const base = url.replace(/\/+$/, '')
  const started = Date.now()
  try {
    const res = await fetchConTimeout(base + def.healthPath, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    })
    const latenciaMs = Date.now() - started
    if (res.status === 401 || res.status === 403) {
      return { estado: 'NO_AUTORIZADO', latenciaMs, detalle: `El motor responde pero exige credencial (HTTP ${res.status}). Guarda la API key en la configuración.`, verificadoEn: new Date().toISOString() }
    }
    if (!res.ok) {
      return { estado: 'INALCANZABLE', latenciaMs, detalle: `El motor respondió HTTP ${res.status} en ${def.healthPath}.`, verificadoEn: new Date().toISOString() }
    }
    return { estado: 'OPERATIVO', latenciaMs, detalle: `Sonda ${def.healthPath} → HTTP ${res.status}. Motor vivo en ${base}.`, verificadoEn: new Date().toISOString() }
  } catch (e) {
    const causa = e instanceof Error && e.name === 'AbortError' ? `sin respuesta en 2500ms` : `red inaccesible (${e instanceof Error ? e.message : 'error desconocido'})`
    return { estado: 'INALCANZABLE', latenciaMs: null, detalle: `No se pudo alcanzar ${base}: ${causa}. ¿Está corriendo el motor en esa máquina/puerto?`, verificadoEn: new Date().toISOString() }
  }
}

/** Config guardada en BD (crea fila por defecto si no existe). */
export async function configMotor(motor: MotorId): Promise<{ url: string; apiKey: string }> {
  const row = await db.motorConfig.findUnique({ where: { motor } })
  const def = defMotor(motor)
  return { url: row?.url || def?.urlPorDefecto || '', apiKey: row?.apiKey || '' }
}

export interface EstadoCompleto {
  motor: MotorId
  estado: SondaResultado
  config: { url: string; apiKey: string; configurada: boolean; actualizadoEn: string | null }
}

export async function estadoMotor(motor: MotorId): Promise<EstadoCompleto> {
  const row = await db.motorConfig.findUnique({ where: { motor } })
  const url = row?.url || defMotor(motor)?.urlPorDefecto || ''
  const apiKey = row?.apiKey || ''
  const sonda = await sondearMotor(motor, url, apiKey)
  return {
    motor,
    estado: sonda,
    config: {
      url,
      apiKey: apiKey ? '••••' + apiKey.slice(-4) : '',
      configurada: Boolean(row),
      actualizadoEn: row?.updatedAt?.toISOString() ?? null,
    },
  }
}

/** Trae datos REALES del motor si la sonda está OPERATIVA (manifest, catálogo, campañas…). */
export async function datosRealesMotor(
  motor: MotorId,
  url: string,
  apiKey: string,
): Promise<{ ok: boolean; detalle: string; datos?: unknown }> {
  const def = defMotor(motor)
  if (!def?.datosReales) return { ok: false, detalle: 'Este motor no expone lectura de datos para el host.' }
  const sonda = await sondearMotor(motor, url, apiKey)
  if (sonda.estado !== 'OPERATIVO') return { ok: false, detalle: `Motor no operativo: ${sonda.detalle}` }
  const base = url.replace(/\/+$/, '')
  try {
    const res = await fetchConTimeout(base + def.datosReales.ruta, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      timeoutMs: 5000,
    })
    const texto = await res.text()
    if (!res.ok) return { ok: false, detalle: `${def.datosReales.ruta} respondió HTTP ${res.status}: ${texto.slice(0, 300)}` }
    try {
      return { ok: true, detalle: `Datos reales desde ${base}${def.datosReales.ruta}`, datos: JSON.parse(texto) }
    } catch {
      return { ok: true, detalle: `Respuesta no-JSON desde ${def.datosReales.ruta}`, datos: texto.slice(0, 2000) }
    }
  } catch (e) {
    return { ok: false, detalle: `Fallo al leer ${def.datosReales.ruta}: ${e instanceof Error ? e.message : 'error'}` }
  }
}

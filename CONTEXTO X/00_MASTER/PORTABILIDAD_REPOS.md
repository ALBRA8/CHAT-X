# PORTABILIDAD DE REPOS ALBRA8 → musestudio8 — triage y plan de la vuelta (D-013)
**Creado:** 2026-11-07 · **Estado:** VIGENTE · **Origen:** directriz del fundador: planificar qué repos de ALBRA8 van a musestudio8 — "tenemos que analizar bien la vuelta"

---

## 1. El problema y los 3 carriles

ALBRA8 tiene 24 repos. **No todo se lleva.** La casa nueva es del negocio; llevar de más es exactamente lo que bloqueó la cuenta (F-007: "mucha información de trancazo") y además emborrona la cadena de auditoría. Tres carriles:

| Carril | Definición | Regla dura |
|---|---|---|
| **LLEVAR** | Copias que el negocio adapta y hace diverger a propósito (como WHATSPOWER/ULTRA/CRM el 31-oct) | Solo lo que toca el negocio o su operación directa. La copia vive en musestudio8; el original de ALBRA8 queda congelado |
| **SUBCONTRATAR** | Servicios SFW de back-office que CHAT-X consume por HTTP o el fundador usa a mano | Jamás ven contenido adulto ni datos de fans. Contrato explícito documentado en `06_INTEGRATIONS/`. ALBRA8 no se toca |
| **NO APLICA** | Proyectos del ecosistema ALBRA sin rol en CHAT-X | Siguen su vida en su casa. No se copian ni se suben a musestudio8 |

## 2. Veredicto del fundador (registrado como D-013, 2026-11-07)

- **AGENTE-TRADING**: "a CHAT-X no le sirve para nada" → NO APLICA.
- **ABOGADO-BASE y CONTADOR-PÚBLICO**: "de pronto", pero mirados como cosas que **se subcontratan a ALBRA8**.
- **AGENTE-LEADS, AGENTE-CHISMOSO y NEX-SCOPE**: "sí son de ayuda para nuestro proyecto" — el fundador los llevó a musestudio8. ⚠️ **POR_VERIFICAR**: la API de musestudio8 lista 0 repos visibles desde el bloqueo (verificado 2026-11-07), así que las 3 copias no se dan por hechas hasta el acta de la vuelta.

## 3. Triage completo de los 24 repos (con evidencia leída 2026-11-07)

| # | Repo | Qué es (evidencia) | Carril | Rol / condición |
|---|---|---|---|---|
| 1 | **CHAT-X** | Esta torre: cerebro + estudio + compliance | LLEVAR (ya mudada) | Torre del negocio. Durante el exilio su torre viva es ALBRA8/CHAT-X (D-012) |
| 2 | **WHATSPOWER** | Conversación WhatsApp, flujos ManyChat-like | LLEVAR (31-oct) | Copia de negocio; patrón de referencia en sala limpia para F1 |
| 3 | **WHATSPOWER-ULTRA** | Difusión anti-ban step-driven | LLEVAR (31-oct) | Ídem para difusión/retención |
| 4 | **CRM-ALBRA** | CRM, memoria comercial del embudo | LLEVAR (31-oct) | Copia de negocio; jamás recibe registros del carril adulto (D-007) |
| 5 | **AGENTE-LEADS** | Bot Telegram de prospección B2B (V2 stable, outreach por APIs oficiales) | LLEVAR (según fundador; POR_VERIFICAR) | Top-of-funnel: prospección y captación; alimenta F3 (Telegram) |
| 6 | **AGENTE-CHISMOSO** | Inteligencia de señales tempranas → tendencias → oportunidades con scoring; entrega a AGENTE-LEADS por contrato (`suggestedNextAgent`) | LLEVAR (según fundador; POR_VERIFICAR) | Radar de nichos/tendencias para decidir qué personajes y contenido producir |
| 7 | **NEX-SCOPE** | SaaS de nichos rentables de YouTube con IA (Z.ai) | LLEVAR (según fundador; POR_VERIFICAR) | Investigación de nichos SFW. Hoy DEGRADADO: exige JWT — su activación ya está en hitos |
| 8 | **YOUTUBE-AUTOMATION** | Fábrica de vídeo YouTube SFW (registro local de producciones R1-R4, sync Flow con gate apagado) | SUBCONTRATAR (por ahora) | Carril vídeo vestido/SFW (D-002). Copia `video-studio` a musestudio8 SOLO si el fundador decide que el carril vídeo vive en casa — decisión pendiente |
| 9 | **ABOGADO-BASE** | Agente jurídico independiente V1.0 (extraído de DESPACHO-JURIDICO @ `fe9d80e`) | SUBCONTRATAR (D-013) | Back-office legal SFW: términos, contratos, consultas. Por HTTP o uso manual |
| 10 | **CONTADOR-PUBLICO** | Contador digital Colombia — Formulario 210 DIAN, motor de cálculo determinista | SUBCONTRATAR (D-013) | Back-office contable SFW. Por HTTP o uso manual |
| 11 | **DESPACHO-JURIDICO** | Jurídico V2.5 con 12 módulos (de aquí salió ABOGADO-BASE) | SUBCONTRATAR (opcional) | Solo si se necesita el completo en vez de la base |
| 12 | **ERP-ADMON** | Marsella ERP contable-administrativo (complementario al CRM) | SUBCONTRATAR (opcional) | Administración general del holding, no del negocio adulto |
| 13 | **Extension-CAZADOR** | Extensión de navegador del motor CAZADOR (:8787, OPERATIVO en sonda 29-oct) | BRAZO ACTUAL | Ya vive como clon en `engines/` (solo lectura, SFW). No se duplica en musestudio8 |
| 14 | **AGENTE-KREA** | Motor de generación :3210 (OPERATIVO en sonda) | BRAZO ACTUAL | Ídem: clon en `engines/`, líneas SFW; jamás toca el carril adulto |
| 15 | **COMUNITI-MANAGER** | Arnés de community management IA para AGENTE-GENERAL | NO APLICA por ahora | CHAT-X ya es su propia torre de control; si algún día hay community SFW, se subcontrata |
| 16 | **AGENTE-GENERAL** | Seed/ADN universal del ecosistema ALBRA | NO APLICA | Es el ADN de la casa vecina; musestudio8 construye cuartos propios |
| 17 | **PANEL-DE-CONTROL** | EEC: control plane con human-in-the-loop | NO APLICA por ahora | CHAT-X ya ES el control plane del negocio |
| 18 | **BROWSER-FACTORY** | Mando local multi-cuenta (Meta/TikTok/YouTube/X/Telegram) con sesiones aisladas, proxies y despacho de vídeos | REVISAR con el fundador | Podría servir al calentamiento multi-cuenta, PERO riesgo ToS alto (Meta castiga evasión/multi-cuenta). No se lleva sin decisión explícita y análisis de riesgo |
| 19 | **AGENTE-TRADING** | Trading SMC/MT5 con LLM (NVIDIA NIM, bot Telegram) | NO APLICA (D-013) | "No le sirve para nada" a CHAT-X. Sigue su vida en ALBRA8 |
| 20 | **RADAR-SECOP2** | Oportunidades de contratación pública SECOP II (Colombia) | NO APLICA | Línea de negocio propia del ecosistema, ajena a CHAT-X |
| 21 | **CONTEXT** | Memoria externa versionada de ALBRA | NO APLICA | Es la memoria de la casa vecina; la nuestra es CONTEXTO X (misma idea, casa propia) |
| 22 | **PURO-PODER-CONOCIMIENTO** | Compendio de 5 cursos (Exponential Marketing Holding) | NO APLICA | Conocimiento, no software. Consulta manual si el fundador quiere |
| 23 | **INSTALADOR** | App Next.js sin README | POR_DEFINIR | SIN_CARACTERIZAR: leer su código antes de decidir. Por defecto NO APLICA |
| 24 | **MAXI-APP** | "Automatización avanzada y gestión de flujos" (descripción vaga) | POR_DEFINIR | Ídem |

**Resumen:** LLEVAR = 7 (4 verificadas + 3 POR_VERIFICAR) · SUBCONTRATAR = 6 · BRAZOS ACTUALES = 2 · NO APLICA = 7 · POR_DEFINIR = 2.

## 4. LA VUELTA — plan de retorno al desbloqueo de musestudio8

### Precondiciones (todas del fundador)
1. Desbloqueo de la cuenta (apelación de GitHub — solo él puede).
2. Los 2 PAT expuestos revocados y un PAT nuevo fine-grained por cada casa.
3. Si se decide traer el carril vídeo: crear `video-studio` vacío en musestudio8.

### Orden de la vuelta (verificación en cada paso, sin `--force`)

| Paso | Acción | Verificación |
|---|---|---|
| 1 | **Acta del estado real de musestudio8**: `git ls-remote` repo por repo. Esperados: CHAT-X @ `9dcfa08`, WHATSPOWER, WHATSPOWER-ULTRA, CRM + las 3 del fundador (AGENTE-LEADS, AGENTE-CHISMOSO, NEX-SCOPE) | lista real de SHAs; nada se da por hecho (hoy la API lista 0 repos) |
| 2 | **Re-sincronizar CHAT-X**: push fast-forward desde la torre exiliada ALBRA8/CHAT-X → musestudio8/CHAT-X (historia completa del exilio incluida) | SHA local = SHA remoto |
| 3 | **Verificar las 3 copias del fundador** (si existen): procedencia (commit de origen de ALBRA8), licencias (`09_KNOWLEDGE/CLONES_LICENCIAS.md`), y anclarlas en `MOTORES_REGISTRO.md` si entran al sondeo | tabla de procedencia nueva |
| 4 | **Portar lo que falte del carril LLEVAR** con `scripts/mudar_casa_nueva.sh` (mapa actualizado a los 7) | espejo SHA a SHA por rama y etiqueta |
| 5 | **Lo SUBCONTRATADO no se mueve**: queda en ALBRA8. Si CHAT-X lo consume, documentar el contrato (endpoint, auth, datos permitidos — cero contenido adulto) en `06_INTEGRATIONS/` | contrato por servicio |
| 6 | **Re-anclar la casa**: PROJECT_STATE vuelve a musestudio8; D-006 restaurada (ALBRA8 SOLO LECTURA total); D-012 → CERRADA; F-007 → RESUELTO; exilio terminado | DECISION_LOG + FAILURE_INDEX actualizados |

### Reglas que NO cambian en la vuelta
Push solo con orden explícita del fundador · token por variable de entorno, usar una vez y revocar · sin `--force` · estados honestos · **los originales de ALBRA8 jamás procesan el negocio 18+** — las copias adaptadas viven SOLO en musestudio8 (D-007).

## 5. Registro de evidencia (2026-11-07)

- API musestudio8: HTTP 200 con **0 repos visibles** — coherente con la cuenta bloqueada; contenido oculto hasta el desbloqueo.
- READMEs leídos en ALBRA8: AGENTE-TRADING, ABOGADO-BASE, CONTADOR-PUBLICO, AGENTE-CHISMOSO (README interno V1.0: inteligencia de señales; contrato con AGENTE-LEADS), DESPACHO-JURIDICO, ERP-ADMON, RADAR-SECOP2, BROWSER-FACTORY, PANEL-DE-CONTROL, CONTEXT, AGENTE-GENERAL, AGENTE-LEADS, NEX-SCOPE, MAXI-APP, CHISMOSO/INICIO-RAPIDO. **INSTALADOR sin README** (SIN_CARACTERIZAR).
- Descripciones del API de los 24 repos: solo COMUNITI-MANAGER y MAXI-APP traen descripción; el resto se caracterizó por README/estructura.

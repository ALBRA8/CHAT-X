# GLOSSARY — CHAT-X
Términos de la casa. Si un documento usa una palabra de esta lista, significa EXACTAMENTE esto.

| Término | Significado exacto |
|---|---|
| **CHAT-X** | La plataforma central (este repo): cerebro + interfaz + compliance. El CUERPO. |
| **Torre de control** | Arquitectura: CHAT-X gobierna motores independientes por contratos HTTP; no hay código ni BD compartidos. |
| **Motores / brazos** | Los 10 repos hermanos (WHATSPOWER, ULTRA, CRM-ALBRA, YOUTUBE-AUTOMATION, NEX-SCOPE, AGENTE-LEADS, AGENTE-GENERAL, AGENTE-KREA, COMUNITI-MANAGER, Extension-CAZADOR). |
| **CASA PROPIA** | Enmienda del fundador (D-007): los clones jamás procesan el negocio 18+; el negocio vive en cuartos nativos de CHAT-X. |
| **Casa nueva** | La cuenta GitHub `musestudio8`: donde vive la torre viva y las copias espejo de los motores del negocio. BLOQUEADA por GitHub desde el 2026-11-07 — durante el exilio la torre viva es `ALBRA8/CHAT-X` (D-012). |
| **Biblioteca de referencia** | Los repos de ALBRA8: solo lectura, congelados, para consulta y líneas SFW propias. |
| **Subcontrato** | Servicio SFW que queda en ALBRA8 y CHAT-X consume por HTTP o el fundador usa a mano (ej.: ABOGADO-BASE, CONTADOR-PÚBLICO — D-013). Jamás ve contenido adulto ni datos de fans; el original no se copia ni se modifica. |
| **Copia espejo / mudanza** | `git clone --mirror` + push completo: historia entera preservada como procedencia; después diverge a propósito. |
| **Commit fijado (pin)** | Cada clon `engines/` se ancla a un SHA documentado; verificarlo es parte de la procedencia. |
| **engines/** | Carpeta local (gitignoreada) donde vive cada brazo como repo completo e independiente. No sobrevive al reciclaje del sandbox: `scripts/reclonar_engines.sh` la reconstruye. |
| **Genoma** | Identidad del personaje: 7 pasos (audiencia → rasgos ancla → atributos+seed → lore → rasgos firmantes → dataset → cara canónica). |
| **Rasgos firmantes** | Rasgos visuales con intensidad que definen la consistencia del personaje (A3). |
| **Cara canónica** | Rostro de referencia del personaje; todo render se le compara (examen de identidad en 5 escenas). |
| **LoRA** | Adaptador de modelo entrenado por personaje; versionada, con hash en la procedencia de cada export. |
| **GFE / chat modo novia** | El carril conversacional nativo (`/api/chat`): personalidad por genoma + media en contexto + voz. El cerebro del embudo. |
| **Carril privado** | Estudio 18+: age-gate real + cifrado AES-256-GCM + llave maestra doble. |
| **QA forense** | Control de calidad de renders: identidad + anatomía, antes de aprobar pieza. |
| **InstaDump** | Planificador determinista de lotes multi-escena (pools curados). |
| **Escalera de vídeo** | draft → max: presupuesto de cómputo creciente por aprobaciones (vídeo). |
| **Gate humano** | Paso obligatorio de aprobación del fundador antes de acciones con efecto real (envíos, publicaciones). |
| **Sonda / taxonomía de 5 estados** | OPERATIVO · DEGRADADO · NO_CONFIGURADO · NO_DISPONIBLE · ERROR. Jamás se marca operativo por un simple HTTP 200. |
| **Sala limpia** | Método: la especificación vive en FICHA/CONTEXTO y el código se escribe solo desde ella — sin copiar código ajeno. |
| **Spintax** | Variación determinista de textos (motor ULTRA) para difusión anti-ban. |
| **NCII** | Non-Consensual Intimate Imagery. Regra absoluta: jamás rostros ni voces de personas reales. Todo personaje es 100% sintético. |
| **Etiqueta IA** | Marcado obligatorio de contenido generado (Fanvue/der.) — vendida como ventaja legal, no como traba. |
| **$0** | Regla económica: no gastar en tokens/APIs salvo autorización expresa del fundador. |
| **Embudo multicanal** | WhatsApp/Meta calientan (SFW) → Telegram y Fanvue cobran. Detalle: `00_MASTER/EMBUDO_MULTICANAL.md` §4. |
| **Calentar (carril SFW)** | Conversación de noviazgo sin contenido adulto por canales que prohíben el 18+ (ToS de Meta/WhatsApp). |
| **SHA a SHA** | Verificación de integridad: comparar el SHA local vs remoto de cada ref tras un push. |
| **Fast-forward only** | Push que jamás reescribe historia remota; si divergió, se detiene y se investiga. Sin `--force`, siempre. |

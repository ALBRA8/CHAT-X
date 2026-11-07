# DECISION_LOG — directrices del fundador
Ley del proyecto. Una directriz VIGENTE no se discute: se ejecuta o se consulta.
Formato: fecha · directriz · consecuencia · estado.

| ID | Fecha | Directriz del fundador | Consecuencia / ejecución | Estado |
|---|---|---|---|---|
| D-001 | 2026-10-30 | "Todo desde nuestra plataforma": crear modelo desde 0 con consistencia, imágenes, vídeo, desnudos — el pipeline completo vive en CHAT-X | Veredicto entregado por capacidades: genoma/consistencia/carril privado ya implementados; vídeo NSFW exige GPU local o RunningHub | EJECUTADA |
| D-002 | 2026-10-30 | Vídeo VESTIDO va por YT-AUTOMATION/Flow (no insistir más en GPU para eso). Pregunta real: ¿desnudos con GPU/RunningHub? → SÍ | Dos carriles de vídeo: SFW→Flow (motor YT); NSFW→GPU local ComfyUI (sin filtro, LoRA del personaje) o RunningHub (ToS sin verificar: probar barato antes de pagar). Flow JAMÁS para NSFW | VIGENTE |
| D-003 | 2026-10-30 | Borrar la "N" flotante de Next.js | Ejecutado en el front | EJECUTADA |
| D-004 | 2026-10-30 | EMBUDO MULTICANAL: CRM-ALBRA + WHATSPOWER + ULTRA = una sola máquina de calentamiento modo novia; evolucionar a Facebook/Instagram/Telegram | Meta/WhatsApp calientan (SFW, ToS); **Telegram y Fanvue cobran**. Plan completo: `00_MASTER/EMBUDO_MULTICANAL.md` §1-§6 | VIGENTE |
| D-005 | 2026-10-30 | Organización modular: cada repo en su carpeta; si se daña un brazo se repara o cambia SOLO el brazo | `engines/<NOMBRE>/` con .git propio, commit fijado, BD y puerto propios; `scripts/reclonar_engines.sh` repara un brazo sin tocar el cuerpo | VIGENTE |
| D-006 | 2026-10-30 | NO tocar jamás los repos originales (solo lectura) | Verificado con evidencia: cero push a ALBRA8; clones de solo lectura | VIGENTE |
| D-007 | 2026-10-30 | ENMIENDA CASA PROPIA: CHAT-X no se cruza con los repos originales; pedirle la casa al vecino la deja hecha un desorden | Los 10 motores JAMÁS procesan el negocio 18+; cuartos nativos en CHAT-X (cerebro ya nativo, daemon WhatsApp propio, bot Telegram propio, libro interno de memoria); F1 reescrita como daemon propio. `EMBUDO_MULTICANAL.md` §7 | VIGENTE |
| D-008 | 2026-10-30 | Layout de la casa nueva: GitHub APARTE (cuenta `musestudio8`), no carpetas dentro de CHAT-X. Copias espejo con historia; divergen a propósito | `scripts/mudar_casa_nueva.sh` + mapa en `EMBUDO_MULTICANAL.md` §8 | EJECUTADA |
| D-009 | 2026-10-31 | "INICIEMOS CON ESOS 3 CLONES ESPEJO": WHATSPOWER, WHATSPOWER-ULTRA, CRM (mantiene nombres originales, cambia el dueño) + token entregado | Mudanza espejo ejecutada y verificada SHA a SHA ese día | EJECUTADA |
| D-010 | 2026-10-31 | "CLONEMOS ESTE PROYECTO TAMBIÉN DE UNA VEZ" → musestudio8/CHAT-X | CHAT-X empujada desde la copia LOCAL VIVA (`9dcfa08`, 2 commits que solo existían localmente — el espejo desde ALBRA8 los habría perdido). Verificada SHA a SHA | EJECUTADA |
| D-011 | 2026-11-07 | Memoria documental con el principio de orden de CONTEXTO YOUTUBE, en carpeta llamada **CONTEXTO X** | Esta carpeta existe: 10 áreas numeradas + INDEX + reglas de mantenimiento; docs/ dejó de existir como carpeta suelta | EJECUTADA |
| D-012 | 2026-11-07 | GitHub BLOQUEÓ musestudio8 por meter "mucha información de trancazo" de golpe. "Por el momento sube lo que necesites en ALBRA8/CHAT-X"; al desbloquear, "portamos lo que nos sirva y lo demás lo dejamos en ALBRA8" | Excepción TEMPORAL y acotada a D-006/D-008: SOLO CHAT-X recibe push en ALBRA8 durante el exilio (fast-forward, sin `--force`, token por env); los demás originales siguen intocables. Al desbloquear: portar lo útil a musestudio8, el resto queda en ALBRA8 | VIGENTE (hasta desbloqueo) |

## Pendientes de decisión del fundador (no son directrices aún)
- Borrar o dejar el repo `borrador` de musestudio8 (cuenta bloqueada: en espera).
- Crear `video-studio` (destino de YOUTUBE-AUTOMATION) para completar la casa (requiere musestudio8 desbloqueada).
- API key del CRM, QR de WhatsApp, JWT de NEX-SCOPE: activaciones opcionales con procedimiento documentado.

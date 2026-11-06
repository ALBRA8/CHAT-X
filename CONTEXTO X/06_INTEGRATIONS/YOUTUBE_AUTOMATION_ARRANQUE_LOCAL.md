# PROCEDIMIENTO — YouTube Automation en tu máquina (modo seguro, sin publicar)

> **Propósito:** poner en marcha el motor YOUTUBE-AUTOMATION en la máquina del fundador y ejecutar una prueba de extremo a extremo **en modo seguro**: render local real, **sin publicar contenido**, sin Flow, sin OAuth, y **sin necesidad de ninguna credencial nueva** (modo demo $0 del propio motor).
>
> **Qué esto NO hace:** no publica en YouTube, no registra OAuth (`client_secret.json`), no activa Google Flow (`FLOW_MCP_ENABLED`), no pide ni incorpora API keys. Todo eso queda como decisión posterior explícita del fundador (ver §8).
>
> Este procedimiento no modifica código. Se ejecuta sobre TU copia local del repo `ALBRA8/YOUTUBE-AUTOMATION` (el clon `engines/` de CHAT-X es de solo lectura y no se toca).

---

## 1. Dependencias

| Requisito | Versión | Notas |
|---|---|---|
| Python | **3.10 – 3.12** | `start.bat` prefiere 3.12 > 3.11 > 3.10. Evita 3.13/3.14 (compilan extensiones C/Rust y se cuelga pip) |
| FFmpeg | cualquiera reciente, **en el PATH** | Windows: `winget install Gyan.FFmpeg` · Mac: `brew install ffmpeg` · Linux: `sudo apt install ffmpeg` |
| Disco | ~2 GB libres | venv + dependencias + salidas de video |
| Red | internet para pip | solo la primera instalación |

Opcionales (ya vienen en `requirements.txt`, el sistema degrada con gracia sin ellos): `faster-whisper` (subtítulos exactos, CPU), `google-api-python-client`/`google-auth-oauthlib` (solo para publicación — **no se usan en esta prueba**). Google Chrome solo se necesita para Google Flow — **fuera del alcance de esta prueba**.

---

## 2. Configuración necesaria (mínimo seguro)

En la raíz del motor:

```bash
cp backend/.env.example backend/.env      # Windows: copy backend\.env.example backend\.env
```

Valores para esta prueba segura (los defaults del `.env.example` ya son seguros; solo confírmalos):

| Variable | Valor seguro | Por qué |
|---|---|---|
| `HOST` / `PORT` | `127.0.0.1` / `8000` | Solo localhost; el 8000 no choca con CHAT-X (:3000) |
| `GEMINI_API_KEY` | **vacío** | Sin clave el motor funciona en modo demo $0: imágenes placeholder + voz edge-tts. (Si más adelante QUIERES calidad completa, tú pegas tu clave en el dashboard → ⚙ Configuración → se activa al instante; no hace falta reiniciar) |
| `TTS_PROVIDER` | `edge` | Locución gratuita e ilimitada, sin cuenta |
| `FACTORY_AUTOPUBLISH` | `false` (default) | **Crítico**: la fábrica programada jamás publica |
| `MASTER_API_KEY` | vacío o definido por ti | Si lo defines, TODAS las rutas `/api/*` exigen tu clave (header `X-API-Key`). Para la prueba local en 127.0.0.1 puede quedar vacío |
| `FLOW_MCP_ENABLED` / `FLOW_MCP_VIDEO_ENABLED` | **sin definir** (default apagado) | Google Flow queda fuera de esta prueba |
| `client_secret.json` | **no subir** | Sin OAuth no existe ruta de publicación: `/api/health` lo reportará como `"youtube": false` |

Whisper (recomendado, opcional): `pip install faster-whisper` no hace falta como paso aparte — entra con las dependencias del arranque.

---

## 3. Comprobaciones previas (checklist, 2 min)

Ejecuta y verifica:

```bash
python --version        # 3.10–3.12
ffmpeg -version         # responde (está en el PATH)
```

1. **Puerto 8000 libre**: nada más escuchando ahí (CHAT-X usa 3000; WHATSPOWER 3003; ULTRA 3004).
2. **`backend/.env`**: `FACTORY_AUTOPUBLISH=false` (o ausente), `GEMINI_API_KEY` vacío, sin `FLOW_MCP_ENABLED`.
3. **Sin `client_secret.json`** cargado en el motor (si existiera de pruebas anteriores, muévelo fuera para esta prueba).
4. Carpeta del repo con permisos de escritura (el motor crea `backend/data/`).
5. Si tu copia local no es la más reciente del upstream, tú decides actualizarla (`git pull` en TU repo); el clon de CHAT-X verificó upstream en `2589e4e`. Nunca hacer push desde CHAT-X.

---

## 4. Arranque

**Windows:** doble clic en `start.bat` (o `start.bat --no-browser` para no abrir navegador).
**Linux/Mac:** `chmod +x start.sh && ./start.sh`

El lanzador hace solo: localiza Python → crea/repara `backend/.venv` → instala dependencias (solo la primera vez, con auto-reparación) → levanta uvicorn con hot-reload → abre el dashboard cuando `/api/health` responde.

Verificación de vida:

```bash
curl http://127.0.0.1:8000/api/health
```

Respuesta esperada (campos clave): `{"ok": true, "version": "2.20.0", "gemini": false, "whisper": true, "youtube": false, ...}`.
- `"youtube": false` = **sin credencial OAuth de publicación** → la publicación es materialmente imposible. Es tu primera evidencia de modo seguro.
- `"gemini": false` = modo demo $0 (esperado, no es error).

Detén con **Ctrl+C** en la misma ventana (el servidor vive en primer plano). También existen `DETENER-ALBRA.vbs` / `DETENER-con-ventana.bat` en la raíz del motor.

---

## 5. Prueba de extremo a extremo en modo seguro (sin publicar)

Dos caminos equivalentes; elige uno. El camino B valida exactamente los contratos que CHAT-X invoca.

### Camino A — Dashboard (interactivo)

1. Abre `http://127.0.0.1:8000`.
2. Crea un video de prueba por idea (p. ej. "video de 30 segundos sobre el imperio romano") y lánzalo desde la UI.
3. Observa el progreso: guion local (fallback $0) → imágenes placeholder → locución edge-tts → render Ken Burns con FFmpeg → subtítulos.
4. Al terminar, el proyecto queda `ready` con su MP4 en `backend/data/output/<pid>/` y el QA forense disponible en la ficha del proyecto.

### Camino B — Arnés m2m (reproducible, contratos reales)

Crear y lanzar son operaciones **separadas** del contrato (crear NUNCA lanza). Sin `MASTER_API_KEY`, sin tokens:

```bash
# [P1] Manifiesto del arnés: 19 operaciones youtube.* con su riesgo
curl http://127.0.0.1:8000/api/harness/v1/manifest

# [P2] CREAR proyecto (op. MEDIUM, solo local, NO lanza nada)
curl -X POST http://127.0.0.1:8000/api/harness/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"contract_version":"1.0","execution_id":"e2e-seguro-crear-001",
       "requester":"fundador","capability":"youtube_automation",
       "operation":"youtube.create",
       "input":{"idea":"video corto de prueba del arnes","format":"short"},
       "permissions":["youtube.production.create"]}'

# [P3] LANZAR pipeline local (render FFmpeg; autopublish=false → nadie publica)
curl -X POST http://127.0.0.1:8000/api/harness/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"contract_version":"1.0","execution_id":"e2e-seguro-lanzar-001",
       "requester":"fundador","capability":"youtube_automation",
       "operation":"youtube.launch","input":{"project_id":"<PID_DE_P2>"},
       "permissions":["youtube.production.launch"]}'

# [P4] Estado normalizado (repetir hasta status READY; sin inventar estados)
curl http://127.0.0.1:8000/api/projects/<PID_DE_P2>

# [P5] QA forense del video final
curl http://127.0.0.1:8000/api/video_qa/<PID_DE_P2>
```

Éxito de la E2E: P1 lista las 19 operaciones · P2 devuelve `{status: "ACCEPTED"|"READY", outputs..., project_id}` · P4 termina `ready` · P5 QA sin errores (`ok`, sin flags de pantalla negra/audio mudo) · MP4 reproducible en `backend/data/output/<pid>/`.
Si tu servidor tiene `MASTER_API_KEY` definido, añade el header `-H "X-API-Key: <tu clave local>"` a los 5 curl (la clave la generaste tú en tu `.env`; nunca la pegues en chats).

### Evidencia de que NADA se publicó (3 comprobaciones)

1. `/api/health` → `"youtube": false` (no hay credencial OAuth: no hay a dónde publicar).
2. `.env` → `FACTORY_AUTOPUBLISH=false` (y así permanece; el autopublish además se omite si el QA final tiene errores — gate estructural).
3. `/api/projects/<pid>` → `meta.publish_state` permanece `DRAFT` (jamás `PUBLISHING`/`PUBLISHED`; la publicación exige llamada explícita a publish + OAuth, y ninguna se ejecutó).

---

## 6. (Opcional) Verificar la conexión con CHAT-X tras el arranque

Si CHAT-X corre en la misma máquina mientras el motor está arriba:

```bash
cd <carpeta-de-CHAT-X> && bun scripts/sondeo_motores.ts
```

El sondeo dejará de reportar youtube como NO_DISPONIBLE y pasará a clasificarlo con las capas reales (conectividad + salud + operación representativa, sin derivar OPERATIVO de un 200). Los pasos de orquestador `youtube_validar` / `youtube_submit` / `youtube_estado` de CHAT-X quedan entonces **invocables de verdad** contra los 7 contratos. Sin credenciales nuevas de por medio.

---

## 7. Deshacer / limpiar

- Detener: Ctrl+C en la ventana del servidor.
- Borrar la prueba: el proyecto de test se elimina con la op. destructiva `youtube.delete` (permiso `youtube.destroy`, id exacto 12-hex, regla M9) o borrando `backend/data/output/<pid>/`; también puedes conservarlo como evidencia.
- Desinstalar: basta borrar `backend/.venv/` y `backend/data/` — el motor no escribe fuera de su carpeta.

## 8. Qué queda FUERA de este procedimiento (requiere tu decisión explícita)

| Capacidad | Qué exigiría | Riesgo |
|---|---|---|
| Calidad completa Gemini (guion/imágenes/TTS premium) | Que TÚ pegues tu `GEMINI_API_KEY` en el dashboard | Consume la cuota gratuita de tu clave; sin costo |
| Google Flow real (generación de video por extensión/CDP) | Chrome con TU sesión de Google + flags `FLOW_MCP_ENABLED=1` / `FLOW_MCP_VIDEO_ENABLED=1` + extensión cargada; el E2E real con Flow **no está demostrado** todavía (ver `ESTADO_REAL.md` §3 del motor) | Toca tu sesión de navegador; hacer solo cuando decidas |
| Publicación en YouTube (manual o autopublish) | Subir `client_secret.json` + flujo OAuth loopback + cambiar `FACTORY_AUTOPUBLISH` | Publica contenido real — fuera de alcance por orden vigente |
| NotebookLM MCP / Studio Bridge | `notebooklm-py[browser]==0.8.5` + configuración | Opcional, independiente |

Ninguno de estos pasos forma parte de la prueba segura; el motor queda plenamente operativo en modo demo sin ellos.

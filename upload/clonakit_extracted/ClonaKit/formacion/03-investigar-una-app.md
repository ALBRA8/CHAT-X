# Investiga una app

> **Tu tutor para esta lección:** en Claude Code, escribe `/clonar` y el tutor te guía en esto paso a paso (en las fases de elegir e investigar). Aquí tienes los mismos pasos por escrito.

## En esta lección

- Entenderás qué es la ingeniería inversa y qué puede (y qué no) descubrir el kit.
- Encontrarás la ruta de una app en Mac o en Windows, o usarás la dirección de una web.
- Lanzarás la investigación y aprenderás a leer el informe.

## Lo que necesitas

- Las lecciones 01 y 02 hechas.
- La app instalada **de forma legal** en tu ordenador, o la dirección de una web pública.
- Google Chrome, si vas a investigar una web.
- Un nombre para tu clon, que decides al elegir la app: el tuyo propio, en minúsculas, con guiones, sin espacios ni tildes y **sin la marca original**. Por ejemplo, `mi-estudio`, no `obs-clon`. Ese nombre acabará en tu dirección web.

## Paso 1. Qué es la ingeniería inversa, en cristiano

Imagina a una mecánica delante de un coche sin manual. Abre el capó y ve que tiene motor eléctrico, batería y cámara de aparcamiento. No tiene los planos de la fábrica, pero entiende qué piezas usa y para qué. Eso es la *ingeniería inversa*: entender algo mirándolo desde fuera.

REA hace eso con las apps, y ClonaKit te lo traduce. Aquí **solo miramos**: no cambiamos la app ni nos saltamos nada. Según el tipo de app, se ve más o menos:

- **App nativa de Mac**: hecha con las herramientas propias de Apple. El kit saca su "esqueleto": los permisos que pide, los *frameworks* del sistema que usa (paquetes de funciones que trae el sistema, por ejemplo para la cámara) y sus plugins. No ve el código por dentro.
- **App Electron**: hecha con tecnología web (HTML, CSS y JavaScript) dentro de una ventana de escritorio. Muchas apps de chat y editores de código lo son. Aquí se ve más: sus ventanas, sus canales de comunicación interna (los mensajes que se pasan las partes de la app entre sí) y otros detalles.
- **Web pública**: el kit abre Chrome solo, hace una captura y analiza los *scripts* (archivos de JavaScript) que carga la página.

Recuerda: investigar es una **ayuda**, no una obligación. Si el kit no puede con una app, escribe la ficha usándola tú y describiendo lo que ves.

## Paso 2. Encuentra la ruta de la app

La *ruta* es la dirección de un archivo dentro de tu ordenador, como `/Applications/MiApp.app`.

**Mac:**

1. En la terminal, dentro de la carpeta del kit, escribe el principio del comando **sin pulsar Intro**: `npm run investigar -- ` (con un espacio al final).
2. Abre Finder → Aplicaciones.
3. Arrastra el icono de la app a la ventana de la terminal. Se pegará su ruta.
4. Si el nombre tiene espacios, la terminal los protege con `\` (por ejemplo, `/Applications/Mi\ App.app`). En ese caso **no añadas comillas**.
5. Completa el comando con `--nombre mi-clon` y pulsa Intro (lo verás entero en el paso 3).

**Windows (solo apps Electron):**

1. Busca el acceso directo de la app en el Escritorio o en el menú Inicio.
2. Clic derecho → **Abrir ubicación del archivo**. Si lo hiciste desde el menú Inicio, se abre la carpeta del acceso directo: repite clic derecho → **Abrir ubicación del archivo** sobre él para llegar a la carpeta de instalación.
3. Entra en la carpeta `resources`. A veces antes hay una carpeta con la versión, tipo `app-1.2.3`.
4. Busca el archivo `app.asar`. *asar* es el paquete donde las apps Electron guardan sus archivos.
5. Clic derecho sobre `app.asar` → **Copiar como ruta de acceso** (en Windows 10, mantén pulsada `Mayús` al hacer clic derecho). La ruta se copia ya entre comillas.

Truco: también puedes darle la carpeta de instalación entera (la que contiene `resources`); el kit busca dentro `app.asar` o una carpeta `app`. Si no encuentra ninguna de las dos, probablemente la app no es Electron. Las apps nativas de Windows (las que solo tienen un `.exe`) todavía no se pueden investigar: el kit te avisará.

En Mac no tienes que saber si la app es nativa o Electron: el kit lo detecta solo.

## Paso 3. Lanza la investigación

Siempre desde la carpeta del kit. La fórmula es:

```bash
npm run investigar -- "<ruta de la app o URL>" --nombre <nombre-del-clon>
```

Los dos guiones `--` le dicen a npm que lo que viene detrás es para el kit. Pon siempre `--nombre` con **tu** nombre: si lo olvidas, el kit usará el nombre de la app original. Ejemplos:

**Mac:**

```bash
npm run investigar -- /Applications/MiApp.app --nombre mi-clon
```

**Windows (PowerShell):**

```powershell
npm run investigar -- "C:\Users\TuUsuario\AppData\Local\Programs\MiApp\resources\app.asar" --nombre mi-clon
```

**Una web (Mac y Windows):**

```bash
npm run investigar -- "https://example.com" --nombre mi-clon
```

Una app nativa o una web suele tardar unos segundos; una app Electron grande, hasta varios minutos. No cierres la terminal. Con una web, se abrirá una ventana de Chrome temporal: no la toques, se cerrará sola. Cuando veas `✅ Listo`, tendrás:

```
clones/mi-clon/
└── investigacion/
    ├── informe.md   ← esto lo lees tú
    ├── captura.png  ← solo en webs: una captura para ti, nunca se publica
    └── datos/       ← datos en bruto de REA: nunca se publican
```

## Paso 4. Lee el informe

Abre `informe.md` con cualquier editor de texto, o pídele a Claude: "Resúmeme el informe de mi-clon en cinco frases". Los apartados cambian según el tipo de app; estos son los principales:

- **Resumen en 30 segundos**: empieza siempre por aquí.
- **Qué tipo de app es**: nativa, Electron o web. Te dice cuánto detalle esperar.
- **Permisos que pide**: qué pide al sistema (cámara, micrófono…) y la explicación que da. Son pistas de sus funciones. Esa explicación es texto del original: entiéndela, pero no la copies.
- **Piezas del sistema que usa** (apps de Mac): para qué sirve cada pieza y, en la columna clave, cómo se hace lo mismo en una web.
- **Ventanas y pantallas** y **Áreas de funcionalidad** (apps Electron): qué ventanas tiene y en qué grandes bloques se organiza.
- **Cómo se ve**, **Elementos de la interfaz** y **Qué guarda en tu navegador** (webs): la captura, los botones de la primera pantalla y qué datos guarda.
- **Lo que este informe no puede ver**: sus límites, para que no te lleves sorpresas.

Algunos equivalentes típicos (no hace falta que te los aprendas: son los que usará Claude):

| La app usa… | En una app web se hace con… |
|---|---|
| Cámara y micrófono | `getUserMedia` |
| Captura de pantalla | `getDisplayMedia` |
| Audio (volumen, mezcla) | Web Audio API |
| Gráficos y vídeo | `<canvas>` o WebGL |
| Grabación | `MediaRecorder` |
| Guardar datos | `localStorage` o IndexedDB |

Mientras lees, toma notas **con tus palabras** para la ficha. No copies frases, textos de la app ni nombres internos.

## Paso 5. Los límites del kit

- **No ve el servidor.** El *servidor* es el ordenador de la empresa que guarda cuentas y datos. Lo que pasa allí es invisible.
- **Las apps nativas solo dan el esqueleto**: qué piezas usan, no cómo funcionan por dentro.
- **Las apps grandes tardan**: varios minutos es normal.
- **En las webs solo mira la página inicial.** Las que exigen iniciar sesión no sirven, y las muy protegidas pueden bloquear la captura. Si pasa, no intentes esquivarlo: describe la web usándola.

## Paso 6. Qué no hacer

- No investigues apps pirateadas ni apps que no tengas de forma legal.
- No intentes entrar en zonas con inicio de sesión usando cuentas ajenas, ni te saltes ninguna protección.
- No publiques ni compartas la carpeta `investigacion/datos/` ni la captura de la web.
- No pases a tu ficha textos, nombres internos ni fragmentos de código del informe o de los datos.
- No lances la investigación de una web muchas veces seguidas.

## Si algo falla

- **"No encuentro «…»".** La ruta está mal escrita. En Mac, arrastra la app otra vez y no mezcles comillas con `\`. En Windows, comprueba que apunta a `app.asar` o a la carpeta de instalación.
- **Al investigar una web dice que no encuentra Chrome.** Instálalo desde [google.com/chrome](https://www.google.com/chrome/) y vuelve a probar.
- **Parece colgado.** Las apps grandes tardan. Si pasa mucho rato sin cambios, pulsa `Ctrl + C` para cancelar y pregunta al tutor.
- **"La investigación no ha podido terminar".** Lee el motivo que aparece detrás. En webs suele ser que la página pide iniciar sesión o redirige a otra. Si el informe sale casi vacío, es normal en apps nativas o webs protegidas: completa la ficha usando la app.
- **`npm ERR! Missing script: "investigar"`.** No estás en la carpeta del kit. Entra con `cd` y repite.

## Resumen

- La ingeniería inversa entiende una app desde fuera; aquí solo miramos, nunca forzamos.
- En Mac arrastras la app a la terminal; en Windows buscas `resources\app.asar`; para webs usas la URL.
- El comando es `npm run investigar -- "<ruta o URL>" --nombre <nombre-del-clon>`.
- El informe va a `clones/<nombre>/investigacion/informe.md`; los datos en bruto nunca se publican.

**Siguiente lección →** [04 · De la ficha al código](04-de-la-ficha-al-codigo.md)

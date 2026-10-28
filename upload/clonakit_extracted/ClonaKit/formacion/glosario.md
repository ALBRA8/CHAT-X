# Glosario

Las palabras raras de ClonaKit, explicadas en una o dos frases. Están ordenadas de la A a la Z.

← [Volver al índice](README.md)

## A

**API**: una "puerta" con reglas fijas para que un programa hable con otro. Los créditos de API de Claude son saldo de prepago para usar Claude a través de esa puerta.

**App nativa**: app hecha con las herramientas propias del sistema (por ejemplo, las de Apple en Mac). El kit solo puede ver su "esqueleto": permisos, frameworks y plugins.

**asar**: el formato de paquete donde las apps Electron guardan sus archivos. En Windows lo buscarás como `resources\app.asar` dentro de la carpeta de la app.

## B

**Build**: paso previo en el que muchos proyectos "empaquetan" su código antes de publicarlo. Las apps de ClonaKit no lo necesitan: se publican tal cual.

## C

**CDP (Chrome DevTools Protocol)**: el idioma que usan las herramientas para comunicarse con Chrome. El kit lo usa para abrir una web, hacer una captura y ver qué scripts carga.

**Clean-room (sala limpia)**: método en el que quien construye nunca ve el original; solo lee una descripción escrita por otra persona. En ClonaKit, el constructor solo lee tu `FICHA.md`.

**CLI**: "interfaz de línea de comandos"; un programa que se maneja escribiendo en la terminal, como `gh` (GitHub CLI) o `npx vercel`.

**Commit**: una "foto" de tu proyecto en un momento concreto, guardada por Git con una nota que explica qué cambió.

**Consola**: panel del navegador donde la página muestra mensajes y errores. En Chrome se abre con `Cmd + Opción + J` (Mac) o `Ctrl + Mayús + J` (Windows).

## D

**Dependencia**: una pieza de software que tu proyecto necesita para funcionar. Las del kit (como REA) se instalan con `npm install`.

**Despliegue (deploy)**: publicar una versión de tu app en un servidor para que esté en internet. El *alojamiento* (hosting) es el sitio donde queda guardada.

**DNS**: la "agenda de contactos" de internet: traduce un nombre como `miapp.com` a la dirección del servidor donde está la web.

**Dominio**: el nombre de tu web, como `miapp.com`. Se alquila por años a un *registrador*, una empresa que vende dominios.

**DRM**: sistemas anticopia que protegen contenidos o programas. En ClonaKit nunca se esquivan.

## E

**Electron**: tecnología para hacer apps de escritorio con herramientas web (HTML, CSS y JavaScript). El kit puede ver bastante de ellas: ventanas, canales internos y más.

## F

**Ficha**: tu especificación, en `clones/<nombre>/FICHA.md`. Describe con tus palabras qué hace tu app, sin código, textos ni imágenes del original.

**Framework**: un conjunto de piezas ya hechas sobre el que se construyen programas. En Mac, los frameworks del sistema dan acceso a la cámara, el audio, los gráficos, etc.

## G

**Git**: programa que guarda el historial de versiones de tu proyecto. Te permite volver atrás y subir tu código a GitHub.

**GitHub**: web donde guardas tus repositorios en internet. Vercel se conecta a ella para publicar tu app.

**.gitignore**: archivo con la lista de cosas que Git no debe guardar ni subir, como contraseñas o claves.

## H

**HTML, CSS y JavaScript**: los tres lenguajes de la web. HTML pone el contenido, CSS el aspecto y JavaScript el comportamiento.

**https**: la versión segura de las direcciones web, la del candado. La cámara, el micrófono y la captura de pantalla solo funcionan con https (o en `localhost`).

## I

**Ingeniería inversa**: entender cómo funciona algo estudiándolo desde fuera, sin sus planos. En ClonaKit se usa para descubrir funciones, nunca para copiar.

## L

**localhost**: nombre que significa "este mismo ordenador". `http://localhost:3000` es tu app funcionando solo para ti mientras la pruebas.

## M

**Markdown**: texto con un formato muy sencillo (`#` para títulos, `-` para listas). Los archivos acaban en `.md`, como estas lecciones.

**MCP (Model Context Protocol)**: un "enchufe" estándar para dar herramientas extra a Claude. El kit trae el servidor MCP `rea`, que le permite usar REA.

**MVP (producto mínimo viable)**: la versión más pequeña de una app que ya es útil. En ClonaKit son de 3 a 5 funciones.

## N

**Node.js**: programa que ejecuta JavaScript fuera del navegador. Las herramientas del kit funcionan con él; usa la versión LTS 24.

**npm**: el gestor de paquetes de Node.js. Instala dependencias (`npm install`) y lanza las tareas del kit (`npm run investigar`, `npm run probar`). `npx` ejecuta un programa sin dejarlo instalado.

## P

**Permiso**: autorización que una app pide para usar algo delicado, como la cámara, el micrófono o la pantalla. El informe te dice qué permisos pide la app original y por qué.

**Puerto**: el "número de puerta" por el que se conecta el navegador a un servidor. El kit usa el 3000 para probar tu app.

**Push**: enviar tus commits desde tu ordenador a GitHub con `git push`. En ClonaKit, cada push publica una versión nueva en Vercel.

## R

**REA**: herramienta de código abierto (licencia MIT) que inspecciona apps sin tener su código fuente. ClonaKit la usa por debajo y traduce sus resultados.

**Repositorio (repo)**: la carpeta de un proyecto junto con todo su historial de versiones guardado por Git.

**Ruta**: la dirección de un archivo o carpeta dentro de tu ordenador, como `/Applications/MiApp.app`.

## S

**Servidor**: ordenador (o programa) que entrega páginas o datos a otros por internet. El kit no puede ver lo que pasa en el servidor de una app.

**Subagente**: otra sesión de Claude, aparte, con sus propias instrucciones. En ClonaKit es el constructor en sala limpia, que solo lee tu ficha.

## T

**Terminal**: ventana para dar órdenes al ordenador escribiendo. En Mac se llama Terminal; en Windows, PowerShell o Terminal.

## V

**Vercel**: servicio que aloja y publica webs. Se conecta a GitHub y publica tu app con https cada vez que haces push.

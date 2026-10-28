# Prueba tu app en local

> **Tu tutor para esta lección:** en Claude Code, escribe `/clonar` y el tutor te guía en esto paso a paso (en la fase de construir y probar). Esta lección te sirve de chuleta cuando pruebes por tu cuenta.

## En esta lección

- Entenderás qué es *localhost* y arrancarás tu app con `npm run probar`.
- Abrirás la consola del navegador para ver qué está fallando.
- Darás permisos de cámara, micrófono y pantalla, y aprenderás a pedir ayuda a Claude con un error.

## Lo que necesitas

- Tu app generada en `clones/<nombre>/app/` (lección 04).
- Google Chrome. Los atajos de esta lección son los de Chrome.

## Paso 1. Qué es localhost

Un *servidor web* es un programa que entrega páginas a un navegador. *localhost* es un nombre especial que significa "este mismo ordenador". Así que `http://localhost:3000` es una web servida desde tu ordenador, por el *puerto* 3000 (piensa en el puerto como el número de puerta por el que entra el navegador).

Solo la ves tú. Nadie más puede entrar desde internet.

¿Por qué no hacer doble clic en `index.html`? Porque abrirla como archivo hace que algunas cosas fallen, como los permisos de cámara. El servidor local imita cómo se comportará tu app ya publicada.

## Paso 2. Arranca tu app

Desde la carpeta del kit (no desde dentro de `app`), escribe:

```bash
npm run probar -- mi-clon
```

Cambia `mi-clon` por el nombre de tu clon. Se abrirá `http://localhost:3000` en el navegador. Si no se abre, escribe tú la dirección que aparece en la terminal. Si el puerto 3000 está ocupado, el kit usa el siguiente libre (3001, 3002…) y te lo indica.

¿Aún no tienes clon? Practica con el ejemplo del kit:

```bash
npm run probar -- ejemplos/mini-estudio/app
```

Mientras el servidor está encendido, esa terminal queda ocupada. Si necesitas escribir otros comandos, abre otra ventana de terminal.

Para apagar el servidor, pulsa `Ctrl + C` en esa terminal. En Mac también es `Ctrl`, no `Cmd`.

## Paso 3. Recarga después de cada cambio

Cuando Claude cambie algún archivo, recarga la página:

- **Mac:** `Cmd + R`
- **Windows:** `Ctrl + R` o `F5`

Si no ves el cambio, haz una recarga forzada, que ignora lo que el navegador tenía guardado:

- **Mac:** `Cmd + Mayús + R`
- **Windows:** `Ctrl + Mayús + R`

## Paso 4. Abre la consola del navegador

La *consola* es un panel del navegador donde la página escribe mensajes y errores. Forma parte de las *herramientas para desarrolladores*, que todos los navegadores traen escondidas.

En Chrome:

- **Mac:** `Cmd + Opción + J`
- **Windows:** `Ctrl + Mayús + J`

Los errores salen en rojo. No hace falta que los entiendas: lo importante es copiarlos para Claude (paso 6). Puedes seleccionar el texto con el ratón y copiarlo como cualquier otro.

## Paso 5. Permisos de cámara, micrófono y pantalla

Los navegadores solo dejan usar la cámara, el micrófono y la captura de pantalla en páginas seguras: las que empiezan por `https://` y, como excepción, `localhost`. Por eso pruebas con `npm run probar` y publicarás en Vercel, que incluye https.

1. La primera vez, Chrome te preguntará si permites el acceso. Pulsa **Permitir**.
2. Si lo bloqueaste sin querer, haz clic en el icono que hay a la izquierda de la dirección, busca la cámara o el micrófono y cámbialo a "Permitir". Después, recarga.
3. Al compartir pantalla, Chrome te deja elegir entre una pestaña, una ventana o la pantalla entera.

**En Mac hay un paso más.** macOS también tiene que dar permiso a Chrome:

1. Abre Ajustes del Sistema → Privacidad y seguridad.
2. Entra en **Grabación de pantalla** (en versiones recientes puede llamarse "Grabación de pantalla y audio del sistema") y activa Google Chrome.
3. Revisa también **Cámara** y **Micrófono**.
4. Cierra Chrome del todo con `Cmd + Q` y vuelve a abrirlo.

**En Windows**, si la cámara no aparece, revisa Configuración → Privacidad y seguridad → Cámara (y Micrófono) y comprueba que el acceso está activado, también para las aplicaciones de escritorio. Los nombres exactos pueden variar según tu versión de Windows.

## Paso 6. Pide ayuda a Claude pegando el error

Claude arregla mucho mejor un error si le das contexto. Usa esta plantilla en Claude Code:

> "Estoy probando mi-clon con `npm run probar`. Al pulsar el botón de grabar no pasa nada. Esperaba que empezara a grabar. En la consola sale este error:
> ```
> (pega aquí el error completo)
> ```
> ¿Qué pasa y cómo lo arreglas? Explícamelo sencillo."

Consejos:

- Copia el error **completo**, no solo la primera línea.
- Cuenta qué hiciste justo antes de que fallara.
- Di qué sistema usas (Mac o Windows) y qué navegador.
- Un problema cada vez.
- Pega errores de **tu** app, nunca trozos de la app original.

## Si algo falla

- **"No encuentro un index.html para «…»".** El nombre no coincide con ninguna carpeta de `clones/` o la app aún no está construida. Si ejecutas `npm run probar` sin nombre, el kit te lista los clones listos. Si sale `Missing script: "probar"`, no estás en la carpeta del kit: entra con `cd` y repite.
- **"Los puertos 3000–3010 están ocupados".** Tienes otros servidores encendidos, quizá en otras terminales. Apágalos con `Ctrl + C` o cierra esas terminales y vuelve a probar.
- **La página sale en blanco o le falta algo.** Abre la consola (paso 4), copia el error en rojo y pásaselo a Claude (paso 6). Mira también la terminal: si sale `⚠️ 404`, la app pide un archivo que no existe.
- **La cámara no funciona (`NotAllowedError` o `NotReadableError`).** El primero significa que el permiso está denegado: repasa el paso 5. El segundo suele indicar que otra app (una videollamada, por ejemplo) está usando la cámara: ciérrala.
- **En Mac, la captura de pantalla sale en negro o falla.** Falta el permiso de Grabación de pantalla para Chrome. Actívalo (paso 5) y reinicia Chrome con `Cmd + Q`.

## Resumen

- `localhost` es tu propio ordenador; tu app solo la ves tú mientras pruebas.
- Arrancas con `npm run probar -- <nombre>` desde la carpeta del kit y paras con `Ctrl + C`.
- La consola de Chrome se abre con `Cmd + Opción + J` (Mac) o `Ctrl + Mayús + J` (Windows).
- Cámara, micro y pantalla solo funcionan en `localhost` o `https`; en Mac, Chrome necesita además el permiso del sistema.
- Para pedir ayuda, pega el error completo y explica qué hacías y qué esperabas.

**Siguiente lección →** [06 · Git y GitHub](06-git-y-github.md)

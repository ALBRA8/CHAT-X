# Publica tu app en Vercel

> **Tu tutor para esta lección:** en Claude Code, escribe `/desplegar` y el tutor te guía en esto paso a paso. Las pantallas de Vercel cambian de vez en cuando; si algo no coincide, el tutor te ayuda a encontrarlo.

## En esta lección

- Entenderás qué significa desplegar y alojar una web.
- Publicarás tu repositorio en Vercel y obtendrás tu dirección `.vercel.app`.
- Sabrás que cada `git push` publica una versión nueva, y tendrás una alternativa por terminal.

## Lo que necesitas

- Tu app subida a GitHub (lección 06).
- Unos 15 minutos.

## Paso 1. Qué es desplegar y alojar

- *Alojar* (en inglés, *hosting*) es tener tu web guardada en un servidor que está encendido día y noche y conectado a internet.
- *Desplegar* (en inglés, *deploy*) es subir una versión de tu app a ese alojamiento para que esté "en vivo".

**Vercel** hace las dos cosas y, además, se conecta a GitHub para publicar solo cada vez que subes cambios. Tiene un plan gratuito (Hobby). Ojo: según sus condiciones actuales, ese plan es para **uso personal y no comercial**. Si quieres ganar dinero con tu app, revisa antes [vercel.com/pricing](https://vercel.com/pricing).

## Paso 2. Practica primero con MiniEstudio

Te recomendamos hacer tu primer despliegue con el ejemplo del kit, sin presión. Copia el ejemplo a `clones/` como si fuera un clon tuyo y trabaja sobre la copia. Desde la carpeta del kit:

**Mac:**

```bash
mkdir -p clones/mini-estudio
cp -R ejemplos/mini-estudio/app clones/mini-estudio/app
```

**Windows (PowerShell):**

```powershell
mkdir clones\mini-estudio
Copy-Item -Recurse ejemplos\mini-estudio\app clones\mini-estudio\app
```

Después sigue la lección 06 con `mini-estudio` en lugar de `mi-clon` (entrando en `clones/mini-estudio/app`) y vuelve aquí. Si prefieres, pide a `/desplegar` que lo haga contigo.

## Paso 3. Crea tu cuenta en Vercel

1. Entra en [vercel.com](https://vercel.com) y regístrate (*Sign Up*).
2. Si te pregunta por el plan, elige el gratuito (Hobby).
3. Elige **Continue with GitHub**. Así Vercel puede ver tus repositorios; tú decides a cuáles le das acceso.

## Paso 4. Importa tu repositorio

1. En el panel de Vercel, busca **Add New…** → **Project** (o algo parecido).
2. Verás la lista de tus repos de GitHub. Busca el tuyo y pulsa **Import**. Si no aparece, usa el enlace para ajustar los permisos de GitHub y dale acceso a ese repo.
3. Revisa la configuración:
   - **Framework Preset**: elige **Other**. (Un *framework* es un conjunto de herramientas para hacer webs; tu app no usa ninguno.)
   - **Root Directory**: déjalo como está, porque `index.html` está en la raíz del repo.
   - **Build Command**: vacío, porque tu app no tiene *build*. Si hay un interruptor para sobrescribirlo, déjalo apagado.
   - **Output Directory**: déjalo por defecto.
4. Pulsa **Deploy**.

En uno o dos minutos verás un mensaje de que ya está publicada, con una vista previa. Si los nombres de los botones han cambiado, busca algo parecido: la idea es siempre importar el repo, elegir "Other" y desplegar.

## Paso 5. Tu dirección `.vercel.app`

Vercel te da una dirección gratis del tipo `https://mi-clon.vercel.app`. Si ese nombre ya está cogido, añadirá algo más. Pruébala desde el móvil: ya está en internet.

Comparte esa dirección (la de *producción*, que es la versión oficial de tu app). En el panel también verás direcciones largas con letras y números: son de cada despliegue concreto y pueden pedir iniciar sesión en Vercel.

## Paso 6. https incluido

*https* es la versión segura de las direcciones web: lo notas por el candado del navegador. Vercel lo pone gratis y de forma automática. Es imprescindible para tu app: sin https, la cámara, el micrófono y la captura de pantalla no funcionarían fuera de `localhost` (lección 05).

## Paso 7. Cada `push` publica una versión nueva

A partir de ahora, para actualizar tu app publicada, desde la carpeta de tu app:

```bash
git status
git add .
git commit -m "Cambio el color del botón de grabar"
git push
```

Vercel detecta el `push` y publica la nueva versión en un minuto o dos. En la pestaña **Deployments** de tu proyecto verás cada despliegue con su estado (en construcción, listo o con error). Lo que subes a la rama `main` va a producción.

## Paso 8. Alternativa: la CLI de Vercel

Si prefieres la terminal, puedes publicar sin pasar por el panel. `npx` ejecuta un programa de npm sin dejarlo instalado. Desde la carpeta de tu app (o dentro de Claude Code, como `! npx vercel`):

```bash
npx vercel
```

Te pedirá iniciar sesión y hará unas preguntas (algo como si quieres configurar y desplegar, en qué cuenta y con qué nombre). Las respuestas por defecto suelen valer. Eso crea una versión de prueba. Para publicar la versión oficial:

```bash
npx vercel --prod
```

Ojo: así tu app no se republica sola con cada `push`, salvo que conectes el repo de GitHub en los ajustes del proyecto. Tienes más detalles en la [documentación de Vercel](https://vercel.com/docs).

## Si algo falla

- **No aparece tu repo al importar.** Ajusta los permisos de la app de Vercel en GitHub y dale acceso a ese repositorio.
- **El despliegue acaba en error.** Abre el despliegue y mira los registros (*logs*). Casi siempre es el Framework Preset o el Build Command: pon "Other", deja el comando vacío y vuelve a desplegar (*Redeploy*). Si sigue, copia los registros y pásaselos a Claude.
- **Sale "404: NOT_FOUND".** Vercel no encuentra `index.html`. Comprueba que está en la raíz del repo o ajusta Root Directory a la carpeta correcta.
- **Funciona en local pero no en Vercel.** Revisa mayúsculas y minúsculas en los nombres de archivo: Vercel distingue `Logo.png` de `logo.png` y tu ordenador normalmente no. Abre la consola del navegador y pasa el error a Claude.
- **Hago `push` y no cambia nada.** Mira en Deployments si hay un despliegue nuevo, comprueba que subiste a `main` y haz una recarga forzada en el navegador.

## Resumen

- Alojar es tener tu web en un servidor; desplegar es publicar una versión en él.
- En Vercel: Continue with GitHub → Add New… → Project → Import → Framework Preset "Other" → Deploy.
- Te da una dirección `.vercel.app` con https incluido, necesario para cámara y pantalla.
- Cada `git push` a `main` publica una versión nueva; también puedes usar `npx vercel`.
- El plan gratuito es para uso personal y no comercial: revísalo si piensas cobrar.

**Siguiente lección →** [08 · Dominio propio y actualizaciones](08-dominio-y-actualizaciones.md)

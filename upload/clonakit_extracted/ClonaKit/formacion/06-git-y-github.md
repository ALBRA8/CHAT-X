# Git y GitHub

> **Tu tutor para esta lección:** en Claude Code, escribe `/desplegar` y el tutor te guía en esto paso a paso, desde crear la cuenta hasta subir tu app. Aquí tienes los comandos explicados uno a uno.

## En esta lección

- Entenderás qué es Git, qué es GitHub y en qué se diferencian.
- Guardarás la primera versión de tu app con `git init`, `git add` y `git commit`.
- La subirás a GitHub con GitHub CLI (o desde la web) sin filtrar contraseñas ni claves.

## Lo que necesitas

- Git instalado (lección 01).
- Tu app funcionando en local (lección 05) y su `LEGAL.md` completo.
- Un correo electrónico para crear tu cuenta de GitHub.

## Paso 1. Qué es Git y qué es GitHub

**Git** es como el carrete de fotos de tu proyecto. Cada vez que haces un *commit*, sacas una foto de cómo están todos los archivos en ese momento, con una nota que explica qué cambió. Puedes volver a cualquier foto anterior.

Un *repositorio* (o *repo*) es la carpeta de tu proyecto más todo su historial de fotos.

**GitHub** es una web donde guardas tus repositorios en internet. Te sirve de copia de seguridad, para compartir tu código y para conectarlo con Vercel, que publicará tu app. Git vive en tu ordenador; GitHub, en internet.

## Paso 2. Crea tu cuenta de GitHub

1. Entra en [github.com](https://github.com) y regístrate (*Sign up*). Es gratis.
2. Elige bien tu nombre de usuario: aparecerá en tus direcciones, como `github.com/tu-usuario`.
3. Si te lo propone, activa la verificación en dos pasos. Es muy recomendable.

## Paso 3. Dile a Git quién eres (solo una vez)

Vale igual en Mac y en Windows:

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu-correo@ejemplo.com"
git config --global init.defaultBranch main
```

- Las dos primeras líneas firman tus commits. Ojo: ese nombre y ese correo serán visibles en los repos públicos. GitHub te ofrece un correo privado del tipo `...@users.noreply.github.com` en los ajustes de tu cuenta (sección de correos); puedes usar ese.
- La tercera hace que la *rama* principal se llame `main`. Una rama es una línea de historia de tu proyecto; por ahora solo usarás la principal, que es la que publicará Vercel.

## Paso 4. Entra en la carpeta de tu app

Cada app tiene **su propio repositorio**, independiente del kit. Desde la carpeta del kit:

**Mac:**

```bash
cd clones/mi-clon/app
pwd
```

**Windows (PowerShell):**

```powershell
cd clones\mi-clon\app
pwd
```

`pwd` debe terminar en `mi-clon/app` (o `mi-clon\app`). Si no, **no sigas**: crearías el repositorio en otro sitio.

## Paso 5. Antes de nada: ni contraseñas ni claves

- **Nunca subas** contraseñas, claves de API, *tokens* (códigos de acceso) ni archivos `.env`, donde suelen guardarse.
- El archivo `.gitignore` le dice a Git qué archivos debe ignorar. La plantilla del kit ya trae uno en tu carpeta `app/`, con líneas como estas:

```
.DS_Store
Thumbs.db
node_modules/
.vercel/
.env
.env.*
```

- La carpeta `investigacion/` está fuera de `app/`, así que no se sube. Bien: nunca debe publicarse.
- Si subes una clave por error, borrar el archivo no basta, porque sigue en el historial. Anula la clave en el servicio que te la dio, crea otra y pide ayuda al tutor.

## Paso 6. Tu primera foto: `init`, `add` y `commit`

```bash
git init
git status
git add .
git commit -m "Primera versión de mi app"
```

- `git init` convierte la carpeta en repositorio. Crea una carpeta oculta `.git` con el historial. Solo se hace una vez.
- `git status` te enseña qué archivos van a entrar. Revísalo siempre antes de `git add`: si ves algo privado (como un `.env`), para y añádelo al `.gitignore`.
- `git add .` prepara lo que entrará en la próxima foto. El punto significa "todo lo de esta carpeta". Es como colocar a la gente antes de disparar.
- `git commit -m "..."` hace la foto con su nota. Escribe notas que entiendas dentro de un mes.

Comprueba que ha salido bien con `git log --oneline`: verás tu commit con su nota.

## Paso 7. Súbelo con GitHub CLI (recomendado)

*GitHub CLI* es un programa para manejar GitHub desde la terminal; se usa con el comando `gh`. (*CLI* significa "interfaz de línea de comandos".)

1. Instálalo siguiendo las instrucciones para tu sistema en [cli.github.com](https://cli.github.com). Cierra y abre la terminal, y comprueba con `gh --version`.
2. Inicia sesión:

   ```bash
   gh auth login
   ```

   El inicio de sesión lo haces tú: escríbelo en tu terminal o, dentro de Claude Code, empezando por `!` (`! gh auth login`). Nunca le des tus contraseñas a Claude. Te hará varias preguntas en inglés. Elige algo como: **GitHub.com** → **HTTPS** → **Yes** (para que Git use estas credenciales) → **Login with a web browser**. Copia el código que te muestra, pulsa Intro, pégalo en el navegador y autoriza.

3. Desde la carpeta de tu app, crea el repositorio en GitHub y sube tus commits:

   ```bash
   gh repo create mi-clon --public --source . --push
   ```

   - `mi-clon` es el nombre del repo: usa el de tu app, nunca la marca original.
   - `--public` lo hace visible para todos (usa `--private` si prefieres que no).
   - `--source .` indica que el repo es la carpeta actual.
   - `--push` sube tus commits a GitHub.

Al terminar te mostrará la dirección, del tipo `https://github.com/tu-usuario/mi-clon`.

## Paso 8. Alternativa: crear el repo desde la web

1. En GitHub, pulsa el botón **+** (arriba a la derecha) → **New repository**, o algo parecido.
2. Ponle nombre y elige público o privado. **No** marques que añada README, `.gitignore` ni licencia: ya tienes archivos y evitarás conflictos.
3. Crea el repositorio. GitHub te enseñará instrucciones; usa las de "subir un repositorio existente" (*push an existing repository*). Serán parecidas a esto:

```bash
git remote add origin https://github.com/TU-USUARIO/mi-clon.git
git branch -M main
git push -u origin main
```

`remote add origin` conecta tu repo local con el de GitHub, y `push` envía tus commits. Si al hacer `push` te pide usuario y contraseña y no funciona, es normal: GitHub ya no acepta la contraseña de la cuenta ahí. Haz `gh auth login` (paso 7) y repite.

## Paso 9. ¿Público o privado?

- **Público:** cualquiera ve tu código. Ideal para aprender, enseñarlo y compartirlo. Revisa antes que no haya secretos.
- **Privado:** solo lo ves tú. Vercel también puede publicar desde repos privados de tu cuenta personal, y la web seguirá siendo pública.

## Si algo falla

- **`fatal: not a git repository`.** No estás en la carpeta de la app o aún no hiciste `git init`. Comprueba con `pwd`.
- **"Author identity unknown" o "Please tell me who you are".** Te falta el paso 3.
- **`gh` no se reconoce.** Cierra y abre la terminal. Si sigue, reinstálalo desde cli.github.com.
- **`remote origin already exists`.** Ya conectaste el repo antes. Mira a dónde apunta con `git remote -v`.
- **El `push` falla por permisos o contraseña.** Ejecuta `gh auth login` y vuelve a intentarlo.

## Resumen

- Git guarda "fotos" (commits) de tu proyecto; GitHub guarda tus repositorios en internet.
- Configuras tu nombre y correo una vez y creas el repo dentro de `clones/<nombre>/app`.
- `git init`, `git add .` y `git commit -m "..."` guardan tu primera versión.
- `gh auth login` y `gh repo create <nombre> --public --source . --push` la suben a GitHub.
- Nunca subas contraseñas ni claves: usa `.gitignore`.

**Siguiente lección →** [07 · Publica tu app en Vercel](07-desplegar-en-vercel.md)

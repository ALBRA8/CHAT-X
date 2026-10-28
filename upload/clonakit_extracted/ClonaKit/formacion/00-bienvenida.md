# Bienvenida a ClonaKit

> **Tu tutor para esta lección:** en Claude Code, escribe `/empezar` y el tutor te explica el kit y te guía en esto paso a paso. Esta lección es la versión por escrito, para que la consultes cuando quieras.

## En esta lección

- Entenderás qué es ClonaKit y qué significa "clonar" una app de forma legal.
- Conocerás las 5 fases del método, desde la idea hasta tu app publicada en internet.
- Sabrás qué necesitas y cuánto tiempo te va a llevar.

## Lo que necesitas

Nada más que ganas. Esta lección es solo para leer.

## Paso 1. Qué es ClonaKit

ClonaKit es un kit gratuito para crear tu propia versión de una app que te gusta y publicarla en internet. Está pensado para gente que nunca ha programado.

El kit junta tres piezas:

- **Claude Code**: un asistente de inteligencia artificial que trabaja dentro de tu ordenador. Lee archivos, escribe código y ejecuta órdenes contigo. En este kit hace de tutor.
- **REA**: una herramienta de código abierto de *ingeniería inversa*. Ingeniería inversa significa estudiar cómo funciona algo mirándolo desde fuera, sin tener sus planos. REA examina una app y cuenta qué piezas usa.
- **Estas lecciones**: la guía por escrito de todo el proceso.

ClonaKit traduce lo que descubre REA a lenguaje sencillo. No necesitas entender nada técnico para empezar.

## Paso 2. Qué significa "clonar" aquí

Esta es la idea más importante del kit, así que vamos despacio.

"Clonar" en ClonaKit **no es copiar**. Es crear **tu propia versión** de las funciones de una app, desde cero, con tu nombre y tu diseño.

| Sí haces esto | Nunca haces esto |
|---|---|
| Estudiar qué hace una app y cómo se usa | Copiar su código |
| Describir sus funciones con tus palabras | Copiar sus textos, imágenes, iconos o sonidos |
| Construir desde cero algo que funciona parecido | Usar su nombre, su logo o su marca |
| Decir "inspirado en X" al presentar tu app | Hacer creer que tu app es la original |

Piénsalo como en la cocina. Puedes probar un plato en un restaurante, entender qué lleva y preparar tu propia receta en casa. Lo que no puedes es llevarte su carta, su logo y abrir un local con su nombre.

La lección [02 · Lo legal](02-lo-legal.md) lo explica a fondo. Es la más importante del kit.

## Paso 3. Las 5 fases

```
1. Elegir → 2. Investigar → 3. Ficha → 4. Construir y probar → 5. Desplegar
```

1. **Elegir**: decides qué app te inspira y qué 3–5 funciones quieres recrear.
2. **Investigar**: el kit usa REA para estudiar la app y te entrega un informe en lenguaje sencillo.
3. **Ficha**: escribes con tus palabras qué debe hacer tu app. Es tu "plano".
4. **Construir y probar**: Claude construye la app leyendo solo tu ficha, sin ver la original. Tú la pruebas en tu ordenador.
5. **Desplegar**: la subes a internet, con su propia dirección web, para que cualquiera pueda usarla.

Las fases 1 a 4 las guía el comando `/clonar`. La fase 5, el comando `/desplegar`.

El kit trae un ejemplo completo para practicar: **MiniEstudio**, una app web de grabación inspirada en OBS Studio. Tiene escenas, fuentes de pantalla, cámara y texto, un mezclador de audio y grabación a MP4. Está en la carpeta `ejemplos/mini-estudio/`.

Y no tienes que empezar de cero: en [`recetas/`](../recetas/README.md) hay fichas ya escritas para recrear herramientas que usan muchos negocios (inspiradas en Excalidraw, Slack, ActiveCampaign, Airtable, Antigravity, Trello, Linktree o Typeform). Con una receta te saltas la investigación y pasas directamente a personalizar y construir. Si tu app usa inicio de sesión, el **modo capturas** te deja investigarla con capturas de tu propia cuenta.

## Paso 4. Qué necesitas

| Qué | Para qué | ¿Cuesta dinero? |
|---|---|---|
| Un ordenador Mac o Windows | Trabajar | — |
| Node.js | Ejecutar las herramientas del kit | Gratis |
| Git | Guardar versiones de tu app | Gratis |
| Google Chrome (opcional) | Investigar webs y probar tu app | Gratis |
| Claude Code | El tutor y el constructor | Necesita una cuenta de Claude de pago (Pro o superior) o créditos de API |
| Cuenta de GitHub | Guardar tu app en internet | Gratis |
| Cuenta de Vercel | Publicar tu app | Plan gratuito |
| Dominio propio (opcional) | Una dirección tipo `miapp.com` | De pago, cada año |

Node.js y Git son programas que instalarás en la lección 01. Una *API* es una puerta para que un programa hable con otro; los "créditos de API" son saldo de prepago para usar Claude de esa forma. Los planes y precios de Claude cambian, así que consúltalos en la web oficial de Claude antes de decidir.

Todo lo demás del kit es gratis.

## Paso 5. Cuánto se tarda

Tiempos orientativos para alguien que empieza de cero:

| Parte | Tiempo aproximado |
|---|---|
| Preparar tu ordenador (lección 01) | 30–60 minutos |
| Leer lo legal (lección 02) | 20 minutos |
| Tu primer clon (fases 1 a 4) | Una tarde |
| Publicarlo (fase 5) | Alrededor de 1 hora la primera vez |

La segunda vez irás mucho más rápido. Investigar una app grande puede tardar varios minutos; es normal.

## Paso 6. Cómo usar estas lecciones

- La primera vez, síguelas en orden.
- Úsalas junto al tutor: el tutor hace los pasos contigo y la lección te deja leerlos con calma.
- Si una palabra te suena a chino, búscala en el [glosario](glosario.md).

| Comando del tutor | Lecciones que cubre |
|---|---|
| `/empezar` | 00 y 01 |
| `/clonar` | 02, 03, 04 y 05 |
| `/desplegar` | 06, 07 y 08 |

## Si algo falla

- **"Nunca he abierto una terminal y me da respeto."** Es normal. En la lección 01 la abrimos juntos y solo escribirás órdenes que te damos hechas. No vas a romper el ordenador.
- **"No tengo cuenta de Claude de pago."** Claude Code la necesita (o créditos de API). Sin ella puedes leer las lecciones, pero no usar el tutor.
- **"Mi ordenador no es Mac ni Windows."** El kit está pensado para Mac y Windows. Con otro sistema, algunos pasos no te servirán tal cual.
- **"No sé qué app elegir."** Empieza por algo pequeño: una app de notas, un temporizador o un editor sencillo. O practica primero con MiniEstudio.
- **"Algunas pantallas salen en inglés."** Claude Code, GitHub y Vercel tienen partes en inglés. Te decimos qué buscar en cada caso, y al tutor siempre puedes preguntarle en español.

## Resumen

- ClonaKit te ayuda a crear tu propia versión de una app, desde cero y de forma legal.
- "Clonar" aquí significa recrear funciones, nunca copiar código, textos, imágenes ni marcas.
- El método tiene 5 fases: elegir, investigar, ficha, construir y probar, y desplegar.
- Necesitas Mac o Windows, Node.js, Git, Claude Code (de pago) y cuentas gratuitas de GitHub y Vercel.

**Siguiente lección →** [01 · Prepara tu ordenador](01-preparar-tu-ordenador.md)

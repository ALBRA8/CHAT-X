# De la ficha al código

> **Tu tutor para esta lección:** en Claude Code, escribe `/clonar` y el tutor te guía en esto paso a paso (en las fases de ficha y construcción). Aquí tienes la explicación por escrito.

## En esta lección

- Entenderás qué es una especificación y elegirás un MVP de 3 a 5 funciones.
- Escribirás tu `FICHA.md` con tus palabras, sin copiar nada del original.
- Sabrás cómo construye Claude tu app en "sala limpia" y cómo pedirle cambios.

## Lo que necesitas

- El informe de tu investigación (lección 03) o tus notas usando la app.
- La lección 02 leída: la ficha es donde más se nota hacerlo bien.

## Paso 1. Qué es una especificación

Una *especificación* es un documento que describe **qué** debe hacer un programa, sin decir **cómo** está programado. Es como el encargo a un arquitecto: "tres habitaciones, cocina abierta y mucha luz". Tú no dibujas los planos; dices lo que necesitas.

En ClonaKit la especificación se llama **ficha** y vive en `clones/<nombre>/FICHA.md`. La extensión `.md` indica *Markdown*: texto normal con un formato sencillo (`#` para títulos, `-` para listas).

## Paso 2. Elige tu MVP

*MVP* son las siglas en inglés de "producto mínimo viable": la versión más pequeña de tu app que ya es útil. Elige **de 3 a 5 funciones** que cumplan esto:

- Son el corazón de la app: sin ellas, no tendría sentido.
- Se pueden hacer en un navegador (mira la tabla de equivalentes del informe).
- No necesitan servidor, cuentas de usuario ni pagos.
- Puedes explicar cada una en dos o tres frases.

Ejemplo, el MiniEstudio del kit (inspirado en OBS Studio):

1. Escenas para cambiar entre composiciones.
2. Fuentes: pantalla, cámara y texto.
3. Mezclador de audio.
4. Grabación a MP4.

Lo que dejas para más adelante (por ejemplo, emitir en directo) lo apuntas en la sección "Para más adelante".

## Paso 3. La estructura de la ficha

El tutor copia la plantilla del kit (`plantillas/FICHA.md`) y la rellenáis juntos. Sus secciones son:

```markdown
# Ficha: <nombre de tu app>
## 1. En una frase
## 2. Para quién y para qué
## 3. Funciones de la primera versión (MVP)   ← tabla de 3 a 5 funciones
## 4. Pantallas                               ← qué se ve y qué se puede hacer
## 5. Flujos paso a paso                      ← recorridos de principio a fin
## 6. Datos                                   ← qué se guarda y dónde
## 7. Para más adelante
## 8. Identidad propia                        ← tu nombre, colores, estilo e icono
## 9. Checklist de sala limpia
```

## Paso 4. Escribe con tus palabras

**Mala ficha** (no hagas esto):

```markdown
### Escenas
Igual que en OBS. Copiar su panel de escenas tal cual, con los mismos
textos y en el mismo sitio. Usar su icono para el botón de añadir.
function addScene() { ... }
```

Problemas: "igual que", copia textos y posición exacta, usa un icono ajeno y pega código.

**Buena ficha** (una fila de la tabla de funciones y su flujo):

```markdown
| 1 | Escenas | Guarda varias composiciones y permite cambiar entre ellas. | Lista en memoria + <canvas> |

### Cambiar de escena
1. La persona crea una escena y le pone nombre.
2. Al hacer clic en una escena, la vista previa muestra sus fuentes.
3. Si intenta borrar la última escena, la app no lo permite y muestra
   un aviso explicando por qué.
```

Describe comportamientos, no copias. Si dudas, pregúntate: "¿lo entendería alguien que nunca ha visto la app original?".

## Paso 5. La construcción en sala limpia

Cuando apruebas la ficha, el tutor lanza un *subagente*: otra sesión de Claude, independiente, con sus propias instrucciones. Ese subagente **lee solo `FICHA.md`**. No ve la app original, ni el informe, ni los datos en bruto. Así tu app nace de tus ideas, no del original (lección 02, paso 8).

La construcción es **en directo y por etapas**:

1. **Etapa 1 (unos 5 minutos):** tu pantalla principal con tu nombre y tus colores, y la función más importante funcionando. El tutor te la abre en el navegador: ese es el momento de decir "esto lo he creado yo".
2. **Una etapa por función:** cada pocos minutos aparece una función nueva. Recargas la página, la pruebas y le cuentas al tutor qué cambiarías antes de seguir.
3. **Remate:** un repaso completo contra tu ficha, la vista en el móvil y los documentos `README.md` y `LEGAL.md`.

Mientras cada etapa se construye, el tutor aprovecha para explicarte qué está pasando. Los ayudantes se pasan el trabajo con una nota, `clones/<nombre>/CONSTRUCCION.md`, que describe cómo está organizado el código. Esa nota no se publica.

El constructor parte de la plantilla del kit (`plantillas/proyecto-web/`) y deja el resultado en `clones/<nombre>/app/`:

```
clones/mi-clon/app/
├── index.html   ← la estructura de la página
├── style.css    ← el aspecto
├── app.js       ← el comportamiento
├── README.md    ← la presentación de tu app (lección 08)
├── LEGAL.md     ← aviso legal y checklist (lección 02)
└── .gitignore   ← lo que Git no debe subir (lección 06)
```

Si al construir tuvo que decidir algo que la ficha no decía, lo apunta al final del README, en "Decisiones".

## Paso 6. Por qué HTML + CSS + JavaScript, sin build

- **HTML** pone el contenido y la estructura, **CSS** el aspecto y **JavaScript** el comportamiento.
- Un *build* es un paso previo que muchos proyectos modernos necesitan: "empaquetar" el código antes de publicarlo. Aquí no hay: lo que ves es lo que se publica.

Ventajas: no hay que instalar nada más, funciona en cualquier navegador, Vercel lo publica tal cual, puedes abrir los archivos y entenderlos, y hay menos piezas que se puedan romper.

## Paso 7. Pide cambios a Claude de forma efectiva

Reglas sencillas:

- **Un cambio cada vez.** Pruébalo antes de pedir el siguiente.
- **Di qué ves y qué esperabas.**
- **Sé concreto:** dónde, qué y cuándo.
- **Si es una función nueva, primero va a la ficha.** Así mantienes la sala limpia.
- **Nunca** digas "hazlo como en X" ni pegues capturas de la app original.

Ejemplos que funcionan bien:

> "En mi-clon, el botón de grabar no cambia al pulsarlo. Quiero que se ponga rojo mientras graba y vuelva a gris al parar."

> "Añade a la FICHA.md de mi-clon una función 5: exportar la lista de escenas a un archivo. Enséñamela antes y, cuando la apruebe, constrúyela en sala limpia."

> "En el móvil, la vista previa se sale de la pantalla. Haz que se adapte a pantallas estrechas."

> "Explícame qué hace app.js en cinco frases, sin tecnicismos."

Ejemplos que funcionan mal: "arréglalo", "ponlo bonito", "que se parezca más a OBS".

## Si algo falla

- **Claude construye algo distinto de lo que imaginabas.** Tu ficha es ambigua en ese punto. Concreta qué hace, cómo se usa y qué pasa si falla, y pide que lo rehaga.
- **La ficha se ha hecho enorme.** Vuelve a 3–5 funciones y pasa el resto a "Para más adelante".
- **No sabes si una función se puede hacer en una web.** Pregunta: "¿Se puede hacer esto en una web sin servidor? Explícamelo sencillo".
- **Un cambio ha roto otra cosa.** Dile a Claude qué funcionaba antes y qué ha dejado de funcionar. Cuando uses Git (lección 06) también podrás volver atrás.
- **Te ha quedado demasiado parecida a la original.** Pide: "Dale un estilo propio: otros colores, otra distribución y otros iconos".

## Resumen

- La ficha es tu especificación: qué hace la app, contado con tus palabras.
- Un buen MVP tiene de 3 a 5 funciones, sin servidor, cuentas ni pagos.
- El constructor en sala limpia lee solo la ficha y genera una web en HTML, CSS y JavaScript.
- Pide cambios de uno en uno, siendo concreto, y añade las funciones nuevas primero a la ficha.

**Siguiente lección →** [05 · Prueba tu app en local](05-probar-en-local.md)

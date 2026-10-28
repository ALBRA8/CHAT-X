# Lo legal: clonar sin copiar

> **Tu tutor para esta lección:** en Claude Code, escribe `/clonar` y el tutor te recuerda estas reglas en cada fase y te guía paso a paso al rellenar el checklist legal. Esta es la lección más importante del kit.

> **Aviso importante:** esto **no es asesoría legal**. Es una explicación general para que trabajes con sentido común. Las leyes cambian y cada caso es distinto. Si vas a usar tu app de forma comercial o tienes cualquier duda, consulta a un abogado especializado en propiedad intelectual. El resumen formal está en el [AVISO-LEGAL.md](../AVISO-LEGAL.md) del kit.

## En esta lección

- Distinguirás lo que está protegido (código, textos, diseño) de lo que no (ideas y funciones).
- Conocerás los límites: marcas, patentes, licencias, términos de servicio y lo que nunca se hace.
- Entenderás el método "sala limpia" y el checklist que rellenarás en `LEGAL.md`.

## Paso 1. Funciones sí, expresión no

Los *derechos de autor* protegen de forma automática lo que alguien crea: no hace falta registrarlo. Pero protegen la **expresión** concreta, no las ideas.

| Protegido: no lo copies | No protegido: puedes recrearlo a tu manera |
|---|---|
| El código | La idea ("una app para grabar la pantalla") |
| Los textos: menús, mensajes, ayuda | Las funciones ("tener escenas y cambiar entre ellas") |
| Los diseños gráficos y el aspecto de las pantallas | Los principios ("mezclar varias fuentes de audio") |
| Los iconos, logos, ilustraciones y fotos | Los flujos ("pulsar grabar, parar y guardar el vídeo") |
| Los sonidos y la música | |

Que exista un editor de notas no te impide hacer el tuyo. Copiar su código o sus iconos, sí.

Ojo con el aspecto: una interfaz original puede estar protegida como obra, y los iconos o pantallas también pueden registrarse como diseño. Por eso tu clon tendrá **su propio estilo**: tus colores, tu distribución, tus iconos.

## Paso 2. Marcas: ni nombre ni logo

Una *marca* es un nombre, logo o símbolo que identifica los productos de una empresa. Suele estar registrada.

- No uses el nombre de la app original (ni uno parecido que confunda) en tu app, tu repositorio, tu dirección web ni tu dominio.
- No uses su logo, su mascota ni sus colores de marca.
- Sí puedes escribir en tu README algo como: *"Inspirado en X. No está afiliado ni respaldado por los creadores de X."* Es un uso descriptivo y honesto del nombre.

En España, además, imitar una app de forma que la gente la confunda con la original, o aprovecharte de su fama, puede ser *competencia desleal* (Ley 3/1991, art. 11), aunque no copies nada concreto.

## Paso 3. Patentes

Una *patente* da a su dueño la exclusiva sobre un invento técnico durante un tiempo, y hay que registrarla. En apps sencillas son raras: no protegen "tener un botón de grabar", sino técnicas concretas. En Europa los programas "como tales" no se patentan, aunque sí ciertos inventos con efecto técnico; en EE. UU. hay más patentes de software. Si tu app hace algo muy técnico y novedoso y piensas venderla, consulta antes.

## Paso 4. Licencias de código abierto

El *código abierto* es código que su autor publica para que otros lo usen, con unas condiciones llamadas *licencia*:

- **MIT**: muy permisiva. Puedes usar, cambiar e incluso vender el código si mantienes el aviso de autoría y la licencia. REA, la herramienta en la que se basa el kit, es MIT.
- **GPL**: si publicas un programa que incluye código GPL, el tuyo también debe compartirse con licencia GPL. La variante **AGPL** lo extiende a apps que se usan por internet.

En ClonaKit **no copiamos código** de la app original, aunque sea de código abierto. Si quieres reutilizar una librería de código abierto en tu clon, lee su licencia, cúmplela y apúntalo en `LEGAL.md`.

## Paso 5. Términos de servicio

Los *términos de servicio* son el contrato que aceptas al usar una app o web. Antes de investigar, échales un vistazo y busca palabras como "ingeniería inversa", *reverse engineer*, *scraping* o "uso automatizado". Incumplirlos puede costarte la cuenta o una reclamación. En la UE hay facultades básicas que un contrato no puede quitarte (paso 7), pero eso no te da vía libre para todo lo demás.

## Paso 6. Lo que nunca se hace

- **Nunca** saltarte DRM (sistemas anticopia), licencias, comprobaciones de pago, sistemas anti-trampas, inicios de sesión ni ninguna otra protección. La ley protege expresamente estas medidas, y REA tampoco ayuda con eso.
- **Nunca** usar datos personales ajenos (nombres, correos, fotos, contactos). En la UE los protege el RGPD.
- **Nunca** recrear apps para engañar: *phishing* (imitar una app o web para robar contraseñas o datos), apps que se hacen pasar por otras o "versiones oficiales" falsas.
- **Nunca** investigar apps que no tienes de forma legal, como versiones pirateadas.
- **Nunca** publicar los datos en bruto de la investigación (`investigacion/datos/`) ni capturas de la app original.

## Paso 7. El marco en España y la UE (con prudencia)

- La [Ley de Propiedad Intelectual](https://www.boe.es/buscar/act.php?id=BOE-A-1996-8930) (LPI), **art. 96.4**, dice que las ideas y principios en los que se basa un programa, incluidos los de sus interfaces, no están protegidos por derechos de autor.
- El **art. 100.3** permite al *usuario legítimo* (quien tiene la app de forma legal) observar, estudiar y verificar su funcionamiento, sin pedir permiso, para descubrir esas ideas y principios, mientras la usa normalmente.
- Ambos artículos se corresponden con la [Directiva 2009/24/CE](https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32009L0024) (arts. 1.2 y 5.3), así que la idea es parecida en toda la UE. La Directiva dice además (art. 8) que un contrato no puede prohibirte esa observación. El Tribunal de Justicia de la UE confirmó en el caso *SAS Institute* (C-406/10, 2012) que la funcionalidad de un programa no está protegida como tal.
- La *descompilación* (traducir un programa ya terminado de vuelta a un código que una persona pueda leer) solo está permitida para lograr la interoperabilidad y con condiciones estrictas (art. 100.5 LPI). **El kit no la necesita:** observa la estructura, los permisos y lo que la app muestra, y tú recreas todo desde cero.
- **Fuera de la UE las reglas cambian.** En EE. UU. o en los países de Latinoamérica hay leyes distintas. Pero la regla práctica del kit es la prudente en todas partes: **recrear desde cero, sin copiar nada, sin usar marcas y sin saltarse protecciones.**

## Paso 8. El método "sala limpia"

Imagina dos cocineros. La cocinera A prueba un plato en un restaurante y escribe con sus palabras cómo es: "guiso de verduras, suave, con un toque ácido al final". El cocinero B **nunca ha probado el plato**: cocina solo a partir de esa descripción. Lo que sale es una receta nueva de B, aunque se parezca al original.

En ClonaKit (en inglés, *clean-room*):

- **Tú eres la cocinera A.** Investigas la app y escribes `FICHA.md` con tus palabras.
- **Un subagente de Claude es el cocinero B.** Es otra sesión de Claude, aparte, que lee **solo** tu ficha. Nunca ve la app original, ni el informe, ni los datos en bruto.

Este método se hizo famoso en los años 80, cuando varias empresas lo usaron para crear ordenadores compatibles con el IBM PC sin copiar su código. Sirve para demostrar que creaste tu versión de forma independiente.

La sala limpia se rompe si pegas en la ficha trozos de código, textos o capturas del original, o si le pides al constructor que "mire la app original".

## Paso 9. El checklist de `LEGAL.md`

Hay dos controles. Al escribir la ficha, repasas su "Checklist de sala limpia". Y al terminar de construir y probar, el tutor repasa contigo `clones/<nombre>/app/LEGAL.md`. Ese archivo explica cómo se creó tu app (investigación, ficha y construcción, con fechas), deja claro que no está afiliada a la original, recoge la licencia que elijas para tu código e incluye este checklist:

- [ ] El código se ha escrito desde cero; no se ha copiado código del original (ni de su pseudocódigo o sus scripts).
- [ ] No hay textos, imágenes, iconos, sonidos ni tipografías propietarias del original.
- [ ] El nombre, el logo y los colores son propios y no se confunden con la app original.
- [ ] La app no se presenta como la original ni como oficial.
- [ ] No se salta pagos, licencias, logins, DRM ni otras protecciones.
- [ ] No recoge datos personales de nadie sin que lo sepa y lo acepte.
- [ ] Los datos en bruto de la investigación no se publican.

Marca cada casilla solo si es verdad. Si no puedes marcar alguna con honestidad, no publiques todavía: arréglalo antes. Y si reutilizas código abierto de terceros, apunta también su licencia.

## Si algo falla

- **"Me he dado cuenta de que mi ficha tiene texto copiado."** Reescríbelo con tus palabras y pide al tutor que vuelva a construir la parte afectada.
- **"Mi app se parece demasiado a la original."** Pide a Claude: "Dale a mi app un estilo propio: otros colores, otra distribución y otros iconos".
- **"Quiero poner el nombre de la app original en mi dirección web para que me encuentren."** No lo hagas. Usa tu nombre y menciona "inspirado en X" en la descripción.
- **"Los términos de la app prohíben la ingeniería inversa."** Sáltate la fase de investigar y escribe la ficha usándola como un usuario normal. Si tienes dudas, consulta.
- **"Quiero cobrar por mi clon."** Habla antes con un abogado y revisa las condiciones de Vercel (lección 07).

## Resumen

- Las ideas y funciones no tienen derechos de autor; el código, los textos, los diseños, los iconos y los sonidos sí.
- Nada de nombres ni logos ajenos; "inspirado en X" en el README está bien.
- Nunca te saltes protecciones, nunca uses datos ajenos y nunca crees apps para engañar.
- El método sala limpia separa a quien investiga de quien construye, y `LEGAL.md` lo deja por escrito.
- Esto no es asesoría legal: si hay dinero de por medio o dudas, consulta a un abogado.

**Siguiente lección →** [03 · Investiga una app](03-investigar-una-app.md)

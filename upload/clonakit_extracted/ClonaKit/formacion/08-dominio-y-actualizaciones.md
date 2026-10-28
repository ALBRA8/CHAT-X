# Dominio propio y actualizaciones

> **Tu tutor para esta lección:** en Claude Code, escribe `/desplegar` y el tutor te guía en esto paso a paso: dominio, actualizaciones y README. Aquí lo tienes por escrito para cuando vuelvas a tu app dentro de unas semanas.

## En esta lección

- Conectarás un dominio propio a tu app en Vercel (opcional).
- Dominarás el ciclo de actualización y sabrás volver a una versión anterior si algo sale mal.
- Escribirás un buen README y compartirás tu app de forma responsable.

## Lo que necesitas

- Tu app publicada en Vercel (lección 07).
- Si quieres dominio propio: una tarjeta para pagarlo (se renueva cada año).

## Paso 1. Qué es un dominio y qué es el DNS

- Un *dominio* es un nombre fácil de recordar para tu web, como `miestudio.com`. No se compra para siempre: se alquila por años.
- Un *registrador* es la empresa que te lo vende.
- El *DNS* es como la agenda de contactos de internet: traduce el nombre (`miestudio.com`) a la dirección del servidor donde está tu web.

Tu dirección `.vercel.app` es gratis y suficiente. El dominio propio es **opcional**.

## Paso 2. Compra tu dominio

- Elige un nombre **tuyo**. Nunca uses la marca de la app original (nada de `nombre-de-la-original-online.com`): puede infringir su marca y te lo podrían quitar.
- El precio depende de la terminación (`.com`, `.es`, `.app`…). Compara el precio del primer año **y el de la renovación**, que a veces es bastante más alto.
- Puedes comprarlo en cualquier registrador. Vercel también vende dominios desde su panel, lo que simplifica la configuración.
- Activa la renovación automática si no quieres perderlo por despiste.

## Paso 3. Añádelo en Vercel

1. En Vercel, abre tu proyecto → **Settings** → **Domains**.
2. Escribe tu dominio y pulsa añadir. Vercel puede proponerte incluir también la versión con `www.` y redirigir una a la otra: acepta la opción que te recomiende.
3. Vercel te mostrará los **registros DNS** que necesitas. Un registro DNS es una línea de esa agenda; los más habituales son de tipo **A** (apunta a una dirección numérica) y **CNAME** (apunta a otro nombre). **Copia los valores exactos que te dé Vercel**, no los de tutoriales antiguos: pueden cambiar.
4. En el panel de tu registrador, busca la sección de DNS (puede llamarse "Zona DNS", "Gestionar DNS" o parecido) y crea esos registros. Si ya había registros del mismo tipo para el mismo nombre, puede que tengas que borrarlos o cambiarlos.

Si compraste el dominio en Vercel, este paso suele hacerse solo. Tienes la guía completa en la [documentación de dominios de Vercel](https://vercel.com/docs/domains).

## Paso 4. Espera a la propagación

La *propagación* es el tiempo que tarda el cambio en llegar a todas las "agendas" de internet. Puede ir de unos minutos a 48 horas. Mientras tanto, es normal que el dominio funcione en un dispositivo y en otro no.

Cuando esté listo, Vercel lo marcará como configurado correctamente y creará solo el certificado https (el candado).

## Paso 5. El ciclo de actualización

Cada mejora de tu app sigue siempre el mismo camino:

```
editar → probar → commit → push → en vivo
```

1. **Editar:** pide el cambio a Claude (lección 04). Si es una función nueva, primero va a la ficha.
2. **Probar:** desde la carpeta del kit, `npm run probar -- mi-clon` (lección 05).
3. **Commit:** desde la carpeta de tu app (`clones/mi-clon/app`), guarda la foto:

   ```bash
   git status
   git add .
   git commit -m "Añado atajos de teclado para grabar y parar"
   ```

4. **Push:** súbela a GitHub con `git push`.
5. **En vivo:** Vercel publica la nueva versión en un par de minutos. Compruébalo en el móvil.

Si el cambio añade algo nuevo (por ejemplo, una librería de código abierto), actualiza también `LEGAL.md`.

## Paso 6. Vuelve a una versión anterior

Si publicas una versión que falla, no te agobies: Vercel guarda todas las anteriores.

1. En tu proyecto de Vercel, abre **Deployments**.
2. Busca el último despliegue que funcionaba bien.
3. En su menú (los tres puntos), elige la opción para promoverlo a producción (algo como **Promote to Production** o **Instant Rollback**).

Lee los avisos que te muestre: puede que, mientras estés en esa versión antigua, los siguientes `push` no se publiquen solos hasta que lo deshagas, y según tu plan puede haber límites. Después, arregla el fallo con calma en local y vuelve a publicar. También puedes pedírselo a Claude: "Deshaz con git revert el último commit de mi-clon y súbelo".

## Paso 7. Escribe un buen README

El `README.md` es la portada de tu repositorio: GitHub lo muestra al entrar. El constructor ya te dejó uno básico. Pide a Claude que lo mejore con una estructura como esta:

```markdown
# MiEstudio

Una app web para grabar tu pantalla y tu cámara, con escenas y mezclador de audio.

**Pruébala:** https://<tu-app>.vercel.app

## Funciones
- Escenas para cambiar entre composiciones.
- Fuentes de pantalla, cámara y texto.
- Grabación a MP4.

## Cómo usarla
1. Ábrela en Chrome y acepta los permisos de cámara y pantalla.
2. Crea una escena y añade fuentes.
3. Pulsa grabar.

## Privacidad
Todo funciona en tu navegador. No se envían vídeos ni datos a ningún servidor.

## Créditos
Inspirado en OBS Studio. No está afiliado ni respaldado por OBS Studio ni por sus autores.
Creado desde cero con ClonaKit.
```

Escribe la sección de privacidad solo si es verdad. Y nada de logos, iconos ni capturas de la app original.

## Paso 8. Comparte de forma responsable

- Presenta tu app como tuya, "inspirada en X". Nunca como "la versión web oficial de X" o "X gratis".
- No uses el logo ni capturas de la original en redes, miniaturas o anuncios.
- Si tu app empieza a recoger datos de otras personas (formularios, cuentas), tendrás que informarles y cumplir el RGPD. Lo más sencillo es que no recoja ninguno.
- Si alguien (incluida la empresa original) te escribe con una queja, responde con educación, revísalo y, si hay dudas, consulta a un abogado.

## Si algo falla

- **Vercel dice que la configuración del dominio no es válida.** Revisa que copiaste los registros exactamente y que no quedan registros antiguos que choquen. Si acabas de cambiarlos, espera a la propagación.
- **El dominio carga pero sin candado.** Espera un poco: Vercel crea el certificado cuando el DNS ya está bien.
- **Funciona con `www` pero no sin él (o al revés).** Añade las dos versiones en Settings → Domains.
- **Hago `push` y la web no cambia.** Mira en Deployments si hay un despliegue nuevo y si tienes una versión anterior promovida (paso 6). Haz también una recarga forzada.
- **Algo se ha roto tras actualizar.** Vuelve a la versión anterior (paso 6) y arregla el fallo en local antes de publicar de nuevo.

## Resumen

- El dominio propio es opcional: se compra en un registrador y se añade en Settings → Domains con los registros DNS que indique Vercel.
- El ciclo de siempre: editar → probar → commit → push → en vivo.
- Si una versión falla, promueve un despliegue anterior desde Deployments.
- Tu README dice "inspirado en X", sin logos ajenos; y compartes tu app como lo que es: tuya.

**Siguiente lección →** [Glosario](glosario.md)

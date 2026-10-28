# Celda

> **Demo de la receta `base-datos-visual`**, construida por ClonaKit en sala limpia a partir de [su ficha](../FICHA.md). Pruébala con `npm run demo -- base-datos-visual` y después crea la tuya, con tu nombre y tu marca, escribiendo `/clonar` en Claude Code.

Una hoja de datos con superpoderes: tablas con columnas de tipo fijo (texto, número, fecha, casilla, selección y URL) que puedes ver como **cuadrícula**, como **tablero** por columnas o como **galería** de tarjetas, con filtros, orden e importación y exportación CSV. Todo se guarda en tu navegador.

Pensada para negocios que llevan clientes, pedidos, productos, proveedores o contenidos en hojas de cálculo que se les quedan cortas.

Inspirada en las funciones de Airtable. No es una app oficial ni contiene nada del original; mira [LEGAL.md](LEGAL.md).

## Funciones

- **Bases, tablas y campos.** Crea varias bases (con nombre, emoji y color), cada una con varias tablas en pestañas. Cada tabla tiene campos de tipo texto, número (con decimales y, si quieres, símbolo €), fecha, casilla, selección (opciones con color) y URL. El primer campo da nombre a cada fila. Los campos se añaden, renombran, reordenan, ocultan, borran y cambian de tipo (la app convierte los valores que puede y avisa antes de vaciar los que no).
- **Vista cuadrícula.** Como una hoja de cálculo: clic para elegir una celda, Intro o doble clic para editarla con el control de su tipo, flechas para moverte, Tab para ir a la derecha, Esc para cancelar. Cabecera fija con un icono por tipo, primera columna fija, ancho de columna arrastrando su borde y «Nueva fila» al final. Cada fila se abre en una **ficha** con todos sus campos, botones de anterior/siguiente, duplicar y borrar.
- **Vista tablero.** Una columna por cada opción de un campo de selección (más «Sin valor»). Arrastra una tarjeta a otra columna para cambiar su valor; en el móvil, cada tarjeta trae un desplegable para moverla.
- **Vista galería.** Tarjetas con una imagen de portada sacada de un campo URL, el nombre y hasta 3 campos más. Sin imagen, la portada muestra la inicial del nombre.
- **Filtros, orden y CSV.** Cada vista guarda sus filtros (combinados con «todas» o «alguna»), su orden (hasta 3 campos), sus campos ocultos y sus anchos de columna. Importa un CSV como tabla nueva o añadiendo filas (la app detecta el separador y propone el tipo de cada columna) y exporta la vista actual a CSV para Excel.
- **Copia de seguridad.** Exporta e importa una base completa como `.json`. Hay una base de ejemplo, «Clientes y pedidos», con datos inventados para jugar.

### Atajos de teclado en la cuadrícula

| Tecla | Qué hace |
| --- | --- |
| Flechas | Moverse entre celdas |
| Tab / Mayús+Tab | Ir a la derecha / izquierda (al final de la fila salta a la siguiente) |
| Intro, F2 o doble clic | Editar la celda elegida (un segundo clic también) |
| Escribir sobre una celda | Empezar a editarla con lo que escribes |
| Intro (editando) | Guardar y bajar a la fila siguiente |
| Esc (editando) | Cancelar sin guardar |
| Espacio (en una casilla) | Marcar o desmarcar |
| Supr o Retroceso | Vaciar la celda |

## Probarla en tu ordenador

Desde la carpeta raíz de ClonaKit:

```bash
npm run demo -- base-datos-visual
```

Se abrirá en http://localhost:3000. Pulsa **«Desde un ejemplo»** para ver la app con datos.

## Publicarla

Es una web estática (HTML, CSS y JavaScript, sin dependencias ni paso de compilación): se publica en Vercel importando este repositorio, con el preset **Other** y sin comando de build. Cada `git push` publica una nueva versión.

Los datos **no viajan a ningún servidor**: cada persona que abra la app tendrá sus propias bases guardadas en su navegador (IndexedDB). Si borra los datos del navegador, se pierden; por eso la app recomienda exportar una copia `.json` de vez en cuando.

## Cómo está hecha

| Archivo | Para qué sirve |
| --- | --- |
| `index.html` | La página. Solo carga `style.css` y `app.js`. |
| `style.css` | Todo el diseño. Los colores están en variables al principio. |
| `app.js` | Punto de entrada: carga los datos y decide qué pantalla pintar. |
| `js/almacen.js` | Guarda y lee las bases en IndexedDB. |
| `js/modelo.js` | Cómo son las bases, tablas, campos, filas y vistas; conversión entre tipos. |
| `js/consulta.js` | Qué filas se ven en una vista (filtros, orden y buscador). |
| `js/inicio.js` / `js/bases.js` | Pantalla de inicio y operaciones con bases (crear, duplicar, borrar, .json). |
| `js/pantalla-base.js` | Pantalla de una base: pestañas, barra de la vista y contador. |
| `js/vista-cuadricula.js` | La cuadrícula editable. |
| `js/vista-tablero.js` / `js/vista-galeria.js` | Las vistas de tablero y galería. |
| `js/ficha-fila.js` | La ventana con todos los campos de una fila. |
| `js/campos.js` | La ventana para crear o editar un campo. |
| `js/paneles.js` | Paneles de filtros, orden, campos y vistas. |
| `js/importar.js` / `js/csv.js` | Importar y exportar CSV. |
| `js/ui.js` / `js/util.js` / `js/iconos.js` | Piezas comunes: ventanas, menús, avisos, formatos e iconos. |
| `js/ejemplo.js` + `img/ejemplos/` | La base de ejemplo y sus ilustraciones. |

## Decisiones

La ficha dejaba algunos detalles abiertos. Estas son las decisiones tomadas al construir:

1. **Campo principal.** Es siempre el primero: se puede renombrar y cambiar de tipo, pero no ocultar, borrar ni mover.
2. **Reordenar y ocultar campos.** Ocultar es propio de cada vista (como dice la ficha); el **orden de los campos es de toda la tabla**, porque la ficha no lo incluye entre lo que guarda cada vista. Se reordena desde el menú de la cabecera («Mover a la izquierda/derecha») o arrastrando en el panel «Campos».
3. **Base vacía.** Se crea con una «Tabla 1» con los campos Nombre y Notas y tres filas vacías, para ver por dónde empezar.
4. **Fechas con el teclado.** Si escribes directamente sobre una celda de fecha se abre un campo de texto (vale `13/10/2026`, `13-10-26` o `13102026`), porque el selector de fecha del navegador se pierde la primera tecla. Con Intro o doble clic se abre el selector de fecha (`<input type="date">`).
5. **Editar con el ratón y en el móvil.** Un segundo clic (o toque) sobre la celda ya elegida también la edita.
6. **Cuándo se reordena la tabla.** Al guardar con Intro o Tab, si el campo editado se usa para ordenar o filtrar, la fila salta a su nuevo sitio. Si guardas haciendo clic fuera, la tabla no se mueve bajo el ratón hasta el siguiente cambio. Las ediciones que no afectan al orden ni a los filtros solo repintan la celda (así es rápido con tablas grandes).
7. **Filas nuevas en una vista filtrada.** Se quedan a la vista aunque todavía no cumplan el filtro, hasta que cambies de vista, para que no desaparezcan mientras las rellenas.
8. **Orden.** Las celdas vacías van siempre al final. Los campos de selección se ordenan según el orden de sus opciones (Nuevo, Preparando, Enviado…). En cada regla solo se ofrecen campos que no estén ya en otra.
9. **Filtros.** «Contiene» y «es» no distinguen mayúsculas ni tildes. Una condición a medio rellenar no filtra. «≠» incluye las celdas vacías. El buscador rápido no se guarda en la vista y busca en los campos visibles.
10. **Tablero.** La columna «Sin valor» va a la derecha, para que las fases se lean seguidas. Las tarjetas muestran el nombre y los 3 primeros campos visibles (sin contar el de agrupar), solo los que tienen valor. Si la tabla tiene varias selecciones, se elige cuál agrupa con el botón «Agrupado por…». El desplegable para cambiar de columna aparece en pantallas estrechas y táctiles.
11. **Galería.** Tarjetas de 248 px (dos columnas en el móvil). El campo de portada se elige con el botón «Portada». Solo se intenta cargar como imagen una URL que lo parece (termina en .jpg, .png, .webp, .gif, .svg o .avif, o viene de un servicio de imágenes conocido), para no pedir como imagen una página web normal; si no carga, se muestra la inicial.
12. **Importar CSV.** Se detecta coma o punto y coma. La casilla se propone con sí/no, verdadero/falso, true/false o yes. La selección no se propone sola, pero puedes elegirla en la vista previa (crea una opción por valor distinto). Al añadir a una tabla, cada columna se empareja con el campo del mismo nombre; un valor de selección nuevo crea una opción en lugar de contar como error.
13. **Exportar CSV.** El separador por defecto es punto y coma. Los números van sin € ni puntos de miles (para que Excel pueda sumarlos), con los decimales del campo y coma decimal si el separador es punto y coma; las fechas, como 13/10/2026; las casillas, como Sí/No. El archivo se llama `<tabla>-AAAA-MM-DD.csv`.
14. **Renombrar y borrar tablas y vistas.** La ficha no dice cómo: pulsar la pestaña de la tabla activa abre un menú (Renombrar, Borrar) y el doble clic la renombra; las vistas se renombran y borran desde su desplegable, junto a los botones para crear una vista nueva.
15. **Borrar.** Bases, tablas, campos y vistas piden confirmación; no se puede borrar la última tabla ni la última vista. Las filas se borran sin preguntar pero con un aviso «Deshacer».
16. **Copia .json.** Importar una copia crea siempre una base nueva; nunca sustituye a una existente.
17. **Identidad.** Solo modo claro, como pide la ficha. Las bases pueden tener los siete pastel de la app o un verde salvia claro. Los números y las fechas se formatean a mano para que 1.234,50 lleve siempre el punto de miles.
18. **Base de ejemplo.** Además de Clientes y Pedidos incluye «Productos» con ilustraciones propias (carpeta `img/ejemplos/`) para lucir la galería, y las vistas «Tablero de envíos» y «Cobros pendientes».

## Limitaciones conocidas

- Pinta todas las filas de la vista: con unas 2.000 filas un repintado completo tarda alrededor de medio segundo. Las tablas de decenas de miles de filas quedan para una versión posterior (ver la ficha).
- Las imágenes de la galería dependen de que la URL sea pública y accesible.
- Los datos viven en un solo navegador y dispositivo.

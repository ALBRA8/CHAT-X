// Vista tablero: una columna por cada opción de un campo de selección (más
// "Sin valor"). Arrastrar una tarjeta a otra columna cambia ese valor.
// En el móvil, cada tarjeta trae un desplegable para cambiarla de columna.

import { guardar } from "./almacen.js";
import { abrirEditorCampo } from "./campos.js";
import { icono } from "./iconos.js";
import { crearOpcion, estaVacio, nombreFila, opcionDe, textoCelda, TIPOS } from "./modelo.js";
import { boton } from "./ui.js";
import { el } from "./util.js";

const COLOR_SIN_VALOR = "#ECEAE5";

// Las líneas de detalle de una tarjeta (se usa también en la galería).
export function detalleTarjeta(campos, fila) {
  const lineas = campos
    .filter((campo) => !estaVacio(fila.valores[campo.id]))
    .map((campo) => {
      const valor = fila.valores[campo.id];
      let contenido;
      if (campo.tipo === "seleccion") {
        const opcion = opcionDe(campo, valor);
        contenido = opcion ? el("span", { class: "pastilla", style: { background: opcion.color } }, opcion.nombre) : null;
      } else if (campo.tipo === "casilla") {
        contenido = el("span", { class: "dato-casilla" }, el("span", { class: "casilla marcada", html: icono("check", 12) }), "Sí");
      } else if (campo.tipo === "url") {
        contenido = el("span", { class: "dato-url" }, String(valor).replace(/^https?:\/\/(www\.)?/i, ""));
      } else contenido = textoCelda(campo, valor);
      return el("div", { class: "dato" }, el("dt", {}, el("span", { html: icono(TIPOS[campo.tipo].icono, 12) }), campo.nombre), el("dd", {}, contenido));
    });
  return lineas.length ? el("dl", { class: "datos" }, lineas) : null;
}

// ctx = { base, tabla, vista, filas, campos, abrirFicha, nuevaFila }
export function pintarTablero(contenedor, ctx) {
  const { base, tabla, vista, filas, campos } = ctx;
  let grupo = tabla.campos.find((c) => c.id === vista.agrupar && c.tipo === "seleccion");
  if (!grupo) {
    // Si la vista no tiene campo de agrupación, usamos la primera selección que haya.
    grupo = tabla.campos.find((c) => c.tipo === "seleccion");
    if (grupo) {
      vista.agrupar = grupo.id;
      guardar(base, { silencioso: true });
    }
  }
  if (!grupo) return contenedor.replaceChildren(sinSeleccion(ctx));

  // Las tarjetas muestran el nombre y los 3 primeros campos visibles (sin contar el de agrupar).
  const camposTarjeta = campos.slice(1).filter((c) => c !== grupo).slice(0, 3);
  // "Sin valor" va al final para que las fases se lean seguidas de izquierda a derecha.
  const columnas = [...grupo.opciones, { id: null, nombre: "Sin valor", color: COLOR_SIN_VALOR }];
  const idsValidos = new Set(grupo.opciones.map((o) => o.id));
  let arrastrada = null;

  const tablero = el(
    "div",
    { class: "tablero desplazable" },
    columnas.map((opcion) => {
      const enColumna = filas.filter((f) => (opcion.id ? f.valores[grupo.id] === opcion.id : !idsValidos.has(f.valores[grupo.id])));
      const lista = el("div", { class: "columna-tarjetas" }, enColumna.map((fila) => tarjeta(fila, opcion)), enColumna.length ? null : el("p", { class: "columna-vacia" }, "Arrastra aquí una tarjeta"));
      const columna = el(
        "section",
        { class: "columna", "data-opcion": opcion.id || "", "aria-label": `${opcion.nombre}: ${enColumna.length}` },
        el("header", { class: "columna-cab", style: { "--color": opcion.color } }, el("span", { class: "pastilla", style: { background: opcion.color } }, opcion.nombre), el("span", { class: "contador" }, enColumna.length)),
        lista,
        el(
          "button",
          {
            type: "button",
            class: "columna-anadir",
            "data-accion": "nueva-en-columna",
            onclick: () => {
              const fila = ctx.nuevaFila(opcion.id ? { [grupo.id]: opcion.id } : {});
              guardar(base);
              ctx.abrirFicha(fila);
            },
          },
          el("span", { html: icono("mas") }),
          "Nueva fila",
        ),
      );
      // Soltar una tarjeta en la columna cambia el valor del campo de agrupación.
      columna.addEventListener("dragover", (e) => {
        if (!arrastrada) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        columna.classList.add("sobre");
      });
      columna.addEventListener("dragleave", (e) => {
        if (!columna.contains(e.relatedTarget)) columna.classList.remove("sobre");
      });
      columna.addEventListener("drop", (e) => {
        e.preventDefault();
        columna.classList.remove("sobre");
        const fila = tabla.filas.find((f) => f.id === (e.dataTransfer.getData("text/plain") || arrastrada?.id));
        arrastrada = null;
        if (!fila || fila.valores[grupo.id] === (opcion.id || null)) return;
        fila.valores[grupo.id] = opcion.id || null;
        guardar(base);
      });
      return columna;
    }),
  );

  function tarjeta(fila, opcionActual) {
    const mover = el(
      "select",
      {
        class: "tarjeta-mover",
        "aria-label": `Mover «${nombreFila(tabla, fila) || "fila"}» a otra columna`,
        onchange: (e) => {
          fila.valores[grupo.id] = e.target.value || null;
          guardar(base);
        },
      },
      columnas.map((o) => el("option", { value: o.id || "", selected: (o.id || null) === (opcionActual.id || null) }, o.id ? o.nombre : "Sin valor")),
    );
    const nodo = el(
      "article",
      { class: "tarjeta", draggable: "true", tabindex: "0", "data-fila": fila.id },
      el("h3", { class: "tarjeta-titulo" }, nombreFila(tabla, fila) || el("span", { class: "sin-nombre" }, "Sin nombre")),
      detalleTarjeta(camposTarjeta, fila),
      el("label", { class: "tarjeta-mover-linea" }, el("span", { html: icono("tablero", 13) }), mover),
    );
    nodo.addEventListener("click", (e) => {
      if (!e.target.closest("select, label")) ctx.abrirFicha(fila);
    });
    nodo.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || e.target !== nodo) return;
      // Sin preventDefault, el mismo Intro "pulsaría" el botón Cerrar de la ficha recién abierta.
      e.preventDefault();
      ctx.abrirFicha(fila);
    });
    nodo.addEventListener("dragstart", (e) => {
      arrastrada = fila;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", fila.id);
      requestAnimationFrame(() => nodo.classList.add("arrastrando"));
    });
    nodo.addEventListener("dragend", () => {
      nodo.classList.remove("arrastrando");
      tablero.querySelectorAll(".sobre").forEach((c) => c.classList.remove("sobre"));
    });
    return nodo;
  }

  contenedor.replaceChildren(tablero);
}

// Si la tabla no tiene ningún campo de selección, lo explicamos y ofrecemos crear uno.
function sinSeleccion({ base, tabla, vista }) {
  return el(
    "div",
    { class: "estado-vacio" },
    el("div", { class: "estado-vacio-ico", html: icono("tablero", 34) }),
    el("h3", {}, "El tablero necesita un campo de selección"),
    el("p", {}, `Las columnas del tablero son las opciones de un campo de selección (por ejemplo, «Estado»: Nuevo, Preparando, Enviado). «${tabla.nombre}» todavía no tiene ninguno.`),
    boton("Crear campo de selección", {
      tipo: "primario",
      icono: "mas",
      "data-accion": "crear-seleccion",
      onclick: () =>
        abrirEditorCampo(base, tabla, null, {
          inicial: { nombre: "Estado", tipo: "seleccion", opciones: ["Por hacer", "En curso", "Hecho"].map((n, i) => crearOpcion(n, i)) },
          alGuardar: (campo) => {
            vista.agrupar = campo.id;
            guardar(base);
          },
        }),
    }),
  );
}

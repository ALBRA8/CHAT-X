// Pantalla de inicio: las bases como tarjetas y los botones para crear una
// base vacía, crear el ejemplo o importar una copia .json.

import { bases, guardar } from "./almacen.js";
import { borrarBaseConfirmando, duplicarBase, exportarBase, importarBase, nuevaBaseVacia, personalizarBase } from "./bases.js";
import { crearBaseEjemplo } from "./ejemplo.js";
import { icono, logo } from "./iconos.js";
import { abrirMenu, boton } from "./ui.js";
import { el, haceCuanto, plural } from "./util.js";

const abrirBase = (base) => (location.hash = `#/base/${base.id}`);

export function pintarInicio(app) {
  const ordenadas = [...bases].sort((a, b) => b.modificada - a.modificada);

  const acciones = el(
    "div",
    { class: "inicio-acciones" },
    boton("Nueva base", {
      tipo: "primario",
      icono: "mas",
      "data-accion": "nueva-base",
      onclick: async () => {
        const base = await nuevaBaseVacia();
        if (base) abrirBase(base);
      },
    }),
    boton("Desde un ejemplo", {
      icono: "estrella",
      "data-accion": "base-ejemplo",
      title: "Crea «Clientes y pedidos» con datos inventados",
      onclick: () => {
        const base = crearBaseEjemplo();
        guardar(base, { silencioso: true });
        abrirBase(base);
      },
    }),
    boton("Importar .json", {
      icono: "subir",
      "data-accion": "importar-json",
      onclick: async () => {
        const base = await importarBase();
        if (base) pintarInicio(app);
      },
    }),
  );

  app.replaceChildren(
    el(
      "div",
      { class: "pantalla-inicio" },
      el(
        "header",
        { class: "inicio-cab" },
        el("a", { class: "marca", href: "#/", "aria-label": "Celda, inicio" }, el("span", { html: logo(30) }), el("span", { class: "marca-nombre" }, "Celda")),
        el("span", { class: "inicio-lema" }, "Tus datos, en tablas con superpoderes"),
      ),
      el(
        "section",
        { class: "inicio-hero" },
        el(
          "div",
          { class: "inicio-titulos" },
          el("h1", {}, "Tus bases"),
          el("p", {}, "Clientes, pedidos, productos o contenidos en tablas que puedes ver como cuadrícula, tablero o galería. Todo se guarda en este navegador."),
        ),
        acciones,
      ),
      el(
        "p",
        { class: "aviso-copia" },
        el("span", { html: icono("escudo", 18) }),
        el("span", {}, "Tus datos viven solo en este navegador: si borras sus datos, se pierden. Exporta una copia ", el("strong", {}, ".json"), " de vez en cuando desde el menú ", el("span", { class: "en-linea", html: icono("puntos", 14) }), " de cada base."),
      ),
      ordenadas.length ? el("section", { class: "rejilla-bases", "aria-label": "Tus bases" }, ordenadas.map((b) => tarjetaBase(b, app))) : vacio(),
      el("footer", { class: "inicio-pie" }, el("span", { html: logo(16) }), "Celda · creada con ClonaKit"),
    ),
  );
}

function tarjetaBase(base, app) {
  const filas = base.tablas.reduce((total, t) => total + t.filas.length, 0);
  const menu = el("button", {
    type: "button",
    class: "btn-icono tarjeta-base-menu",
    "aria-label": `Opciones de ${base.nombre}`,
    html: icono("puntos", 18),
    onclick: (e) =>
      abrirMenu(e.currentTarget, [
        { texto: "Abrir", icono: "derecha", accion: () => abrirBase(base) },
        { texto: "Renombrar y personalizar", icono: "lapiz", accion: () => personalizarBase(base) },
        { texto: "Duplicar", icono: "copiar", accion: () => duplicarBase(base) },
        { texto: "Exportar copia (.json)", icono: "bajar", accion: () => exportarBase(base) },
        "-",
        { texto: "Borrar", icono: "papelera", peligro: true, accion: async () => (await borrarBaseConfirmando(base)) && pintarInicio(app) },
      ]),
  });
  return el(
    "article",
    { class: "tarjeta-base", style: { "--color-base": base.color }, "data-base": base.id },
    el(
      "a",
      { class: "tarjeta-base-abrir", href: `#/base/${base.id}` },
      el("span", { class: "tarjeta-base-portada" }, el("span", { class: "tarjeta-base-emoji" }, base.emoji), el("span", { class: "mini-rejilla", "aria-hidden": "true" })),
      el(
        "span",
        { class: "tarjeta-base-textos" },
        el("strong", { class: "tarjeta-base-nombre" }, base.nombre),
        el("span", { class: "tarjeta-base-meta" }, `${plural(base.tablas.length, "tabla")} · ${plural(filas, "fila")}`),
        el("span", { class: "tarjeta-base-fecha" }, `Editada ${haceCuanto(base.modificada)}`),
      ),
    ),
    menu,
  );
}

function vacio() {
  return el(
    "div",
    { class: "estado-vacio inicio-vacio" },
    el("div", { class: "estado-vacio-ico", html: logo(54) }),
    el("h3", {}, "Todavía no tienes ninguna base"),
    el("p", {}, "Crea una base vacía para tus datos o empieza con el ejemplo «Clientes y pedidos» y juega con él: sus datos son inventados y puedes borrarlos cuando quieras."),
  );
}

// Pantalla de una base: arriba el nombre y las pestañas de las tablas; luego
// la barra de la vista (vistas, filtros, orden, campos, importar, exportar,
// buscador y contador) y, en el centro, la vista elegida.

import { buscarBase, estadoDelGuardado, guardar } from "./almacen.js";
import { exportarBase, personalizarBase } from "./bases.js";
import { abrirEditorCampo } from "./campos.js";
import { camposVisibles, filasVisibles, filtrosActivos } from "./consulta.js";
import { abrirFicha } from "./ficha-fila.js";
import { icono, logo } from "./iconos.js";
import { abrirExportador, importarCSV } from "./importar.js";
import { crearFila, crearOpcion, crearTabla, TIPOS_VISTA } from "./modelo.js";
import { abrirCampos, abrirFiltros, abrirOrden, abrirVistas } from "./paneles.js";
import { abrirMenu, avisar, cerrarPanel, confirmar, pedirTexto } from "./ui.js";
import { el, formatearNumero } from "./util.js";
import { mostrarElegida, pintarCuadricula } from "./vista-cuadricula.js";
import { pintarGaleria } from "./vista-galeria.js";
import { pintarTablero } from "./vista-tablero.js";

// Estado de la pantalla que no se guarda: el texto del buscador y las filas
// recién creadas que se mantienen a la vista aunque el filtro no las incluya.
let baseId = null;
let busqueda = "";
let retenidas = new Set();
let vistaDeRetenidas = null;
let app = null;

export function abrirPantallaBase(contenedor, id) {
  if (id !== baseId) {
    busqueda = "";
    retenidas = new Set();
  }
  baseId = id;
  app = contenedor;
  pintar();
}

// Pinta la pantalla entera conservando el desplazamiento y el foco.
export function pintar() {
  const base = buscarBase(baseId);
  if (!base) {
    location.hash = "#/";
    return;
  }
  document.title = `${base.nombre} · Celda`;
  const tabla = base.tablas.find((t) => t.id === base.tablaActiva) || base.tablas[0];
  const vista = tabla.vistas.find((v) => v.id === tabla.vistaActiva) || tabla.vistas[0];
  if (vistaDeRetenidas !== vista.id) {
    retenidas = new Set();
    vistaDeRetenidas = vista.id;
  }

  // Recordamos dónde estaba el foco y el desplazamiento para recuperarlos.
  const anterior = app.querySelector(".vista-cuerpo .desplazable");
  const desplazamiento = anterior ? { arriba: anterior.scrollTop, izquierda: anterior.scrollLeft, vista: anterior.dataset.vista } : null;
  const focoEnVista = Boolean(document.activeElement?.closest?.(".vista-cuerpo"));
  const focoEnBuscador = document.activeElement?.matches?.(".buscador input");
  const pestanasScroll = app.querySelector(".pestanas")?.scrollLeft || 0;

  const cuerpo = el("main", { class: `vista-cuerpo vista-${vista.tipo}`, id: "vista" });
  const contador = el("span", { class: "contador-filas", "aria-live": "polite" });

  app.replaceChildren(el("div", { class: "pantalla-base", style: { "--color-base": base.color } }, cabecera(base), pestanas(base, tabla), barraVista(base, tabla, vista, cuerpo, contador), cuerpo));
  pintarVista(base, tabla, vista, cuerpo, contador);
  // Solo tocamos el desplazamiento si hace falta: cada lectura o escritura
  // obliga al navegador a recalcular el diseño, y con tablas grandes se nota.
  if (pestanasScroll) app.querySelector(".pestanas").scrollLeft = pestanasScroll;

  const nuevo = cuerpo.querySelector(".desplazable");
  if (nuevo && desplazamiento && desplazamiento.vista === vista.id && (desplazamiento.arriba || desplazamiento.izquierda)) {
    nuevo.scrollTop = desplazamiento.arriba;
    nuevo.scrollLeft = desplazamiento.izquierda;
  }
  if (focoEnVista && vista.tipo === "cuadricula" && !document.querySelector("dialog[open]")) {
    cuerpo.querySelector(".rejilla")?.focus({ preventScroll: true });
    mostrarElegida();
  }
  if (focoEnBuscador) {
    const input = app.querySelector(".buscador input");
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
}

// Pinta solo la vista y el contador (lo usa el buscador para no perder el foco).
function pintarVista(base, tabla, vista, cuerpo, contador) {
  const filas = filasVisibles(tabla, vista, busqueda, retenidas);
  const campos = camposVisibles(tabla, vista);
  contador.textContent = `${formatearNumero(filas.length)} de ${formatearNumero(tabla.filas.length)} ${tabla.filas.length === 1 ? "fila" : "filas"}`;
  const ctx = {
    base,
    tabla,
    vista,
    filas,
    campos,
    filtrada: Boolean(busqueda.trim()) || filtrosActivos(tabla, vista) > 0,
    busqueda: busqueda.trim(),
    refrescar: pintar,
    abrirFicha: (fila) => abrirFicha({ base, tabla, vista, fila, obtenerFilas: () => filasVisibles(tabla, vista, busqueda, retenidas) }),
    nuevaFila: (valores = {}) => {
      const fila = crearFila(valores);
      tabla.filas.push(fila);
      retenidas.add(fila.id);
      return fila;
    },
  };
  const pintores = { cuadricula: pintarCuadricula, tablero: pintarTablero, galeria: pintarGaleria };
  pintores[vista.tipo](cuerpo, ctx);
  cuerpo.querySelector(".desplazable")?.setAttribute("data-vista", vista.id);
}

// ---------- Cabecera con el nombre de la base ----------

function cabecera(base) {
  return el(
    "header",
    { class: "base-cab" },
    el("a", { class: "base-volver", href: "#/", "aria-label": "Volver a tus bases", title: "Volver a tus bases" }, el("span", { html: icono("volver", 18) }), el("span", { html: logo(24) })),
    el("span", { class: "base-emoji", "aria-hidden": "true" }, base.emoji),
    el("button", { type: "button", class: "base-nombre", title: "Renombrar y personalizar", onclick: () => personalizarBase(base) }, base.nombre),
    el("span", { class: "estado-guardado", id: "estado-guardado" }, textoGuardado()),
    el("span", { class: "hueco" }),
    el("button", {
      type: "button",
      class: "btn-icono",
      "aria-label": "Opciones de la base",
      html: icono("puntos", 18),
      onclick: (e) =>
        abrirMenu(e.currentTarget, [
          { texto: "Renombrar y personalizar", icono: "lapiz", accion: () => personalizarBase(base) },
          { texto: "Exportar copia (.json)", icono: "bajar", accion: () => exportarBase(base) },
          "-",
          { texto: "Volver a tus bases", icono: "volver", accion: () => (location.hash = "#/") },
        ]),
    }),
  );
}

function textoGuardado() {
  const estado = estadoDelGuardado();
  if (estado === "error") return [el("span", { html: icono("aviso", 14) }), "No se pudo guardar"];
  if (estado === "guardando") return [el("span", { class: "punto-guardando" }), "Guardando…"];
  return [el("span", { html: icono("check", 14) }), "Guardado en este navegador"];
}

// La cabecera escucha los cambios del guardado sin repintar toda la pantalla.
export function actualizarGuardado() {
  const nodo = document.getElementById("estado-guardado");
  if (!nodo) return;
  nodo.replaceChildren(...textoGuardado());
  nodo.dataset.estado = estadoDelGuardado();
}

// ---------- Pestañas de las tablas ----------

function pestanas(base, tabla) {
  const cambiar = (t) => {
    base.tablaActiva = t.id;
    busqueda = "";
    cerrarPanel();
    guardar(base, { sinFecha: true });
  };
  return el(
    "nav",
    { class: "pestanas", role: "tablist", "aria-label": "Tablas" },
    base.tablas.map((t) =>
      el(
        "button",
        {
          type: "button",
          role: "tab",
          class: `pestana ${t === tabla ? "activa" : ""}`,
          "aria-selected": String(t === tabla),
          "data-tabla": t.id,
          onclick: (e) => (t === tabla ? menuTabla(e.currentTarget, base, t) : cambiar(t)),
          ondblclick: () => renombrarTabla(base, t),
        },
        t.nombre,
        t === tabla ? el("span", { class: "pestana-flecha", html: icono("abajo", 13) }) : null,
      ),
    ),
    el("button", {
      type: "button",
      class: "pestana pestana-nueva",
      "aria-label": "Nueva tabla",
      title: "Nueva tabla",
      "data-accion": "nueva-tabla",
      html: icono("mas", 16),
      onclick: async () => {
        let n = base.tablas.length + 1;
        while (base.tablas.some((t) => t.nombre === `Tabla ${n}`)) n++;
        const nombre = await pedirTexto({ titulo: "Nueva tabla", etiqueta: "Nombre de la tabla", valor: `Tabla ${n}`, aceptar: "Crear tabla" });
        if (!nombre) return;
        const nueva = crearTabla(nombre);
        base.tablas.push(nueva);
        cambiar(nueva);
      },
    }),
  );
}

function menuTabla(ancla, base, tabla) {
  abrirMenu(ancla, [
    { texto: "Renombrar tabla", icono: "lapiz", accion: () => renombrarTabla(base, tabla) },
    {
      texto: "Borrar tabla",
      icono: "papelera",
      peligro: true,
      deshabilitado: base.tablas.length === 1,
      ayuda: base.tablas.length === 1 ? "Una base necesita al menos una tabla" : null,
      accion: async () => {
        const seguro = await confirmar({ titulo: `¿Borrar la tabla «${tabla.nombre}»?`, mensaje: `Se borrarán sus ${tabla.filas.length} filas, sus campos y sus vistas. No se puede deshacer.`, aceptar: "Borrar tabla", peligro: true });
        if (!seguro) return;
        const i = base.tablas.indexOf(tabla);
        base.tablas.splice(i, 1);
        base.tablaActiva = base.tablas[Math.max(0, i - 1)].id;
        guardar(base);
        avisar(`Tabla «${tabla.nombre}» borrada`);
      },
    },
  ], { titulo: tabla.nombre });
}

async function renombrarTabla(base, tabla) {
  const nombre = await pedirTexto({ titulo: "Renombrar tabla", etiqueta: "Nombre", valor: tabla.nombre });
  if (!nombre) return;
  tabla.nombre = nombre;
  guardar(base);
}

// ---------- Barra de la vista ----------

function barraVista(base, tabla, vista, cuerpo, contador) {
  const contexto = {
    base,
    tabla,
    vista,
    cambiarVista: (v) => {
      tabla.vistaActiva = v.id;
      guardar(base, { sinFecha: true });
    },
  };
  const herramienta = (texto, nombreIcono, { activo, onclick, abre, accion, extra } = {}) =>
    el(
      "button",
      { type: "button", class: `herramienta ${activo ? "activa" : ""}`, "data-abre": abre, "data-accion": accion, title: texto, onclick },
      el("span", { html: icono(nombreIcono) }),
      el("span", { class: "herramienta-texto" }, extra || texto),
    );

  const nFiltros = filtrosActivos(tabla, vista);
  const nOcultos = vista.ocultos.filter((id) => tabla.campos.some((c) => c.id === id)).length;
  const herramientas = [];

  if (vista.tipo === "tablero") {
    const grupo = tabla.campos.find((c) => c.id === vista.agrupar && c.tipo === "seleccion");
    herramientas.push(
      herramienta("Agrupar por", "tablero", {
        extra: grupo ? `Agrupado por ${grupo.nombre}` : "Agrupar por…",
        abre: "agrupar",
        onclick: (e) =>
          abrirMenu(
            e.currentTarget,
            [
              ...tabla.campos.filter((c) => c.tipo === "seleccion").map((c) => ({ texto: c.nombre, icono: "seleccion", activo: c === grupo, accion: () => ((vista.agrupar = c.id), guardar(base)) })),
              "-",
              {
                texto: "Crear campo de selección",
                icono: "mas",
                accion: () =>
                  abrirEditorCampo(base, tabla, null, {
                    inicial: { nombre: "Estado", tipo: "seleccion", opciones: ["Por hacer", "En curso", "Hecho"].map((n, i) => crearOpcion(n, i)) },
                    alGuardar: (campo) => ((vista.agrupar = campo.id), guardar(base)),
                  }),
              },
            ],
            { titulo: "Columnas según…", tipo: "agrupar" },
          ),
      }),
    );
  }
  if (vista.tipo === "galeria") {
    const portada = tabla.campos.find((c) => c.id === vista.portada && c.tipo === "url");
    herramientas.push(
      herramienta("Portada", "galeria", {
        extra: portada ? `Portada: ${portada.nombre}` : "Sin portada",
        abre: "portada",
        onclick: (e) =>
          abrirMenu(
            e.currentTarget,
            [
              ...tabla.campos.filter((c) => c.tipo === "url").map((c) => ({ texto: c.nombre, icono: "url", activo: c === portada, accion: () => ((vista.portada = c.id), guardar(base)) })),
              { texto: "Sin portada", icono: "cerrar", activo: !portada, accion: () => ((vista.portada = null), guardar(base)) },
            ],
            { titulo: "Imagen de portada desde un campo URL", tipo: "portada" },
          ),
      }),
    );
  }
  herramientas.push(
    herramienta("Filtrar", "filtro", { activo: nFiltros > 0, abre: "filtros", extra: nFiltros ? `${nFiltros} ${nFiltros === 1 ? "filtro" : "filtros"}` : "Filtrar", onclick: (e) => abrirFiltros(e.currentTarget, contexto) }),
    herramienta("Ordenar", "orden", { activo: vista.orden.length > 0, abre: "orden", extra: vista.orden.length ? `Orden (${vista.orden.length})` : "Ordenar", onclick: (e) => abrirOrden(e.currentTarget, contexto) }),
    herramienta("Ocultar campos", "ojoCerrado", { activo: nOcultos > 0, abre: "campos", extra: nOcultos ? `${nOcultos} ${nOcultos === 1 ? "oculto" : "ocultos"}` : "Campos", onclick: (e) => abrirCampos(e.currentTarget, contexto) }),
    el("span", { class: "barra-sep", "aria-hidden": "true" }),
    herramienta("Importar CSV", "subir", { accion: "importar", extra: "Importar", onclick: () => importarCSV({ base, tabla, alTerminar: () => pintar() }) }),
    herramienta("Exportar CSV", "bajar", {
      accion: "exportar",
      extra: "Exportar",
      onclick: () => abrirExportador({ tabla, vista, filas: filasVisibles(tabla, vista, busqueda, retenidas), campos: camposVisibles(tabla, vista) }),
    }),
  );

  const inputBusqueda = el("input", { type: "search", placeholder: "Buscar…", value: busqueda, "aria-label": "Buscar en esta vista" });
  inputBusqueda.addEventListener("input", () => {
    busqueda = inputBusqueda.value;
    pintarVista(base, tabla, vista, cuerpo, contador);
  });

  return el(
    "div",
    { class: "barra-vista" },
    el(
      "button",
      { type: "button", class: "selector-vista", "data-abre": "vistas", "aria-haspopup": "dialog", onclick: (e) => abrirVistas(e.currentTarget, contexto) },
      el("span", { class: `vista-ico vista-ico-${vista.tipo}`, html: icono(TIPOS_VISTA[vista.tipo].icono) }),
      el("span", { class: "selector-vista-nombre" }, vista.nombre),
      el("span", { html: icono("abajo", 14) }),
    ),
    el("div", { class: "herramientas" }, herramientas),
    el("label", { class: "buscador" }, el("span", { html: icono("buscar", 15) }), inputBusqueda),
    contador,
  );
}

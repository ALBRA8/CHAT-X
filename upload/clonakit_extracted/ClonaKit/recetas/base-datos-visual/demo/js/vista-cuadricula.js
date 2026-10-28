// Vista cuadrícula: una tabla editable como una hoja de cálculo.
//  - Clic en una celda la elige; Intro, doble clic o un segundo clic la editan.
//  - Flechas para moverse, Tab para ir a la derecha, Esc para cancelar.
//  - Las casillas se marcan con un solo clic.
//  - La cabecera abre un menú del campo y su borde derecho cambia el ancho.

import { guardar } from "./almacen.js";
import { abrirEditorCampo, borrarCampo, moverCampo, ocultarCampo } from "./campos.js";
import { icono } from "./iconos.js";
import { interpretar, opcionDe, textoCelda, TIPOS } from "./modelo.js";
import { abrirMenu, avisar } from "./ui.js";
import { el, urlSegura } from "./util.js";

// En pantallas estrechas la columna del número y la principal (que quedan
// fijas a la izquierda) son más estrechas, para dejar sitio al resto.
const esEstrecha = () => window.innerWidth < 640;
const anchoNumero = () => (esEstrecha() ? 44 : 56); // columna con el número de fila
const ANCHO_NUEVO = 56; // columna del botón "+" para añadir campo
const ANCHOS = { texto: 190, numero: 130, fecha: 140, casilla: 96, seleccion: 160, url: 210 };
const ANCHO_MIN = 70;
const ANCHO_MAX = 640;

// Estado que sobrevive a los repintados: qué celda está elegida y si se está editando.
let elegida = null; // { vistaId, filaId, campoId }
let edicion = null; // { filaId, campoId, control }
let ctx = null; // datos de la última vez que se pintó
let raiz = null; // el <div class="rejilla"> actual

function anchoDe(vista, campo, i) {
  const ancho = vista.anchos[campo.id] || (i === 0 ? 220 : ANCHOS[campo.tipo]);
  // Si la persona ya eligió un ancho, se respeta también en el móvil.
  return i === 0 && esEstrecha() && !vista.anchos[campo.id] ? Math.min(ancho, 150) : ancho;
}

// ctx = { base, tabla, vista, filas, campos, abrirFicha, nuevaFila, refrescar, filtrada, busqueda }
export function pintarCuadricula(contenedor, contexto) {
  ctx = contexto;
  edicion = null;
  const { tabla, vista, filas, campos } = ctx;
  if (elegida && (elegida.vistaId !== vista.id || !filas.some((f) => f.id === elegida.filaId) || !campos.some((c) => c.id === elegida.campoId))) elegida = null;

  const anchos = campos.map((c, i) => anchoDe(vista, c, i));
  const ANCHO_NUMERO = anchoNumero();
  const anchoTotal = ANCHO_NUMERO + anchos.reduce((a, b) => a + b, 0) + ANCHO_NUEVO;
  const ordenados = new Map(vista.orden.map((r) => [r.campoId, r.direccion]));
  const filtrados = new Set(vista.filtros.condiciones.map((c) => c.campoId));

  const colgroup = el("colgroup", {}, el("col", { style: { width: `${ANCHO_NUMERO}px` } }), anchos.map((a, i) => el("col", { style: { width: `${a}px` }, "data-campo": campos[i].id })), el("col", { style: { width: `${ANCHO_NUEVO}px` } }));

  const cabecera = el(
    "tr",
    {},
    el("th", { class: "col-num", scope: "col" }, el("span", { class: "oculto-visual" }, "Número de fila")),
    campos.map((campo, i) =>
      el(
        "th",
        { scope: "col", class: i === 0 ? "col-principal" : "", "data-campo": campo.id },
        el(
          "button",
          { type: "button", class: "cab-campo", "aria-haspopup": "menu", title: `${campo.nombre} · ${TIPOS[campo.tipo].nombre}`, onclick: (e) => menuCampo(e.currentTarget, campo, i) },
          el("span", { class: "cab-ico", html: icono(TIPOS[campo.tipo].icono, 15) }),
          el("span", { class: "cab-nombre" }, campo.nombre),
          ordenados.has(campo.id) ? el("span", { class: "cab-marca", title: "Ordenado", html: icono(ordenados.get(campo.id) === "desc" ? "desc" : "asc", 13) }) : null,
          filtrados.has(campo.id) ? el("span", { class: "cab-marca", title: "Filtrado", html: icono("filtro", 13) }) : null,
        ),
        el("span", { class: "redimensionar", "aria-hidden": "true", onpointerdown: (e) => empezarRedimension(e, campo, i) }),
      ),
    ),
    el("th", { class: "col-nuevo" }, el("button", { type: "button", class: "btn-icono", "aria-label": "Añadir campo", title: "Añadir campo", "data-accion": "nuevo-campo", html: icono("mas"), onclick: () => abrirEditorCampo(ctx.base, tabla, null) })),
  );

  const cuerpo = el(
    "tbody",
    {},
    filas.map((fila, n) =>
      el(
        "tr",
        { "data-fila": fila.id },
        el(
          "td",
          { class: "col-num" },
          el("span", { class: "num-fila" }, n + 1),
          el("button", { type: "button", class: "expandir", "aria-label": "Abrir ficha de la fila", title: "Abrir ficha", html: icono("expandir", 14), onclick: () => ctx.abrirFicha(fila) }),
        ),
        campos.map((campo, i) => el("td", { "data-campo": campo.id, class: `tipo-${campo.tipo} ${i === 0 ? "col-principal" : ""}` }, contenidoCelda(campo, fila.valores[campo.id]))),
        el("td", { class: "col-relleno" }),
      ),
    ),
    filas.length
      ? null
      : el("tr", { class: "fila-vacia" }, el("td", { colspan: campos.length + 2 }, el("span", {}, ctx.filtrada ? "Ninguna fila coincide con los filtros o la búsqueda." : "Todavía no hay filas. Crea la primera."))),
    el(
      "tr",
      { class: "fila-anadir" },
      el("td", { colspan: campos.length + 2 }, el("button", { type: "button", class: "btn-anadir-fila", "data-accion": "nueva-fila", onclick: anadirFila }, el("span", { html: icono("mas") }), "Nueva fila")),
    ),
  );

  const tablaHtml = el("table", { class: "cuadricula", style: { width: `${anchoTotal}px` } }, colgroup, el("thead", {}, cabecera), cuerpo);
  raiz = el("div", { class: "rejilla desplazable", tabindex: "0", role: "grid", "aria-label": `Cuadrícula de ${tabla.nombre}`, "aria-rowcount": filas.length }, tablaHtml);
  // Para que al moverse con el teclado la celda no quede tapada por la cabecera
  // ni por la primera columna, que están fijas.
  raiz.style.scrollPaddingLeft = `${ANCHO_NUMERO + (anchos[0] || 0)}px`;
  raiz.style.setProperty("--ancho-num", `${ANCHO_NUMERO}px`); // lo usa el CSS para fijar la columna principal
  raiz.addEventListener("mousedown", alPulsarCelda);
  raiz.addEventListener("keydown", alPulsarTecla);
  contenedor.replaceChildren(raiz);
  marcarElegida(false);
}

// Tras repintar, la pantalla llama a esto para que la celda elegida se vea.
export function mostrarElegida() {
  marcarElegida(true);
}

// ---------- Contenido de cada celda según su tipo ----------

function contenidoCelda(campo, valor) {
  switch (campo.tipo) {
    case "casilla":
      return el("span", { class: `casilla ${valor ? "marcada" : ""}`, role: "checkbox", "aria-checked": String(Boolean(valor)), html: valor ? icono("check", 13) : "" });
    case "seleccion": {
      const opcion = opcionDe(campo, valor);
      return opcion ? el("span", { class: "pastilla", style: { background: opcion.color } }, opcion.nombre) : null;
    }
    case "url": {
      const segura = urlSegura(valor);
      if (!segura) return valor ? el("span", { class: "celda-texto" }, valor) : null;
      return el("a", { class: "enlace", href: segura, target: "_blank", rel: "noopener noreferrer", title: segura }, segura.replace(/^https?:\/\/(www\.)?/i, ""));
    }
    default:
      return el("span", { class: "celda-texto" }, textoCelda(campo, valor));
  }
}

// ---------- Elegir y moverse ----------

const celdaDe = (filaId, campoId) => raiz?.querySelector(`tr[data-fila="${filaId}"] td[data-campo="${campoId}"]`);
const filaDe = (id) => ctx.tabla.filas.find((f) => f.id === id);
const campoDe = (id) => ctx.tabla.campos.find((c) => c.id === id);

function elegir(filaId, campoId, desplazar = true) {
  elegida = { vistaId: ctx.vista.id, filaId, campoId };
  marcarElegida(desplazar);
}

function marcarElegida(desplazar) {
  raiz?.querySelectorAll(".elegida, .fila-elegida").forEach((n) => n.classList.remove("elegida", "fila-elegida"));
  if (!elegida) return;
  const celda = celdaDe(elegida.filaId, elegida.campoId);
  if (!celda) return;
  celda.classList.add("elegida");
  celda.parentElement.classList.add("fila-elegida");
  if (desplazar) celda.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function mover(direccion) {
  if (!elegida) return false;
  const { filas, campos } = ctx;
  let f = filas.findIndex((x) => x.id === elegida.filaId);
  let c = campos.findIndex((x) => x.id === elegida.campoId);
  if (direccion === "arriba") f--;
  else if (direccion === "abajo") f++;
  else if (direccion === "izquierda") c--;
  else if (direccion === "derecha") c++;
  else if (direccion === "tab") {
    // Tab pasa a la derecha y, al final de la fila, salta a la siguiente.
    c++;
    if (c >= campos.length) [f, c] = [f + 1, 0];
  } else if (direccion === "tab-atras") {
    c--;
    if (c < 0) [f, c] = [f - 1, campos.length - 1];
  }
  if (f < 0 || f >= filas.length || c < 0 || c >= campos.length) return false;
  elegir(filas[f].id, campos[c].id);
  return true;
}

function enfocar() {
  raiz?.focus({ preventScroll: true });
}

// ---------- Ratón ----------

function alPulsarCelda(e) {
  if (e.button !== 0) return;
  const celda = e.target.closest("td[data-campo]");
  if (!celda || e.target.closest(".expandir")) return;
  if (edicion && celda.contains(edicion.control)) return; // clic dentro del editor
  // Evitamos que el navegador mueva el foco o seleccione texto: lo hacemos nosotros.
  if (!e.target.closest("a")) e.preventDefault();
  const filaId = celda.parentElement.dataset.fila;
  const campoId = celda.dataset.campo;
  const yaElegida = elegida && elegida.filaId === filaId && elegida.campoId === campoId;
  if (edicion) confirmar(null);
  elegir(filaId, campoId, false);
  enfocar();
  const campo = campoDe(campoId);
  if (campo.tipo === "casilla") alternarCasilla(filaDe(filaId), campo);
  else if (yaElegida && !e.target.closest("a")) empezarEdicion();
}

// ---------- Teclado ----------

function alPulsarTecla(e) {
  if (edicion) return; // el editor gestiona sus propias teclas
  if (!elegida) {
    if (["ArrowDown", "ArrowRight", "Enter", "Tab"].includes(e.key) && ctx.filas.length && e.target === raiz) {
      if (e.key === "Tab") return; // sin celda elegida, Tab sigue su camino normal
      e.preventDefault();
      elegir(ctx.filas[0].id, ctx.campos[0].id);
    }
    return;
  }
  const campo = campoDe(elegida.campoId);
  const fila = filaDe(elegida.filaId);
  const flechas = { ArrowUp: "arriba", ArrowDown: "abajo", ArrowLeft: "izquierda", ArrowRight: "derecha" };
  if (flechas[e.key]) {
    e.preventDefault();
    mover(flechas[e.key]);
  } else if (e.key === "Tab") {
    // Si no hay más celdas, dejamos que Tab salga de la cuadrícula.
    if (mover(e.shiftKey ? "tab-atras" : "tab")) e.preventDefault();
  } else if (e.key === "Enter" || e.key === "F2") {
    e.preventDefault();
    if (campo.tipo === "casilla") alternarCasilla(fila, campo);
    else empezarEdicion();
  } else if (e.key === " " && campo.tipo === "casilla") {
    e.preventDefault();
    alternarCasilla(fila, campo);
  } else if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    fila.valores[campo.id] = campo.tipo === "casilla" ? false : null;
    guardarCambio(fila, campo);
  } else if (e.key === "Escape") {
    elegida = null;
    marcarElegida(false);
  } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    // Escribir directamente sobre una celda elegida empieza a editarla.
    e.preventDefault();
    if (campo.tipo === "seleccion") empezarEdicion();
    else if (campo.tipo !== "casilla") empezarEdicion(e.key);
  }
}

function alternarCasilla(fila, campo) {
  fila.valores[campo.id] = !fila.valores[campo.id];
  guardarCambio(fila, campo);
}

// ¿Puede este cambio mover o esconder filas? Solo si el campo se usa para
// ordenar o filtrar, o si hay una búsqueda escrita.
function afectaALaVista(campo) {
  const { vista } = ctx;
  return Boolean(ctx.busqueda) || vista.orden.some((r) => r.campoId === campo.id) || vista.filtros.condiciones.some((c) => c.campoId === campo.id);
}

// Guarda un cambio. Si no afecta al orden ni a los filtros, basta con
// repintar esa celda: así editar es instantáneo aunque la tabla sea grande.
function guardarCambio(fila, campo) {
  if (afectaALaVista(campo)) return guardar(ctx.base);
  guardarSoloCelda(fila, campo);
}

function guardarSoloCelda(fila, campo) {
  guardar(ctx.base, { silencioso: true });
  const celda = celdaDe(fila.id, campo.id);
  if (celda) {
    celda.classList.remove("editando");
    celda.replaceChildren(contenidoCelda(campo, fila.valores[campo.id]) || "");
  }
}

// ---------- Edición dentro de la celda ----------

function empezarEdicion(textoInicial) {
  if (!elegida) return;
  const campo = campoDe(elegida.campoId);
  const fila = filaDe(elegida.filaId);
  const celda = celdaDe(elegida.filaId, elegida.campoId);
  if (!campo || !fila || !celda || campo.tipo === "casilla") return;
  const valor = fila.valores[campo.id];

  let control;
  if (campo.tipo === "seleccion") {
    control = el(
      "select",
      { class: "editor", "aria-label": campo.nombre },
      el("option", { value: "" }, "— Sin valor —"),
      campo.opciones.map((o) => el("option", { value: o.id, selected: o.id === valor }, o.nombre)),
    );
    control.addEventListener("change", () => confirmar(null, { refrescar: true }));
  } else if (campo.tipo === "fecha" && textoInicial === undefined) {
    control = el("input", { class: "editor", type: "date", value: valor || "", "aria-label": campo.nombre });
  } else if (campo.tipo === "fecha") {
    // Al teclear directamente sobre una fecha usamos un campo de texto: el
    // selector de fecha del navegador se "come" la primera tecla.
    control = el("input", { class: "editor", type: "text", inputmode: "numeric", value: textoInicial, placeholder: "dd/mm/aaaa", "aria-label": campo.nombre });
  } else {
    let texto = valor ?? "";
    if (campo.tipo === "numero" && typeof valor === "number") texto = String(valor).replace(".", ",");
    control = el("input", {
      class: "editor",
      type: "text",
      inputmode: campo.tipo === "numero" ? "decimal" : null,
      value: textoInicial ?? texto,
      "aria-label": campo.nombre,
      spellcheck: "false",
    });
  }
  edicion = { filaId: fila.id, campoId: campo.id, control };
  celda.classList.add("editando");
  celda.replaceChildren(control);
  control.focus();
  if (control.setSelectionRange && control.type === "text") control.setSelectionRange(control.value.length, control.value.length);
  if (campo.tipo === "seleccion") {
    try {
      control.showPicker?.();
    } catch {
      /* Algunos navegadores no dejan abrir la lista desde código: no pasa nada. */
    }
  }

  control.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      confirmar("abajo");
    } else if (e.key === "Tab") {
      e.preventDefault();
      e.stopPropagation();
      confirmar(e.shiftKey ? "tab-atras" : "tab");
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      cancelar();
    }
  });
  // Si el foco se va a otro sitio (clic fuera), guardamos lo escrito.
  control.addEventListener("blur", () => {
    if (edicion?.control === control) confirmar(null);
  });
}

// Guarda lo que hay en el editor.
//   direccion: hacia dónde moverse después ("abajo", "tab"…) o null para quedarse.
//   Con teclado, si el campo ordena o filtra la vista, se repinta todo para
//   aplicar orden y filtros; en los demás casos (y con un clic fuera) solo se
//   actualiza la celda, para no mover la tabla bajo el ratón.
function confirmar(direccion, { refrescar = Boolean(direccion) } = {}) {
  if (!edicion) return;
  const { filaId, campoId, control } = edicion;
  edicion = null;
  const campo = campoDe(campoId);
  const fila = filaDe(filaId);
  if (!campo || !fila) return;
  let nuevo;
  let encaja = true;
  if (control.type === "date" || campo.tipo === "seleccion") nuevo = control.value || null;
  else ({ valor: nuevo, encaja } = interpretar(campo, fechaConBarras(campo, control.value)));
  if (!encaja) avisar(`«${control.value}» no es ${{ numero: "un número válido", fecha: "una fecha válida", url: "una URL válida" }[campo.tipo]}. Se mantiene el valor anterior.`, { tipo: "error" });
  else fila.valores[campo.id] = nuevo;

  if (refrescar && afectaALaVista(campo)) {
    // Con teclado y si el campo ordena o filtra: repintamos todo para que la
    // fila ocupe su nuevo sitio (la celda elegida la sigue).
    if (direccion) mover(direccion);
    guardar(ctx.base);
    return;
  }
  // Con un clic fuera, o si el cambio no mueve filas, basta con repintar la
  // celda: no movemos la tabla bajo el ratón y es instantáneo.
  const teniaFoco = raiz?.contains(document.activeElement);
  guardarSoloCelda(fila, campo);
  if (direccion) mover(direccion);
  if (teniaFoco || refrescar) enfocar();
}

// "13102026" o "131026" escritos sin barras también valen como fecha.
function fechaConBarras(campo, texto) {
  if (campo.tipo !== "fecha") return texto;
  const m = /^(\d{2})(\d{2})(\d{2}|\d{4})$/.exec(texto.trim());
  return m ? `${m[1]}/${m[2]}/${m[3]}` : texto;
}

// Esc: se descarta lo escrito y la celda vuelve a mostrar su valor.
function cancelar() {
  const { filaId, campoId } = edicion;
  edicion = null;
  const celda = celdaDe(filaId, campoId);
  if (celda) {
    celda.classList.remove("editando");
    celda.replaceChildren(contenidoCelda(campoDe(campoId), filaDe(filaId).valores[campoId]) || "");
  }
  enfocar();
}

// Crea una fila al final, la elige y empieza a escribir en su primer campo.
function anadirFila() {
  const fila = ctx.nuevaFila();
  elegida = { vistaId: ctx.vista.id, filaId: fila.id, campoId: ctx.campos[0].id };
  guardar(ctx.base); // repinta la cuadrícula con la fila nueva
  marcarElegida(true);
  enfocar();
  empezarEdicion();
}

// ---------- Cabecera: menú del campo y ancho de columna ----------

function menuCampo(boton, campo, i) {
  const { base, tabla, vista } = ctx;
  const principal = i === 0;
  const posicion = tabla.campos.indexOf(campo);
  const [asc, desc] = { numero: ["1 → 9", "9 → 1"], fecha: ["más antigua primero", "más reciente primero"], casilla: ["sin marcar primero", "marcadas primero"], seleccion: ["orden de opciones", "orden inverso"] }[campo.tipo] || ["A → Z", "Z → A"];
  abrirMenu(
    boton,
    [
      { texto: "Renombrar", icono: "lapiz", accion: () => abrirEditorCampo(base, tabla, campo, { foco: "nombre" }) },
      { texto: "Cambiar tipo", icono: TIPOS[campo.tipo].icono, extra: TIPOS[campo.tipo].nombre, accion: () => abrirEditorCampo(base, tabla, campo, { foco: "tipo" }) },
      "-",
      { texto: `Ordenar ${asc}`, icono: "asc", accion: () => ((vista.orden = [{ campoId: campo.id, direccion: "asc" }]), guardar(base)) },
      { texto: `Ordenar ${desc}`, icono: "desc", accion: () => ((vista.orden = [{ campoId: campo.id, direccion: "desc" }]), guardar(base)) },
      "-",
      { texto: "Mover a la izquierda", icono: "izquierda", deshabilitado: posicion <= 1, accion: () => moverCampo(base, tabla, campo, -1) },
      { texto: "Mover a la derecha", icono: "derecha", deshabilitado: principal || posicion >= tabla.campos.length - 1, accion: () => moverCampo(base, tabla, campo, 1) },
      { texto: "Ocultar en esta vista", icono: "ojoCerrado", deshabilitado: principal, ayuda: principal ? "El campo principal siempre se ve" : null, accion: () => ocultarCampo(base, tabla, vista, campo) },
      "-",
      { texto: "Borrar campo", icono: "papelera", peligro: true, deshabilitado: principal, accion: () => borrarCampo(base, tabla, campo) },
    ],
    { titulo: principal ? `${campo.nombre} · campo principal` : campo.nombre },
  );
}

// Arrastrar el borde derecho de la cabecera cambia el ancho de la columna.
function empezarRedimension(e, campo, i) {
  e.preventDefault();
  e.stopPropagation();
  const { base, vista } = ctx;
  const tabla = raiz.querySelector("table");
  const col = raiz.querySelector(`col[data-campo="${campo.id}"]`);
  const inicioX = e.clientX;
  const anchoInicial = anchoDe(vista, campo, i);
  const anchoTablaInicial = tabla.offsetWidth;
  let ancho = anchoInicial;
  const asa = e.currentTarget;
  asa.setPointerCapture(e.pointerId);
  asa.classList.add("activa");
  const alMover = (ev) => {
    ancho = Math.round(Math.min(ANCHO_MAX, Math.max(ANCHO_MIN, anchoInicial + ev.clientX - inicioX)));
    col.style.width = `${ancho}px`;
    tabla.style.width = `${anchoTablaInicial + ancho - anchoInicial}px`;
  };
  const alSoltar = () => {
    asa.removeEventListener("pointermove", alMover);
    asa.removeEventListener("pointerup", alSoltar);
    asa.removeEventListener("pointercancel", alSoltar);
    asa.classList.remove("activa");
    if (ancho !== anchoInicial) {
      vista.anchos[campo.id] = ancho;
      guardar(base);
    }
  };
  asa.addEventListener("pointermove", alMover);
  asa.addEventListener("pointerup", alSoltar);
  asa.addEventListener("pointercancel", alSoltar);
}

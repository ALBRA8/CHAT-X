// Paneles de la barra de la vista: filtros, orden, campos visibles y el
// desplegable de vistas. Cada cambio se guarda en la vista al momento, así
// que los filtros y el orden solo afectan a esa vista.

import { guardar } from "./almacen.js";
import { abrirEditorCampo } from "./campos.js";
import { condicionCompleta, OPERADORES, operadorSinValor } from "./consulta.js";
import { icono } from "./iconos.js";
import { crearVista, TIPOS, TIPOS_VISTA } from "./modelo.js";
import { abrirPanel, boton, cerrarPanel, confirmar, panelAbiertoEs, pedirTexto } from "./ui.js";
import { el, nuevoId, reemplazar } from "./util.js";

// Abre el panel o, si ya estaba abierto, lo cierra (comportamiento de interruptor).
function alternar(tipo, abrir) {
  if (panelAbiertoEs(tipo)) return cerrarPanel();
  abrir();
}

const cabecera = (titulo, ayuda) => el("div", { class: "panel-cab" }, el("strong", {}, titulo), ayuda ? el("span", { class: "ayuda" }, ayuda) : null);

// ---------- Filtros ----------

export function abrirFiltros(ancla, { base, tabla, vista }) {
  alternar("filtros", () => {
    const contenido = el("div", { class: "panel-filtros" });
    const control = abrirPanel(ancla, contenido, { tipo: "filtros", clase: "panel-ancho" });
    const aplicar = () => guardar(base);

    function pintar() {
      const condiciones = vista.filtros.condiciones;
      reemplazar(contenido, 
        cabecera("Filtros", "Solo afectan a esta vista."),
        condiciones.length ? null : el("p", { class: "panel-vacio" }, "No hay filtros: se ven todas las filas."),
        ...condiciones.map(filaCondicion),
        el("div", { class: "panel-pie" }, boton("Añadir condición", { icono: "mas", tipo: "suave", "data-accion": "anadir-condicion", onclick: anadir })),
      );
      control.recolocar();
    }

    function anadir() {
      const campo = tabla.campos[0];
      vista.filtros.condiciones.push({ id: nuevoId("q"), campoId: campo.id, operador: OPERADORES[campo.tipo][0][0], valor: "", valor2: "" });
      aplicar();
      pintar();
      contenido.querySelector(".condicion:last-of-type select")?.focus();
    }

    function filaCondicion(condicion, i) {
      const campo = tabla.campos.find((c) => c.id === condicion.campoId) || tabla.campos[0];
      let prefijo;
      if (i === 0) prefijo = el("span", { class: "cond-prefijo" }, "Donde");
      else if (i === 1) {
        prefijo = el(
          "select",
          { class: "campo-input campo-input-peq cond-prefijo", "aria-label": "Combinar condiciones", "data-rol": "modo", onchange: (e) => ((vista.filtros.modo = e.target.value), aplicar(), pintar()) },
          el("option", { value: "todas", selected: vista.filtros.modo !== "alguna" }, "y (todas)"),
          el("option", { value: "alguna", selected: vista.filtros.modo === "alguna" }, "o (alguna)"),
        );
      } else prefijo = el("span", { class: "cond-prefijo" }, vista.filtros.modo === "alguna" ? "o" : "y");

      const selectCampo = el(
        "select",
        {
          class: "campo-input campo-input-peq",
          "aria-label": "Campo",
          "data-rol": "campo",
          onchange: (e) => {
            const nuevo = tabla.campos.find((c) => c.id === e.target.value);
            Object.assign(condicion, { campoId: nuevo.id, operador: OPERADORES[nuevo.tipo][0][0], valor: "", valor2: "" });
            aplicar();
            pintar();
          },
        },
        tabla.campos.map((c) => el("option", { value: c.id, selected: c === campo }, c.nombre)),
      );
      const selectOperador = el(
        "select",
        {
          class: "campo-input campo-input-peq",
          "aria-label": "Condición",
          "data-rol": "operador",
          onchange: (e) => {
            condicion.operador = e.target.value;
            if (condicion.operador === "alguna") condicion.valor = [];
            else if (Array.isArray(condicion.valor)) condicion.valor = "";
            aplicar();
            pintar();
          },
        },
        OPERADORES[campo.tipo].map(([clave, texto]) => el("option", { value: clave, selected: condicion.operador === clave }, texto)),
      );
      const incompleta = !condicionCompleta(condicion, campo);
      return el(
        "div",
        { class: `condicion ${incompleta ? "incompleta" : ""}` },
        prefijo,
        selectCampo,
        selectOperador,
        controlValor(condicion, campo),
        el("button", {
          type: "button",
          class: "btn-icono",
          "aria-label": "Quitar condición",
          html: icono("cerrar"),
          onclick: () => {
            vista.filtros.condiciones.splice(i, 1);
            aplicar();
            pintar();
          },
        }),
      );
    }

    // El control para escribir el valor cambia según el tipo de campo y el operador.
    function controlValor(condicion, campo) {
      const op = condicion.operador;
      if (operadorSinValor(op)) return el("span", { class: "cond-valor" });
      const alEscribir = (clave) => (e) => {
        condicion[clave] = e.target.value;
        e.target.closest(".condicion").classList.toggle("incompleta", !condicionCompleta(condicion, campo));
        aplicar();
      };
      if (campo.tipo === "seleccion") {
        if (op === "alguna") {
          return el(
            "div",
            { class: "cond-valor chips" },
            campo.opciones.map((o) =>
              el(
                "button",
                {
                  type: "button",
                  class: `pastilla chip ${condicion.valor.includes(o.id) ? "elegida" : ""}`,
                  style: { background: o.color },
                  "aria-pressed": String(condicion.valor.includes(o.id)),
                  onclick: () => {
                    condicion.valor = condicion.valor.includes(o.id) ? condicion.valor.filter((id) => id !== o.id) : [...condicion.valor, o.id];
                    aplicar();
                    pintar();
                  },
                },
                o.nombre,
              ),
            ),
          );
        }
        return el(
          "select",
          { class: "campo-input campo-input-peq cond-valor", "aria-label": "Valor", "data-rol": "valor", onchange: alEscribir("valor") },
          el("option", { value: "" }, "Elige…"),
          campo.opciones.map((o) => el("option", { value: o.id, selected: condicion.valor === o.id }, o.nombre)),
        );
      }
      const tipoInput = campo.tipo === "fecha" ? "date" : "text";
      const crearInput = (clave, etiqueta) =>
        el("input", {
          class: "campo-input campo-input-peq",
          type: tipoInput,
          value: condicion[clave] || "",
          inputmode: campo.tipo === "numero" ? "decimal" : null,
          placeholder: campo.tipo === "numero" ? "0" : "Escribe…",
          "aria-label": etiqueta,
          "data-rol": clave,
          oninput: alEscribir(clave),
        });
      if (op === "entre") return el("div", { class: "cond-valor cond-entre" }, crearInput("valor", "Desde"), el("span", {}, "y"), crearInput("valor2", "Hasta"));
      const input = crearInput("valor", "Valor");
      input.classList.add("cond-valor");
      return input;
    }

    pintar();
  });
}

// ---------- Orden (hasta 3 campos) ----------

const MAX_ORDEN = 3;
const textosDireccion = {
  numero: ["1 → 9", "9 → 1"],
  fecha: ["Más antigua primero", "Más reciente primero"],
  casilla: ["Sin marcar primero", "Marcadas primero"],
  seleccion: ["Orden de las opciones", "Orden inverso"],
};

export function abrirOrden(ancla, { base, tabla, vista }) {
  alternar("orden", () => {
    const contenido = el("div", { class: "panel-orden" });
    const control = abrirPanel(ancla, contenido, { tipo: "orden", clase: "panel-ancho" });

    function pintar() {
      const usados = new Set(vista.orden.map((r) => r.campoId));
      const libre = tabla.campos.find((c) => !usados.has(c.id));
      reemplazar(contenido, 
        cabecera("Ordenar", `Hasta ${MAX_ORDEN} campos, por orden de prioridad.`),
        vista.orden.length ? null : el("p", { class: "panel-vacio" }, "Sin orden: las filas salen en el orden en que se crearon."),
        ...vista.orden.map((regla, i) => {
          const campo = tabla.campos.find((c) => c.id === regla.campoId);
          const [asc, desc] = textosDireccion[campo?.tipo] || ["A → Z", "Z → A"];
          return el(
            "div",
            { class: "condicion" },
            el("span", { class: "cond-prefijo" }, i === 0 ? "Por" : "y luego"),
            el(
              "select",
              { class: "campo-input campo-input-peq", "aria-label": "Campo", "data-rol": "campo", onchange: (e) => ((regla.campoId = e.target.value), guardar(base), pintar()) },
              tabla.campos.filter((c) => c.id === regla.campoId || !usados.has(c.id)).map((c) => el("option", { value: c.id, selected: c.id === regla.campoId }, c.nombre)),
            ),
            el(
              "select",
              { class: "campo-input campo-input-peq", "aria-label": "Dirección", "data-rol": "direccion", onchange: (e) => ((regla.direccion = e.target.value), guardar(base)) },
              el("option", { value: "asc", selected: regla.direccion !== "desc" }, asc),
              el("option", { value: "desc", selected: regla.direccion === "desc" }, desc),
            ),
            el("button", {
              type: "button",
              class: "btn-icono",
              "aria-label": "Quitar orden",
              html: icono("cerrar"),
              onclick: () => {
                vista.orden.splice(i, 1);
                guardar(base);
                pintar();
              },
            }),
          );
        }),
        el(
          "div",
          { class: "panel-pie" },
          vista.orden.length < MAX_ORDEN && libre
            ? boton("Añadir orden", {
                icono: "mas",
                tipo: "suave",
                "data-accion": "anadir-orden",
                onclick: () => {
                  vista.orden.push({ campoId: libre.id, direccion: "asc" });
                  guardar(base);
                  pintar();
                },
              })
            : el("span", { class: "ayuda" }, `Máximo ${MAX_ORDEN} campos.`),
        ),
      );
      control.recolocar();
    }
    pintar();
  });
}

// ---------- Campos: ocultar, mostrar y reordenar ----------

export function abrirCampos(ancla, { base, tabla, vista }) {
  alternar("campos", () => {
    const contenido = el("div", { class: "panel-campos" });
    const control = abrirPanel(ancla, contenido, { tipo: "campos" });
    let arrastrado = null;

    const mover = (campo, destino) => {
      const i = tabla.campos.indexOf(campo);
      if (i <= 0 || destino <= 0 || destino >= tabla.campos.length || destino === i) return;
      tabla.campos.splice(i, 1);
      tabla.campos.splice(destino, 0, campo);
      guardar(base);
      pintar();
    };

    function pintar() {
      reemplazar(contenido, 
        cabecera("Campos", "Ocultar solo afecta a esta vista; el orden, a toda la tabla."),
        el(
          "ul",
          { class: "lista-campos" },
          tabla.campos.map((campo, i) => {
            const principal = i === 0;
            const visible = principal || !vista.ocultos.includes(campo.id);
            const item = el(
              "li",
              { class: `campo-item ${principal ? "principal" : ""}`, draggable: principal ? null : "true", "data-campo": campo.id },
              el("span", { class: "asa", html: principal ? "" : icono("arrastrar"), "aria-hidden": "true" }),
              el("span", { class: "campo-item-ico", html: icono(TIPOS[campo.tipo].icono) }),
              el("span", { class: "campo-item-nombre" }, campo.nombre, principal ? el("small", {}, " · principal") : null),
              principal ? null : el("button", { type: "button", class: "btn-icono btn-mini", "aria-label": `Subir ${campo.nombre}`, disabled: i <= 1, html: icono("asc", 14), onclick: () => mover(campo, i - 1) }),
              principal ? null : el("button", { type: "button", class: "btn-icono btn-mini", "aria-label": `Bajar ${campo.nombre}`, disabled: i >= tabla.campos.length - 1, html: icono("desc", 14), onclick: () => mover(campo, i + 1) }),
              el(
                "label",
                { class: "interruptor interruptor-peq", title: principal ? "El campo principal siempre se ve" : visible ? "Ocultar" : "Mostrar" },
                el("input", {
                  type: "checkbox",
                  checked: visible,
                  disabled: principal,
                  "aria-label": `Mostrar ${campo.nombre}`,
                  onchange: (e) => {
                    vista.ocultos = e.target.checked ? vista.ocultos.filter((id) => id !== campo.id) : [...vista.ocultos, campo.id];
                    guardar(base);
                  },
                }),
                el("span", { class: "interruptor-pista" }),
              ),
            );
            // Arrastrar para reordenar (con el ratón). En el móvil, las flechas.
            item.addEventListener("dragstart", (e) => {
              arrastrado = campo;
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", campo.id);
              item.classList.add("arrastrando");
            });
            item.addEventListener("dragend", () => item.classList.remove("arrastrando"));
            item.addEventListener("dragover", (e) => {
              if (!arrastrado || principal) return;
              e.preventDefault();
              item.classList.add("destino");
            });
            item.addEventListener("dragleave", () => item.classList.remove("destino"));
            item.addEventListener("drop", (e) => {
              e.preventDefault();
              item.classList.remove("destino");
              if (arrastrado) mover(arrastrado, tabla.campos.indexOf(campo));
              arrastrado = null;
            });
            return item;
          }),
        ),
        el(
          "div",
          { class: "panel-pie" },
          boton("Mostrar todos", { tipo: "suave", onclick: () => ((vista.ocultos = []), guardar(base), pintar()) }),
          boton("Ocultar todos", { tipo: "suave", onclick: () => ((vista.ocultos = tabla.campos.slice(1).map((c) => c.id)), guardar(base), pintar()) }),
          boton("Nuevo campo", { icono: "mas", tipo: "suave", onclick: () => (cerrarPanel(), abrirEditorCampo(base, tabla, null)) }),
        ),
      );
      control.recolocar();
    }
    pintar();
  });
}

// ---------- Desplegable de vistas ----------

export function abrirVistas(ancla, { base, tabla, vista, cambiarVista }) {
  alternar("vistas", () => {
    const contenido = el("div", { class: "panel-vistas" });
    abrirPanel(ancla, contenido, { tipo: "vistas" });

    const nombreLibre = (nombre) => {
      let candidato = nombre;
      for (let n = 2; tabla.vistas.some((v) => v.nombre === candidato); n++) candidato = `${nombre} ${n}`;
      return candidato;
    };

    async function crear(tipo) {
      cerrarPanel();
      const nombre = await pedirTexto({ titulo: `Nueva vista: ${TIPOS_VISTA[tipo].nombre}`, etiqueta: "Nombre de la vista", valor: nombreLibre(TIPOS_VISTA[tipo].nombre), aceptar: "Crear vista" });
      if (!nombre) return;
      const nueva = crearVista(tipo, nombre, tabla);
      // La vista nueva hereda qué campos estaban ocultos, para no empezar de cero.
      nueva.ocultos = [...vista.ocultos];
      tabla.vistas.push(nueva);
      cambiarVista(nueva);
    }

    async function renombrar(v) {
      cerrarPanel();
      const nombre = await pedirTexto({ titulo: "Renombrar vista", etiqueta: "Nombre", valor: v.nombre });
      if (!nombre) return;
      v.nombre = nombre;
      guardar(base);
    }

    async function borrar(v) {
      cerrarPanel();
      if (tabla.vistas.length === 1) return;
      const seguro = await confirmar({ titulo: `¿Borrar la vista «${v.nombre}»?`, mensaje: "Se borran sus filtros y su orden. Los datos de la tabla no se tocan.", aceptar: "Borrar vista", peligro: true });
      if (!seguro) return;
      tabla.vistas = tabla.vistas.filter((x) => x !== v);
      cambiarVista(tabla.vistas[0]);
    }

    contenido.append(
      cabecera(`Vistas de «${tabla.nombre}»`),
      el(
        "ul",
        { class: "lista-vistas" },
        tabla.vistas.map((v) =>
          el(
            "li",
            { class: `vista-item ${v === vista ? "activa" : ""}` },
            el(
              "button",
              { type: "button", class: "vista-item-abrir", "data-vista": v.id, onclick: () => (cerrarPanel(), cambiarVista(v)) },
              el("span", { class: `vista-ico vista-ico-${v.tipo}`, html: icono(TIPOS_VISTA[v.tipo].icono) }),
              el("span", { class: "vista-item-nombre" }, v.nombre),
              v === vista ? el("span", { class: "vista-check", html: icono("check") }) : null,
            ),
            el("button", { type: "button", class: "btn-icono btn-mini", "aria-label": `Renombrar ${v.nombre}`, html: icono("lapiz", 14), onclick: () => renombrar(v) }),
            el("button", { type: "button", class: "btn-icono btn-mini", "aria-label": `Borrar ${v.nombre}`, disabled: tabla.vistas.length === 1, html: icono("papelera", 14), onclick: () => borrar(v) }),
          ),
        ),
      ),
      el("div", { class: "panel-sub" }, "Crear una vista nueva"),
      el(
        "div",
        { class: "crear-vista" },
        Object.entries(TIPOS_VISTA).map(([tipo, info]) =>
          el("button", { type: "button", class: `crear-vista-btn vista-ico-${tipo}`, "data-crear-vista": tipo, onclick: () => crear(tipo) }, el("span", { html: icono(info.icono, 20) }), info.nombre),
        ),
      ),
    );
  });
}

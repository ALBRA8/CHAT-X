// Campos: la ventana para crear o editar un campo (nombre, tipo, formato y
// opciones) y las operaciones de mover, ocultar y borrar campos.

import { guardar } from "./almacen.js";
import { icono } from "./iconos.js";
import { convertirValor, crearCampo, crearOpcion, PASTELES, textoCelda, TIPOS } from "./modelo.js";
import { abrirDialogo, avisar, boton, confirmar } from "./ui.js";
import { clonar, el, formatearNumero } from "./util.js";

// Abre la ventana del campo. Si "campo" es null, crea uno nuevo.
//   opciones.foco: "nombre" o "tipo" (a qué parte saltar al abrir)
//   opciones.inicial: valores de partida para un campo nuevo
export function abrirEditorCampo(base, tabla, campo, { foco = "nombre", inicial = {}, alGuardar } = {}) {
  const esNuevo = !campo;
  const esPrincipal = campo && tabla.campos[0] === campo;
  // Trabajamos sobre un borrador: si se cancela, no se toca nada.
  const borrador = esNuevo
    ? { nombre: inicial.nombre || "", tipo: inicial.tipo || "texto", opciones: inicial.opciones || [], formato: { decimales: 0, moneda: false } }
    : { nombre: campo.nombre, tipo: campo.tipo, opciones: clonar(campo.opciones), formato: { ...campo.formato } };

  const inputNombre = el("input", { class: "campo-input", type: "text", value: borrador.nombre, placeholder: "Por ejemplo: Estado", "aria-label": "Nombre del campo" });
  inputNombre.addEventListener("input", () => (borrador.nombre = inputNombre.value));
  inputNombre.addEventListener("keydown", (e) => e.key === "Enter" && (e.preventDefault(), enviar()));

  const rejillaTipos = el("div", { class: "tipos-rejilla", role: "radiogroup", "aria-label": "Tipo de campo" });
  const zonaConfig = el("div", { class: "campo-config" });

  function pintarTipos() {
    rejillaTipos.replaceChildren(
      ...Object.entries(TIPOS).map(([clave, tipo]) =>
        el(
          "button",
          {
            type: "button",
            class: `tipo-opcion ${borrador.tipo === clave ? "elegido" : ""}`,
            role: "radio",
            "aria-checked": String(borrador.tipo === clave),
            "data-tipo": clave,
            onclick: () => {
              borrador.tipo = clave;
              if (clave === "seleccion" && !borrador.opciones.length && esNuevo) borrador.opciones.push(crearOpcion("", 0));
              pintarTipos();
              pintarConfig();
            },
          },
          el("span", { class: "tipo-ico", html: icono(tipo.icono, 18) }),
          el("span", { class: "tipo-textos" }, el("strong", {}, tipo.nombre), el("small", {}, tipo.ayuda)),
        ),
      ),
    );
  }

  function pintarConfig() {
    zonaConfig.replaceChildren();
    if (borrador.tipo === "numero") zonaConfig.append(configNumero(borrador));
    if (borrador.tipo === "seleccion") zonaConfig.append(configOpciones(borrador));
  }

  pintarTipos();
  pintarConfig();

  const { cerrar, dialogo } = abrirDialogo({
    titulo: esNuevo ? "Nuevo campo" : "Editar campo",
    subtitulo: esPrincipal ? "Es el campo principal: da nombre a cada fila." : null,
    clase: "dialogo-campo",
    contenido: [
      el("label", { class: "etiqueta" }, el("span", {}, "Nombre"), inputNombre),
      el("div", { class: "etiqueta" }, el("span", {}, "Tipo"), rejillaTipos),
      zonaConfig,
    ],
    acciones: [boton("Cancelar", { onclick: () => cerrar() }), boton(esNuevo ? "Crear campo" : "Guardar", { tipo: "primario", "data-accion": "aceptar", onclick: () => enviar() })],
  });

  if (foco === "tipo") rejillaTipos.querySelector(".elegido")?.focus();
  else {
    inputNombre.focus();
    inputNombre.select();
  }

  async function enviar() {
    borrador.nombre = inputNombre.value.trim();
    if (!borrador.nombre) {
      inputNombre.focus();
      inputNombre.classList.add("error");
      return;
    }
    if (tabla.campos.some((c) => c !== campo && c.nombre.toLowerCase() === borrador.nombre.toLowerCase())) {
      avisar(`Ya hay un campo llamado «${borrador.nombre}».`, { tipo: "error" });
      inputNombre.focus();
      return;
    }
    // Las opciones sin nombre no se guardan.
    borrador.opciones = borrador.opciones.filter((o) => o.nombre.trim()).map((o) => ({ ...o, nombre: o.nombre.trim() }));
    dialogo.inert = true; // Evita dobles clics mientras se pregunta algo.
    const hecho = esNuevo ? crearNuevo() : await aplicarCambios(base, tabla, campo, borrador);
    dialogo.inert = false;
    if (!hecho) return;
    cerrar();
    alGuardar?.(hecho);
  }

  function crearNuevo() {
    const nuevo = crearCampo(borrador.nombre, borrador.tipo, { opciones: borrador.opciones, formato: borrador.formato });
    tabla.campos.push(nuevo);
    guardar(base);
    return nuevo;
  }
}

// Formato de los números: decimales y símbolo €, con una vista previa.
function configNumero(borrador) {
  const muestra = el("span", { class: "muestra-numero" });
  const actualizar = () => {
    const t = formatearNumero(1234.5, borrador.formato.decimales);
    muestra.textContent = borrador.formato.moneda ? `${t} €` : t;
  };
  const decimales = el(
    "select",
    { class: "campo-input", "aria-label": "Decimales", onchange: (e) => ((borrador.formato.decimales = Number(e.target.value)), actualizar()) },
    [0, 1, 2, 3, 4].map((n) => el("option", { value: n, selected: borrador.formato.decimales === n }, n === 0 ? "Sin decimales (1.235)" : `${n} decimal${n > 1 ? "es" : ""}`)),
  );
  const moneda = el("input", { type: "checkbox", checked: borrador.formato.moneda, onchange: (e) => ((borrador.formato.moneda = e.target.checked), actualizar()) });
  actualizar();
  return el(
    "div",
    { class: "config-caja" },
    el("label", { class: "etiqueta" }, el("span", {}, "Decimales"), decimales),
    el("label", { class: "check-linea" }, moneda, el("span", {}, "Mostrar el símbolo €")),
    el("p", { class: "ayuda" }, "Así se verá: ", muestra),
  );
}

// Lista editable de opciones de un campo de selección, cada una con su color.
function configOpciones(borrador) {
  const lista = el("div", { class: "opciones-lista" });
  const pintar = () => {
    lista.replaceChildren(
      ...borrador.opciones.map((opcion, i) => {
        const paleta = el(
          "div",
          { class: "paleta-linea", hidden: true },
          PASTELES.map((p) =>
            el("button", {
              type: "button",
              class: `muestra-color ${opcion.color === p.color ? "elegido" : ""}`,
              style: { background: p.color },
              title: p.nombre,
              "aria-label": `Color ${p.nombre}`,
              onclick: () => {
                opcion.color = p.color;
                pintar();
              },
            }),
          ),
        );
        const input = el("input", { class: "campo-input", type: "text", value: opcion.nombre, placeholder: `Opción ${i + 1}`, "aria-label": `Nombre de la opción ${i + 1}` });
        input.addEventListener("input", () => (opcion.nombre = input.value));
        input.addEventListener("keydown", (e) => {
          // Intro en la última opción crea otra: así se escriben seguidas.
          if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            anadir();
          }
        });
        return el(
          "div",
          { class: "opcion-fila" },
          el(
            "div",
            { class: "opcion-linea" },
            el("button", { type: "button", class: "muestra-color", style: { background: opcion.color }, "aria-label": "Cambiar color", onclick: () => (paleta.hidden = !paleta.hidden) }),
            input,
            el("button", {
              type: "button",
              class: "btn-icono",
              "aria-label": "Quitar opción",
              html: icono("cerrar"),
              onclick: () => {
                borrador.opciones.splice(i, 1);
                pintar();
              },
            }),
          ),
          paleta,
        );
      }),
    );
  };
  const anadir = () => {
    borrador.opciones.push(crearOpcion("", borrador.opciones.length));
    pintar();
    lista.querySelector(".opcion-fila:last-child input")?.focus();
  };
  pintar();
  return el("div", { class: "config-caja" }, el("span", { class: "etiqueta-texto" }, "Opciones"), lista, boton("Añadir opción", { icono: "mas", tipo: "suave", onclick: anadir }));
}

// Guarda los cambios de un campo existente. Si cambia el tipo, convierte los
// valores y avisa antes de vaciar los que no se puedan convertir.
async function aplicarCambios(base, tabla, campo, borrador) {
  const cambios = new Map(); // idFila → valor nuevo
  const perdidos = [];

  if (borrador.tipo !== campo.tipo) {
    const destino = { ...borrador, opciones: clonar(borrador.opciones) };
    for (const fila of tabla.filas) {
      const { valor, perdido } = convertirValor(fila.valores[campo.id], campo, destino);
      cambios.set(fila.id, valor);
      if (perdido) perdidos.push(textoCelda(campo, fila.valores[campo.id]));
    }
    borrador.opciones = destino.opciones;
    if (perdidos.length) {
      const seguir = await confirmar({
        titulo: "Algunos valores no encajan",
        mensaje: `${perdidos.length} ${perdidos.length === 1 ? "valor no se puede convertir" : "valores no se pueden convertir"} a ${TIPOS[borrador.tipo].nombre} y se ${perdidos.length === 1 ? "vaciará" : "vaciarán"}.`,
        detalle: el("ul", { class: "lista-perdidos" }, perdidos.slice(0, 6).map((t) => el("li", {}, `«${t}»`)), perdidos.length > 6 ? el("li", {}, `y ${perdidos.length - 6} más…`) : null),
        aceptar: "Cambiar y vaciar",
        peligro: true,
      });
      if (!seguir) return false;
    }
  } else if (campo.tipo === "seleccion") {
    // ¿Se ha quitado alguna opción que estaba en uso?
    const quedan = new Set(borrador.opciones.map((o) => o.id));
    const afectadas = tabla.filas.filter((f) => f.valores[campo.id] && !quedan.has(f.valores[campo.id]));
    if (afectadas.length) {
      const seguir = await confirmar({
        titulo: "Quitar opciones en uso",
        mensaje: `${afectadas.length} ${afectadas.length === 1 ? "fila usa" : "filas usan"} una opción que vas a quitar. Ese valor quedará vacío.`,
        aceptar: "Quitar",
        peligro: true,
      });
      if (!seguir) return false;
      for (const fila of afectadas) cambios.set(fila.id, null);
    }
  }

  const tipoCambiado = borrador.tipo !== campo.tipo;
  for (const fila of tabla.filas) if (cambios.has(fila.id)) fila.valores[campo.id] = cambios.get(fila.id);
  Object.assign(campo, { nombre: borrador.nombre, tipo: borrador.tipo, opciones: borrador.opciones, formato: borrador.formato });

  // Las vistas que dependían del tipo antiguo se ajustan.
  const quedan = new Set(campo.opciones.map((o) => o.id));
  for (const vista of tabla.vistas) {
    if (tipoCambiado) vista.filtros.condiciones = vista.filtros.condiciones.filter((c) => c.campoId !== campo.id);
    else if (campo.tipo === "seleccion") {
      for (const c of vista.filtros.condiciones) {
        if (c.campoId !== campo.id) continue;
        if (Array.isArray(c.valor)) c.valor = c.valor.filter((id) => quedan.has(id));
        else if (c.valor && !quedan.has(c.valor)) c.valor = "";
      }
    }
    if (vista.agrupar === campo.id && campo.tipo !== "seleccion") vista.agrupar = tabla.campos.find((c) => c.tipo === "seleccion")?.id || null;
    if (vista.portada === campo.id && campo.tipo !== "url") vista.portada = tabla.campos.find((c) => c.tipo === "url")?.id || null;
    if (!vista.agrupar && campo.tipo === "seleccion") vista.agrupar = campo.id;
  }
  guardar(base);
  if (perdidos.length) avisar(`Campo convertido. ${perdidos.length} ${perdidos.length === 1 ? "valor vaciado" : "valores vaciados"}.`);
  return campo;
}

// ---------- Mover, ocultar y borrar ----------

// Mueve un campo a la izquierda (-1) o a la derecha (+1). El primero no se mueve.
export function moverCampo(base, tabla, campo, desplazamiento) {
  const i = tabla.campos.indexOf(campo);
  const j = i + desplazamiento;
  if (i <= 0 || j <= 0 || j >= tabla.campos.length) return;
  tabla.campos.splice(i, 1);
  tabla.campos.splice(j, 0, campo);
  guardar(base);
}

export function ocultarCampo(base, tabla, vista, campo) {
  if (tabla.campos[0] === campo) return;
  if (!vista.ocultos.includes(campo.id)) vista.ocultos.push(campo.id);
  guardar(base);
}

export async function borrarCampo(base, tabla, campo) {
  if (tabla.campos[0] === campo) {
    avisar("El primer campo da nombre a las filas y no se puede borrar.", { tipo: "error" });
    return false;
  }
  const seguro = await confirmar({
    titulo: `¿Borrar el campo «${campo.nombre}»?`,
    mensaje: "Se borrarán sus datos en todas las filas. No se puede deshacer.",
    aceptar: "Borrar campo",
    peligro: true,
  });
  if (!seguro) return false;
  tabla.campos = tabla.campos.filter((c) => c !== campo);
  for (const fila of tabla.filas) delete fila.valores[campo.id];
  for (const vista of tabla.vistas) {
    vista.ocultos = vista.ocultos.filter((id) => id !== campo.id);
    delete vista.anchos[campo.id];
    vista.filtros.condiciones = vista.filtros.condiciones.filter((c) => c.campoId !== campo.id);
    vista.orden = vista.orden.filter((r) => r.campoId !== campo.id);
    if (vista.agrupar === campo.id) vista.agrupar = tabla.campos.find((c) => c.tipo === "seleccion")?.id || null;
    if (vista.portada === campo.id) vista.portada = tabla.campos.find((c) => c.tipo === "url")?.id || null;
  }
  guardar(base);
  return true;
}

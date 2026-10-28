// Piezas de interfaz reutilizables: ventanas (diálogos), paneles que se
// abren bajo un botón, menús, confirmaciones y avisos flotantes.

import { el } from "./util.js";
import { icono } from "./iconos.js";

// ---------- Ventanas (usamos <dialog>, que ya trae Esc y fondo oscuro) ----------

export function abrirDialogo({ titulo, subtitulo, contenido, acciones = [], clase = "", alCerrar } = {}) {
  const botonCerrar = el("button", { class: "btn-icono", type: "button", "aria-label": "Cerrar", html: icono("cerrar", 18) });
  const dialogo = el(
    "dialog",
    { class: `dialogo ${clase}`, "aria-label": titulo },
    el(
      "div",
      { class: "dialogo-caja" },
      el("header", { class: "dialogo-cab" }, el("div", {}, el("h2", {}, titulo), subtitulo ? el("p", { class: "dialogo-sub" }, subtitulo) : null), botonCerrar),
      el("div", { class: "dialogo-cuerpo" }, contenido),
      acciones.length ? el("footer", { class: "dialogo-pie" }, acciones) : null,
    ),
  );
  let cerrado = false;
  // Antes de cerrar, quitamos el foco del campo activo: así su evento
  // "change" llega y no se pierde lo último que se escribió.
  const soltarFoco = () => {
    if (dialogo.contains(document.activeElement)) document.activeElement.blur();
  };
  dialogo.addEventListener("cancel", soltarFoco);
  const cerrar = () => {
    if (cerrado) return;
    cerrado = true;
    soltarFoco();
    if (dialogo.open) dialogo.close();
    dialogo.remove();
    alCerrar?.();
  };
  botonCerrar.addEventListener("click", cerrar);
  dialogo.addEventListener("close", cerrar);
  // Clic en el fondo oscuro (fuera de la caja) = cerrar.
  dialogo.addEventListener("mousedown", (e) => {
    if (e.target === dialogo) cerrar();
  });
  document.body.append(dialogo);
  dialogo.showModal();
  return { dialogo, cerrar };
}

export function boton(texto, { tipo = "secundario", icono: nombreIcono, onclick, ...resto } = {}) {
  return el("button", { class: `btn btn-${tipo}`, type: "button", onclick, ...resto }, nombreIcono ? el("span", { html: icono(nombreIcono) }) : null, el("span", { class: "btn-texto" }, texto));
}

// Pregunta "¿Seguro?" y devuelve true o false.
export function confirmar({ titulo, mensaje, aceptar = "Aceptar", peligro = false, detalle }) {
  return new Promise((resolver) => {
    let respuesta = false;
    const { cerrar } = abrirDialogo({
      titulo,
      clase: "dialogo-peq",
      contenido: [el("p", {}, mensaje), detalle || null],
      acciones: [
        boton("Cancelar", { onclick: () => cerrar() }),
        boton(aceptar, {
          tipo: peligro ? "peligro" : "primario",
          "data-accion": "aceptar",
          onclick: () => {
            respuesta = true;
            cerrar();
          },
        }),
      ],
      alCerrar: () => resolver(respuesta),
    });
  });
}

// Pide un texto (por ejemplo, un nombre). Devuelve el texto o null si se cancela.
export function pedirTexto({ titulo, etiqueta, valor = "", aceptar = "Guardar", placeholder = "" }) {
  return new Promise((resolver) => {
    let respuesta = null;
    const input = el("input", { class: "campo-input", type: "text", value: valor, placeholder, "aria-label": etiqueta || titulo });
    const enviar = () => {
      if (!input.value.trim()) return input.focus();
      respuesta = input.value.trim();
      cerrar();
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        enviar();
      }
    });
    const { cerrar } = abrirDialogo({
      titulo,
      clase: "dialogo-peq",
      contenido: el("label", { class: "etiqueta" }, etiqueta ? el("span", {}, etiqueta) : null, input),
      acciones: [boton("Cancelar", { onclick: () => cerrar() }), boton(aceptar, { tipo: "primario", "data-accion": "aceptar", onclick: enviar })],
      alCerrar: () => resolver(respuesta),
    });
    input.focus();
    input.select();
  });
}

// ---------- Paneles flotantes bajo un botón (filtros, orden, menús…) ----------

let panelAbierto = null;

export function cerrarPanel() {
  panelAbierto?.cerrar();
}

// ¿Está abierto ahora mismo el panel de este tipo? (para que el botón lo abra y lo cierre)
export const panelAbiertoEs = (tipo) => Boolean(tipo) && panelAbierto?.tipo === tipo;

export function abrirPanel(ancla, contenido, { clase = "", alCerrar, tipo = "" } = {}) {
  cerrarPanel();
  const movil = window.innerWidth < 640;
  const panel = el("div", { class: `panel ${clase} ${movil ? "panel-hoja" : ""}`, role: "dialog" }, contenido);
  const fondo = movil ? el("div", { class: "panel-fondo" }) : null;
  // Si hay una ventana abierta, el panel va dentro de ella para quedar por encima.
  const contenedor = [...document.querySelectorAll("dialog[open]")].pop() || document.body;
  if (fondo) contenedor.append(fondo);
  contenedor.append(panel);

  // Coloca el panel justo debajo del botón, sin salirse de la pantalla.
  const recolocar = () => {
    if (movil || !ancla.isConnected) return;
    const r = ancla.getBoundingClientRect();
    const ancho = panel.offsetWidth;
    panel.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - ancho - 8))}px`;
    panel.style.top = `${r.bottom + 6}px`;
    panel.style.maxHeight = `${window.innerHeight - r.bottom - 20}px`;
  };
  recolocar();

  const fuera = (e) => {
    // Los clics dentro de otra ventana abierta (por ejemplo, una confirmación) no cuentan.
    // El fondo oscuro del móvil cierra con su propio "click" (ver más abajo).
    if (panel.contains(e.target) || ancla.contains(e.target) || e.target === fondo) return;
    // El botón que abre este panel se encarga él mismo de cerrarlo.
    if (tipo && e.target.closest?.(`[data-abre="${tipo}"]`)) return;
    const ventana = e.target.closest?.("dialog[open]");
    if (ventana && !ventana.contains(panel)) return;
    cerrar();
  };
  const tecla = (e) => {
    if (e.key === "Escape" && !document.querySelector("dialog[open]")) {
      e.stopPropagation();
      cerrar();
      ancla.focus?.();
    }
  };
  // En el móvil, tocar el fondo cierra el panel en el "click" y no antes: si
  // lo quitáramos al empezar el toque, el clic caería sobre el botón de debajo.
  fondo?.addEventListener("click", () => cerrar());
  // Se activa un instante después para que el propio clic que abre no lo cierre.
  setTimeout(() => document.addEventListener("pointerdown", fuera, true));
  document.addEventListener("keydown", tecla, true);

  const cerrar = () => {
    if (panelAbierto !== control) return;
    panelAbierto = null;
    document.removeEventListener("pointerdown", fuera, true);
    document.removeEventListener("keydown", tecla, true);
    panel.remove();
    fondo?.remove();
    alCerrar?.();
  };
  const control = { panel, cerrar, recolocar, ancla, tipo };
  panelAbierto = control;
  return control;
}

// Menú sencillo: lista de opciones bajo un botón.
//   elementos: [{ texto, icono, accion, peligro, deshabilitado }, "-" (separador)]
export function abrirMenu(ancla, elementos, { titulo, tipo } = {}) {
  // Pulsar otra vez el botón de un menú abierto lo cierra.
  if (panelAbiertoEs(tipo)) return cerrarPanel();
  const lista = el("div", { class: "menu-lista", role: "menu" });
  if (titulo) lista.append(el("div", { class: "menu-titulo" }, titulo));
  for (const item of elementos) {
    if (!item) continue;
    if (item === "-") {
      lista.append(el("hr", { class: "menu-sep" }));
      continue;
    }
    lista.append(
      el(
        "button",
        {
          class: `menu-item ${item.peligro ? "peligro" : ""} ${item.activo ? "activo" : ""}`,
          type: "button",
          role: "menuitem",
          disabled: item.deshabilitado,
          title: item.ayuda,
          onclick: () => {
            control.cerrar();
            item.accion();
          },
        },
        item.icono ? el("span", { class: "menu-ico", html: item.icono.startsWith("<") ? item.icono : icono(item.icono) }) : null,
        el("span", { class: "menu-texto" }, item.texto),
        item.extra ? el("span", { class: "menu-extra" }, item.extra) : null,
      ),
    );
  }
  // Flechas arriba y abajo para moverse por el menú con el teclado.
  lista.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = [...lista.querySelectorAll(".menu-item:not(:disabled)")];
    const i = items.indexOf(document.activeElement);
    items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
  });
  const control = abrirPanel(ancla, lista, { clase: "menu", tipo });
  lista.querySelector(".menu-item:not(:disabled)")?.focus({ preventScroll: true });
  return control;
}

// ---------- Avisos flotantes ("Fila borrada · Deshacer") ----------

let zonaAvisos = null;

export function avisar(mensaje, { accion, tipo = "info", duracion = 4500 } = {}) {
  if (!zonaAvisos) {
    // "popover" coloca los avisos en la capa superior, por encima incluso de las ventanas.
    zonaAvisos = el("div", { class: "avisos", role: "status", "aria-live": "polite", popover: "manual" });
    document.body.append(zonaAvisos);
  }
  try {
    if (zonaAvisos.matches(":popover-open")) zonaAvisos.hidePopover();
    zonaAvisos.showPopover();
  } catch {
    /* Navegadores sin popover: los avisos se ven igual, solo que por debajo de las ventanas. */
  }
  const aviso = el(
    "div",
    { class: `aviso aviso-${tipo}` },
    el("span", { html: icono(tipo === "error" ? "aviso" : "check") }),
    el("span", { class: "aviso-texto" }, mensaje),
  );
  const quitar = () => {
    aviso.classList.add("saliendo");
    setTimeout(() => aviso.remove(), 200);
  };
  if (accion) {
    aviso.append(
      el("button", {
        class: "aviso-accion",
        type: "button",
        onclick: () => {
          accion.fn();
          quitar();
        },
      }, accion.texto),
    );
  }
  zonaAvisos.append(aviso);
  setTimeout(quitar, duracion);
}

// Operaciones con bases enteras: crear, personalizar (nombre, emoji y color),
// duplicar, borrar y la copia de seguridad en .json.

import { borrarBase, guardar } from "./almacen.js";
import { crearBase, normalizarBase, PASTELES } from "./modelo.js";
import { abrirDialogo, avisar, boton, confirmar } from "./ui.js";
import { clonar, descargar, el, elegirArchivo, hoyIso, nuevoId, slug } from "./util.js";

const EMOJIS = ["🗂️", "🛍️", "📦", "👥", "🧾", "📅", "🎨", "📚", "☕", "🍰", "🌿", "🏠", "🚚", "💼", "📈", "🎬", "📝", "🧴", "🐾", "🎵", "🏋️", "🍷", "✂️", "💡"];

// Colores para las bases: los pastel de la app más el verde salvia claro.
const COLORES_BASE = [...PASTELES, { color: "#CBE3D7", nombre: "Salvia" }];

// Ventana para elegir nombre, emoji y color. Devuelve los datos o null.
function dialogoBase({ titulo, aceptar, inicial = {} }) {
  return new Promise((resolver) => {
    const datos = { nombre: inicial.nombre || "", emoji: inicial.emoji || EMOJIS[1], color: inicial.color || COLORES_BASE[7].color };
    let respuesta = null;
    const vista = el("div", { class: "base-previa" });
    const input = el("input", { class: "campo-input", type: "text", value: datos.nombre, placeholder: "Por ejemplo: Tienda", "aria-label": "Nombre de la base" });
    const emojis = el("div", { class: "rejilla-emojis", role: "radiogroup", "aria-label": "Emoji" });
    const colores = el("div", { class: "rejilla-colores", role: "radiogroup", "aria-label": "Color" });

    const pintar = () => {
      vista.style.background = datos.color;
      vista.replaceChildren(el("span", { class: "base-previa-emoji" }, datos.emoji), el("strong", {}, datos.nombre.trim() || "Tu base"));
      emojis.replaceChildren(
        ...EMOJIS.map((e) => el("button", { type: "button", class: `emoji-btn ${e === datos.emoji ? "elegido" : ""}`, role: "radio", "aria-checked": String(e === datos.emoji), "aria-label": `Emoji ${e}`, onclick: () => ((datos.emoji = e), pintar()) }, e)),
      );
      colores.replaceChildren(
        ...COLORES_BASE.map((c) =>
          el("button", { type: "button", class: `muestra-color grande ${c.color === datos.color ? "elegido" : ""}`, role: "radio", "aria-checked": String(c.color === datos.color), "aria-label": `Color ${c.nombre}`, title: c.nombre, style: { background: c.color }, onclick: () => ((datos.color = c.color), pintar()) }),
        ),
      );
    };
    input.addEventListener("input", () => {
      datos.nombre = input.value;
      vista.querySelector("strong").textContent = datos.nombre.trim() || "Tu base";
    });
    const enviar = () => {
      if (!input.value.trim()) {
        input.classList.add("error");
        return input.focus();
      }
      respuesta = { ...datos, nombre: input.value.trim() };
      cerrar();
    };
    input.addEventListener("keydown", (e) => e.key === "Enter" && (e.preventDefault(), enviar()));
    pintar();
    const { cerrar } = abrirDialogo({
      titulo,
      clase: "dialogo-base",
      contenido: [
        vista,
        el("label", { class: "etiqueta" }, el("span", {}, "Nombre"), input),
        el("div", { class: "etiqueta" }, el("span", {}, "Emoji"), emojis),
        el("div", { class: "etiqueta" }, el("span", {}, "Color"), colores),
      ],
      acciones: [boton("Cancelar", { onclick: () => cerrar() }), boton(aceptar, { tipo: "primario", "data-accion": "aceptar", onclick: enviar })],
      alCerrar: () => resolver(respuesta),
    });
    input.focus();
  });
}

export async function nuevaBaseVacia() {
  const datos = await dialogoBase({ titulo: "Nueva base", aceptar: "Crear base" });
  if (!datos) return null;
  const base = crearBase(datos);
  guardar(base, { silencioso: true });
  return base;
}

export async function personalizarBase(base) {
  const datos = await dialogoBase({ titulo: "Personalizar base", aceptar: "Guardar", inicial: base });
  if (!datos) return;
  Object.assign(base, datos);
  guardar(base);
}

export function duplicarBase(base) {
  // Las tablas, campos y filas pueden conservar sus id: solo tienen que ser únicos dentro de cada base.
  const copia = clonar(base);
  copia.id = nuevoId("b");
  copia.nombre = `${base.nombre} (copia)`;
  copia.creada = Date.now();
  guardar(copia);
  avisar(`Base duplicada: «${copia.nombre}»`);
  return copia;
}

export async function borrarBaseConfirmando(base) {
  const seguro = await confirmar({
    titulo: `¿Borrar «${base.nombre}»?`,
    mensaje: `Se borrarán sus ${base.tablas.length} ${base.tablas.length === 1 ? "tabla" : "tablas"} con todas sus filas. No se puede deshacer. Si quieres conservarla, exporta antes una copia .json.`,
    aceptar: "Borrar base",
    peligro: true,
  });
  if (!seguro) return false;
  await borrarBase(base.id);
  avisar(`Base «${base.nombre}» borrada`);
  return true;
}

// ---------- Copia de seguridad en .json ----------

export function exportarBase(base) {
  const datos = { app: "Celda", formato: 1, exportada: new Date().toISOString(), base };
  const nombre = `${slug(base.nombre)}-${hoyIso()}.json`;
  descargar(nombre, JSON.stringify(datos, null, 2), "application/json");
  avisar(`Copia descargada: ${nombre}`);
}

export async function importarBase() {
  const archivo = await elegirArchivo(".json,application/json");
  if (!archivo) return null;
  let datos;
  try {
    datos = JSON.parse(await archivo.text());
  } catch {
    avisar("Ese archivo no es un .json válido.", { tipo: "error" });
    return null;
  }
  // Aceptamos tanto la copia de Celda ({ app, base }) como una base suelta.
  const base = datos?.base ?? datos;
  if (!base || typeof base !== "object" || !Array.isArray(base.tablas)) {
    avisar("Ese .json no parece una copia de una base de Celda.", { tipo: "error" });
    return null;
  }
  normalizarBase(base);
  base.id = nuevoId("b"); // id nuevo: así importar dos veces no pisa la base que ya tienes
  guardar(base);
  avisar(`Base «${base.nombre}» importada`);
  return base;
}

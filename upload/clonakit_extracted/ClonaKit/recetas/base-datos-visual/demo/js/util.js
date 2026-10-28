// Utilidades pequeñas que usan todos los módulos: crear HTML, formatear
// números y fechas al estilo español, descargar archivos…

// Crea un elemento HTML de forma cómoda:
//   el("button", { class: "btn", onclick: fn }, "Guardar")
// Los textos se añaden como texto (nunca como HTML) para que nadie pueda
// colar código a través de los datos de una tabla o de un CSV.
export function el(etiqueta, atributos = {}, ...hijos) {
  const nodo = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(atributos || {})) {
    if (valor === undefined || valor === null || valor === false) continue;
    if (clave.startsWith("on") && typeof valor === "function") {
      nodo.addEventListener(clave.slice(2), valor);
    } else if (clave === "class") {
      nodo.className = valor;
    } else if (clave === "style" && typeof valor === "object") {
      // setProperty sirve también para variables CSS como "--color-base".
      for (const [propiedad, v] of Object.entries(valor)) {
        if (propiedad.startsWith("--")) nodo.style.setProperty(propiedad, v);
        else nodo.style[propiedad] = v;
      }
    } else if (clave === "html") {
      // Solo para iconos SVG escritos por nosotros, nunca para datos del usuario.
      nodo.innerHTML = valor;
    } else if (clave in nodo && typeof valor !== "string") {
      nodo[clave] = valor;
    } else {
      nodo.setAttribute(clave, valor === true ? "" : valor);
    }
  }
  anadirHijos(nodo, hijos);
  return nodo;
}

// Cambia todo el contenido de un nodo. A diferencia de replaceChildren,
// ignora los huecos (null o false) en lugar de escribir "null".
export function reemplazar(nodo, ...hijos) {
  nodo.replaceChildren();
  anadirHijos(nodo, hijos);
}

function anadirHijos(nodo, hijos) {
  for (const hijo of hijos.flat(Infinity)) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    nodo.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
}

// Identificadores cortos y únicos para bases, tablas, campos, filas y vistas.
export function nuevoId(prefijo = "") {
  return prefijo + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 8);
}

// Copia profunda de un objeto de datos (sin funciones).
export const clonar = (dato) => structuredClone(dato);

// Pasa a minúsculas y quita tildes: así "Lucía" se encuentra buscando "lucia".
export function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// "Clientes y pedidos" → "clientes-y-pedidos" (para nombres de archivo).
export function slug(texto) {
  return normalizar(texto).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "celda";
}

// ---------- Números al estilo español: 1.234,50 ----------

// Formatea a mano para que los miles lleven siempre punto
// (Intl en español no pone el punto en números de 4 cifras como 1234).
export function formatearNumero(numero, decimales = 0) {
  if (typeof numero !== "number" || !Number.isFinite(numero)) return "";
  const negativo = numero < 0;
  const [entera, fraccion] = Math.abs(numero).toFixed(decimales).split(".");
  const conMiles = entera.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (negativo ? "-" : "") + conMiles + (fraccion ? "," + fraccion : "");
}

// Entiende "1.234,50", "1234,5", "1,234.50", "1234.5", "12 €"… y devuelve
// un número, o null si el texto no es un número.
export function leerNumero(texto) {
  if (typeof texto === "number") return Number.isFinite(texto) ? texto : null;
  let s = String(texto ?? "").replace(/[€\s ]/g, "");
  if (s === "") return null;
  let signo = 1;
  if (s.startsWith("-")) { signo = -1; s = s.slice(1); } else if (s.startsWith("+")) s = s.slice(1);
  let valor = null;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) valor = Number(s.replace(/\./g, "").replace(",", ".")); // 1.234,50
  else if (/^\d+(,\d+)?$/.test(s)) valor = Number(s.replace(",", ".")); // 1234,5
  else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) valor = Number(s.replace(/,/g, "")); // 1,234.50
  else if (/^\d*\.\d+$|^\d+\.?$/.test(s)) valor = Number(s); // 1234.5
  return valor === null || Number.isNaN(valor) ? null : signo * valor;
}

// Cuántos decimales tiene un número escrito como texto ("12,50" → 2).
export function decimalesDe(texto) {
  const s = String(texto ?? "").replace(/[€\s ]/g, "");
  const m = s.match(/[.,](\d+)$/);
  if (!m) return 0;
  // "1.234" en español son miles, no decimales.
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) return 0;
  return m[1].length;
}

// ---------- Fechas: se guardan como "AAAA-MM-DD" y se ven como 13/10/2026 ----------

export function formatearFecha(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

// Entiende "13/10/2026", "13-10-26", "2026-10-13"… Devuelve "AAAA-MM-DD" o null.
export function leerFecha(texto) {
  const s = String(texto ?? "").trim();
  if (!s) return null;
  let dia, mes, anio;
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T ].*)?$/.exec(s);
  if (m) [anio, mes, dia] = [m[1], m[2], m[3]].map(Number);
  else {
    m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/.exec(s);
    if (!m) return null;
    [dia, mes, anio] = [m[1], m[2], m[3]].map(Number);
    if (m[3].length === 2) anio += anio < 70 ? 2000 : 1900;
  }
  // Comprobamos que la fecha existe (no vale el 31/02).
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (fecha.getUTCFullYear() !== anio || fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) return null;
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

// La fecha de hoy en formato "AAAA-MM-DD" (hora local, no UTC).
export function hoyIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// "Editada hoy a las 20:15" o "Editada el 12/10/2026".
export function haceCuanto(marca) {
  const d = new Date(marca);
  const hoy = new Date();
  const hora = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (d.toDateString() === hoy.toDateString()) return `hoy a las ${hora}`;
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);
  if (d.toDateString() === ayer.toDateString()) return `ayer a las ${hora}`;
  return `el ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// "1 fila" / "3 filas"
export const plural = (n, singular, pluralTexto = singular + "s") => `${formatearNumero(n)} ${n === 1 ? singular : pluralTexto}`;

// ---------- Archivos ----------

// Descarga un texto como archivo sin servidor: se crea un Blob y un enlace temporal.
export function descargar(nombre, contenido, tipo) {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const enlace = el("a", { href: url, download: nombre });
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Abre el selector de archivos del sistema y devuelve el archivo elegido (o null).
export function elegirArchivo(aceptar) {
  return new Promise((resolver) => {
    const input = el("input", { type: "file", accept: aceptar, class: "oculto-visual" });
    input.addEventListener("change", () => {
      resolver(input.files[0] || null);
      input.remove();
    });
    input.addEventListener("cancel", () => {
      resolver(null);
      input.remove();
    });
    document.body.append(input);
    input.click();
  });
}

// Solo dejamos enlazar direcciones web normales (http/https), nunca "javascript:".
export function urlSegura(texto) {
  const s = String(texto ?? "").trim();
  return /^https?:\/\//i.test(s) ? s : null;
}

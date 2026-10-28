// Vista galería: tarjetas con una imagen de portada (sacada de un campo URL
// que apunte a una imagen), el nombre y hasta 3 campos más.

import { guardar } from "./almacen.js";
import { icono } from "./iconos.js";
import { nombreFila } from "./modelo.js";
import { el, urlSegura } from "./util.js";
import { detalleTarjeta } from "./vista-tablero.js";

// ctx = { base, tabla, vista, filas, campos, abrirFicha, nuevaFila, filtrada }
export function pintarGaleria(contenedor, ctx) {
  const { base, tabla, vista, filas, campos } = ctx;
  const portada = tabla.campos.find((c) => c.id === vista.portada && c.tipo === "url") || null;
  const camposTarjeta = campos.slice(1).filter((c) => c !== portada).slice(0, 3);

  const tarjetas = filas.map((fila) => {
    const nombre = nombreFila(tabla, fila);
    const tarjeta = el(
      "article",
      { class: "tarjeta-galeria", tabindex: "0", "data-fila": fila.id, "aria-label": nombre || "Fila sin nombre" },
      cabeceraImagen(portada ? urlSegura(fila.valores[portada.id]) : null, nombre),
      el("div", { class: "galeria-cuerpo" }, el("h3", { class: "tarjeta-titulo" }, nombre || el("span", { class: "sin-nombre" }, "Sin nombre")), detalleTarjeta(camposTarjeta, fila)),
    );
    tarjeta.addEventListener("click", () => ctx.abrirFicha(fila));
    tarjeta.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault(); // evita que el mismo Intro cierre la ficha recién abierta
      ctx.abrirFicha(fila);
    });
    return tarjeta;
  });

  const anadir = el(
    "button",
    {
      type: "button",
      class: "tarjeta-galeria galeria-anadir",
      "data-accion": "nueva-fila",
      onclick: () => {
        const fila = ctx.nuevaFila();
        guardar(base);
        ctx.abrirFicha(fila);
      },
    },
    el("span", { html: icono("mas", 22) }),
    "Nueva fila",
  );

  contenedor.replaceChildren(
    el(
      "div",
      { class: "galeria-zona desplazable" },
      filas.length || !ctx.filtrada ? null : el("p", { class: "aviso-vacio" }, "Ninguna fila coincide con los filtros o la búsqueda."),
      el("div", { class: "galeria" }, tarjetas, anadir),
    ),
  );
}

// ¿Apunta esta URL a una imagen? Miramos la extensión del archivo o si viene
// de un servicio de imágenes conocido. Así no pedimos como imagen una página
// web normal (por ejemplo, un enlace de seguimiento), que daría error.
const EXTENSIONES = /\.(jpe?g|png|gif|webp|avif|svg|bmp)$/i;
const SERVICIOS = /(^|\.)(images\.unsplash\.com|images\.pexels\.com|i\.imgur\.com|res\.cloudinary\.com|cdn\.shopify\.com|googleusercontent\.com|picsum\.photos)$/i;
function pareceImagen(url) {
  try {
    const { hostname, pathname } = new URL(url);
    return EXTENSIONES.test(pathname) || SERVICIOS.test(hostname);
  } catch {
    return false;
  }
}

// La portada: la imagen si hay una URL de imagen; si no (o si no carga), la
// inicial del nombre sobre el color de acento.
function cabeceraImagen(url, nombre) {
  const inicial = el("div", { class: "portada portada-inicial", "aria-hidden": "true" }, (nombre.trim()[0] || "?").toUpperCase());
  if (!url || !pareceImagen(url)) return inicial;
  const imagen = el("img", { src: url, alt: "", loading: "lazy", decoding: "async" });
  const caja = el("div", { class: "portada" }, imagen);
  imagen.addEventListener("error", () => caja.replaceWith(inicial));
  return caja;
}

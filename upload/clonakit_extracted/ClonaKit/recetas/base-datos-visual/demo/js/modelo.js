// Modelo de datos de Celda: cómo es una base, una tabla, un campo, una fila
// y una vista, y cómo se convierten los valores entre tipos de campo.
//
//   base  = { id, nombre, emoji, color, tablas: [tabla], tablaActiva }
//   tabla = { id, nombre, campos: [campo], filas: [fila], vistas: [vista], vistaActiva }
//   campo = { id, nombre, tipo, opciones: [{id, nombre, color}], formato: {decimales, moneda} }
//   fila  = { id, valores: { idDeCampo: valor } }
//   vista = { id, nombre, tipo, filtros, orden, ocultos, anchos, agrupar, portada }

import {
  formatearFecha, formatearNumero, leerFecha, leerNumero, normalizar, nuevoId, urlSegura,
} from "./util.js";

// Los seis tipos de campo. "icono" es el nombre del dibujo en iconos.js.
export const TIPOS = {
  texto: { nombre: "Texto", icono: "texto", ayuda: "Nombres, notas, teléfonos…" },
  numero: { nombre: "Número", icono: "numero", ayuda: "Cantidades e importes, con decimales y €" },
  fecha: { nombre: "Fecha", icono: "fecha", ayuda: "Un día del calendario" },
  casilla: { nombre: "Casilla", icono: "casilla", ayuda: "Sí o no, con un clic" },
  seleccion: { nombre: "Selección", icono: "seleccion", ayuda: "Una opción de una lista con colores" },
  url: { nombre: "URL", icono: "url", ayuda: "Enlaces a webs o a imágenes" },
};

export const TIPOS_VISTA = {
  cuadricula: { nombre: "Cuadrícula", icono: "cuadricula" },
  tablero: { nombre: "Tablero", icono: "tablero" },
  galeria: { nombre: "Galería", icono: "galeria" },
};

// Tonos pastel propios para las opciones de selección (y para las bases).
export const PASTELES = [
  { color: "#F6D8CF", nombre: "Coral" },
  { color: "#F9E7B7", nombre: "Miel" },
  { color: "#D7EBD2", nombre: "Menta" },
  { color: "#CFE3EE", nombre: "Cielo" },
  { color: "#E6DDF1", nombre: "Lavanda" },
  { color: "#EFE3D3", nombre: "Arena" },
  { color: "#DDE1E6", nombre: "Niebla" },
];
const colorPastel = (i) => PASTELES[i % PASTELES.length].color;

// ---------- Crear piezas nuevas ----------

export function crearCampo(nombre, tipo = "texto", extra = {}) {
  return {
    id: nuevoId("c"),
    nombre,
    tipo,
    opciones: [],
    formato: { decimales: 0, moneda: false },
    ...extra,
  };
}

export function crearOpcion(nombre, indice) {
  return { id: nuevoId("o"), nombre, color: colorPastel(indice) };
}

export function crearVista(tipo, nombre, tabla) {
  const vista = {
    id: nuevoId("v"),
    nombre: nombre || TIPOS_VISTA[tipo].nombre,
    tipo,
    filtros: { modo: "todas", condiciones: [] },
    orden: [],
    ocultos: [],
    anchos: {},
    agrupar: null,
    portada: null,
  };
  // Valores razonables: el tablero agrupa por la primera selección y la
  // galería toma la portada del primer campo URL.
  if (tabla) {
    vista.agrupar = tabla.campos.find((c) => c.tipo === "seleccion")?.id || null;
    vista.portada = tabla.campos.find((c) => c.tipo === "url")?.id || null;
  }
  return vista;
}

export function crearTabla(nombre, campos) {
  const tabla = {
    id: nuevoId("t"),
    nombre,
    campos: campos || [crearCampo("Nombre", "texto"), crearCampo("Notas", "texto")],
    filas: [],
    vistas: [],
  };
  const vista = crearVista("cuadricula", "Cuadrícula", tabla);
  tabla.vistas.push(vista);
  tabla.vistaActiva = vista.id;
  return tabla;
}

export function crearFila(valores = {}) {
  return { id: nuevoId("f"), valores: { ...valores }, creada: Date.now() };
}

export function crearBase({ nombre, emoji = "🗂️", color = PASTELES[2].color }) {
  const tabla = crearTabla("Tabla 1");
  // Tres filas vacías para que se vea por dónde empezar a escribir.
  for (let i = 0; i < 3; i++) tabla.filas.push(crearFila());
  return {
    id: nuevoId("b"),
    nombre,
    emoji,
    color,
    creada: Date.now(),
    modificada: Date.now(),
    tablas: [tabla],
    tablaActiva: tabla.id,
  };
}

// Repara datos antiguos o importados para que siempre tengan todas las piezas.
export function normalizarBase(base) {
  base.id ||= nuevoId("b");
  base.nombre ||= "Sin nombre";
  base.emoji ||= "🗂️";
  base.color ||= PASTELES[2].color;
  base.creada ||= Date.now();
  base.modificada ||= Date.now();
  base.tablas = Array.isArray(base.tablas) ? base.tablas : [];
  if (!base.tablas.length) base.tablas.push(crearTabla("Tabla 1"));
  for (const tabla of base.tablas) {
    tabla.id ||= nuevoId("t");
    tabla.nombre ||= "Tabla";
    tabla.campos = Array.isArray(tabla.campos) && tabla.campos.length ? tabla.campos : [crearCampo("Nombre")];
    for (const campo of tabla.campos) {
      campo.id ||= nuevoId("c");
      if (!TIPOS[campo.tipo]) campo.tipo = "texto";
      campo.opciones = Array.isArray(campo.opciones) ? campo.opciones : [];
      campo.formato = { decimales: 0, moneda: false, ...(campo.formato || {}) };
    }
    tabla.filas = (Array.isArray(tabla.filas) ? tabla.filas : []).map((f) => ({ id: f.id || nuevoId("f"), valores: f.valores || {}, creada: f.creada || Date.now() }));
    tabla.vistas = Array.isArray(tabla.vistas) ? tabla.vistas : [];
    if (!tabla.vistas.length) tabla.vistas.push(crearVista("cuadricula", "Cuadrícula", tabla));
    for (const vista of tabla.vistas) {
      const limpia = crearVista(TIPOS_VISTA[vista.tipo] ? vista.tipo : "cuadricula", vista.nombre);
      Object.assign(vista, { ...limpia, ...vista, filtros: { ...limpia.filtros, ...(vista.filtros || {}) } });
    }
    if (!tabla.vistas.some((v) => v.id === tabla.vistaActiva)) tabla.vistaActiva = tabla.vistas[0].id;
  }
  if (!base.tablas.some((t) => t.id === base.tablaActiva)) base.tablaActiva = base.tablas[0].id;
  return base;
}

// ---------- Leer y mostrar valores ----------

const campoPrincipal = (tabla) => tabla.campos[0];

export function estaVacio(valor) {
  return valor === null || valor === undefined || valor === "" || valor === false;
}

export const opcionDe = (campo, idOpcion) => campo.opciones.find((o) => o.id === idOpcion) || null;

// Texto de una celda tal como se ve: "1.234,50 €", "13/10/2026", "Enviado"…
export function textoCelda(campo, valor) {
  if (valor === null || valor === undefined) return "";
  switch (campo.tipo) {
    case "numero": {
      if (typeof valor !== "number") return "";
      const texto = formatearNumero(valor, campo.formato.decimales);
      return campo.formato.moneda ? `${texto} €` : texto;
    }
    case "fecha":
      return formatearFecha(valor);
    case "casilla":
      return valor ? "Sí" : "";
    case "seleccion":
      return opcionDe(campo, valor)?.nombre || "";
    default:
      return String(valor);
  }
}

// Nombre de la fila = valor de su primer campo.
export function nombreFila(tabla, fila) {
  return textoCelda(campoPrincipal(tabla), fila.valores[campoPrincipal(tabla).id]).trim();
}

const SI = ["si", "sí", "s", "yes", "y", "true", "verdadero", "v", "x", "1", "✓", "marcada", "marcado"];
const NO = ["no", "n", "false", "falso", "f", "0", "", "sin marcar"];
const pareceSi = (t) => SI.includes(normalizar(t)) || SI.includes(String(t).trim().toLowerCase());
const pareceNo = (t) => NO.includes(normalizar(t));

// Convierte un texto escrito por la persona (o leído de un CSV) al valor que
// guarda el campo. Devuelve { valor, encaja }: "encaja" es false si había
// algo escrito que no vale para ese tipo (p. ej. "doce" en un número).
export function interpretar(campo, texto, { crearOpciones = false } = {}) {
  const s = String(texto ?? "").trim();
  if (campo.tipo === "casilla") {
    if (pareceSi(s)) return { valor: true, encaja: true };
    return { valor: false, encaja: pareceNo(s) };
  }
  if (s === "") return { valor: null, encaja: true };
  switch (campo.tipo) {
    case "numero": {
      const n = leerNumero(s);
      return { valor: n, encaja: n !== null };
    }
    case "fecha": {
      const f = leerFecha(s);
      return { valor: f, encaja: f !== null };
    }
    case "seleccion": {
      let opcion = campo.opciones.find((o) => normalizar(o.nombre) === normalizar(s));
      if (!opcion && crearOpciones) {
        opcion = crearOpcion(s, campo.opciones.length);
        campo.opciones.push(opcion);
      }
      return { valor: opcion ? opcion.id : null, encaja: Boolean(opcion) };
    }
    case "url": {
      if (urlSegura(s)) return { valor: s, encaja: true };
      // "www.tienda.com" o "tienda.com/envio" → le ponemos https:// delante.
      if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(s)) return { valor: "https://" + s, encaja: true };
      return { valor: null, encaja: false };
    }
    default:
      return { valor: s, encaja: true };
  }
}

// Al cambiar el tipo de un campo, convierte un valor del tipo viejo al nuevo.
// "perdido" indica que había un dato que no se ha podido convertir.
export function convertirValor(valor, origen, destino) {
  if (estaVacio(valor)) return { valor: destino.tipo === "casilla" ? false : null, perdido: false };
  let texto = textoCelda(origen, valor);
  if (origen.tipo === "numero" && destino.tipo === "casilla") return { valor: valor !== 0, perdido: false };
  if (origen.tipo === "casilla" && destino.tipo === "numero") return { valor: 1, perdido: false };
  if (origen.tipo === "numero" && destino.tipo !== "texto") texto = String(valor).replace(".", ",");
  const { valor: nuevo, encaja } = interpretar(destino, texto, { crearOpciones: true });
  return { valor: nuevo, perdido: !encaja };
}

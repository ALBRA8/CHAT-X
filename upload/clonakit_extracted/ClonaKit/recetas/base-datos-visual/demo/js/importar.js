// Importar y exportar CSV.
//  - Importar: vista previa con el tipo propuesto de cada columna, elegir
//    "tabla nueva" o "añadir a la tabla actual" y ver qué no encajaba.
//  - Exportar: descarga lo que se ve en la vista (filas y columnas visibles).

import { guardar } from "./almacen.js";
import { adivinarTipo, detectarSeparador, escribirCSV, leerCSV } from "./csv.js";
import { icono } from "./iconos.js";
import { crearCampo, crearFila, crearTabla, estaVacio, interpretar, opcionDe, TIPOS } from "./modelo.js";
import { abrirDialogo, avisar, boton } from "./ui.js";
import { descargar, el, elegirArchivo, formatearFecha, hoyIso, normalizar, plural, reemplazar, slug } from "./util.js";

const FILAS_PREVIA = 5;

export async function importarCSV({ base, tabla, alTerminar }) {
  const archivo = await elegirArchivo(".csv,text/csv,text/plain");
  if (!archivo) return;
  const texto = await archivo.text();
  if (!texto.trim()) return avisar("El archivo está vacío.", { tipo: "error" });
  abrirImportador({ base, tabla, nombreArchivo: archivo.name, texto, alTerminar });
}

function abrirImportador({ base, tabla, nombreArchivo, texto, alTerminar }) {
  const nombreSinExtension = nombreArchivo.replace(/\.[^.]+$/, "");
  const estado = {
    separador: detectarSeparador(texto),
    destino: "nueva",
    nombreTabla: nombreSinExtension.charAt(0).toUpperCase() + nombreSinExtension.slice(1),
    columnas: [],
    filas: [],
  };

  // Lee el CSV con el separador elegido y propone un tipo para cada columna.
  function analizar() {
    const todas = leerCSV(texto, estado.separador);
    const cabecera = todas[0] || [];
    estado.filas = todas.slice(1);
    const total = Math.max(cabecera.length, ...estado.filas.map((f) => f.length));
    estado.columnas = Array.from({ length: total }, (_, i) => {
      const titulo = (cabecera[i] || "").trim() || `Campo ${i + 1}`;
      const propuesta = adivinarTipo(estado.filas.map((f) => f[i]));
      const mismoNombre = tabla.campos.find((c) => normalizar(c.nombre) === normalizar(titulo));
      return {
        titulo,
        tipo: propuesta.tipo,
        formato: propuesta.formato || { decimales: 0, moneda: false },
        campoDestino: mismoNombre?.id || "",
      };
    });
  }

  const zona = el("div", { class: "importar" });

  function pintar() {
    const selectorSeparador = el(
      "select",
      {
        class: "campo-input campo-input-peq",
        "aria-label": "Separador",
        onchange: (e) => {
          estado.separador = e.target.value;
          analizar();
          pintar();
        },
      },
      el("option", { value: ",", selected: estado.separador === "," }, "Coma ( , )"),
      el("option", { value: ";", selected: estado.separador === ";" }, "Punto y coma ( ; )"),
    );

    const inputNombre = el("input", { class: "campo-input", type: "text", value: estado.nombreTabla, "aria-label": "Nombre de la tabla nueva" });
    inputNombre.addEventListener("input", () => (estado.nombreTabla = inputNombre.value));

    const opcionDestino = (valor, titulo, detalle, extra) =>
      el(
        "label",
        { class: `radio-tarjeta ${estado.destino === valor ? "elegida" : ""}` },
        el("input", {
          type: "radio",
          name: "destino",
          value: valor,
          checked: estado.destino === valor,
          onchange: () => {
            estado.destino = valor;
            pintar();
          },
        }),
        el("span", { class: "radio-textos" }, el("strong", {}, titulo), el("small", {}, detalle), extra),
      );

    reemplazar(zona, 
      el(
        "div",
        { class: "importar-resumen" },
        el("span", { class: "importar-archivo", html: icono("archivo", 18) }),
        el("span", {}, el("strong", {}, nombreArchivo), ` · ${plural(estado.filas.length, "fila")} · ${plural(estado.columnas.length, "columna")}`),
        el("label", { class: "importar-sep" }, el("span", {}, "Separador"), selectorSeparador),
      ),
      el(
        "div",
        { class: "importar-destinos" },
        opcionDestino("nueva", "Tabla nueva", "Se crea una tabla con un campo por columna.", estado.destino === "nueva" ? inputNombre : null),
        opcionDestino("anadir", `Añadir a «${tabla.nombre}»`, "Elige a qué campo va cada columna."),
      ),
      el("p", { class: "ayuda" }, estado.destino === "nueva" ? "Tipo propuesto para cada columna según sus valores. Puedes cambiarlo." : "Las columnas con «No importar» se ignoran."),
      tablaPrevia(),
      estado.filas.length > FILAS_PREVIA ? el("p", { class: "ayuda" }, `Vista previa de ${FILAS_PREVIA} de ${plural(estado.filas.length, "fila")}.`) : null,
    );
    if (estado.destino === "nueva") inputNombre.focus();
  }

  // Tabla de vista previa: una columna por columna del CSV, con su selector.
  function tablaPrevia() {
    const selectores = estado.columnas.map((columna, i) => {
      if (estado.destino === "nueva") {
        return el(
          "select",
          { class: "campo-input campo-input-peq", "aria-label": `Tipo de ${columna.titulo}`, "data-columna": i, onchange: (e) => (columna.tipo = e.target.value) },
          Object.entries(TIPOS).map(([clave, tipo]) => el("option", { value: clave, selected: columna.tipo === clave }, tipo.nombre)),
        );
      }
      return el(
        "select",
        { class: "campo-input campo-input-peq", "aria-label": `Campo para ${columna.titulo}`, "data-columna": i, onchange: (e) => (columna.campoDestino = e.target.value) },
        el("option", { value: "" }, "— No importar —"),
        tabla.campos.map((c) => el("option", { value: c.id, selected: columna.campoDestino === c.id }, `${c.nombre} (${TIPOS[c.tipo].nombre})`)),
      );
    });
    return el(
      "div",
      { class: "previa-scroll" },
      el(
        "table",
        { class: "previa" },
        el(
          "thead",
          {},
          el("tr", {}, estado.columnas.map((c) => el("th", {}, c.titulo))),
          el("tr", { class: "previa-tipos" }, selectores.map((s) => el("td", {}, s))),
        ),
        el("tbody", {}, estado.filas.slice(0, FILAS_PREVIA).map((fila) => el("tr", {}, estado.columnas.map((_, i) => el("td", {}, fila[i] ?? ""))))),
      ),
    );
  }

  analizar();
  pintar();
  const { cerrar } = abrirDialogo({
    titulo: "Importar CSV",
    clase: "dialogo-ancho",
    contenido: zona,
    acciones: [boton("Cancelar", { onclick: () => cerrar() }), boton("Importar", { tipo: "primario", icono: "subir", "data-accion": "importar", onclick: () => ejecutar() })],
  });

  function ejecutar() {
    let destino;
    let mapa; // [{ indice de columna, campo }]
    if (estado.destino === "nueva") {
      const usados = new Set();
      const campos = estado.columnas.map((columna) => {
        // Si dos columnas se llaman igual, numeramos la segunda.
        let nombre = columna.titulo;
        for (let n = 2; usados.has(nombre.toLowerCase()); n++) nombre = `${columna.titulo} ${n}`;
        usados.add(nombre.toLowerCase());
        return crearCampo(nombre, columna.tipo, { formato: columna.tipo === "numero" ? { ...columna.formato } : { decimales: 0, moneda: false } });
      });
      const nombreTabla = estado.nombreTabla.trim() || "Importada";
      destino = crearTabla(nombreTabla, campos);
      mapa = campos.map((campo, indice) => ({ indice, campo }));
    } else {
      destino = tabla;
      mapa = estado.columnas
        .map((columna, indice) => ({ indice, campo: tabla.campos.find((c) => c.id === columna.campoDestino) }))
        .filter((m) => m.campo);
      if (!mapa.length) return avisar("Elige al menos una columna para importar.", { tipo: "error" });
    }

    const principal = mapa.find((m) => m.campo === destino.campos[0]);
    const noEncajan = [];
    const nuevas = estado.filas.map((datos, n) => {
      const fila = crearFila();
      for (const { indice, campo } of mapa) {
        const texto = datos[indice] ?? "";
        const { valor, encaja } = interpretar(campo, texto, { crearOpciones: true });
        if (!estaVacio(valor) || campo.tipo === "casilla") fila.valores[campo.id] = valor;
        if (!encaja) noEncajan.push({ numero: n + 1, nombre: principal ? (datos[principal.indice] || "").trim() : "", campo: campo.nombre, texto: texto.trim() });
      }
      return fila;
    });
    destino.filas.push(...nuevas);
    if (estado.destino === "nueva") {
      base.tablas.push(destino);
      base.tablaActiva = destino.id;
    }
    guardar(base);
    cerrar();
    mostrarResultado(nuevas.length, destino, noEncajan);
    alTerminar?.(destino);
  }
}

function mostrarResultado(creadas, tabla, noEncajan) {
  const contenido = [
    el("p", { class: "resultado-ok" }, el("span", { html: icono("check", 18) }), `Se ${creadas === 1 ? "ha creado" : "han creado"} ${plural(creadas, "fila")} en «${tabla.nombre}».`),
  ];
  if (noEncajan.length) {
    contenido.push(
      el("p", { class: "resultado-aviso" }, el("span", { html: icono("aviso", 18) }), `${noEncajan.length} ${noEncajan.length === 1 ? "valor no encajaba con su tipo y se ha dejado vacío" : "valores no encajaban con su tipo y se han dejado vacíos"}:`),
      el(
        "ul",
        { class: "lista-perdidos" },
        noEncajan.slice(0, 40).map((e) => el("li", {}, el("strong", {}, `Fila ${e.numero}${e.nombre ? ` (${e.nombre})` : ""}`), ` · ${e.campo}: «${e.texto}»`)),
        noEncajan.length > 40 ? el("li", {}, `y ${noEncajan.length - 40} más…`) : null,
      ),
    );
  }
  const { cerrar } = abrirDialogo({
    titulo: "Importación terminada",
    clase: "dialogo-peq",
    contenido,
    acciones: [boton("Entendido", { tipo: "primario", "data-accion": "aceptar", onclick: () => cerrar() })],
  });
}

// ---------- Exportar ----------

// Valor de una celda tal como se escribe en el CSV. Los números van sin
// símbolo € ni puntos de miles para que Excel pueda sumarlos.
function valorCSV(campo, valor, separador) {
  if (campo.tipo === "casilla") return valor ? "Sí" : "No";
  if (estaVacio(valor)) return "";
  switch (campo.tipo) {
    case "numero": {
      const texto = valor.toFixed(campo.formato.decimales);
      // Con punto y coma, Excel en español espera la coma decimal.
      return separador === ";" ? texto.replace(".", ",") : texto;
    }
    case "fecha":
      return formatearFecha(valor);
    case "seleccion":
      return opcionDe(campo, valor)?.nombre || "";
    default:
      return String(valor);
  }
}

export function abrirExportador({ tabla, vista, filas, campos }) {
  let separador = ";";
  const opcion = (valor, titulo, detalle) =>
    el(
      "label",
      { class: `radio-tarjeta ${separador === valor ? "elegida" : ""}` },
      el("input", {
        type: "radio",
        name: "separador",
        value: valor,
        checked: separador === valor,
        onchange: (e) => {
          separador = valor;
          e.target.closest(".importar-destinos").querySelectorAll(".radio-tarjeta").forEach((t) => t.classList.toggle("elegida", t.contains(e.target)));
        },
      }),
      el("span", { class: "radio-textos" }, el("strong", {}, titulo), el("small", {}, detalle)),
    );
  const nombreArchivo = `${slug(tabla.nombre)}-${hoyIso()}.csv`;
  const { cerrar } = abrirDialogo({
    titulo: "Exportar a CSV",
    subtitulo: `Vista «${vista.nombre}»: ${plural(filas.length, "fila")} y ${plural(campos.length, "columna")} visibles.`,
    clase: "dialogo-peq",
    contenido: [
      el("div", { class: "importar-destinos" }, opcion(";", "Punto y coma ( ; )", "Lo que espera Excel configurado en español."), opcion(",", "Coma ( , )", "Para Google Sheets, Numbers y otros programas.")),
      el("p", { class: "ayuda" }, "Se descargará ", el("code", {}, nombreArchivo), "."),
    ],
    acciones: [
      boton("Cancelar", { onclick: () => cerrar() }),
      boton("Descargar CSV", {
        tipo: "primario",
        icono: "bajar",
        "data-accion": "exportar",
        onclick: () => {
          const datos = [campos.map((c) => c.nombre), ...filas.map((fila) => campos.map((c) => valorCSV(c, fila.valores[c.id], separador)))];
          descargar(nombreArchivo, escribirCSV(datos, separador), "text/csv;charset=utf-8");
          cerrar();
          avisar(`Descargado ${nombreArchivo}`);
        },
      }),
    ],
  });
}

// CSV: leer y escribir archivos de hoja de cálculo en texto.
// Escrito a mano (sin librerías) y siguiendo las reglas habituales:
// las celdas con separadores, comillas o saltos de línea van entre comillas,
// y una comilla dentro de una celda se escribe doble ("").

import { decimalesDe, leerFecha, leerNumero, normalizar } from "./util.js";

// Convierte el texto de un CSV en una lista de filas, cada una con sus celdas.
export function leerCSV(texto, separador) {
  if (texto.charCodeAt(0) === 0xfeff) texto = texto.slice(1); // quita la marca BOM
  const filas = [];
  let fila = [];
  let celda = "";
  let entreComillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (entreComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          celda += '"';
          i++;
        } else entreComillas = false;
      } else celda += c;
    } else if (c === '"' && celda === "") entreComillas = true;
    else if (c === separador) {
      fila.push(celda);
      celda = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      fila.push(celda);
      filas.push(fila);
      fila = [];
      celda = "";
    } else celda += c;
  }
  if (celda !== "" || fila.length) {
    fila.push(celda);
    filas.push(fila);
  }
  // Las líneas totalmente vacías no cuentan.
  return filas.filter((f) => f.some((c) => c.trim() !== ""));
}

// ¿Coma o punto y coma? Probamos los dos con las primeras líneas y nos
// quedamos con el que da el mismo número de columnas en todas.
export function detectarSeparador(texto) {
  const lineas = texto.split(/\r?\n/).slice(0, 20).join("\n");
  let mejor = ",";
  let mejorPuntos = -1;
  for (const separador of [";", ","]) {
    const filas = leerCSV(lineas, separador).slice(0, 10);
    const columnas = filas[0]?.length || 0;
    if (columnas <= 1) continue;
    const iguales = filas.filter((f) => f.length === columnas).length;
    const puntos = iguales * 100 + columnas;
    if (puntos > mejorPuntos) {
      mejorPuntos = puntos;
      mejor = separador;
    }
  }
  return mejor;
}

// Escribe filas como CSV. Empieza por la marca BOM para que Excel lea bien
// las tildes y la ñ, y usa saltos de línea de Windows (\r\n), que Excel prefiere.
export function escribirCSV(filas, separador) {
  // Solo van entre comillas las celdas que lo necesitan: las que llevan el
  // separador, comillas, saltos de línea o espacios al principio o al final.
  const escapar = (valor) => {
    const s = String(valor ?? "");
    const necesita = s.includes(separador) || /["\r\n]/.test(s) || s !== s.trim();
    return necesita ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "\uFEFF" + filas.map((fila) => fila.map(escapar).join(separador)).join("\r\n") + "\r\n";
}

const PALABRAS_CASILLA = ["si", "no", "verdadero", "falso", "true", "false", "yes"];

// Propone un tipo de campo mirando los valores de una columna:
// número si todos lo son, fecha si tienen formato de fecha, casilla si son
// sí/no o verdadero/falso, URL si empiezan por http. Si no, texto.
export function adivinarTipo(valores) {
  const llenos = valores.map((v) => String(v ?? "").trim()).filter(Boolean);
  if (!llenos.length) return { tipo: "texto" };
  if (llenos.every((v) => PALABRAS_CASILLA.includes(normalizar(v)))) return { tipo: "casilla" };
  if (llenos.every((v) => /^https?:\/\//i.test(v))) return { tipo: "url" };
  if (llenos.every((v) => leerFecha(v) !== null)) return { tipo: "fecha" };
  if (llenos.every((v) => leerNumero(v) !== null)) {
    return {
      tipo: "numero",
      formato: {
        decimales: Math.min(4, Math.max(...llenos.map(decimalesDe))),
        moneda: llenos.some((v) => v.includes("€")),
      },
    };
  }
  return { tipo: "texto" };
}

// Consulta: decide qué filas se ven en una vista y en qué orden, aplicando
// sus filtros, su orden y el buscador rápido. No pinta nada: solo calcula.

import { estaVacio, textoCelda } from "./modelo.js";
import { leerFecha, leerNumero, normalizar } from "./util.js";

// Operadores de filtro disponibles según el tipo de campo: [clave, texto].
export const OPERADORES = {
  texto: [["contiene", "contiene"], ["no_contiene", "no contiene"], ["es", "es"], ["vacio", "está vacío"]],
  numero: [["=", "="], ["!=", "≠"], ["<", "<"], [">", ">"], ["entre", "entre"], ["vacio", "está vacío"]],
  fecha: [["=", "="], ["!=", "≠"], ["<", "<"], [">", ">"], ["entre", "entre"], ["vacio", "está vacía"]],
  casilla: [["marcada", "está marcada"], ["sin_marcar", "sin marcar"]],
  seleccion: [["es", "es"], ["no_es", "no es"], ["alguna", "es alguna de"]],
  url: [["vacia", "está vacía"], ["no_vacia", "no está vacía"]],
};

// Estos operadores no necesitan que la persona escriba un valor.
export const operadorSinValor = (op) => ["vacio", "marcada", "sin_marcar", "vacia", "no_vacia"].includes(op);

// Una condición a medio rellenar (sin valor todavía) no filtra nada.
export function condicionCompleta(condicion, campo) {
  if (!campo) return false;
  const op = condicion.operador;
  if (!OPERADORES[campo.tipo].some(([clave]) => clave === op)) return false;
  if (operadorSinValor(op)) return true;
  if (op === "alguna") return Array.isArray(condicion.valor) && condicion.valor.length > 0;
  const lleno = (v) => v !== undefined && v !== null && String(v).trim() !== "";
  if (op === "entre") return lleno(condicion.valor) && lleno(condicion.valor2);
  return lleno(condicion.valor);
}

// ¿Cumple esta fila la condición?
function cumple(fila, condicion, campo) {
  const v = fila.valores[campo.id];
  const op = condicion.operador;
  switch (campo.tipo) {
    case "numero":
    case "fecha": {
      // Los números se comparan como números y las fechas "AAAA-MM-DD" como texto.
      const leer = campo.tipo === "numero" ? leerNumero : leerFecha;
      const actual = estaVacio(v) ? null : v;
      if (op === "vacio") return actual === null;
      const a = leer(condicion.valor);
      if (op === "!=") return actual !== a;
      if (actual === null || a === null) return false;
      if (op === "=") return actual === a;
      if (op === "<") return actual < a;
      if (op === ">") return actual > a;
      if (op === "entre") {
        const b = leer(condicion.valor2);
        if (b === null) return false;
        const [min, max] = a <= b ? [a, b] : [b, a];
        return actual >= min && actual <= max;
      }
      return true;
    }
    case "casilla":
      return op === "marcada" ? v === true : v !== true;
    case "seleccion":
      if (op === "es") return v === condicion.valor;
      if (op === "no_es") return v !== condicion.valor;
      return condicion.valor.includes(v);
    case "url":
      return op === "vacia" ? estaVacio(v) : !estaVacio(v);
    default: {
      const texto = normalizar(v);
      const buscado = normalizar(condicion.valor);
      if (op === "vacio") return texto === "";
      if (op === "contiene") return texto.includes(buscado);
      if (op === "no_contiene") return !texto.includes(buscado);
      return texto === buscado;
    }
  }
}

// Campos que se ven en la vista, en orden. El primero (el nombre) nunca se oculta.
export function camposVisibles(tabla, vista) {
  return tabla.campos.filter((campo, i) => i === 0 || !vista.ocultos.includes(campo.id));
}

const comparadorTexto = new Intl.Collator("es", { sensitivity: "base", numeric: true });

// Compara dos filas por un campo. Las celdas vacías van siempre al final.
function comparar(campo, filaA, filaB, direccion) {
  const a = filaA.valores[campo.id];
  const b = filaB.valores[campo.id];
  if (campo.tipo !== "casilla") {
    const vaciaA = estaVacio(a);
    const vaciaB = estaVacio(b);
    if (vaciaA || vaciaB) return vaciaA === vaciaB ? 0 : vaciaA ? 1 : -1;
  }
  let resultado;
  switch (campo.tipo) {
    case "numero":
      resultado = a - b;
      break;
    case "fecha":
      resultado = a < b ? -1 : a > b ? 1 : 0;
      break;
    case "casilla":
      resultado = (a ? 1 : 0) - (b ? 1 : 0);
      break;
    case "seleccion": {
      // Las opciones se ordenan según su posición en la lista (Nuevo, Preparando, Enviado…).
      const posicion = (id) => campo.opciones.findIndex((o) => o.id === id);
      resultado = posicion(a) - posicion(b);
      break;
    }
    default:
      resultado = comparadorTexto.compare(textoCelda(campo, a), textoCelda(campo, b));
  }
  return direccion === "desc" ? -resultado : resultado;
}

// La función principal: las filas que se ven en una vista.
//   retenidas: filas recién creadas que se siguen mostrando aunque el filtro
//   no las incluya, para que no "desaparezcan" mientras las rellenas.
export function filasVisibles(tabla, vista, busqueda = "", retenidas = new Set()) {
  const campoPorId = new Map(tabla.campos.map((c) => [c.id, c]));
  let filas = tabla.filas;

  const condiciones = vista.filtros.condiciones
    .map((c) => [c, campoPorId.get(c.campoId)])
    .filter(([c, campo]) => condicionCompleta(c, campo));
  if (condiciones.length) {
    const todas = vista.filtros.modo !== "alguna";
    filas = filas.filter((fila) => {
      if (retenidas.has(fila.id)) return true;
      return todas
        ? condiciones.every(([c, campo]) => cumple(fila, c, campo))
        : condiciones.some(([c, campo]) => cumple(fila, c, campo));
    });
  }

  const buscado = normalizar(busqueda);
  if (buscado) {
    const visibles = camposVisibles(tabla, vista);
    filas = filas.filter((fila) => visibles.some((campo) => normalizar(textoCelda(campo, fila.valores[campo.id])).includes(buscado)));
  }

  const reglas = vista.orden.map((r) => [campoPorId.get(r.campoId), r.direccion]).filter(([campo]) => campo);
  if (reglas.length) {
    // sort de JavaScript es estable: con valores iguales se respeta el orden original.
    filas = [...filas].sort((a, b) => {
      for (const [campo, direccion] of reglas) {
        const r = comparar(campo, a, b, direccion);
        if (r !== 0) return r;
      }
      return 0;
    });
  }
  return filas;
}

// Número de condiciones que de verdad están filtrando (para el botón "Filtrar").
export function filtrosActivos(tabla, vista) {
  return vista.filtros.condiciones.filter((c) => condicionCompleta(c, tabla.campos.find((f) => f.id === c.campoId))).length;
}

// Almacén: guarda las bases en IndexedDB, la base de datos que trae el
// propio navegador. Cada base (con sus tablas, campos, filas y vistas) se
// guarda como un único objeto. Así una base entera se lee y se escribe de golpe.

const NOMBRE_BD = "celda";
const VERSION_BD = 1;
const ALMACEN = "bases";

let conexion = null;

// Abre (o crea la primera vez) la base de datos del navegador.
function abrir() {
  if (conexion) return Promise.resolve(conexion);
  return new Promise((resolver, rechazar) => {
    const peticion = indexedDB.open(NOMBRE_BD, VERSION_BD);
    peticion.onupgradeneeded = () => {
      // Solo se ejecuta la primera vez (o al subir de versión).
      peticion.result.createObjectStore(ALMACEN, { keyPath: "id" });
    };
    peticion.onsuccess = () => {
      conexion = peticion.result;
      resolver(conexion);
    };
    peticion.onerror = () => rechazar(peticion.error);
  });
}

// Envuelve una operación de IndexedDB en una promesa para poder usar "await".
async function operacion(modo, hacer) {
  const bd = await abrir();
  return new Promise((resolver, rechazar) => {
    const tx = bd.transaction(ALMACEN, modo);
    const resultado = hacer(tx.objectStore(ALMACEN));
    tx.oncomplete = () => resolver(resultado?.result);
    tx.onerror = () => rechazar(tx.error);
    tx.onabort = () => rechazar(tx.error);
  });
}

// ---------- Estado en memoria ----------

// Lista de bases ya cargadas. La interfaz siempre lee de aquí (es rápido) y
// cada cambio se copia a IndexedDB en segundo plano.
export const bases = [];

const oyentes = new Set();
const pendientes = new Set();
let programado = false;
let estadoGuardado = "guardado"; // "guardando" | "guardado" | "error"

export async function cargarBases() {
  const todas = (await operacion("readonly", (almacen) => almacen.getAll())) || [];
  todas.sort((a, b) => (b.modificada || 0) - (a.modificada || 0));
  bases.splice(0, bases.length, ...todas);
  return bases;
}

export const buscarBase = (id) => bases.find((b) => b.id === id) || null;

// Avisa a quien escuche (la pantalla) de que algo ha cambiado.
export function alCambiar(funcion) {
  oyentes.add(funcion);
  return () => oyentes.delete(funcion);
}

function avisar(tipo) {
  for (const funcion of oyentes) funcion(tipo);
}

export const estadoDelGuardado = () => estadoGuardado;

// Marca una base como cambiada. Los cambios del mismo instante se agrupan y
// se escriben juntos justo después ("al momento", pero sin escribir 10 veces).
//   silencioso: no repintar la pantalla (por ejemplo, mientras se escribe)
//   sinFecha: no cuenta como edición (por ejemplo, cambiar de pestaña)
export function guardar(base, { silencioso = false, sinFecha = false } = {}) {
  if (!sinFecha) base.modificada = Date.now();
  if (!bases.includes(base)) bases.unshift(base);
  pendientes.add(base);
  if (!programado) {
    programado = true;
    queueMicrotask(escribirPendientes);
  }
  if (!silencioso) avisar("datos");
}

async function escribirPendientes() {
  programado = false;
  const lote = [...pendientes];
  pendientes.clear();
  estadoGuardado = "guardando";
  avisar("guardado");
  try {
    await operacion("readwrite", (almacen) => {
      // structuredClone deja fuera cualquier cosa que no sean datos.
      for (const base of lote) almacen.put(structuredClone(base));
    });
    estadoGuardado = pendientes.size ? "guardando" : "guardado";
  } catch (error) {
    console.error("No se pudo guardar en IndexedDB", error);
    estadoGuardado = "error";
  }
  avisar("guardado");
}

export async function borrarBase(id) {
  const indice = bases.findIndex((b) => b.id === id);
  if (indice >= 0) bases.splice(indice, 1);
  await operacion("readwrite", (almacen) => almacen.delete(id));
  avisar("datos");
}

// Base de ejemplo "Clientes y pedidos" con datos inventados, para ver la app
// funcionando antes de meter los tuyos. Se puede borrar sin miedo.

import { crearBase, crearCampo, crearFila, crearOpcion, crearTabla, crearVista } from "./modelo.js";

// Fecha de hace "n" días en formato AAAA-MM-DD, para que el ejemplo parezca reciente.
function haceDias(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Crea una tabla a partir de una lista de campos y de filas escritas como listas de valores.
function tablaCon(nombre, campos, filas) {
  const tabla = crearTabla(nombre, campos);
  tabla.filas = filas.map((valores) => crearFila(Object.fromEntries(campos.map((c, i) => [c.id, valores[i] ?? null]))));
  return tabla;
}

const opciones = (...nombres) => nombres.map((n, i) => crearOpcion(n, i));

export function crearBaseEjemplo() {
  const base = crearBase({ nombre: "Clientes y pedidos", emoji: "🛍️", color: "#F9E7B7" });

  // --- Clientes ---
  const tipo = crearCampo("Tipo", "seleccion", { opciones: opciones("Particular", "Empresa", "Tienda") });
  const [particular, empresa, tienda] = tipo.opciones.map((o) => o.id);
  const clientes = tablaCon(
    "Clientes",
    [crearCampo("Nombre"), crearCampo("Email"), crearCampo("Teléfono"), crearCampo("Ciudad"), tipo, crearCampo("Cliente desde", "fecha"), crearCampo("Newsletter", "casilla")],
    [
      ["Lucía Martín", "lucia.martin@ejemplo.es", "612 345 678", "Valencia", particular, haceDias(410), true],
      ["Café Brisa S.L.", "compras@cafebrisa.ejemplo", "963 210 554", "Valencia", empresa, haceDias(300), false],
      ["Jorge Ibáñez", "jorge.ibanez@ejemplo.es", "699 112 233", "Zaragoza", particular, haceDias(120), true],
      ["La Despensa Verde", "hola@despensaverde.ejemplo", "944 556 677", "Bilbao", tienda, haceDias(95), true],
      ["Marta Soler", "marta.soler@ejemplo.es", "655 908 771", "Barcelona", particular, haceDias(60), false],
      ["Estudio Nébula", "equipo@nebula.ejemplo", "911 234 908", "Madrid", empresa, haceDias(33), true],
      ["Andrés Peña", "andres.pena@ejemplo.es", "622 431 090", "Sevilla", particular, haceDias(12), false],
    ],
  );

  // --- Pedidos ---
  const estado = crearCampo("Estado", "seleccion", { opciones: opciones("Nuevo", "Preparando", "Enviado", "Entregado") });
  const [nuevo, preparando, enviado, entregado] = estado.opciones.map((o) => o.id);
  const importe = crearCampo("Importe", "numero", { formato: { decimales: 2, moneda: true } });
  const fecha = crearCampo("Fecha", "fecha");
  const pagado = crearCampo("Pagado", "casilla");
  const seguimiento = (codigo) => `https://www.example.com/envios/${codigo}`;
  const pedidos = tablaCon(
    "Pedidos",
    [crearCampo("Cliente"), crearCampo("Producto"), importe, fecha, pagado, estado, crearCampo("Seguimiento", "url")],
    [
      ["Lucía Martín", "Taza esmaltada ×2", 36, haceDias(9), true, entregado, seguimiento("ES48201")],
      ["Café Brisa S.L.", "Tazas para cafetería ×24", 1234.5, haceDias(7), false, enviado, seguimiento("ES48236")],
      ["Jorge Ibáñez", "Vela de soja", 14.9, haceDias(5), true, preparando, null],
      ["La Despensa Verde", "Jabones artesanos ×30", 249, haceDias(4), false, preparando, null],
      ["Marta Soler", "Libreta de lino", 12.5, haceDias(3), true, nuevo, null],
      ["Estudio Nébula", "Planta en maceta ×6", 189.9, haceDias(2), false, nuevo, null],
      ["Andrés Peña", "Bolsa de algodón", 18, haceDias(1), false, nuevo, null],
      ["Lucía Martín", "Vela de soja ×3", 44.7, haceDias(0), false, nuevo, null],
    ],
  );
  pedidos.vistas[0].nombre = "Todos los pedidos";
  const tableroEnvios = crearVista("tablero", "Tablero de envíos", pedidos);
  tableroEnvios.agrupar = estado.id;
  const cobros = crearVista("cuadricula", "Cobros pendientes", pedidos);
  cobros.filtros.condiciones.push({ id: "q-ejemplo", campoId: pagado.id, operador: "sin_marcar", valor: "", valor2: "" });
  cobros.orden.push({ campoId: fecha.id, direccion: "asc" });
  pedidos.vistas.push(tableroEnvios, cobros);

  // --- Productos (con fotos para la galería) ---
  const categoria = crearCampo("Categoría", "seleccion", { opciones: opciones("Cerámica", "Velas", "Papelería", "Plantas", "Textil", "Cosmética") });
  const [ceramica, velas, papeleria, plantas, textil, cosmetica] = categoria.opciones.map((o) => o.id);
  // Las fotos son ilustraciones que vienen con la app (carpeta img/ejemplos).
  const foto = (archivo) => new URL(`img/ejemplos/${archivo}`, document.baseURI).href;
  const precio = crearCampo("Precio", "numero", { formato: { decimales: 2, moneda: true } });
  const productos = tablaCon(
    "Productos",
    [crearCampo("Producto"), crearCampo("Foto", "url"), categoria, precio, crearCampo("Stock", "numero"), crearCampo("A la venta", "casilla")],
    [
      ["Taza esmaltada", foto("taza.svg"), ceramica, 18, 42, true],
      ["Vela de soja", foto("vela.svg"), velas, 14.9, 25, true],
      ["Libreta de lino", foto("libreta.svg"), papeleria, 12.5, 60, true],
      ["Planta en maceta", foto("planta.svg"), plantas, 31.65, 8, true],
      ["Bolsa de algodón", foto("bolsa.svg"), textil, 18, 0, false],
      ["Jabón artesano", foto("jabon.svg"), cosmetica, 8.3, 120, true],
    ],
  );
  const catalogo = productos.vistas[0];
  Object.assign(catalogo, crearVista("galeria", "Catálogo", productos), { id: catalogo.id });
  productos.vistas.push(crearVista("cuadricula", "Inventario", productos));

  base.tablas = [clientes, pedidos, productos];
  base.tablaActiva = pedidos.id;
  return base;
}

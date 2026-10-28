// Ficha de la fila: una ventana con todos los campos de una fila en vertical,
// para leerla y editarla con calma. Permite ir a la anterior o la siguiente,
// duplicarla y borrarla.

import { guardar } from "./almacen.js";
import { icono } from "./iconos.js";
import { crearFila, interpretar, nombreFila, textoCelda, TIPOS } from "./modelo.js";
import { abrirDialogo, avisar, boton } from "./ui.js";
import { clonar, el, reemplazar, urlSegura } from "./util.js";

// obtenerFilas: función que devuelve las filas de la vista en su orden actual,
// para que "anterior" y "siguiente" sigan lo que la persona ve.
export function abrirFicha({ base, tabla, vista, fila, obtenerFilas }) {
  let actual = fila;
  const titulo = el("h2", { class: "ficha-titulo" });
  const posicion = el("p", { class: "dialogo-sub" });
  const cuerpo = el("div", { class: "ficha-campos" });
  const btnAnterior = boton("Anterior", { icono: "izquierda", "aria-label": "Fila anterior", onclick: () => mover(-1), class: "btn btn-secundario btn-nav" });
  const btnSiguiente = boton("Siguiente", { icono: "derecha", "aria-label": "Fila siguiente", onclick: () => mover(1), class: "btn btn-secundario btn-nav btn-icono-dcha" });

  const { cerrar, dialogo } = abrirDialogo({
    titulo: "Ficha",
    clase: "dialogo-ficha",
    contenido: cuerpo,
    acciones: [
      boton("Borrar", { icono: "papelera", tipo: "peligro-suave", "data-accion": "borrar-fila", onclick: borrar }),
      boton("Duplicar", { icono: "copiar", "data-accion": "duplicar-fila", onclick: duplicar }),
      el("span", { class: "hueco" }),
      btnAnterior,
      btnSiguiente,
    ],
    // Al cerrar, refrescamos la pantalla para que se vean los cambios.
    alCerrar: () => guardar(base),
  });
  // Cambiamos la cabecera genérica por el nombre de la fila y su posición.
  dialogo.querySelector(".dialogo-cab > div").replaceChildren(titulo, posicion);

  function pintar() {
    const filas = obtenerFilas();
    const i = filas.indexOf(actual);
    titulo.textContent = nombreFila(tabla, actual) || "Fila sin nombre";
    posicion.textContent = i >= 0 ? `Fila ${i + 1} de ${filas.length} en «${vista.nombre}»` : "Fila fuera de esta vista (por los filtros)";
    btnAnterior.disabled = i <= 0;
    btnSiguiente.disabled = i < 0 || i >= filas.length - 1;

    const visibles = tabla.campos.filter((c, n) => n === 0 || !vista.ocultos.includes(c.id));
    const ocultos = tabla.campos.filter((c) => !visibles.includes(c));
    reemplazar(cuerpo, 
      ...visibles.map(campoEditable),
      ocultos.length ? el("p", { class: "ficha-separador" }, "Ocultos en esta vista") : null,
      ...ocultos.map(campoEditable),
    );
  }

  // Una línea por campo: su nombre con el icono del tipo y el control para editarlo.
  function campoEditable(campo) {
    const valor = actual.valores[campo.id];
    const id = `ficha-${campo.id}`;
    const guardarValor = (nuevo, { silencioso = false } = {}) => {
      actual.valores[campo.id] = nuevo;
      guardar(base, { silencioso });
      if (campo === tabla.campos[0]) titulo.textContent = nombreFila(tabla, actual) || "Fila sin nombre";
    };
    let control;
    switch (campo.tipo) {
      case "casilla":
        control = el("label", { class: "interruptor" }, el("input", { id, type: "checkbox", checked: valor === true, onchange: (e) => guardarValor(e.target.checked) }), el("span", { class: "interruptor-pista" }), el("span", {}, valor ? "Marcada" : "Sin marcar"));
        control.querySelector("input").addEventListener("change", (e) => (control.lastChild.textContent = e.target.checked ? "Marcada" : "Sin marcar"));
        break;
      case "seleccion":
        control = el(
          "div",
          { class: "chips", role: "radiogroup", "aria-label": campo.nombre },
          campo.opciones.length
            ? campo.opciones.map((o) =>
                el(
                  "button",
                  {
                    type: "button",
                    class: `pastilla chip ${valor === o.id ? "elegida" : ""}`,
                    style: { background: o.color },
                    role: "radio",
                    "aria-checked": String(valor === o.id),
                    onclick: () => {
                      guardarValor(actual.valores[campo.id] === o.id ? null : o.id);
                      pintar();
                    },
                  },
                  o.nombre,
                ),
              )
            : el("span", { class: "ayuda" }, "Este campo todavía no tiene opciones."),
        );
        break;
      case "fecha":
        control = el("input", { id, class: "campo-input", type: "date", value: valor || "", onchange: (e) => guardarValor(e.target.value || null) });
        break;
      case "numero": {
        const texto = textoCelda({ ...campo, formato: { ...campo.formato, moneda: false } }, valor);
        control = el("input", { id, class: "campo-input", type: "text", inputmode: "decimal", value: texto, placeholder: campo.formato.moneda ? "0,00 €" : "0" });
        control.addEventListener("change", () => {
          const { valor: nuevo, encaja } = interpretar(campo, control.value);
          control.classList.toggle("error", !encaja);
          if (!encaja) return avisar(`«${control.value}» no es un número.`, { tipo: "error" });
          guardarValor(nuevo);
          control.value = textoCelda({ ...campo, formato: { ...campo.formato, moneda: false } }, nuevo);
        });
        break;
      }
      case "url": {
        const input = el("input", { id, class: "campo-input", type: "url", value: valor || "", placeholder: "https://" });
        const abrir = el("a", { class: "btn btn-secundario", target: "_blank", rel: "noopener noreferrer", html: icono("enlace") + "<span>Abrir</span>" });
        const actualizarEnlace = () => {
          const segura = urlSegura(actual.valores[campo.id]);
          if (segura) abrir.href = segura;
          else abrir.removeAttribute("href");
          abrir.classList.toggle("deshabilitado", !segura);
        };
        input.addEventListener("input", () => guardarValor(input.value.trim() || null, { silencioso: true }));
        input.addEventListener("change", () => {
          const { valor: nuevo } = interpretar(campo, input.value);
          guardarValor(nuevo ?? (input.value.trim() || null));
          actualizarEnlace();
        });
        actualizarEnlace();
        control = el("div", { class: "url-linea" }, input, abrir);
        break;
      }
      default:
        control = el("input", { id, class: "campo-input", type: "text", value: valor || "" });
        control.addEventListener("input", () => guardarValor(control.value || null, { silencioso: true }));
        control.addEventListener("change", () => guardarValor(control.value || null));
    }
    return el(
      "div",
      { class: "ficha-campo", "data-campo": campo.id },
      el("label", { class: "ficha-etiqueta", for: id }, el("span", { html: icono(TIPOS[campo.tipo].icono) }), campo.nombre),
      control,
    );
  }

  function mover(paso) {
    // Guardamos lo que se esté escribiendo antes de cambiar de fila.
    document.activeElement?.blur?.();
    const filas = obtenerFilas();
    const siguiente = filas[filas.indexOf(actual) + paso];
    if (!siguiente) return;
    actual = siguiente;
    pintar();
  }

  function duplicar() {
    document.activeElement?.blur?.();
    const copia = crearFila(clonar(actual.valores));
    tabla.filas.splice(tabla.filas.indexOf(actual) + 1, 0, copia);
    guardar(base);
    actual = copia;
    pintar();
    avisar("Fila duplicada");
  }

  function borrar() {
    const indice = tabla.filas.indexOf(actual);
    const borrada = actual;
    tabla.filas.splice(indice, 1);
    cerrar();
    avisar(`Fila «${nombreFila(tabla, borrada) || "sin nombre"}» borrada`, {
      accion: {
        texto: "Deshacer",
        fn: () => {
          tabla.filas.splice(indice, 0, borrada);
          guardar(base);
        },
      },
    });
  }

  pintar();
}

// Iconos dibujados a mano en SVG (sin librerías ni archivos externos).
// Todos usan "currentColor", así que toman el color del texto que los rodea.

const trazo = (contenido, tam = 16) =>
  `<svg class="ico" width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${contenido}</svg>`;

const dibujos = {
  // Tipos de campo
  texto: '<path d="M5 7V5h14v2"/><path d="M12 5v14"/><path d="M9 19h6"/>',
  numero: '<path d="M9 4 7 20"/><path d="M17 4l-2 16"/><path d="M4 9h16"/><path d="M3 15h16"/>',
  fecha: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17"/><path d="M8 3v4"/><path d="M16 3v4"/>',
  casilla: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  seleccion: '<circle cx="12" cy="12" r="8.5"/><path d="m8.5 10.5 3.5 3.5 3.5-3.5"/>',
  url: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  // Vistas
  cuadricula: '<rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M3.5 9.5h17"/><path d="M3.5 15h17"/><path d="M9.5 4v16"/>',
  tablero: '<rect x="3.5" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="16.5" y="4" width="4" height="7" rx="1.5"/>',
  galeria: '<rect x="3.5" y="4" width="7.5" height="7" rx="1.5"/><rect x="13" y="4" width="7.5" height="7" rx="1.5"/><rect x="3.5" y="13" width="7.5" height="7" rx="1.5"/><rect x="13" y="13" width="7.5" height="7" rx="1.5"/>',
  // Acciones
  filtro: '<path d="M4 5h16l-6.2 7.5V19l-3.6-1.8v-4.7Z"/>',
  orden: '<path d="M7 4v16"/><path d="m3.5 16.5 3.5 3.5 3.5-3.5"/><path d="M17 20V4"/><path d="M13.5 7.5 17 4l3.5 3.5"/>',
  ojo: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
  ojoCerrado: '<path d="M4 4l16 16"/><path d="M10.6 6.1A9 9 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3 3.7"/><path d="M6.6 7.6A16 16 0 0 0 2.5 12S6 18 12 18a9 9 0 0 0 4-.9"/><path d="M10 10a3 3 0 0 0 4 4"/>',
  subir: '<path d="M12 15V4"/><path d="m7.5 8.5 4.5-4.5 4.5 4.5"/><path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
  bajar: '<path d="M12 4v11"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
  buscar: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  mas: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  puntos: '<circle cx="5.5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18.5" cy="12" r="1.3" fill="currentColor"/>',
  papelera: '<path d="M4 7h16"/><path d="M9.5 7V4.5h5V7"/><path d="M6 7l1 12.5a1.5 1.5 0 0 0 1.5 1.5h7a1.5 1.5 0 0 0 1.5-1.5L18 7"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  copiar: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  lapiz: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/>',
  cerrar: '<path d="M6 6l12 12"/><path d="M18 6 6 18"/>',
  izquierda: '<path d="m14.5 6-6 6 6 6"/>',
  derecha: '<path d="m9.5 6 6 6-6 6"/>',
  abajo: '<path d="m6 9.5 6 6 6-6"/>',
  expandir: '<path d="M14 4h6v6"/><path d="M20 4l-7 7"/><path d="M10 20H4v-6"/><path d="M4 20l7-7"/>',
  volver: '<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>',
  asc: '<path d="M12 19V5"/><path d="m6 11 6-6 6 6"/>',
  desc: '<path d="M12 5v14"/><path d="m6 13 6 6 6-6"/>',
  arrastrar: '<circle cx="9" cy="6" r="1.2" fill="currentColor"/><circle cx="15" cy="6" r="1.2" fill="currentColor"/><circle cx="9" cy="12" r="1.2" fill="currentColor"/><circle cx="15" cy="12" r="1.2" fill="currentColor"/><circle cx="9" cy="18" r="1.2" fill="currentColor"/><circle cx="15" cy="18" r="1.2" fill="currentColor"/>',
  enlace: '<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>',
  archivo: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/>',
  aviso: '<path d="M12 4 2.8 19.5h18.4Z"/><path d="M12 10v4"/><path d="M12 17v.5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  escudo: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6Z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
  estrella: '<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6Z"/>',
};

// icono("filtro") → texto SVG listo para meter con { html: icono("filtro") }.
export function icono(nombre, tam = 16) {
  return trazo(dibujos[nombre] || dibujos.texto, tam);
}

// El logo de Celda: un cuadrado dividido en cuatro celdas con una rellena de verde salvia.
export function logo(tam = 28) {
  return `<svg class="logo" width="${tam}" height="${tam}" viewBox="0 0 32 32" aria-hidden="true">
    <rect x="2" y="2" width="28" height="28" rx="7" fill="#FFFFFF" stroke="#2B2D31" stroke-width="2.4"/>
    <path d="M16 2v28M2 16h28" stroke="#2B2D31" stroke-width="2.4"/>
    <path d="M16 16h14v7a7 7 0 0 1-7 7h-7Z" fill="#3F8A6B"/>
    <rect x="2" y="2" width="28" height="28" rx="7" fill="none" stroke="#2B2D31" stroke-width="2.4"/>
  </svg>`;
}

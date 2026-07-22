/* =========================================================
   ¿Salimos? — biblioteca de iconos SVG (línea, sin dependencias)
   Todos los iconos son SVG propios, estilo trazo, heredan currentColor.
   Uso:  svgIcon('ramen', 'icon')  ->  '<svg …>…</svg>'
   ========================================================= */

'use strict';

const ICON_PATHS = {
  /* --- Planes (Vamos a…) --- */
  desayunar: '<path d="M3 18h18M6 18a6 6 0 0 1 12 0M12 3v3M5 8l1.6 1.6M19 8l-1.6 1.6"/>',            // amanecer
  comer:     '<path d="M4 3v5a2 2 0 0 0 4 0V3M6 8v13M15 3c-.8 1.3-1 3-1 4.5 0 2 .8 3 2 3.5v10"/>',   // tenedor + cuchillo
  cenar:     '<path d="M20 14A8 8 0 1 1 10.5 4.7 6.2 6.2 0 0 0 20 14Z"/><path d="M18 4l.4 1.2L19.6 6l-1.2.4L18 7.6l-.4-1.2L16.4 6l1.2-.4z"/>', // luna + estrella
  pasear:    '<circle cx="13" cy="4.5" r="1.6"/><path d="M12.5 8l-2.2 4.2 2.4 2.2.6 6M12.5 8l3 1.8 2.7-1M10.3 12.2l-3 1.4-1.3 4"/>',      // persona andando
  tomar:     '<path d="M5 4h14l-7 8zM12 12v6M8 20h8"/>',                                              // copa cóctel

  /* --- Desayuno --- */
  cafe:      '<path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 9h2a2 2 0 0 1 0 4h-2M7 3c-.6.8-.6 1.4 0 2M10 3c-.6.8-.6 1.4 0 2"/>', // taza + vapor
  churros:   '<path d="M6 3.5 5 17M9.5 3.5 8.5 17M13 3.5 12 17M4 20h9a3 3 0 0 0 3-3"/>',              // churros + taza
  bakery:    '<path d="M3.5 16c1.2-7 16-7 17 0-2.4 2.2-5.5 1.2-8.5-1-3 2.2-6.1 3.2-8.5 1Z"/>',        // croissant
  brunch:    '<path d="M4 14c0 1.8 3.6 3 8 3s8-1.2 8-3M4 11c0 1.8 3.6 3 8 3s8-1.2 8-3M12 5c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3ZM12 3v2"/>', // tortitas

  /* --- Comida / Cena --- */
  ramen:     '<path d="M3 11h18a9 9 0 0 1-18 0ZM7 11c0-2.2 2-3.4 5-3.4M13 3.5l4 3M11 3.5l4 3"/>',      // cuenco + palillos
  sushi:     '<path d="M3 13a4 4 0 0 1 4-4h10a4 4 0 0 1 0 8H7a4 4 0 0 1-4-4ZM8.5 9V6.5a3.5 3.5 0 0 1 7 0V9"/>', // nigiri
  burger:    '<path d="M4 9a8 8 0 0 1 16 0zM4 13h16M5 16h14a2 2 0 0 1-2 3H7a2 2 0 0 1-2-3ZM8.5 8.5h.01M12 8.5h.01M15.5 8.5h.01"/>', // hamburguesa
  pizza:     '<path d="M12 3 3 20l9-1.8L21 20zM10 9h.01M13.5 12h.01M9 15h.01"/>',                     // porción
  tapas:     '<path d="M3 16h8M4 16a3 3 0 0 1 6 0M13 16h8M14 16a3 3 0 0 1 6 0M7 13v-1M17 13v-1"/>',   // platillos
  mexican:   '<path d="M3 16a9 9 0 0 1 18 0zM3 16h18M8 13c1.2-1 2.8-1 4 0M12 13c1.2-1 2.8-1 4 0"/>',  // taco
  kebab:     '<path d="M8 3.2 16 7 8 21zM8 3.2 5.8 7.2 8 21M10 7.5l4 2M9 12.5l4 2"/>',                // durum
  italian:   '<path d="M3 14h18a9 9 0 0 1-18 0ZM6 11c2-3 4 1 6-1s3 2 6-1"/>',                        // pasta

  /* --- Paseo --- */
  parque:    '<path d="M12 21v-6M8.5 15a4 4 0 0 1-1-7.8 5 5 0 0 1 9.9 0A4 4 0 0 1 15.5 15z"/>',       // árbol
  mirador:   '<path d="M3 20l6-9 3.2 4.5L15 11l6 9zM8 7.5a1.8 1.8 0 1 0 0-.1"/>',                     // montañas + sol
  playa:     '<path d="M3 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0M12 4v10M12 4c-4 0-7 2-8 5h16c-1-3-4-5-8-5Z"/>', // sombrilla + olas
  casco:     '<path d="M4 21h16M6 21V9l6-4 6 4v12M9.5 21v-5h5v5M9.5 12h.01M14.5 12h.01"/>',           // edificio

  /* --- Tomar algo --- */
  bar:       '<path d="M5 6h11v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM16 8.5h3a2 2 0 0 1 0 5h-3M5 10.5h11"/>', // jarra
  coctel:    '<path d="M5 4h14l-7 8zM12 12v6M8 20h8M17.5 4l1 2.5"/>',                                 // cóctel + removedor
  vino:      '<path d="M8 3h8l-1 6a3 3 0 0 1-6 0zM12 15v4M9 20h6"/>',                                 // copa de vino
  terraza:   '<path d="M5 10h10v3a5 5 0 0 1-10 0zM15 11h2a2 2 0 0 1 0 4h-2M10 3.5v2.5M18.5 5l-1 2"/>', // café al sol

  /* --- Interfaz --- */
  heart:     '<path d="M12 20.5s-7-4.6-9.2-9.2A4.6 4.6 0 0 1 12 8a4.6 4.6 0 0 1 9.2 3.3C19 15.9 12 20.5 12 20.5Z"/>',
  check:     '<path d="M4 12.5l5 5L20 6.5"/>',
  close:     '<path d="M6 6l12 12M18 6 6 18"/>',
  pin:       '<path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11ZM12 12.2a2.2 2.2 0 1 0 0-.1"/>',
  back:      '<path d="M15 5 8 12l7 7"/>',
  sparkle:   '<path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z"/>',
  lock:      '<path d="M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3"/>',
  send:      '<path d="M4 12 20 4l-6 16-3-7z"/>',
  search:    '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  target:    '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  clip:      '<path d="M20 11.5 11 20.5a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8.5-8.5"/>',
  logout:    '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  edit:      '<path d="M4 20h4L19 9l-4-4L4 16zM14.5 5.5l4 4"/>',
  star:      '<path d="M12 3l2.5 5.6L20.5 9l-4.3 4.2 1 6-5.2-2.8L6.8 19.2l1-6L3.5 9l6-.4z"/>',
  copy:      '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
  plus:      '<path d="M12 5v14M5 12h14"/>',
  trash:     '<path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13h10l1-13"/>',
  area:      '<path d="M4 4h4M4 4v4M20 4h-4M20 4v4M4 20h4M4 20v-4M20 20h-4M20 20v-4M4 12h.01M12 4h.01M20 12h.01M12 20h.01"/>',
  refresh:   '<path d="M20 11a8 8 0 1 0-.5 4M20 5v6h-6"/>',
  save:      '<path d="M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6"/>',
  user:      '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
};

function svgIcon(id, cls = 'icon') {
  const p = ICON_PATHS[id] || ICON_PATHS.sparkle;
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
    `stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
}

window.svgIcon = svgIcon;

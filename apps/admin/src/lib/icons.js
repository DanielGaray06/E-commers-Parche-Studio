/* ===========================================================================
   Iconos del panel
   ---------------------------------------------------------------------------
   Trazos de 24×24 con `currentColor`. Se definen aquí (y no se reutilizan los
   de la tienda) porque el panel necesita iconos que la tienda no usa
   (tablero, cierre de sesión, edición, visibilidad…).
   =========================================================================== */

const STROKE = {
  dashboard:
    '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  box: '<path d="M21 8v8l-9 5-9-5V8l9-5 9 5Z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v8"/>',
  receipt:
    '<path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2Z"/><path d="M9 7h6"/><path d="M9 11h6"/><path d="M9 15h3"/>',
  settings:
    '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',
  logout:
    '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  menu: '<path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/>',
  close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  trash:
    '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff:
    '<path d="M10.6 6.2A9.7 9.7 0 0 1 12 6c6.4 0 10 6 10 6a17.4 17.4 0 0 1-3 3.6"/><path d="M6.3 6.5A17.3 17.3 0 0 0 2 12s3.6 6 10 6a9.6 9.6 0 0 0 4-.8"/><path d="m2 2 20 20"/>',
  check: '<path d="m20 6-11 11-5-5"/>',
  chevronLeft: '<path d="m15 6-6 6 6 6"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  external:
    '<path d="M15 3h6v6"/><path d="m10 14 11-11"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
  alert: '<path d="M12 3 2 20h20L12 3Z"/><path d="M12 9v5"/><path d="M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-5"/><path d="M12 8h.01"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/>',
  arrowUp: '<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>',
  arrowDown: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
  store:
    '<path d="m3 9 1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  tag: '<path d="M20.6 13.4 12 22l-9-9 8.6-8.6A2 2 0 0 1 13 4h7a2 2 0 0 1 2 2v7a2 2 0 0 1-.4 1.4Z"/><circle cx="17" cy="7" r="1.2"/>',
  clipboard:
    '<rect x="8" y="3" width="8" height="4" rx="1"/><path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4-2v-4L3 5Z"/>',
  coins:
    '<circle cx="12" cy="12" r="9"/><path d="M12 7v10"/><path d="M15 9.5a2.5 2.5 0 0 0-2.5-2.5h-1a2.5 2.5 0 0 0 0 5h1a2.5 2.5 0 0 1 0 5h-1A2.5 2.5 0 0 1 9 14.5"/>',
  cart: '<circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/><path d="M2 3h3l2.6 12.4a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 7H5"/>',
};

const FILLED = {
  whatsapp:
    '<path d="M12.04 2C6.6 2 2.2 6.4 2.2 11.84c0 1.94.55 3.75 1.5 5.29L2 22.5l5.5-1.66a9.83 9.83 0 0 0 4.54 1.12c5.44 0 9.84-4.4 9.84-9.84S17.48 2 12.04 2Zm5.7 13.9c-.24.68-1.4 1.3-1.93 1.35-.53.06-1.02.24-3.44-.72-2.92-1.16-4.75-4.16-4.9-4.35-.14-.2-1.15-1.55-1.15-2.96s.73-2.1 1-2.38c.26-.29.58-.36.77-.36l.55.01c.18 0 .42-.07.65.5l.9 2.18c.07.15.12.32.02.51l-.36.55c-.12.19-.26.4-.11.65.14.24.63 1.05 1.36 1.7.93.83 1.72 1.09 1.96 1.21.24.12.39.1.53-.06l.77-.9c.19-.24.36-.19.6-.11l1.92.9c.24.12.4.18.46.28.06.1.06.58-.18 1.26Z"/>',
};

/**
 * Devuelve el SVG de un icono.
 * @param {string} name
 * @param {{ size?: number, className?: string, strokeWidth?: number }} options
 */
export function icon(name, { size = 18, className = '', strokeWidth = 1.7 } = {}) {
  const classes = className ? ` class="${className}"` : '';

  if (FILLED[name]) {
    return `<svg${classes} width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">${FILLED[name]}</svg>`;
  }

  const path = STROKE[name] ?? STROKE.info;
  return `<svg${classes} width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${path}</svg>`;
}

/* ===========================================================================
   Iconos — SVG en línea (sin dependencias externas ni peticiones de red).
   Todos heredan el color con `currentColor`.
   =========================================================================== */

const UI = {
  search:
    '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>',
  cart:
    '<path d="M3 4h2.2l2 11.2A2 2 0 0 0 9.2 17h8.4a2 2 0 0 0 2-1.6L21 8H6"/><circle cx="10" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  trash:
    '<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
  chevronLeft: '<path d="m15 6-6 6 6 6"/>',
  arrowRight: '<path d="M4 12h15"/><path d="m13 6 6 6-6 6"/>',
  arrowLeft: '<path d="M20 12H5"/><path d="m11 6-6 6 6 6"/>',
  filter: '<path d="M3 6h18M6 12h12M10 18h4"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 8h.01"/>',
  alert:
    '<path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 10v4"/><path d="M12 17h.01"/>',
  shield: '<path d="M12 3 5 6v6c0 4.5 3 7.7 7 9 4-1.3 7-4.5 7-9V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
  truck:
    '<path d="M3 7h10v9H3z"/><path d="M13 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
  exchange:
    '<path d="M4 8h13l-3-3"/><path d="M20 16H7l3 3"/>',
  whatsapp:
    '<path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3Z"/><path d="M9 8.5c0 3 2.5 5.5 5.5 5.5.6 0 1-.4 1-1v-.8l-1.6-.7-.9.9a4.7 4.7 0 0 1-2.2-2.2l.9-.9L11 7.7h-.8c-.6 0-1.1.4-1.1 1"/>',
  instagram:
    '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
  tiktok:
    '<path d="M14 4v9.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 4c.4 2.3 1.9 3.7 4 4"/>',
  facebook:
    '<path d="M14 8h2V5h-2a3.5 3.5 0 0 0-3.5 3.5V11H9v3h1.5v6h3v-6H16l.5-3h-3V8.8c0-.5.2-.8.8-.8Z"/>',
  mapPin:
    '<path d="M12 21s6-5.3 6-10a6 6 0 1 0-12 0c0 4.7 6 10 6 10Z"/><circle cx="12" cy="11" r="2.2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8L3 12Z"/><circle cx="7.5" cy="8.5" r="1.2"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  sparkle:
    '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/>',
};

/* Siluetas de prendas (se usan como respaldo visual cuando no hay fotos). */
const GARMENTS = {
  tee: 'M38 16 C38 16 44 22 50 22 C56 22 62 16 62 16 L80 23 L88 44 L72 50 L72 88 L28 88 L28 50 L12 44 L20 23 Z',
  hoodie:
    'M50 12 C41 12 35 19 35 28 L18 35 L10 54 L25 60 L25 88 L75 88 L75 60 L90 54 L82 35 L65 28 C65 19 59 12 50 12 Z',
  pants: 'M31 12 L69 12 L74 44 L67 88 L54 88 L50 50 L46 88 L33 88 L26 44 Z',
  jacket:
    'M38 15 L20 23 L12 46 L25 53 L25 88 L47 88 L50 30 L53 88 L75 88 L75 53 L88 46 L80 23 L62 15 Z',
  cap: 'M16 63 C16 40 31 25 50 25 C69 25 84 40 84 63 L84 66 L16 66 Z',
  bag: 'M22 34 h56 l5 54 H17 Z M38 34 v-6 a12 12 0 0 1 24 0 v6',
  sock: 'M35 16 h30 v34 c0 1 0 2 -1 3 l-11 11 a15 15 0 0 1 -21 -21 z',
};

/**
 * Devuelve el markup de un icono de interfaz.
 * icon('cart', { size: 22, className: 'mi-clase' })
 */
export function icon(name, { size = 22, className = '', strokeWidth = 1.7 } = {}) {
  const path = UI[name];
  if (!path) return '';
  return `<svg class="icon ${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${path}</svg>`;
}

/** Devuelve la ruta (path) de una silueta de prenda, o null. */
export function garmentPath(name) {
  return GARMENTS[name] ?? null;
}

export const iconNames = Object.keys(UI);

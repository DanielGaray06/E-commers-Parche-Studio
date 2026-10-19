/* ===========================================================================
   Portadas provisionales
   ---------------------------------------------------------------------------
   ⚠️ El catálogo de demostración no incluye fotografías reales. En lugar de
   inventar imágenes, generamos una portada gráfica de marca para cada producto.

   CÓMO USAR FOTOS REALES:
   - Guarda las imágenes en `public/images/productos/`.
   - Añade sus rutas en el campo `images` del producto (src/data/products.js).
   - Si un producto tiene al menos una imagen, esta función no se utiliza.

   Las portadas se generan como SVG en memoria (data URI): no requieren red ni
   archivos adicionales, y mantienen una proporción constante de 4:5.
   =========================================================================== */

import { COLORS } from '../data/products.js';
import { garmentPath } from './icons.js';
import { theme } from '../config/theme.config.js';

const WIDTH = 900;
const HEIGHT = 1125; // proporción 4:5, consistente en todo el catálogo

/** Mezcla un color hexadecimal con blanco para obtener un tono suave. */
function tint(hex, amount = 0.86) {
  const clean = String(hex).replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const mix = (channel) => Math.round(channel + (255 - channel) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

/**
 * Genera el data URI de la portada de un producto.
 * @param {{ name?: string, categoryName?: string, colorHex?: string, garment?: string, tag?: string }} options
 */
export function productPlaceholder({
  name = '',
  categoryName = '',
  colorHex = '#111112',
  garment = 'tee',
  tag = '',
} = {}) {
  const safeName = escapeXml(name);
  const safeCategory = escapeXml(categoryName.toUpperCase());
  const soft = tint(colorHex, 0.88);
  const soft2 = tint(colorHex, 0.72);
  const path = garmentPath(garment) ?? garmentPath('tee');
  const fontStack = 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}" role="img" aria-label="Portada provisional de ${safeName}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${soft2}"/>
      <stop offset="1" stop-color="${soft}"/>
    </linearGradient>
    <linearGradient id="shape" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${colorHex}" stop-opacity="0.30"/>
      <stop offset="1" stop-color="${colorHex}" stop-opacity="0.10"/>
    </linearGradient>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <circle cx="720" cy="230" r="300" fill="url(#shape)"/>
  <circle cx="180" cy="940" r="230" fill="url(#shape)" opacity="0.7"/>

  <g transform="translate(450 545) scale(3.2) translate(-50 -50)">
    <path d="${path}" fill="${colorHex}" fill-opacity="0.82"/>
  </g>

  <text x="60" y="80" font-family="${fontStack}" font-size="26" font-weight="600" letter-spacing="6" fill="${colorHex}" fill-opacity="0.55">${safeCategory}</text>

  ${
    tag
      ? `<g><rect x="700" y="46" width="150" height="44" rx="22" fill="${theme.accent}"/>
  <text x="775" y="75" text-anchor="middle" font-family="${fontStack}" font-size="20" font-weight="700" letter-spacing="2" fill="#0b0b0c">${escapeXml(tag.toUpperCase())}</text></g>`
      : ''
  }

  <text x="60" y="1000" font-family="${fontStack}" font-size="30" font-weight="600" letter-spacing="4" fill="${colorHex}" fill-opacity="0.6">PARCHE STUDIO</text>
  <text x="60" y="1058" font-family="${fontStack}" font-size="50" font-weight="800" fill="#0b0b0c">${safeName}</text>
  <text x="60" y="1098" font-family="${fontStack}" font-size="24" font-weight="500" fill="#0b0b0c" fill-opacity="0.55">Imagen de demostración — pendiente de fotografía real</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Portada genérica de marca (para el hero o las categorías).
 */
export function brandPlaceholder({ label = 'PARCHE Studio', accent = '#ff4d00' } = {}) {
  const safe = escapeXml(label);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1400" width="1200" height="1400" role="img" aria-label="${safe}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e9e9e6"/>
      <stop offset="1" stop-color="#d3d3ce"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="1400" fill="url(#g)"/>
  <circle cx="900" cy="380" r="420" fill="${accent}" fill-opacity="0.28"/>
  <circle cx="300" cy="1080" r="300" fill="#0b0b0c" fill-opacity="0.10"/>
  <g transform="translate(600 700) scale(6) translate(-50 -50)">
    <path d="${garmentPath('hoodie')}" fill="#0b0b0c" fill-opacity="0.78"/>
  </g>
  <text x="80" y="1320" font-family="Archivo, Inter, sans-serif" font-size="64" font-weight="800" fill="#0b0b0c">${safe}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Devuelve la imagen a mostrar para un producto (real si existe, si no generada). */
export function productImage(product, index = 0) {
  const real = product.images?.[index];
  if (real) return real;
  const firstColor = product.colors?.[0];
  return productPlaceholder({
    name: product.name,
    categoryName: categoryLabel(product.category),
    colorHex: COLORS[firstColor]?.hex ?? '#111112',
    garment: garmentFor(product.category),
    tag: product.tags?.includes('nuevo') ? 'Nuevo' : product.tags?.includes('rebaja') ? 'Rebaja' : '',
  });
}

/** Todos los recursos visuales de un producto (para la galería del detalle). */
export function productImages(product) {
  const real = Array.isArray(product.images) ? product.images : [];
  if (real.length > 0) return real;
  // Sin fotos: generamos 3 variantes (una por color disponible, hasta 3).
  const colors = (product.colors ?? ['negro']).slice(0, 3);
  return colors.map((colorId, i) =>
    productPlaceholder({
      name: product.name,
      categoryName: categoryLabel(product.category),
      colorHex: COLORS[colorId]?.hex ?? '#111112',
      garment: garmentFor(product.category),
      tag: i === 0 && product.tags?.includes('nuevo') ? 'Nuevo' : '',
    }),
  );
}

function garmentFor(categoryId) {
  return (
    {
      camisetas: 'tee',
      pantalones: 'pants',
      buzos: 'hoodie',
      chaquetas: 'jacket',
      accesorios: 'cap',
    }[categoryId] ?? 'tee'
  );
}

function categoryLabel(categoryId) {
  return (
    {
      camisetas: 'Camisetas',
      pantalones: 'Pantalones',
      buzos: 'Buzos y Hoodies',
      chaquetas: 'Chaquetas',
      accesorios: 'Accesorios',
    }[categoryId] ?? 'Catálogo'
  );
}

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

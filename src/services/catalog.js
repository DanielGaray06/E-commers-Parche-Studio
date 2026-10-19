/* ===========================================================================
   Servicio de catálogo
   ---------------------------------------------------------------------------
   Encapsula toda la lógica de consulta, búsqueda, filtrado y ordenamiento.
   Las páginas nunca leen `products` directamente: siempre pasan por aquí.
   =========================================================================== */

import { products, categories, COLORS } from '../data/products.js';
import { normalizeText } from '../utils/dom.js';

/** Todos los productos (copia defensiva). */
export function getProducts() {
  return [...products];
}

export function getCategories() {
  return [...categories];
}

export function getCategory(id) {
  return categories.find((category) => category.id === id) ?? null;
}

export function categoryName(id) {
  return getCategory(id)?.name ?? 'Catálogo';
}

export function getProductById(id) {
  return products.find((product) => product.id === id) ?? null;
}

export function getProductBySlug(slug) {
  return products.find((product) => product.slug === slug) ?? null;
}

export function colorInfo(colorId) {
  return COLORS[colorId] ?? { name: colorId, hex: '#111112' };
}

export function isSoldOut(product) {
  return !product || product.stock <= 0;
}

/** Todas las tallas presentes en el catálogo, en orden lógico. */
export function getAllSizes() {
  const order = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const present = new Set(products.flatMap((product) => product.sizes));
  return [...present].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return String(a).localeCompare(String(b), 'es', { numeric: true });
  });
}

/** Todos los colores presentes en el catálogo. */
export function getAllColors() {
  const present = new Set(products.flatMap((product) => product.colors));
  return [...present].map((id) => ({ id, ...colorInfo(id) }));
}

/** Rango de precios real del catálogo (para el filtro de precio). */
export function getPriceRange() {
  const prices = products.map((product) => product.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

const SORTERS = {
  destacados: (a, b) =>
    Number(b.tags.includes('destacado')) - Number(a.tags.includes('destacado')) ||
    Number(isSoldOut(a)) - Number(isSoldOut(b)),
  recientes: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  'precio-asc': (a, b) => a.price - b.price,
  'precio-desc': (a, b) => b.price - a.price,
  nombre: (a, b) => a.name.localeCompare(b.name, 'es'),
};

export const SORT_OPTIONS = [
  { value: 'destacados', label: 'Destacados' },
  { value: 'recientes', label: 'Novedades' },
  { value: 'precio-asc', label: 'Precio: menor a mayor' },
  { value: 'precio-desc', label: 'Precio: mayor a menor' },
  { value: 'nombre', label: 'Nombre (A–Z)' },
];

/**
 * Filtra y ordena el catálogo.
 * @param {{ q?: string, categoria?: string, talla?: string, color?: string,
 *           min?: number, max?: number, orden?: string, soloDisponibles?: boolean }} filters
 */
export function filterProducts(filters = {}) {
  const {
    q = '',
    categoria = '',
    talla = '',
    color = '',
    min = null,
    max = null,
    orden = 'destacados',
    soloDisponibles = false,
  } = filters;

  const needle = normalizeText(q);

  let result = products.filter((product) => {
    if (categoria && product.category !== categoria) return false;
    if (talla && !product.sizes.includes(talla)) return false;
    if (color && !product.colors.includes(color)) return false;
    if (min != null && product.price < min) return false;
    if (max != null && product.price > max) return false;
    if (soloDisponibles && isSoldOut(product)) return false;

    if (needle) {
      const haystack = normalizeText(
        `${product.name} ${product.description} ${categoryName(product.category)}`,
      );
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  result = result.sort(SORTERS[orden] ?? SORTERS.destacados);
  return result;
}

/** Productos marcados como destacados. */
export function getFeatured(limit = 4) {
  return products
    .filter((product) => product.tags.includes('destacado'))
    .slice(0, limit);
}

/** Productos más recientes por fecha de creación. */
export function getNewest(limit = 4) {
  return [...products].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
}

/** Cantidad de productos por categoría (para los accesos rápidos). */
export function countByCategory(categoryId) {
  return products.filter((product) => product.category === categoryId).length;
}

/** Productos relacionados: misma categoría, distinto id. */
export function getRelated(product, limit = 4) {
  if (!product) return [];
  return products
    .filter((item) => item.category === product.category && item.id !== product.id)
    .slice(0, limit);
}

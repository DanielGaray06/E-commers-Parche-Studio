/* ===========================================================================
   Componente: tarjeta de producto
   ---------------------------------------------------------------------------
   Se usa en la portada, el catálogo y los relacionados.
   Regla de negocio: un producto agotado no ofrece acción de compra.
   =========================================================================== */

import { escapeHtml, escapeAttr } from '../utils/dom.js';
import { formatCurrency, discountPercent } from '../utils/format.js';
import { productImage } from '../utils/placeholder.js';
import { categoryName, colorInfo, isSoldOut } from '../services/catalog.js';
import { icon } from '../utils/icons.js';

/** ¿El producto tiene variantes triviales (una sola talla y un solo color)? */
export function isSimpleProduct(product) {
  return product.colors.length === 1 && product.sizes.length <= 1;
}

function badges(product, soldOut) {
  const items = [];
  if (soldOut) items.push('<span class="badge badge--out">Agotado</span>');
  if (product.tags.includes('nuevo')) items.push('<span class="badge badge--new">Nuevo</span>');
  if (product.tags.includes('destacado')) {
    items.push('<span class="badge badge--featured">Destacado</span>');
  }
  const discount = discountPercent(product.price, product.compareAtPrice);
  if (discount > 0) items.push(`<span class="badge badge--sale">-${discount}%</span>`);
  return items.join('');
}

function swatches(product) {
  return product.colors
    .slice(0, 5)
    .map((colorId) => {
      const color = colorInfo(colorId);
      return `<span class="swatch" style="--swatch:${color.hex}" title="${escapeAttr(color.name)}" aria-hidden="true"></span>`;
    })
    .join('');
}

/** Devuelve el HTML de la tarjeta. */
export function productCard(product, { eager = false } = {}) {
  const soldOut = isSoldOut(product);
  const href = `#/producto/${escapeAttr(product.slug)}`;
  const discount = discountPercent(product.price, product.compareAtPrice);
  const image = productImage(product);
  const simple = isSimpleProduct(product) && !soldOut;

  const action = soldOut
    ? `<span class="card__soldout">Sin stock por ahora</span>`
    : simple
      ? `<button class="btn btn--primary btn--block" type="button"
           data-action="add-simple"
           data-product-id="${escapeAttr(product.id)}"
           data-size="${escapeAttr(product.sizes[0] ?? '')}"
           data-color="${escapeAttr(product.colors[0] ?? '')}">
           ${icon('cart', { size: 18 })} Agregar
         </button>`
      : `<a class="btn btn--primary btn--block" href="${href}">
           Elegir talla y color
         </a>`;

  return `
    <article class="card ${soldOut ? 'is-soldout' : ''}">
      <a class="card__media" href="${href}" aria-label="Ver ${escapeAttr(product.name)}">
        <img
          src="${image}"
          alt="Portada provisional de ${escapeAttr(product.name)} — ${escapeAttr(categoryName(product.category))}"
          loading="${eager ? 'eager' : 'lazy'}"
          decoding="async"
          width="900" height="1125"
        />
        <span class="card__badges">${badges(product, soldOut)}</span>
      </a>
      <div class="card__body">
        <p class="card__cat">${escapeHtml(categoryName(product.category))}</p>
        <h3 class="card__title"><a href="${href}">${escapeHtml(product.name)}</a></h3>
        <p class="card__price">
          <span class="price">${formatCurrency(product.price)}</span>
          ${
            discount > 0
              ? `<s class="price--old">${formatCurrency(product.compareAtPrice)}</s>`
              : ''
          }
        </p>
        <div class="card__meta">
          <div class="card__swatches" role="img" aria-label="Colores disponibles: ${escapeAttr(
            product.colors.map((c) => colorInfo(c).name).join(', '),
          )}">${swatches(product)}</div>
          <p class="card__sizes">${escapeHtml(product.sizes.join(' · '))}</p>
        </div>
        <div class="card__actions">${action}</div>
      </div>
    </article>
  `;
}

/** Rejilla de tarjetas. */
export function productGrid(products, { className = '' } = {}) {
  if (products.length === 0) return '';
  return `<div class="product-grid ${className}">${products.map((p) => productCard(p)).join('')}</div>`;
}

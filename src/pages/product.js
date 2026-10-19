/* ===========================================================================
   Página: Detalle de producto
   ---------------------------------------------------------------------------
   La selección de talla y color es obligatoria: el botón de agregar valida
   antes de tocar el carrito (lo hace `main.js` al leer el DOM).
   =========================================================================== */

import { site } from '../config/site.config.js';
import { escapeHtml, escapeAttr } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { formatCurrency, discountPercent } from '../utils/format.js';
import { productImages } from '../utils/placeholder.js';
import { getProductBySlug, getRelated, categoryName, colorInfo, isSoldOut } from '../services/catalog.js';
import { productGrid } from '../components/productCard.js';
import { contactUrl } from '../services/whatsapp.js';

function galleryHtml(product, images) {
  const thumbs = images
    .map(
      (src, index) => `
      <button class="gallery__thumb ${index === 0 ? 'is-active' : ''}" type="button"
        data-action="gallery-select" data-index="${index}" aria-label="Ver imagen ${index + 1}">
        <img src="${escapeAttr(src)}" alt="" width="180" height="225" loading="lazy" />
      </button>`,
    )
    .join('');

  return `
    <div class="gallery" data-gallery>
      <div class="gallery__main">
        <img id="gallery-main" src="${escapeAttr(images[0])}"
          alt="Imagen de ${escapeAttr(product.name)} — ${escapeAttr(categoryName(product.category))}"
          width="900" height="1125" fetchpriority="high" />
        ${isSoldOut(product) ? '<span class="gallery__soldout badge badge--out">Agotado</span>' : ''}
      </div>
      ${images.length > 1 ? `<div class="gallery__thumbs" role="group" aria-label="Miniaturas">${thumbs}</div>` : ''}
    </div>
  `;
}

function colorOptions(product) {
  return product.colors
    .map((colorId, index) => {
      const color = colorInfo(colorId);
      return `
        <button class="option option--color" type="button"
          data-action="select-color" data-value="${escapeAttr(colorId)}" data-color-index="${index}"
          aria-pressed="false" aria-label="Color ${escapeAttr(color.name)}">
          <i class="option__swatch" style="--swatch:${color.hex}"></i>
          <span>${escapeHtml(color.name)}</span>
        </button>`;
    })
    .join('');
}

function sizeOptions(product) {
  return product.sizes
    .map(
      (size) => `
        <button class="option option--size" type="button"
          data-action="select-size" data-value="${escapeAttr(size)}"
          aria-pressed="false" aria-label="Talla ${escapeAttr(size)}">
          <span>${escapeHtml(size)}</span>
        </button>`,
    )
    .join('');
}

function detailsHtml(product) {
  const rows = [
    { label: 'Material', value: product.material },
    { label: 'Corte', value: product.fit },
    { label: 'Categoría', value: categoryName(product.category) },
  ].filter((row) => row.value);

  return `
    <div class="details">
      <details class="details__item" open>
        <summary>Descripción</summary>
        <p>${escapeHtml(product.description)}</p>
      </details>
      <details class="details__item">
        <summary>Ficha técnica</summary>
        <dl class="spec">
          ${rows.map((row) => `<div><dt>${escapeHtml(row.label)}</dt><dd>${escapeHtml(row.value)}</dd></div>`).join('')}
        </dl>
      </details>
      <details class="details__item">
        <summary>Envío y cobertura</summary>
        <p>
          Entregamos únicamente en ${escapeHtml(site.coverage.city)} y las zonas confirmadas por la tienda.
          El costo de envío se confirma por WhatsApp según tu barrio.
        </p>
        <p class="details__note">${icon('alert', { size: 15 })} ${escapeHtml(site.shipping.note)}</p>
      </details>
    </div>
  `;
}

export function productPage(route = {}) {
  const product = getProductBySlug(route.params?.slug ?? '');

  if (!product) {
    return `
      <div class="container">
        <div class="empty-state empty-state--wide">
          <span class="empty-state__icon">${icon('search', { size: 30 })}</span>
          <h1>No encontramos esta prenda</h1>
          <p>Puede que ya no esté en el catálogo o que el enlace esté escrito con otro nombre.</p>
          <a class="btn btn--primary" href="#/catalogo">Volver al catálogo</a>
        </div>
      </div>
    `;
  }

  const soldOut = isSoldOut(product);
  const images = productImages(product);
  const discount = discountPercent(product.price, product.compareAtPrice);
  const related = getRelated(product, 4);

  return `
    <div class="container product-page" data-product-root data-product-id="${escapeAttr(product.id)}"
      data-product-name="${escapeAttr(product.name)}">
      <nav class="breadcrumb" aria-label="Ruta de navegación">
        <ol>
          <li><a href="#/">Inicio</a></li>
          <li><a href="#/catalogo">Catálogo</a></li>
          <li><a href="#/catalogo?categoria=${escapeAttr(product.category)}">${escapeHtml(categoryName(product.category))}</a></li>
          <li aria-current="page">${escapeHtml(product.name)}</li>
        </ol>
      </nav>

      <div class="product-layout">
        ${galleryHtml(product, images)}

        <div class="product-info">
          <p class="product-info__cat">${escapeHtml(categoryName(product.category))}</p>
          <h1 class="product-info__title">${escapeHtml(product.name)}</h1>

          <div class="product-info__price">
            <span class="price price--lg">${formatCurrency(product.price)}</span>
            ${discount > 0 ? `<s class="price--old">${formatCurrency(product.compareAtPrice)}</s>` : ''}
            ${discount > 0 ? `<span class="badge badge--sale">-${discount}%</span>` : ''}
          </div>

          <p class="product-info__desc">${escapeHtml(product.description)}</p>

          <p class="product-info__stock ${soldOut ? 'is-out' : ''}" role="status">
            ${soldOut
              ? `${icon('alert', { size: 16 })} Producto agotado por ahora`
              : `${icon('check', { size: 16 })} Disponible${product.stock <= 5 ? ` — quedan ${product.stock} unidades` : ''}`}
          </p>

          ${
            soldOut
              ? `
            <div class="notice notice--warning">
              ${icon('alert', { size: 18 })}
              <p>Este producto no tiene stock en este momento. Escríbenos por WhatsApp para avisarte cuando llegue.</p>
            </div>
            <a class="btn btn--whatsapp btn--block btn--lg" target="_blank" rel="noopener noreferrer"
              href="${escapeAttr(contactUrl(`¡Hola! Me interesa "${product.name}" y quiero saber cuándo vuelve a estar disponible.`))}">
              ${icon('whatsapp', { size: 20 })} Avisarme por WhatsApp
            </a>
          `
              : `
            <div class="selector" role="group" aria-labelledby="color-label">
              <div class="selector__head">
                <span class="selector__label" id="color-label">Color</span>
                <span class="selector__value" data-color-value>Selecciona una opción</span>
              </div>
              <div class="options options--colors">${colorOptions(product)}</div>
            </div>

            <div class="selector" role="group" aria-labelledby="size-label">
              <div class="selector__head">
                <span class="selector__label" id="size-label">Talla</span>
                <span class="selector__value" data-size-value>Selecciona una opción</span>
              </div>
              <div class="options options--sizes">${sizeOptions(product)}</div>
            </div>

            <div class="selector selector--qty">
              <span class="selector__label">Cantidad</span>
              <div class="stepper stepper--lg" role="group" aria-label="Cantidad">
                <button class="stepper__btn" type="button" data-action="qty-decrement" aria-label="Menos">${icon('minus', { size: 18 })}</button>
                <input class="stepper__input" type="number" inputmode="numeric" min="1" max="${product.stock}"
                  value="1" step="1" data-qty-input aria-label="Cantidad" />
                <button class="stepper__btn" type="button" data-action="qty-increment" data-max="${product.stock}" aria-label="Más">${icon('plus', { size: 18 })}</button>
              </div>
            </div>

            <p class="form-message" id="product-message" role="alert" hidden></p>

            <button class="btn btn--accent btn--block btn--lg" type="button" data-action="add-to-cart">
              ${icon('cart', { size: 20 })} Agregar al carrito
            </button>

            <a class="btn btn--outline btn--block" href="${escapeAttr(contactUrl(`¡Hola! Tengo una pregunta sobre "${product.name}".`))}"
              target="_blank" rel="noopener noreferrer">
              ${icon('whatsapp', { size: 18 })} Preguntar por WhatsApp
            </a>
          `
          }

          <ul class="product-info__perks">
            <li>${icon('truck', { size: 18 })} Entrega en ${escapeHtml(site.coverage.city)}</li>
            <li>${icon('exchange', { size: 18 })} Cambios sujetos a condiciones de la tienda</li>
            <li>${icon('shield', { size: 18 })} Pago contra entrega</li>
          </ul>

          ${detailsHtml(product)}
        </div>
      </div>

      ${
        related.length > 0
          ? `
        <section class="section related" aria-labelledby="related-title">
          <div class="section-head">
            <h2 id="related-title">También te puede gustar</h2>
          </div>
          ${productGrid(related)}
        </section>`
          : ''
      }
    </div>
  `;
}

/** Imágenes del producto (para que main.js pueda cambiar la galería). */
export function productGalleryImages(slug) {
  const product = getProductBySlug(slug);
  return product ? productImages(product) : [];
}

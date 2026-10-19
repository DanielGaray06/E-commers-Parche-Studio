/* ===========================================================================
   Componente: carrito lateral (drawer)
   ---------------------------------------------------------------------------
   Muestra el resumen del pedido sin salir de la página. La finalización del
   pedido (datos del cliente y envío por WhatsApp) vive en #/carrito.
   =========================================================================== */

import { site } from '../config/site.config.js';
import { escapeHtml, escapeAttr, qs, lockScroll } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { formatCurrency } from '../utils/format.js';
import { colorInfo } from '../services/catalog.js';
import { getLines, getSubtotal, getShipping, getTotal, getCount, setQuantity, remove } from '../services/cart.js';
import { productImage } from '../utils/placeholder.js';
import { toast } from './toast.js';

export function cartDrawerHtml() {
  return `
    <div class="drawer-backdrop" data-action="close-cart"></div>
    <aside class="cart-drawer" id="cart-drawer" role="dialog" aria-modal="true"
      aria-label="Carrito de compras" aria-hidden="true">
      <header class="cart-drawer__head">
        <div>
          <h2 class="cart-drawer__title">Tu carrito</h2>
          <p class="cart-drawer__count" id="cart-drawer-count">0 artículos</p>
        </div>
        <button class="icon-btn" type="button" data-action="close-cart" aria-label="Cerrar carrito">
          ${icon('close', { size: 22 })}
        </button>
      </header>
      <div class="cart-drawer__body" id="cart-drawer-body"></div>
      <footer class="cart-drawer__foot" id="cart-drawer-foot"></footer>
    </aside>
  `;
}

function emptyState() {
  return `
    <div class="empty-state">
      <span class="empty-state__icon">${icon('cart', { size: 30 })}</span>
      <h3>Aún no tienes prendas</h3>
      <p>Explora el catálogo y agrega tus favoritas. Cuando termines, enviamos el pedido por WhatsApp.</p>
      <a class="btn btn--primary" href="#/catalogo" data-action="close-cart">Ver catálogo</a>
    </div>
  `;
}

function lineHtml(line) {
  const color = colorInfo(line.color);
  return `
    <article class="cart-line" data-key="${escapeAttr(line.key)}">
      <img class="cart-line__img" src="${escapeAttr(line.image)}" alt="" width="120" height="150" loading="lazy" />
      <div class="cart-line__info">
        <h3 class="cart-line__name">
          <a href="#/producto/${escapeAttr(line.product.slug)}" data-action="close-cart">${escapeHtml(line.product.name)}</a>
        </h3>
        <p class="cart-line__variant">
          ${line.size ? `<span>Talla ${escapeHtml(line.size)}</span>` : ''}
          <span class="cart-line__color"><i style="--swatch:${color.hex}"></i>${escapeHtml(color.name)}</span>
        </p>
        <p class="cart-line__price">${formatCurrency(line.unitPrice)} <span class="text-muted">c/u</span></p>

        <div class="cart-line__controls">
          <div class="stepper" role="group" aria-label="Cantidad de ${escapeAttr(line.product.name)}">
            <button class="stepper__btn" type="button" data-action="cart-decrement" data-key="${escapeAttr(line.key)}"
              aria-label="Quitar una unidad">${icon('minus', { size: 16 })}</button>
            <span class="stepper__value" aria-live="polite">${line.quantity}</span>
            <button class="stepper__btn" type="button" data-action="cart-increment" data-key="${escapeAttr(line.key)}"
              aria-label="Agregar una unidad">${icon('plus', { size: 16 })}</button>
          </div>
          <button class="link-btn" type="button" data-action="cart-remove" data-key="${escapeAttr(line.key)}">
            ${icon('trash', { size: 16 })} Eliminar
          </button>
        </div>
      </div>
      <p class="cart-line__total">${formatCurrency(line.lineTotal)}</p>
    </article>
  `;
}

function summaryHtml() {
  const shipping = getShipping();
  const shippingValue = shipping.isPending
    ? `<span class="pending">${escapeHtml(shipping.label)}</span>`
    : shipping.amount === 0
      ? '<span class="free">Gratis</span>'
      : formatCurrency(shipping.amount);

  return `
    <dl class="summary">
      <div class="summary__row"><dt>Subtotal</dt><dd>${formatCurrency(getSubtotal())}</dd></div>
      <div class="summary__row"><dt>Envío</dt><dd>${shippingValue}</dd></div>
      <div class="summary__row summary__row--total"><dt>Total estimado</dt><dd>${formatCurrency(getTotal())}</dd></div>
    </dl>
    <p class="summary__note">${icon('info', { size: 15 })} ${escapeHtml(site.shipping.note)}</p>
  `;
}

/** Vuelve a pintar el contenido del carrito lateral. */
export function renderCartDrawer() {
  const body = qs('#cart-drawer-body');
  const foot = qs('#cart-drawer-foot');
  const countLabel = qs('#cart-drawer-count');
  if (!body || !foot) return;

  const lines = getLines().map((line) => ({ ...line, image: productImage(line.product) }));

  const count = getCount();
  if (countLabel) countLabel.textContent = count === 1 ? '1 artículo' : `${count} artículos`;

  if (lines.length === 0) {
    body.innerHTML = emptyState();
    foot.innerHTML = '';
    return;
  }

  body.innerHTML = lines.map(lineHtml).join('');
  foot.innerHTML = `
    ${summaryHtml()}
    <a class="btn btn--accent btn--block btn--lg" href="#/carrito" data-action="close-cart">
      Finalizar pedido ${icon('arrowRight', { size: 18 })}
    </a>
    <button class="btn btn--ghost btn--block" type="button" data-action="close-cart">Seguir comprando</button>
  `;
}

/** Abre el carrito lateral. */
export function openCartDrawer() {
  const drawer = qs('#cart-drawer');
  const backdrop = qs('.drawer-backdrop');
  if (!drawer) return;
  renderCartDrawer();
  drawer.classList.add('is-open');
  backdrop?.classList.add('is-open');
  drawer.setAttribute('aria-hidden', 'false');
  lockScroll(true);
}

/** Cierra el carrito lateral. */
export function closeCartDrawer() {
  const drawer = qs('#cart-drawer');
  const backdrop = qs('.drawer-backdrop');
  if (!drawer || !drawer.classList.contains('is-open')) return;
  drawer.classList.remove('is-open');
  backdrop?.classList.remove('is-open');
  drawer.setAttribute('aria-hidden', 'true');
  // Solo se libera el scroll si no queda ninguna otra capa abierta.
  if (!qs('#mobile-menu.is-open') && !qs('.filters.is-open')) lockScroll(false);
}

/** Maneja las acciones del carrito lateral. Reutiliza el patrón de delegación. */
export function handleDrawerAction(action, key) {
  if (!key) return;
  if (action === 'cart-increment') {
    const result = incrementSafe(key, 1);
    if (!result.ok) toast(result.reason, { type: 'warning' });
  } else if (action === 'cart-decrement') {
    incrementSafe(key, -1);
  } else if (action === 'cart-remove') {
    remove(key);
    toast('Prenda eliminada del carrito.', { type: 'info' });
  }
}

function incrementSafe(key, delta) {
  const line = getLines().find((entry) => entry.key === key);
  if (!line) return { ok: false };
  return setQuantity(key, line.quantity + delta);
}

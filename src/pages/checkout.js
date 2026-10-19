/* ===========================================================================
   Página: Carrito y finalización del pedido por WhatsApp
   ---------------------------------------------------------------------------
   Flujo: carrito → datos de entrega → REVISIÓN del mensaje → abrir WhatsApp.
   Importante: abrir WhatsApp NO confirma el pedido. El mensaje lo indica y la
   tienda responde confirmando disponibilidad y condiciones.
   =========================================================================== */

import { site } from '../config/site.config.js';
import { escapeHtml, escapeAttr } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { formatCurrency } from '../utils/format.js';
import { productImage } from '../utils/placeholder.js';
import { colorInfo } from '../services/catalog.js';
import { getLines, getSubtotal, getShipping, getTotal, setQuantity, remove, validate } from '../services/cart.js';
import { buildOrderMessage, buildWhatsAppUrl, generateOrderRef, isPlaceholderNumber } from '../services/whatsapp.js';
import { validateCustomer, isWithinCoverage } from '../utils/validators.js';
import { toast } from '../components/toast.js';

/* --- Estado local de la página ------------------------------------------- */

const initialCustomer = () => ({
  nombre: '',
  barrio: '',
  entrega: 'domicilio',
  direccion: '',
  telefono: '',
  observaciones: '',
});

let state = { customer: initialCustomer(), reviewing: false, orderRef: null, errors: {} };

export function resetCheckout() {
  state = { customer: initialCustomer(), reviewing: false, orderRef: null, errors: {} };
}

export function updateCustomer(field, value) {
  if (field in state.customer) state.customer[field] = value;
}

/** Quita el error de un campo concreto (se llama mientras el cliente escribe). */
export function clearFieldError(field) {
  delete state.errors[field];
  delete state.errors.cart;
}

export function getCustomer() {
  return { ...state.customer };
}

export function isReviewing() {
  return state.reviewing;
}

export function setReviewing(value) {
  if (value && !state.orderRef) state.orderRef = generateOrderRef();
  state.reviewing = value;
}

/** Arma el objeto del pedido con datos reales del catálogo y del carrito. */
export function buildOrder() {
  return {
    lines: getLines(),
    customer: getCustomer(),
    subtotal: getSubtotal(),
    shipping: getShipping(),
    total: getTotal(),
    orderRef: state.orderRef ?? generateOrderRef(),
  };
}

export function buildMessage() {
  return buildOrderMessage(buildOrder());
}

/** Valida el carrito y los datos antes de pasar a la revisión. */
export function validateCheckout() {
  const cartCheck = validate();
  const customerCheck = validateCustomer(state.customer);
  const errors = { ...customerCheck.errors };
  if (cartCheck.issues.length > 0) errors.cart = cartCheck.issues.join(' ');
  return { valid: cartCheck.valid && customerCheck.valid, errors };
}

/* --- Render -------------------------------------------------------------- */

function emptyState() {
  return `
    <div class="container">
      <div class="empty-state empty-state--wide">
        <span class="empty-state__icon">${icon('cart', { size: 30 })}</span>
        <h1>Tu carrito está vacío</h1>
        <p>Agrega tus prendas favoritas y cuando termines enviamos el pedido por WhatsApp.</p>
        <div class="empty-state__actions">
          <a class="btn btn--primary btn--lg" href="#/catalogo">Explorar catálogo</a>
          <a class="btn btn--outline btn--lg" href="#/catalogo?orden=destacados">Ver destacados</a>
        </div>
      </div>
    </div>
  `;
}

function lineHtml(line) {
  const color = colorInfo(line.color);
  return `
    <article class="checkout-line" data-key="${escapeAttr(line.key)}">
      <a class="checkout-line__media" href="#/producto/${escapeAttr(line.product.slug)}">
        <img src="${escapeAttr(productImage(line.product))}" alt="" width="140" height="175" loading="lazy" />
      </a>
      <div class="checkout-line__info">
        <h3 class="checkout-line__name">
          <a href="#/producto/${escapeAttr(line.product.slug)}">${escapeHtml(line.product.name)}</a>
        </h3>
        <p class="checkout-line__variant">
          ${line.size ? `<span>Talla ${escapeHtml(line.size)}</span>` : ''}
          <span class="cart-line__color"><i style="--swatch:${color.hex}"></i>${escapeHtml(color.name)}</span>
        </p>
        <p class="checkout-line__unit">${formatCurrency(line.unitPrice)} c/u</p>
        <div class="checkout-line__controls">
          <div class="stepper" role="group" aria-label="Cantidad de ${escapeAttr(line.product.name)}">
            <button class="stepper__btn" type="button" data-action="cart-decrement" data-key="${escapeAttr(line.key)}" aria-label="Menos">${icon('minus', { size: 16 })}</button>
            <span class="stepper__value">${line.quantity}</span>
            <button class="stepper__btn" type="button" data-action="cart-increment" data-key="${escapeAttr(line.key)}" aria-label="Más">${icon('plus', { size: 16 })}</button>
          </div>
          <button class="link-btn" type="button" data-action="cart-remove" data-key="${escapeAttr(line.key)}">
            ${icon('trash', { size: 16 })} Eliminar
          </button>
        </div>
      </div>
      <p class="checkout-line__total">${formatCurrency(line.lineTotal)}</p>
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

function fieldError(errors, name) {
  return errors?.[name]
    ? `<p class="error" id="error-${name}">${escapeHtml(errors[name])}</p>`
    : '';
}

/**
 * Pista en vivo sobre la cobertura.
 * IMPORTANTE: es solo una ayuda visual; la tienda siempre confirma por WhatsApp.
 */
export function coverageHintHtml() {
  const barrio = String(state.customer.barrio ?? '').trim();
  if (barrio.length < 3) return '';
  return isWithinCoverage(barrio)
    ? `<p class="hint hint--ok">${icon('check', { size: 14 })} Tu zona figura en la cobertura provisional. La tienda lo confirma por WhatsApp.</p>`
    : `<p class="hint hint--warn">${icon('alert', { size: 14 })} ${escapeHtml(site.coverage.outsideMessage)}</p>`;
}

function formHtml(errors = {}) {
  const { customer } = state;
  const areas = site.coverage.areas.map((area) => `<option value="${escapeAttr(area)}"></option>`).join('');

  return `
    <form class="checkout-form" id="checkout-form" data-action="checkout-form" novalidate>
      <h2 class="checkout-form__title">${icon('truck', { size: 20 })} Datos de entrega</h2>

      <div class="field">
        <label for="c-nombre">Nombre completo <span aria-hidden="true">*</span></label>
        <input class="input" id="c-nombre" name="nombre" type="text" autocomplete="name"
          value="${escapeAttr(customer.nombre)}" placeholder="Ej: Daniel Garay"
          data-action="customer-input" aria-invalid="${Boolean(errors.nombre)}"
          ${errors.nombre ? 'aria-describedby="error-nombre"' : ''} required />
        ${fieldError(errors, 'nombre')}
      </div>

      <div class="field">
        <label for="c-barrio">Barrio o sector en ${escapeHtml(site.coverage.city)} <span aria-hidden="true">*</span></label>
        <input class="input" id="c-barrio" name="barrio" type="text" list="coverage-areas"
          value="${escapeAttr(customer.barrio)}" placeholder="Ej: El Poblado"
          data-action="customer-input" aria-invalid="${Boolean(errors.barrio)}"
          ${errors.barrio ? 'aria-describedby="error-barrio"' : ''} required />
        <datalist id="coverage-areas">${areas}</datalist>
        ${fieldError(errors, 'barrio')}
        <div id="coverage-hint">${coverageHintHtml()}</div>
      </div>

      <fieldset class="field">
        <legend>¿Cómo quieres recibirlo?</legend>
        <div class="radio-row">
          <label class="radio">
            <input type="radio" name="entrega" value="domicilio" data-action="customer-input"
              ${customer.entrega === 'domicilio' ? 'checked' : ''} />
            <span>Domicilio</span>
          </label>
          <label class="radio">
            <input type="radio" name="entrega" value="recoger" data-action="customer-input"
              ${customer.entrega === 'recoger' ? 'checked' : ''} />
            <span>Coordinar con la tienda</span>
          </label>
        </div>
      </fieldset>

      ${
        customer.entrega === 'domicilio'
          ? `
        <div class="field">
          <label for="c-direccion">Dirección de entrega <span aria-hidden="true">*</span></label>
          <input class="input" id="c-direccion" name="direccion" type="text" autocomplete="street-address"
            value="${escapeAttr(customer.direccion)}" placeholder="Ej: Cra 43 # 10-20, apto 301"
            data-action="customer-input" aria-invalid="${Boolean(errors.direccion)}"
            ${errors.direccion ? 'aria-describedby="error-direccion"' : ''} />
          ${fieldError(errors, 'direccion')}
        </div>`
          : ''
      }

      <div class="field">
        <label for="c-telefono">Número de contacto <span class="hint-inline">(opcional)</span></label>
        <input class="input" id="c-telefono" name="telefono" type="tel" autocomplete="tel"
          value="${escapeAttr(customer.telefono)}" placeholder="Ej: 300 000 0000"
          data-action="customer-input" aria-invalid="${Boolean(errors.telefono)}" />
        ${fieldError(errors, 'telefono')}
      </div>

      <div class="field">
        <label for="c-observaciones">Observaciones <span class="hint-inline">(opcional)</span></label>
        <textarea class="textarea" id="c-observaciones" name="observaciones" rows="3"
          placeholder="Ej: entregar después de las 6 p.m."
          data-action="customer-input">${escapeHtml(customer.observaciones)}</textarea>
        ${fieldError(errors, 'observaciones')}
      </div>

      ${errors.cart ? `<div class="notice notice--error">${icon('alert', { size: 18 })}<p>${escapeHtml(errors.cart)}</p></div>` : ''}

      <button class="btn btn--accent btn--block btn--lg" type="submit" data-action="review-order">
        ${icon('check', { size: 20 })} Revisar pedido
      </button>
      <p class="checkout-form__legal">
        Al continuar podrás revisar el mensaje antes de enviarlo. El pedido queda pendiente de confirmación por parte de la tienda.
      </p>
    </form>
  `;
}

function reviewHtml() {
  const order = buildOrder();
  const message = buildOrderMessage(order);
  const url = buildWhatsAppUrl(message);

  return `
    <section class="review" id="review" aria-labelledby="review-title">
      <div class="review__head">
        <h2 id="review-title">${icon('check', { size: 20 })} Revisa tu pedido</h2>
        <p>Verifica que todo esté correcto. Este es el mensaje exacto que enviarás por WhatsApp.</p>
      </div>

      ${
        isPlaceholderNumber()
          ? `<div class="notice notice--warning">${icon('alert', { size: 18 })}<p>
               El número de WhatsApp aún es un marcador de lugar (demostración). El propietario debe configurarlo en
               <code>src/config/site.config.js</code> antes de publicar el sitio.</p></div>`
          : ''
      }

      <pre class="review__preview" aria-label="Vista previa del mensaje">${escapeHtml(message)}</pre>

      <div class="review__actions">
        <a class="btn btn--whatsapp btn--lg btn--block" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer"
          data-action="send-whatsapp">
          ${icon('whatsapp', { size: 22 })} Enviar pedido por WhatsApp
        </a>
        <button class="btn btn--outline" type="button" data-action="copy-message">
          ${icon('tag', { size: 18 })} Copiar mensaje
        </button>
        <button class="btn btn--ghost" type="button" data-action="edit-order">
          ${icon('arrowLeft', { size: 18 })} Volver a editar
        </button>
      </div>

      <p class="review__note">
        ${icon('info', { size: 15 })}
        Al abrir WhatsApp el pedido <strong>no queda confirmado</strong>: la tienda te responderá para confirmar
        disponibilidad, costo de envío y tiempo de entrega.
      </p>
    </section>
  `;
}

export function checkoutPage() {
  if (getLines().length === 0) return emptyState();

  return `
    <div class="container checkout">
      <nav class="breadcrumb" aria-label="Ruta de navegación">
        <ol>
          <li><a href="#/">Inicio</a></li>
          <li aria-current="page">Carrito</li>
        </ol>
      </nav>

      <header class="page-head">
        <h1>Tu carrito</h1>
        <p>Revisa tus prendas, completa tus datos y envía el pedido por WhatsApp.</p>
      </header>

      <div class="checkout__layout">
        <div class="checkout__main">
          <section class="checkout__lines" aria-labelledby="lines-title">
            <h2 id="lines-title" class="checkout__lines-title">Prendas seleccionadas</h2>
            ${getLines().map(lineHtml).join('')}
            <button class="link-btn" type="button" data-action="cart-clear">${icon('trash', { size: 16 })} Vaciar carrito</button>
          </section>

          ${state.reviewing ? reviewHtml() : formHtml(state.errors)}
        </div>

        <aside class="checkout__aside" aria-label="Resumen del pedido">
          <div class="card-panel">
            <h2 class="card-panel__title">Resumen</h2>
            ${summaryHtml()}
            <a class="btn btn--outline btn--block" href="#/catalogo">${icon('arrowLeft', { size: 18 })} Seguir comprando</a>
          </div>

          <div class="card-panel card-panel--info">
            <h3 class="card-panel__title">${icon('mapPin', { size: 18 })} Cobertura</h3>
            <p>Entregamos solo en <strong>${escapeHtml(site.coverage.city)}</strong> y zonas confirmadas.</p>
            <p class="hint">${escapeHtml(site.coverage.disclaimer)}</p>
            <a class="link-arrow" href="#/informacion/cobertura">Ver zonas ${icon('arrowRight', { size: 16 })}</a>
          </div>
        </aside>
      </div>
    </div>
  `;
}

/* --- Acciones expuestas a main.js ---------------------------------------- */

/** Maneja incrementos/eliminaciones desde la página del carrito. */
export function handleCartLineAction(action, key) {
  if (!key) return;
  const line = getLines().find((entry) => entry.key === key);
  if (!line) return;

  if (action === 'cart-increment') {
    const result = setQuantity(key, line.quantity + 1);
    if (!result.ok && result.reason) toast(result.reason, { type: 'warning' });
  } else if (action === 'cart-decrement') {
    setQuantity(key, line.quantity - 1);
  } else if (action === 'cart-remove') {
    remove(key);
    toast('Prenda eliminada del carrito.', { type: 'info' });
  }
}

/** Intenta pasar a la revisión. Devuelve los errores si algo falta. */
export function tryReview() {
  const result = validateCheckout();
  if (result.valid) {
    state.errors = {};
    setReviewing(true);
    return { ok: true };
  }
  state.errors = result.errors;
  return { ok: false, errors: result.errors };
}

/** Copia el mensaje al portapapeles. */
export async function copyMessage() {
  const message = buildMessage();
  try {
    await navigator.clipboard.writeText(message);
    toast('Mensaje copiado al portapapeles.', { type: 'success' });
  } catch {
    // Respaldo para navegadores sin permiso de portapapeles.
    const area = document.createElement('textarea');
    area.value = message;
    document.body.append(area);
    area.select();
    document.execCommand('copy');
    area.remove();
    toast('Mensaje copiado.', { type: 'success' });
  }
}

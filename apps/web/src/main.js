/* ===========================================================================
   PARCHE Studio — punto de entrada
   ---------------------------------------------------------------------------
   Responsabilidades de este archivo:
     1. Montar el armazón del sitio (encabezado, contenido, pie, carrito).
     2. Escuchar el enrutador y pintar la página correspondiente.
     3. Centralizar los eventos por DELEGACIÓN (un solo listener por tipo).
     4. Mantener sincronizados el contador del carrito y el cajón lateral.

   Cualquier acción de la interfaz se declara con `data-action="..."` en el HTML
   y se resuelve en `handleAction()`. Así los componentes no necesitan registrar
   listeners propios.
   =========================================================================== */

import './styles/main.css';

import { site, applyRemoteConfig } from './config/site.config.js';
import { qs, qsa, lockScroll } from './utils/dom.js';
import { toast } from './components/toast.js';
import { headerHtml, updateCartBadge } from './components/header.js';
import { footerHtml } from './components/footer.js';
import {
  cartDrawerHtml,
  renderCartDrawer,
  openCartDrawer,
  closeCartDrawer,
} from './components/cartDrawer.js';
import { homePage } from './pages/home.js';
import { catalogPage } from './pages/catalog.js';
import { productPage, productGalleryImages } from './pages/product.js';
import * as checkout from './pages/checkout.js';
import { infoPage, notFoundPage } from './pages/info.js';
import { navigate, currentQuery, replaceQuery, startRouter } from './router.js';
import { init as initCart, subscribe as subscribeCart, add as addToCart, clear as clearCart } from './services/cart.js';
import { applyCatalog } from './services/catalog.js';
import { fetchBootstrap } from './services/api.js';

/* --- Referencias ---------------------------------------------------------- */

let currentRoute = { name: 'home', params: {}, query: {} };
let lastPath = '';

/* --- Armazón -------------------------------------------------------------- */

function mountShell() {
  const app = qs('#app');
  app.innerHTML = `
    ${headerHtml()}
    <main id="contenido" tabindex="-1"></main>
    ${footerHtml()}
    ${cartDrawerHtml()}
  `;
}

/* --- Render de páginas ---------------------------------------------------- */

const PAGES = {
  home: () => homePage(),
  catalog: (route) => catalogPage(route),
  product: (route) => productPage(route),
  checkout: () => checkout.checkoutPage(),
  info: (route) => infoPage(route),
  notFound: (route) => notFoundPage(route),
};

const TITLES = {
  home: `${site.brand.name} — Ropa urbana en ${site.brand.city}`,
  catalog: `Catálogo — ${site.brand.name}`,
  product: `Producto — ${site.brand.name}`,
  checkout: `Carrito — ${site.brand.name}`,
  info: `Información — ${site.brand.name}`,
  notFound: `Página no encontrada — ${site.brand.name}`,
};

function renderRoute(route, { scroll = true } = {}) {
  const target = qs('#contenido');
  if (!target) return;

  // Al salir del carrito se limpia el estado del formulario.
  if (currentRoute.name === 'checkout' && route.name !== 'checkout') checkout.resetCheckout();

  currentRoute = route;
  target.innerHTML = PAGES[route.name]?.(route) ?? notFoundPage(route);
  document.title = TITLES[route.name] ?? TITLES.home;

  updateCartBadge();
  renderCartDrawer();
  closeOverlays();

  if (scroll && route.path !== lastPath) {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
  lastPath = route.path;
}

/** Vuelve a pintar la ruta actual sin mover el scroll (para filtros, etc.). */
function rerender() {
  renderRoute(currentRoute, { scroll: false });
}

/* --- Superposiciones (menú, carrito, filtros) ---------------------------- */

function closeOverlays() {
  closeMobileMenu();
  closeFilters();
}

/** Libera el scroll solo si no queda ninguna capa abierta. */
function syncScrollLock() {
  const anyOpen =
    qs('.mobile-menu.is-open') || qs('.cart-drawer.is-open') || qs('.filters.is-open');
  lockScroll(Boolean(anyOpen));
}

function openMobileMenu() {
  const menu = qs('#mobile-menu');
  if (!menu) return;
  menu.classList.add('is-open');
  menu.setAttribute('aria-hidden', 'false');
  qs('[data-action="open-mobile-menu"]')?.setAttribute('aria-expanded', 'true');
  syncScrollLock();
  menu.querySelector('a, button')?.focus();
}

function closeMobileMenu() {
  const menu = qs('#mobile-menu');
  if (!menu || !menu.classList.contains('is-open')) return;
  menu.classList.remove('is-open');
  menu.setAttribute('aria-hidden', 'true');
  qs('[data-action="open-mobile-menu"]')?.setAttribute('aria-expanded', 'false');
  syncScrollLock();
}

function openFilters() {
  const panel = qs('#filters');
  if (!panel) return;
  panel.classList.add('is-open');
  qs('.filters-backdrop')?.classList.add('is-open');
  syncScrollLock();
}

function closeFilters() {
  const panel = qs('#filters');
  if (!panel || !panel.classList.contains('is-open')) return;
  panel.classList.remove('is-open');
  qs('.filters-backdrop')?.classList.remove('is-open');
  syncScrollLock();
}

/* --- Filtros y búsqueda -------------------------------------------------- */

function applyQuery(patch) {
  const next = { ...currentQuery(), ...patch };
  for (const [key, value] of Object.entries(next)) {
    if (value === null || value === '' || value === undefined) delete next[key];
  }
  replaceQuery(next);
  currentRoute = { ...currentRoute, query: next };
  rerender();
}

function doSearch(form) {
  const data = new FormData(form);
  const value = String(data.get('q') ?? '').trim();
  const query = value ? `?q=${encodeURIComponent(value)}` : '';
  closeMobileMenu();
  navigate(`/catalogo${query}`);
}

/* --- Carrito ------------------------------------------------------------- */

function handleAddToCart() {
  const root = qs('[data-product-root]');
  if (!root) return;

  const productId = root.dataset.productId;
  const color = qs('.option--color.is-selected', root)?.dataset.value ?? '';
  const size = qs('.option--size.is-selected', root)?.dataset.value ?? '';
  const quantity = Number(qs('[data-qty-input]', root)?.value ?? 1);

  if (!color) return productMessage('Selecciona un color para continuar.');
  if (!size) return productMessage('Selecciona una talla para continuar.');

  const result = addToCart({ productId, size, color, quantity });
  if (!result.ok) return productMessage(result.reason ?? 'No pudimos agregar la prenda.');

  clearProductMessage();
  toast('Prenda agregada al carrito.', { type: 'success' });
  openCartDrawer();
}

function productMessage(text) {
  const node = qs('#product-message');
  if (!node) {
    toast(text, { type: 'warning' });
    return;
  }
  node.textContent = text;
  node.hidden = false;
}

function clearProductMessage() {
  const node = qs('#product-message');
  if (node) {
    node.hidden = true;
    node.textContent = '';
  }
}

function handleSimpleAdd(button) {
  const result = addToCart({
    productId: button.dataset.productId,
    size: button.dataset.size ?? '',
    color: button.dataset.color ?? '',
    quantity: 1,
  });
  if (!result.ok) return toast(result.reason ?? 'No pudimos agregar la prenda.', { type: 'warning' });
  toast('Prenda agregada al carrito.', { type: 'success' });
  openCartDrawer();
}

/* --- Selección de variantes --------------------------------------------- */

function selectVariant(root, selector, button) {
  const group = qsa(selector, root);
  const wasSelected = button.classList.contains('is-selected');
  for (const option of group) {
    option.classList.remove('is-selected');
    option.setAttribute('aria-pressed', 'false');
  }
  if (!wasSelected) {
    button.classList.add('is-selected');
    button.setAttribute('aria-pressed', 'true');
  }
  clearProductMessage();
  return !wasSelected;
}

function updateVariantLabel(root) {
  const color = qs('.option--color.is-selected', root);
  const size = qs('.option--size.is-selected', root);
  const colorValue = qs('[data-color-value]', root);
  const sizeValue = qs('[data-size-value]', root);
  if (colorValue) colorValue.textContent = color ? color.textContent.trim() : 'Selecciona una opción';
  if (sizeValue) sizeValue.textContent = size ? size.textContent.trim() : 'Selecciona una opción';

  // Si la portada es generada, cada color tiene su propia variante de imagen.
  const images = productGalleryImages(currentRoute.params?.slug ?? '');
  if (color && images.length > 1) {
    const index = Number(color.dataset.colorIndex ?? 0);
    const main = qs('#gallery-main');
    if (main && images[index]) main.src = images[index];
  }
}

function setQuantityInput(delta, trigger) {
  const input = qs('[data-qty-input]');
  if (!input) return;
  const max = Number(trigger?.dataset.max ?? input.max ?? 99) || 99;
  const next = Math.min(max, Math.max(1, Number(input.value || 1) + delta));
  input.value = String(next);
}

function selectGalleryImage(button) {
  const images = productGalleryImages(currentRoute.params?.slug ?? '');
  const index = Number(button.dataset.index ?? 0);
  const main = qs('#gallery-main');
  if (main && images[index]) main.src = images[index];
  for (const thumb of qsa('.gallery__thumb')) thumb.classList.remove('is-active');
  button.classList.add('is-active');
}

/* --- Acciones ------------------------------------------------------------ */

function handleAction(action, target) {
  switch (action) {
    case 'open-mobile-menu':
      return openMobileMenu();
    case 'close-mobile-menu':
      return closeMobileMenu();
    case 'open-cart':
      return openCartDrawer();
    case 'close-cart':
      return closeCartDrawer();
    case 'open-filters':
      return openFilters();
    case 'close-filters':
      return closeFilters();

    case 'add-simple':
      return handleSimpleAdd(target);
    case 'add-to-cart':
      return handleAddToCart();

    case 'select-color': {
      const root = qs('[data-product-root]');
      if (!root) return;
      selectVariant(root, '.option--color', target);
      return updateVariantLabel(root);
    }
    case 'select-size': {
      const root = qs('[data-product-root]');
      if (!root) return;
      selectVariant(root, '.option--size', target);
      return updateVariantLabel(root);
    }
    case 'qty-increment':
      return setQuantityInput(1, target);
    case 'qty-decrement':
      return setQuantityInput(-1, target);
    case 'gallery-select':
      return selectGalleryImage(target);

    case 'cart-increment':
    case 'cart-decrement':
    case 'cart-remove':
      checkout.handleCartLineAction(action, target.dataset.key);
      if (currentRoute.name === 'checkout') rerender();
      return;

    case 'cart-clear':
      if (window.confirm('¿Vaciar el carrito por completo?')) {
        clearCart();
        checkout.resetCheckout();
        rerender();
      }
      return;

    case 'filter-set': {
      const { filter, value } = target.dataset;
      const isActive = String(currentQuery()[filter] ?? '') === String(value);
      return applyQuery({ [filter]: isActive ? null : value });
    }
    case 'filter-reset':
      return applyQuery({
        categoria: null,
        talla: null,
        color: null,
        min: null,
        max: null,
        disponibles: null,
        q: null,
      });
    case 'filter-clear-one':
      return applyQuery({ [target.dataset.filter]: null });

    case 'edit-order':
      checkout.setReviewing(false);
      return rerender();
    case 'copy-message':
      return checkout.copyMessage();

    default:
      return undefined;
  }
}

/* --- Listeners globales -------------------------------------------------- */

function onClick(event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;

  const action = target.dataset.action;

  // Los controles de formulario se manejan en los eventos 'input' / 'change'.
  if (target.matches('input, select, textarea')) return;
  // Los formularios se manejan en 'submit'.
  if (action === 'search-form' || action === 'checkout-form') return;
  // El enlace de WhatsApp se abre de forma nativa (target="_blank").
  if (action === 'send-whatsapp') return;

  // Nota: los enlaces con `href` siguen navegando; aquí solo ejecutamos
  // acciones adicionales como cerrar el carrito o el menú.
  handleAction(action, target);
}

async function onSubmit(event) {
  const form = event.target.closest('form[data-action]');
  if (!form) return;
  event.preventDefault();

  if (form.dataset.action === 'search-form') return doSearch(form);

  if (form.dataset.action === 'checkout-form') {
    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.dataset.label = submitButton.textContent ?? '';
      submitButton.textContent = 'Registrando pedido…';
    }

    const result = await checkout.tryReview();

    if (result.ok) {
      toast('Revisa tu pedido antes de enviarlo.', { type: 'info' });
      rerender();
      qs('#review')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // Se repinta el formulario para que aparezcan los mensajes de error.
      rerender();
      toast('Revisa los campos marcados.', { type: 'error' });
      const firstError = qs('[aria-invalid="true"]');
      firstError?.focus();
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }
}

function onInput(event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;

  if (target.dataset.action === 'customer-input') {
    if (target.type === 'radio' && !target.checked) return;
    checkout.updateCustomer(target.name, target.value);
    // El error de un campo desaparece en cuanto el cliente lo corrige.
    checkout.clearFieldError(target.name);
    qs(`#error-${target.name}`)?.remove();
    if (target.getAttribute('aria-invalid') === 'true') target.setAttribute('aria-invalid', 'false');
    if (target.name === 'barrio') updateCoverageHint();
  }
}

function onChange(event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;

  switch (action) {
    case 'sort':
      return applyQuery({ orden: target.value });
    case 'filter-number':
      return applyQuery({ [target.dataset.filter]: target.value });
    case 'filter-toggle-disponibles':
      return applyQuery({ disponibles: target.checked ? '1' : null });
    case 'customer-input': {
      // Radios (método de entrega): actualizar y repintar el formulario.
      checkout.updateCustomer(target.name, target.value);
      if (target.name === 'entrega') rerender();
      return;
    }
    default:
      return;
  }
}

function onKeydown(event) {
  if (event.key !== 'Escape') return;
  if (qs('.cart-drawer.is-open')) return closeCartDrawer();
  if (qs('.mobile-menu.is-open')) return closeMobileMenu();
  if (qs('.filters.is-open')) return closeFilters();
}

/** Actualiza en línea la pista de cobertura del formulario. */
function updateCoverageHint() {
  const holder = qs('#coverage-hint');
  if (holder) holder.innerHTML = checkout.coverageHintHtml();
}

/* --- Arranque ------------------------------------------------------------ */

function bootstrap() {
  // 1) Se intenta traer el catálogo y la configuración reales de la API.
  //    Si algo falla, se sigue con los datos del código: la tienda nunca se
  //    queda en blanco ni bloquea la compra por WhatsApp.
  void loadRemoteData().finally(() => {
    initCart();
    mountShell();

    subscribeCart(() => {
      updateCartBadge();
      renderCartDrawer();
    });

    startRouter((route) => renderRoute(route));

    document.addEventListener('click', onClick);
    document.addEventListener('submit', onSubmit);
    document.addEventListener('input', onInput);
    document.addEventListener('change', onChange);
    document.addEventListener('keydown', onKeydown);
  });
}

/** Carga catálogo + configuración desde la API (con respaldo silencioso). */
async function loadRemoteData() {
  const bootstrapData = await fetchBootstrap();
  if (!bootstrapData) {
    if (import.meta.env.DEV) {
      console.info(
        '[PARCHE] Usando el catálogo del código. Para ver los cambios del panel, arranca la API (pnpm dev:api).',
      );
    }
    return;
  }

  applyRemoteConfig(bootstrapData.config);
  applyCatalog(bootstrapData);
}

bootstrap();

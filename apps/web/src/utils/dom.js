/* ===========================================================================
   Utilidades de DOM
   ---------------------------------------------------------------------------
   La interfaz se renderiza con plantillas de texto (HTML) y se manejan los
   eventos por delegación desde `main.js`. Por eso la regla de oro de este
   módulo es: TODO dato que provenga del usuario debe pasar por `escapeHtml`.
   =========================================================================== */

const ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escapa caracteres peligrosos para insertarlos con seguridad en HTML. */
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

/** Escapa un valor para usarlo dentro de un atributo entre comillas dobles. */
export function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

export const qs = (selector, scope = document) => scope.querySelector(selector);
export const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

/**
 * Construye un elemento con atributos y contenido.
 * createElement('a', { href: '#/catalogo', class: 'btn' }, 'Ver catálogo')
 */
export function createElement(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value == null) continue;
    if (key === 'text') node.textContent = String(value);
    else if (key === 'html') node.innerHTML = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key === 'style' && typeof value === 'object') Object.assign(node.style, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, String(value));
  }
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

/** Une clases condicionales: classNames('btn', isActive && 'is-active'). */
export function classNames(...values) {
  return values.filter(Boolean).join(' ');
}

/** Quita acentos y normaliza para búsquedas tolerantes. */
export function normalizeText(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Reemplaza el contenido principal con una transición suave. */
export function renderInto(target, html) {
  target.innerHTML = html;
  return target;
}

/** Bloquea el scroll del body (para el carrito lateral y los modales). */
export function lockScroll(locked) {
  document.documentElement.style.overflow = locked ? 'hidden' : '';
}

/** Genera un id único y estable para relaciones ARIA. */
let idCounter = 0;
export function uid(prefix = 'id') {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

/** Atajo para no repetir el operador de coalescencia en plantillas. */
export function attr(name, value) {
  return value ? `${name}="${escapeAttr(value)}"` : '';
}

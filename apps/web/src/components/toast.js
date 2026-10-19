/* ===========================================================================
   Notificaciones (toasts)
   ---------------------------------------------------------------------------
   Se muestran en una región con aria-live="polite" definida en index.html, de
   modo que los lectores de pantalla anuncian los mensajes automáticamente.
   =========================================================================== */

import { icon } from '../utils/icons.js';
import { escapeHtml, qs } from '../utils/dom.js';

const ICONS = { info: 'info', success: 'check', error: 'alert', warning: 'alert' };
const MAX_VISIBLE = 3;

/**
 * Muestra una notificación temporal.
 * @param {string} message
 * @param {{ type?: 'info'|'success'|'error'|'warning', duration?: number }} options
 */
export function toast(message, { type = 'info', duration = 3600 } = {}) {
  const region = qs('#toasts');
  if (!region) return;

  // Evita acumular avisos en pantalla.
  while (region.children.length >= MAX_VISIBLE) region.firstElementChild.remove();

  const node = document.createElement('div');
  node.className = `toast toast--${type}`;
  node.innerHTML = `
    <span class="toast__icon">${icon(ICONS[type] ?? 'info', { size: 18 })}</span>
    <p class="toast__text">${escapeHtml(message)}</p>
    <button class="toast__close" type="button" aria-label="Cerrar aviso">
      ${icon('close', { size: 16 })}
    </button>
  `;

  const dismiss = () => {
    node.classList.add('is-leaving');
    node.addEventListener('animationend', () => node.remove(), { once: true });
    // Respaldo por si la animación no se dispara (prefers-reduced-motion).
    setTimeout(() => node.remove(), 400);
  };

  node.querySelector('.toast__close').addEventListener('click', dismiss);
  region.append(node);
  setTimeout(dismiss, duration);
}

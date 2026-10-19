/* ===========================================================================
   Utilidades de interfaz del panel
   ---------------------------------------------------------------------------
   Formato, escape de HTML, avisos flotantes, cajones, modales y el ayudante
   `bindActions`, que conecta los elementos con `data-action` con funciones.
   (Es la misma convención de la tienda: la interfaz declara intenciones y el
   código decide qué hacer, en un solo lugar por página.)
   =========================================================================== */

import { icon } from './icons.js';

/* --- Texto seguro --------------------------------------------------------- */

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const escapeAttr = escapeHtml;

/* --- Formato -------------------------------------------------------------- */

const LOCALE = 'es-CO';

export function formatCurrency(value, decimals = 0) {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

export function formatNumber(value) {
  return new Intl.NumberFormat(LOCALE).format(Number(value) || 0);
}

export function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(LOCALE, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(LOCALE, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "Hoy", "Ayer" o la fecha. */
export function formatDayLabel(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const diff = Math.round((today - target) / 86_400_000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  return formatDate(date);
}

/** "PS-261019-4821" → "PS-…-4821" en espacios estrechos. */
export function shortReference(reference) {
  const parts = String(reference ?? '').split('-');
  return parts.length === 3 ? `${parts[0]}-…-${parts[2]}` : String(reference ?? '');
}

/* --- Dominio -------------------------------------------------------------- */

export const STATUS_LABELS = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export const STATUS_ORDER = ['pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado'];

export function statusBadge(status) {
  const label = STATUS_LABELS[status] ?? status;
  return `<span class="badge badge--${escapeAttr(status)}">${escapeHtml(label)}</span>`;
}

export function channelBadge(channel) {
  return channel === 'manual'
    ? `<span class="badge badge--manual">Mostrador</span>`
    : `<span class="badge badge--whatsapp">WhatsApp</span>`;
}

/** Texto del cambio porcentual respecto al periodo anterior. */
export function deltaBadge(change) {
  if (change === null || change === undefined) {
    return `<span class="delta delta--flat">Sin datos previos</span>`;
  }
  if (change === 0) return `<span class="delta delta--flat">Igual que antes</span>`;
  const up = change > 0;
  return `<span class="delta delta--${up ? 'up' : 'down'}">${icon(up ? 'arrowUp' : 'arrowDown', { size: 12 })}${Math.abs(change)}%</span>`;
}

/* --- Avisos flotantes ----------------------------------------------------- */

const TOAST_ICONS = { success: 'check', error: 'alert', warning: 'alert', info: 'info' };

export function toast(message, { type = 'info', timeout = 4200 } = {}) {
  const region = document.getElementById('toasts');
  if (!region) return;

  const element = document.createElement('div');
  element.className = `toast toast--${type}`;
  element.innerHTML = `${icon(TOAST_ICONS[type] ?? 'info', { size: 18 })}<span>${escapeHtml(message)}</span>`;
  region.append(element);

  window.setTimeout(() => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(8px)';
    window.setTimeout(() => element.remove(), 240);
  }, timeout);
}

/* --- Conexión de acciones ------------------------------------------------- */

/**
 * Conecta los elementos con `data-action` del contenedor con funciones.
 * @param {HTMLElement} container
 * @param {{ click?: Record<string, Function>, submit?: Record<string, Function>,
 *           change?: Record<string, Function>, input?: Record<string, Function> }} handlers
 * @returns {() => void} función para desconectar
 */
export function bindActions(container, handlers = {}) {
  const listeners = [];

  for (const [type, map] of Object.entries(handlers)) {
    const listener = (event) => {
      const trigger = event.target.closest?.('[data-action]');
      if (!trigger || !container.contains(trigger)) return;
      const handler = map[trigger.dataset.action];
      if (!handler) return;
      if (type === 'submit' || type === 'click') event.preventDefault();
      handler(trigger, event);
    };
    container.addEventListener(type, listener);
    listeners.push([type, listener]);
  }

  return () => {
    for (const [type, listener] of listeners) container.removeEventListener(type, listener);
  };
}

/** Retrasa la ejecución hasta que el usuario deje de escribir. */
export function debounce(fn, delay = 320) {
  let timer = null;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}

/* --- Capas superiores ----------------------------------------------------- */

let currentOverlay = null;

function closeCurrentOverlay() {
  if (!currentOverlay) return;
  currentOverlay.remove();
  currentOverlay = null;
  document.body.style.overflow = '';
}

/**
 * Abre un cajón lateral o un modal.
 * @param {{ variant: 'drawer'|'modal', title: string, body: string,
 *           footer?: string, onMount?: (root: HTMLElement, close: Function) => void }} options
 */
export function openLayer({ variant = 'drawer', title, body, footer = '', onMount }) {
  closeCurrentOverlay();

  const root = document.createElement('div');
  root.innerHTML = `
    <div class="overlay" data-layer-overlay></div>
    <section class="${variant}" role="dialog" aria-modal="true" aria-label="${escapeAttr(title)}">
      <header class="drawer__head">
        <h2 class="drawer__title">${escapeHtml(title)}</h2>
        <button class="icon-btn" type="button" data-layer-close aria-label="Cerrar">${icon('close', { size: 18 })}</button>
      </header>
      <div class="drawer__body">${body}</div>
      ${footer ? `<footer class="drawer__foot">${footer}</footer>` : ''}
    </section>
  `;

  document.body.append(root);
  document.body.style.overflow = 'hidden';
  currentOverlay = root;

  const panel = root.querySelector(`.${variant}`);
  window.requestAnimationFrame(() => {
    root.querySelector('[data-layer-overlay]')?.classList.add('is-open');
    panel?.classList.add('is-open');
  });

  const close = () => closeCurrentOverlay();

  root.querySelector('[data-layer-close]')?.addEventListener('click', close);
  root.querySelector('[data-layer-overlay]')?.addEventListener('click', close);
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });

  const focusable = panel?.querySelector('input, select, textarea, button');
  focusable?.focus();

  onMount?.(root, close);
  return { root, close };
}

/** Confirmación con el estilo del panel. Devuelve una promesa booleana. */
export function confirmAction({ title, message, confirmLabel = 'Confirmar', danger = false }) {
  return new Promise((resolve) => {
    const { root, close } = openLayer({
      variant: 'modal',
      title,
      body: `<p>${escapeHtml(message)}</p>`,
      footer: `
        <button class="btn btn--ghost" type="button" data-confirm="no">Cancelar</button>
        <button class="btn ${danger ? 'btn--danger' : 'btn--primary'}" type="button" data-confirm="yes">
          ${escapeHtml(confirmLabel)}
        </button>
      `,
      onMount: (element, closeLayer) => {
        element.querySelectorAll('[data-confirm]').forEach((button) => {
          button.addEventListener('click', () => {
            const answer = button.dataset.confirm === 'yes';
            closeLayer();
            resolve(answer);
          });
        });
      },
    });

    // Si se cierra con Escape o clic fuera, se entiende como "no".
    const observer = new MutationObserver(() => {
      if (!document.body.contains(root)) {
        observer.disconnect();
        resolve(false);
      }
    });
    observer.observe(document.body, { childList: true });

    void close;
  });
}

/** Copia texto al portapapeles con respaldo para navegadores antiguos. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    document.body.append(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

/** Barra de paginación reutilizable. */
export function paginationHtml(page, pages, total, perPage) {
  if (pages <= 1) return '';
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);
  return `
    <div class="pagination">
      <span class="small muted">Mostrando ${from}–${to} de ${total}</span>
      <div class="row">
        <button class="btn btn--outline btn--sm" type="button" data-action="page" data-page="${page - 1}"
          ${page <= 1 ? 'disabled' : ''}>${icon('chevronLeft', { size: 16 })} Anterior</button>
        <span class="small muted">Página ${page} de ${pages}</span>
        <button class="btn btn--outline btn--sm" type="button" data-action="page" data-page="${page + 1}"
          ${page >= pages ? 'disabled' : ''}>Siguiente ${icon('chevronRight', { size: 16 })}</button>
      </div>
    </div>
  `;
}

/* ===========================================================================
   Panel de administración — armazón
   ---------------------------------------------------------------------------
   * Enrutado por hash (#/productos) para poder servirse como sitio estático.
   * Cada página se monta como un módulo con `mount(container, ctx)` y devuelve
     una función de limpieza. Así cada página controla su propio estado y sus
     eventos sin que este archivo crezca sin control.
   * Si no hay sesión, se muestra la pantalla de acceso y nada más: el panel no
     llega a pedir datos protegidos.
   =========================================================================== */

import './styles/admin.css';

import { api } from './lib/api.js';
import { clearSession, getUser, isAuthenticated, subscribe } from './lib/session.js';
import { escapeHtml, toast } from './lib/ui.js';
import { icon } from './lib/icons.js';

import { mountLogin } from './pages/login.js';
import { mountDashboard } from './pages/dashboard.js';
import { mountProducts } from './pages/products.js';
import { mountOrders } from './pages/orders.js';
import { mountSettings } from './pages/settings.js';

const STORE_URL = import.meta.env.VITE_STORE_URL ?? 'http://localhost:5173';

const ROUTES = [
  {
    path: '/',
    title: 'Tablero',
    subtitle: 'Cómo van las ventas y el inventario',
    icon: 'dashboard',
    mount: mountDashboard,
  },
  {
    path: '/productos',
    title: 'Productos',
    subtitle: 'Precios, stock, tallas y colores',
    icon: 'box',
    mount: mountProducts,
  },
  {
    path: '/pedidos',
    title: 'Pedidos',
    subtitle: 'Pedidos de WhatsApp y ventas de mostrador',
    icon: 'receipt',
    mount: mountOrders,
  },
  {
    path: '/ajustes',
    title: 'Ajustes',
    subtitle: 'Datos de la tienda, WhatsApp, cobertura y envío',
    icon: 'settings',
    mount: mountSettings,
  },
];

const app = document.getElementById('app');

let cleanup = null;
let pendingOrders = 0;
let shellSignature = null;

/* --- Navegación ----------------------------------------------------------- */

function parseHash() {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, queryString] = raw.split('?');
  const params = Object.fromEntries(new URLSearchParams(queryString ?? ''));
  return { path: path || '/', params };
}

export function navigate(path, params = {}) {
  const search = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  ).toString();
  window.location.hash = `#${path}${search ? `?${search}` : ''}`;
}

function currentRoute() {
  const { path, params } = parseHash();
  return { route: ROUTES.find((item) => item.path === path) ?? null, params, path };
}

/* --- Armazón -------------------------------------------------------------- */

function sidebarHtml(activePath, user) {
  const links = ROUTES.map((route) => {
    const badge =
      route.path === '/pedidos' && pendingOrders > 0
        ? `<span class="sidebar__badge">${pendingOrders}</span>`
        : '';
    return `
      <a class="sidebar__link ${route.path === activePath ? 'is-active' : ''}" href="#${route.path}">
        ${icon(route.icon, { size: 18 })}<span>${escapeHtml(route.title)}</span>${badge}
      </a>
    `;
  }).join('');

  return `
    <aside class="sidebar" id="sidebar">
      <div>
        <span class="sidebar__brand">PARCHE <em>STUDIO</em></span>
        <span class="sidebar__tag">Panel de administración</span>
      </div>

      <nav class="sidebar__nav" aria-label="Secciones del panel">${links}</nav>

      <div class="sidebar__footer">
        <div class="sidebar__user">
          <strong>${escapeHtml(user?.name ?? 'Sesión')}</strong>
          <span>${escapeHtml(user?.email ?? '')}</span>
        </div>
        <a class="sidebar__link" href="${escapeHtml(STORE_URL)}" target="_blank" rel="noopener noreferrer">
          ${icon('store', { size: 18 })}<span>Ver la tienda</span>${icon('external', { size: 14 })}
        </a>
        <button class="sidebar__link" type="button" data-action="logout">
          ${icon('logout', { size: 18 })}<span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
    <div class="overlay" id="nav-overlay" data-action="close-nav"></div>
  `;
}

function renderShell(activePath, route) {
  const user = getUser();
  const signature = `${activePath}|${user?.email ?? ''}|${pendingOrders}`;
  const existingSidebar = document.getElementById('sidebar');

  if (!existingSidebar) {
    app.innerHTML = `
      <aside class="sidebar" id="sidebar"></aside>
      <div class="overlay" id="nav-overlay" data-action="close-nav"></div>
      <div class="content">
        <header class="topbar">
          <button class="icon-btn mobile-nav-btn" type="button" data-action="open-nav" aria-label="Abrir menú">
            ${icon('menu', { size: 20 })}
          </button>
          <div>
            <h1 class="topbar__title" id="page-title"></h1>
            <p class="topbar__subtitle" id="page-subtitle"></p>
          </div>
          <span class="topbar__spacer"></span>
          <button class="btn btn--outline btn--sm" type="button" data-action="reload">
            ${icon('refresh', { size: 15 })} Actualizar
          </button>
        </header>
        <main class="main" id="contenido" tabindex="-1"></main>
      </div>
    `;
    shellSignature = null;
  }

  if (shellSignature !== signature) {
    document.getElementById('sidebar').outerHTML = sidebarHtml(activePath, user);
    document.getElementById('page-title').textContent = route.title;
    document.getElementById('page-subtitle').textContent = route.subtitle;
    shellSignature = signature;
  }
}

function closeNav() {
  document.getElementById('sidebar')?.classList.remove('is-open');
  document.getElementById('nav-overlay')?.classList.remove('is-open');
}

app.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-action]');
  if (!trigger) return;

  const action = trigger.dataset.action;
  if (action === 'logout') {
    clearSession();
    toast('Sesión cerrada.', { type: 'info' });
    return;
  }
  if (action === 'open-nav') {
    document.getElementById('sidebar')?.classList.add('is-open');
    document.getElementById('nav-overlay')?.classList.add('is-open');
    return;
  }
  if (action === 'close-nav') {
    closeNav();
    return;
  }
  if (action === 'reload') {
    void renderRoute({ force: true });
  }
});

/* --- Render de la ruta ---------------------------------------------------- */

async function renderRoute({ force = false } = {}) {
  const { route, params, path } = currentRoute();

  if (!isAuthenticated()) {
    cleanup?.();
    cleanup = null;
    shellSignature = null;
    await mountLogin(app);
    return;
  }

  if (!route) {
    navigate('/');
    return;
  }

  renderShell(path, route);
  closeNav();

  const container = document.getElementById('contenido');
  if (!container) return;

  // Si es la misma página y solo cambian los filtros, la propia página se
  // encarga de refrescar (evita parpadeos y peticiones dobles).
  if (!force) {
    cleanup?.();
    cleanup = null;
  }

  container.setAttribute('aria-busy', 'true');
  container.innerHTML = `
    <div class="card"><div class="empty">
      ${icon('refresh', { size: 26 })}
      <p>Cargando…</p>
    </div></div>
  `;

  try {
    cleanup = (await route.mount(container, { params, navigate })) ?? null;
  } catch (error) {
    container.innerHTML = `
      <div class="card"><div class="card__body">
        <div class="notice notice--danger">
          ${icon('alert', { size: 20 })}
          <div>
            <strong>No pude cargar esta sección.</strong>
            <p>${escapeHtml(error?.message ?? 'Error inesperado.')}</p>
          </div>
        </div>
        <div class="row mt-4">
          <button class="btn btn--primary" type="button" data-action="reload">${icon('refresh', { size: 16 })} Reintentar</button>
        </div>
      </div></div>
    `;
  } finally {
    container.removeAttribute('aria-busy');
  }

  // Refresca el contador de pedidos pendientes (se ve en la barra lateral).
  void refreshPendingBadge();
}

async function refreshPendingBadge() {
  if (!isAuthenticated()) return;
  try {
    const data = await api.dashboard(30);
    const next = data?.kpis?.pendingOrders ?? 0;
    if (next !== pendingOrders) {
      pendingOrders = next;
      shellSignature = null;
      const { route, path } = currentRoute();
      if (route) renderShell(path, route);
    }
  } catch {
    /* silencio: es solo un adorno */
  }
}

/* --- Ciclo de vida -------------------------------------------------------- */

window.addEventListener('hashchange', () => void renderRoute());

subscribe(() => {
  shellSignature = null;
  void renderRoute();
});

renderRoute();

/* ===========================================================================
   Enrutador por hash
   ---------------------------------------------------------------------------
   Se eligió "hash routing" (#/catalogo) porque permite desplegar el sitio en
   cualquier hosting estático sin configurar reescrituras del servidor.

   Rutas:
     #/                          → Inicio
     #/catalogo?categoria=buzos   → Catálogo con filtros en la URL
     #/producto/:slug            → Detalle de producto
     #/carrito                   → Carrito y finalización del pedido
     #/informacion/:slug         → Páginas informativas
   =========================================================================== */

/** Convierte el hash actual en un objeto de ruta. */
export function parseRoute(rawHash = window.location.hash) {
  const hash = String(rawHash).replace(/^#/, '') || '/';
  const [pathPart, queryPart] = hash.split('?');
  const segments = pathPart.split('/').filter(Boolean);
  const query = Object.fromEntries(new URLSearchParams(queryPart ?? ''));

  if (segments.length === 0) return { name: 'home', params: {}, query, path: '/' };

  switch (segments[0]) {
    case 'catalogo':
      return { name: 'catalog', params: {}, query, path: pathPart };
    case 'producto':
      return { name: 'product', params: { slug: segments[1] ?? '' }, query, path: pathPart };
    case 'carrito':
      return { name: 'checkout', params: {}, query, path: pathPart };
    case 'informacion':
      return { name: 'info', params: { slug: segments[1] ?? '' }, query, path: pathPart };
    default:
      return { name: 'notFound', params: { path: pathPart }, query, path: pathPart };
  }
}

/** Navega a una ruta. Si es la misma, solo actualiza los filtros. */
export function navigate(href) {
  const next = href.startsWith('#') ? href : `#${href}`;
  if (window.location.hash === next) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = next;
  }
}

/** Reemplaza el hash sin añadir una entrada al historial (útil para filtros). */
export function replaceQuery(query) {
  const route = parseRoute();
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== '' && value != null) params.set(key, value);
  }
  const qs = params.toString();
  const base = route.path || '/';
  history.replaceState(null, '', `#${base}${qs ? `?${qs}` : ''}`);
}

/** Devuelve el query actual de la ruta. */
export function currentQuery() {
  return parseRoute().query;
}

/**
 * Arranca el enrutador.
 * @param {(route: object) => void} handler
 */
export function startRouter(handler) {
  const run = () => handler(parseRoute());
  window.addEventListener('hashchange', run);

  // Si el usuario abre la página sin hash, lo mandamos a la portada.
  if (!window.location.hash) history.replaceState(null, '', '#/');
  run();

  return () => window.removeEventListener('hashchange', run);
}

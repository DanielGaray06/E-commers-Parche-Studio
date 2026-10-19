/* ===========================================================================
   Página: Catálogo
   ---------------------------------------------------------------------------
   Los filtros y el orden viven en la URL (#/catalogo?categoria=buzos&talla=M),
   por lo que esta página se limita a leerlos, delegar el filtrado al servicio
   y pintar el resultado.
   =========================================================================== */

import { escapeHtml } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { pluralize } from '../utils/format.js';
import { productGrid } from '../components/productCard.js';
import { filtersHtml, sortHtml, activeFilterCount, activeFilterTags } from '../components/filters.js';
import { filterProducts, getCategory } from '../services/catalog.js';

function numeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && value !== '' && value != null ? parsed : null;
}

/** Normaliza el query de la URL a los filtros que espera el servicio. */
export function readFilters(query = {}) {
  return {
    q: query.q ?? '',
    categoria: query.categoria ?? '',
    talla: query.talla ?? '',
    color: query.color ?? '',
    min: numeric(query.min),
    max: numeric(query.max),
    orden: query.orden ?? 'destacados',
    soloDisponibles: query.disponibles === '1',
  };
}

function emptyState() {
  return `
    <div class="empty-state empty-state--wide">
      <span class="empty-state__icon">${icon('search', { size: 30 })}</span>
      <h3>No encontramos prendas con esos filtros</h3>
      <p>Prueba con otra búsqueda, quita algún filtro o revisa el catálogo completo.</p>
      <div class="empty-state__actions">
        <button class="btn btn--primary" type="button" data-action="filter-reset">Limpiar filtros</button>
        <a class="btn btn--outline" href="#/catalogo">Ver todo el catálogo</a>
      </div>
    </div>
  `;
}

export function catalogPage(route = {}) {
  const query = route.query ?? {};
  const filters = readFilters(query);
  const results = filterProducts(filters);
  const category = filters.categoria ? getCategory(filters.categoria) : null;
  const activeCount = activeFilterCount(query);

  const title = filters.q
    ? `Resultados para “${filters.q}”`
    : category
      ? category.name
      : 'Todo el catálogo';

  const subtitle = category?.blurb ?? 'Prendas urbanas de uso diario, listas para pedir por WhatsApp.';

  return `
    <div class="container catalog">
      <nav class="breadcrumb" aria-label="Ruta de navegación">
        <ol>
          <li><a href="#/">Inicio</a></li>
          <li><a href="#/catalogo" ${category ? '' : 'aria-current="page"'}>Catálogo</a></li>
          ${category ? `<li aria-current="page">${escapeHtml(category.name)}</li>` : ''}
        </ol>
      </nav>

      <header class="page-head">
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(subtitle)}</p>
      </header>

      <div class="catalog__layout">
        <div class="filters-backdrop" data-action="close-filters"></div>

        <aside class="filters" id="filters" aria-label="Filtros del catálogo">
          <button class="filters__close icon-btn" type="button" data-action="close-filters" aria-label="Cerrar filtros">
            ${icon('close', { size: 22 })}
          </button>
          ${filtersHtml(query)}
        </aside>

        <section class="catalog__main">
          <div class="toolbar">
            <p class="toolbar__count" role="status">
              ${pluralize(results.length, 'prenda')}
            </p>
            <div class="toolbar__right">
              <button class="btn btn--outline filters-toggle" type="button" data-action="open-filters">
                ${icon('filter', { size: 18 })} Filtros${activeCount ? ` (${activeCount})` : ''}
              </button>
              ${sortHtml(query)}
            </div>
          </div>

          ${activeFilterTags(query)}

          ${results.length > 0 ? productGrid(results) : emptyState()}
        </section>
      </div>
    </div>
  `;
}

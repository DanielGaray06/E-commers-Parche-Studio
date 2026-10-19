/* ===========================================================================
   Componente: filtros del catálogo
   ---------------------------------------------------------------------------
   El estado de los filtros vive en la URL (#/catalogo?categoria=buzos&talla=M),
   lo que hace que la búsqueda sea compartible y permite usar "atrás" del
   navegador. Este componente solo pinta los controles; quien los aplica es
   `main.js` mediante delegación de eventos.
   =========================================================================== */

import { escapeHtml, escapeAttr } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { formatCurrency } from '../utils/format.js';
import {
  getCategories,
  getAllSizes,
  getAllColors,
  getPriceRange,
  SORT_OPTIONS,
} from '../services/catalog.js';

function isActive(query, filter, value) {
  return String(query[filter] ?? '') === String(value);
}

function chip({ action, filter, value, label, active, swatch }) {
  return `
    <button class="chip ${active ? 'is-active' : ''}" type="button"
      data-action="${action}" data-filter="${escapeAttr(filter)}" data-value="${escapeAttr(value)}"
      aria-pressed="${active ? 'true' : 'false'}">
      ${swatch ? `<i class="chip__swatch" style="--swatch:${swatch}"></i>` : ''}
      <span>${escapeHtml(label)}</span>
    </button>
  `;
}

function group(title, content, { hint } = {}) {
  return `
    <fieldset class="filter-group">
      <legend class="filter-group__title">${escapeHtml(title)}</legend>
      ${hint ? `<p class="filter-group__hint">${escapeHtml(hint)}</p>` : ''}
      <div class="filter-group__body">${content}</div>
    </fieldset>
  `;
}

/** Panel completo de filtros. */
export function filtersHtml(query = {}) {
  const categoryChips = getCategories()
    .map((category) =>
      chip({
        action: 'filter-set',
        filter: 'categoria',
        value: category.id,
        label: category.name,
        active: isActive(query, 'categoria', category.id),
      }),
    )
    .join('');

  const sizeChips = getAllSizes()
    .map((size) =>
      chip({
        action: 'filter-set',
        filter: 'talla',
        value: size,
        label: size,
        active: isActive(query, 'talla', size),
      }),
    )
    .join('');

  const colorChips = getAllColors()
    .map((color) =>
      chip({
        action: 'filter-set',
        filter: 'color',
        value: color.id,
        label: color.name,
        active: isActive(query, 'color', color.id),
        swatch: color.hex,
      }),
    )
    .join('');

  const range = getPriceRange();
  const showPrice = range.max > range.min;

  const priceGroup = showPrice
    ? group(
        'Precio',
        `<div class="price-range">
          <label class="price-range__field">
            <span>Desde</span>
            <input class="input" type="number" inputmode="numeric" min="${range.min}" max="${range.max}"
              step="5000" placeholder="${range.min}" value="${escapeAttr(query.min ?? '')}"
              data-action="filter-number" data-filter="min" aria-label="Precio mínimo" />
          </label>
          <span class="price-range__sep" aria-hidden="true">—</span>
          <label class="price-range__field">
            <span>Hasta</span>
            <input class="input" type="number" inputmode="numeric" min="${range.min}" max="${range.max}"
              step="5000" placeholder="${range.max}" value="${escapeAttr(query.max ?? '')}"
              data-action="filter-number" data-filter="max" aria-label="Precio máximo" />
          </label>
        </div>
        <p class="filter-group__hint">Catálogo entre ${formatCurrency(range.min)} y ${formatCurrency(range.max)}.</p>`,
        { hint: '' },
      )
    : '';

  const availability = `
    <label class="toggle">
      <input type="checkbox" data-action="filter-toggle-disponibles" ${query.disponibles === '1' ? 'checked' : ''} />
      <span class="toggle__track" aria-hidden="true"></span>
      <span class="toggle__label">Solo disponibles</span>
    </label>
  `;

  const count = activeFilterCount(query);

  return `
    <div class="filters__head">
      <h2 class="filters__title">${icon('filter', { size: 18 })} Filtros</h2>
      ${count > 0 ? `<button class="link-btn" type="button" data-action="filter-reset">Limpiar (${count})</button>` : ''}
    </div>

    <div class="filters__body">
      ${group('Categoría', `<div class="chips">${categoryChips}</div>`)}
      ${group('Talla', `<div class="chips">${sizeChips}</div>`)}
      ${group('Color', `<div class="chips chips--colors">${colorChips}</div>`)}
      ${priceGroup}
      ${group('Disponibilidad', availability)}
    </div>
  `;
}

/** Selector de orden para la barra de herramientas. */
export function sortHtml(query = {}) {
  const current = query.orden ?? 'destacados';
  const options = SORT_OPTIONS.map(
    (option) =>
      `<option value="${escapeAttr(option.value)}" ${option.value === current ? 'selected' : ''}>${escapeHtml(option.label)}</option>`,
  ).join('');
  return `
    <label class="sort">
      <span class="sort__label">Ordenar por</span>
      <span class="select-wrap">
        <select class="select" data-action="sort" aria-label="Ordenar productos">${options}</select>
        ${icon('chevronDown', { size: 18 })}
      </span>
    </label>
  `;
}

/** Número de filtros activos (para el botón "Limpiar"). */
export function activeFilterCount(query = {}) {
  const keys = ['categoria', 'talla', 'color', 'min', 'max'];
  return keys.filter((key) => query[key] != null && query[key] !== '').length + (query.disponibles === '1' ? 1 : 0);
}

/** Etiqueta legible del filtro activo (se muestra sobre la rejilla). */
export function activeFilterTags(query = {}) {
  const tags = [];
  const push = (label, key, value) => tags.push({ label, key, value });

  if (query.categoria) {
    const category = getCategories().find((item) => item.id === query.categoria);
    push(category?.name ?? query.categoria, 'categoria', query.categoria);
  }
  if (query.talla) push(`Talla ${query.talla}`, 'talla', query.talla);
  if (query.color) {
    const color = getAllColors().find((item) => item.id === query.color);
    push(color?.name ?? query.color, 'color', query.color);
  }
  if (query.min) push(`Desde ${formatCurrency(Number(query.min))}`, 'min', query.min);
  if (query.max) push(`Hasta ${formatCurrency(Number(query.max))}`, 'max', query.max);
  if (query.disponibles === '1') push('Solo disponibles', 'disponibles', '1');
  if (query.q) push(`“${query.q}”`, 'q', query.q);

  if (tags.length === 0) return '';
  return `
    <ul class="active-filters" aria-label="Filtros activos">
      ${tags
        .map(
          (tag) => `
        <li>
          <button class="tag-pill" type="button" data-action="filter-clear-one"
            data-filter="${escapeAttr(tag.key)}" data-value="${escapeAttr(tag.value)}">
            <span>${escapeHtml(tag.label)}</span> ${icon('close', { size: 14 })}
          </button>
        </li>`,
        )
        .join('')}
    </ul>
  `;
}

/* ===========================================================================
   Página: Productos
   ---------------------------------------------------------------------------
   Es el corazón del panel: precios, stock, tallas, colores y visibilidad.
   Los filtros viven en la URL (#/productos?estado=bajos) para poder compartir
   o marcar una vista concreta.
   =========================================================================== */

import { api } from '../lib/api.js';
import { bindActions, confirmAction, debounce, escapeAttr, escapeHtml, formatCurrency, formatNumber, openLayer, paginationHtml, toast } from '../lib/ui.js';
import { icon } from '../lib/icons.js';

const COMMON_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', '38', '40', 'Única'];
const TAGS = [
  { id: 'nuevo', label: 'Nuevo' },
  { id: 'destacado', label: 'Destacado' },
  { id: 'rebaja', label: 'Rebaja' },
];
const STATUS_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'activos', label: 'Publicados' },
  { value: 'inactivos', label: 'Ocultos' },
  { value: 'agotados', label: 'Agotados' },
  { value: 'bajos', label: 'Poco stock' },
];
const SORT_OPTIONS = [
  { value: 'recientes', label: 'Más recientes' },
  { value: 'nombre', label: 'Nombre (A–Z)' },
  { value: 'precio-desc', label: 'Precio: mayor a menor' },
  { value: 'precio-asc', label: 'Precio: menor a mayor' },
  { value: 'stock-asc', label: 'Menos stock primero' },
  { value: 'stock-desc', label: 'Más stock primero' },
];

/* --- Tabla ---------------------------------------------------------------- */

function stockCell(product) {
  return `
    <div class="row" style="gap:4px;flex-wrap:nowrap">
      <button class="icon-btn" type="button" data-action="stock-step" data-id="${escapeAttr(product.id)}" data-delta="-1"
        aria-label="Quitar una unidad de ${escapeAttr(product.name)}" ${product.stock <= 0 ? 'disabled' : ''}>${icon('minus', { size: 14 })}</button>
      <input class="input" type="number" min="0" step="1" value="${product.stock}"
        data-action="stock-set" data-id="${escapeAttr(product.id)}"
        aria-label="Stock de ${escapeAttr(product.name)}"
        style="width:4.6rem;text-align:center;padding:var(--sp-2)" />
      <button class="icon-btn" type="button" data-action="stock-step" data-id="${escapeAttr(product.id)}" data-delta="1"
        aria-label="Añadir una unidad de ${escapeAttr(product.name)}">${icon('plus', { size: 14 })}</button>
    </div>
  `;
}

function rowHtml(product, threshold) {
  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? `<span class="cell-sub"><s>${formatCurrency(product.compareAtPrice)}</s></span>`
      : '';

  const stockBadge =
    product.stock === 0
      ? '<span class="badge badge--danger">Agotado</span>'
      : product.stock <= threshold
        ? `<span class="badge badge--warning">${product.stock} u</span>`
        : '';

  return `
    <tr>
      <td>
        <span class="cell-strong">${escapeHtml(product.name)}</span>
        <span class="cell-sub">${escapeHtml(product.sku)} · ${escapeHtml(product.category)}</span>
      </td>
      <td class="num">
        ${formatCurrency(product.price)}
        ${discount}
      </td>
      <td>${stockCell(product)}</td>
      <td>
        ${product.sizes.length > 0 ? `<span class="cell-sub">${escapeHtml(product.sizes.join(' · '))}</span>` : '<span class="muted small">—</span>'}
        <span class="cell-sub">${formatNumber(product.colors.length)} color(es)</span>
      </td>
      <td class="nowrap">
        ${product.active ? '<span class="badge badge--on">Publicado</span>' : '<span class="badge badge--off">Oculto</span>'}
        ${stockBadge}
      </td>
      <td>
        <div class="actions">
          <button class="icon-btn" type="button" data-action="edit" data-id="${escapeAttr(product.id)}"
            aria-label="Editar ${escapeAttr(product.name)}">${icon('pencil', { size: 15 })}</button>
          <button class="icon-btn" type="button" data-action="toggle" data-id="${escapeAttr(product.id)}" data-active="${product.active}"
            aria-label="${product.active ? 'Ocultar' : 'Publicar'} ${escapeAttr(product.name)}">
            ${icon(product.active ? 'eyeOff' : 'eye', { size: 15 })}
          </button>
          <button class="icon-btn icon-btn--danger" type="button" data-action="remove" data-id="${escapeAttr(product.id)}"
            data-name="${escapeAttr(product.name)}" aria-label="Eliminar ${escapeAttr(product.name)}">${icon('trash', { size: 15 })}</button>
        </div>
      </td>
    </tr>
  `;
}

function pageHtml(data, state, categories) {
  const rows = data.items.map((product) => rowHtml(product, data.lowStockThreshold)).join('');

  return `
    <section class="card">
      <div class="toolbar">
        <label class="toolbar__search">
          <span class="visually-hidden"></span>
          ${icon('search', { size: 16 })}
          <input class="input" type="search" placeholder="Buscar por nombre, SKU o descripción…"
            value="${escapeAttr(state.q)}" data-action="search" aria-label="Buscar productos" />
        </label>

        <select class="select" data-action="filter-category" aria-label="Filtrar por categoría" style="width:auto">
          <option value="">Todas las categorías</option>
          ${categories
            .map(
              (category) =>
                `<option value="${escapeAttr(category.id)}" ${state.categoria === category.id ? 'selected' : ''}>${escapeHtml(category.name)} (${category.productCount ?? 0})</option>`,
            )
            .join('')}
        </select>

        <select class="select" data-action="filter-status" aria-label="Filtrar por estado" style="width:auto">
          ${STATUS_OPTIONS.map(
            (option) => `<option value="${option.value}" ${state.estado === option.value ? 'selected' : ''}>${escapeHtml(option.label)}</option>`,
          ).join('')}
        </select>

        <select class="select" data-action="sort" aria-label="Ordenar" style="width:auto">
          ${SORT_OPTIONS.map(
            (option) => `<option value="${option.value}" ${state.orden === option.value ? 'selected' : ''}>${escapeHtml(option.label)}</option>`,
          ).join('')}
        </select>

        <span class="toolbar__spacer"></span>

        <button class="btn btn--accent" type="button" data-action="new">
          ${icon('plus', { size: 16 })} Nuevo producto
        </button>
      </div>

      ${
        data.items.length === 0
          ? `<div class="empty">
               ${icon('box', { size: 30 })}
               <h3>No hay productos con estos filtros</h3>
               <p>Cambia la búsqueda o crea uno nuevo.</p>
               <button class="btn btn--primary" type="button" data-action="reset">Limpiar filtros</button>
             </div>`
          : `<div class="table-wrap">
               <table class="table">
                 <thead>
                   <tr>
                     <th>Producto</th>
                     <th class="num">Precio</th>
                     <th>Stock</th>
                     <th>Tallas y colores</th>
                     <th>Estado</th>
                     <th></th>
                   </tr>
                 </thead>
                 <tbody>${rows}</tbody>
               </table>
             </div>
             ${paginationHtml(data.page, data.pages, data.total, data.perPage)}`
      }
    </section>

    <p class="small muted">
      Se muestran ${formatNumber(data.total)} producto(s). Los cambios de stock y precio se publican en la tienda de inmediato.
    </p>
  `;
}

/* --- Editor --------------------------------------------------------------- */

function chipsHtml(items, selected, action, { withColor = false } = {}) {
  return items
    .map((item) => {
      const id = typeof item === 'string' ? item : item.id;
      const label = typeof item === 'string' ? item : item.name ?? item.label;
      const on = selected.includes(id);
      const dot = withColor ? `<span class="chip__dot" style="--swatch:${escapeAttr(item.hex)}"></span>` : '';
      return `<button class="chip ${withColor ? 'chip--color' : ''} ${on ? 'is-on' : ''}" type="button"
        data-action="${action}" data-value="${escapeAttr(id)}" aria-pressed="${on}">${dot}${escapeHtml(label)}</button>`;
    })
    .join('');
}

function productFormHtml(product, categories, colors) {
  const isNew = !product;
  const value = (key, fallback = '') => escapeAttr(product?.[key] ?? fallback);

  return `
    <form id="product-form" novalidate>
      <div class="field">
        <label for="p-name">Nombre</label>
        <input class="input" id="p-name" name="name" value="${value('name')}" maxlength="160" required />
        <p class="error-text hidden" data-error="name"></p>
      </div>

      <div class="field-row">
        <div class="field">
          <label for="p-price">Precio (COP)</label>
          <input class="input" id="p-price" name="price" type="number" min="0" step="1000" value="${product?.price ?? ''}" required />
          <p class="error-text hidden" data-error="price"></p>
        </div>
        <div class="field">
          <label for="p-compare">Precio anterior (opcional)</label>
          <input class="input" id="p-compare" name="compareAtPrice" type="number" min="0" step="1000"
            value="${product?.compareAtPrice ?? ''}" placeholder="Para mostrar descuento" />
        </div>
      </div>

      <div class="field-row">
        <div class="field">
          <label for="p-category">Categoría</label>
          <select class="select" id="p-category" name="categoryId" required>
            ${categories
              .map(
                (category) =>
                  `<option value="${escapeAttr(category.id)}" ${product?.category === category.id ? 'selected' : ''}>${escapeHtml(category.name)}</option>`,
              )
              .join('')}
          </select>
          <p class="error-text hidden" data-error="categoryId"></p>
        </div>
        <div class="field">
          <label for="p-stock">Stock</label>
          <input class="input" id="p-stock" name="stock" type="number" min="0" step="1" value="${product?.stock ?? 0}" required />
          <p class="error-text hidden" data-error="stock"></p>
        </div>
      </div>

      <div class="field">
        <span class="label">Tallas</span>
        <div class="chip-list" id="size-chips">
          ${chipsHtml(COMMON_SIZES, product?.sizes ?? [], 'toggle-size')}
        </div>
        <input class="input mt-4" id="p-sizes-extra" placeholder="Otras tallas separadas por comas (opcional)"
          value="${escapeAttr((product?.sizes ?? []).filter((size) => !COMMON_SIZES.includes(size)).join(', '))}" />
      </div>

      <div class="field">
        <span class="label">Colores</span>
        <div class="chip-list" id="color-chips">
          ${chipsHtml(colors, product?.colors ?? [], 'toggle-color', { withColor: true })}
        </div>
        <p class="field__hint">La paleta se administra en Ajustes → Colores.</p>
      </div>

      <div class="field">
        <span class="label">Etiquetas</span>
        <div class="chip-list" id="tag-chips">
          ${chipsHtml(TAGS, product?.tags ?? [], 'toggle-tag')}
        </div>
      </div>

      <div class="field-row">
        <div class="field">
          <label for="p-material">Material</label>
          <input class="input" id="p-material" name="material" value="${value('material')}" maxlength="160" />
        </div>
        <div class="field">
          <label for="p-fit">Corte</label>
          <input class="input" id="p-fit" name="fit" value="${value('fit')}" maxlength="120" />
        </div>
      </div>

      <div class="field">
        <label for="p-description">Descripción</label>
        <textarea class="textarea" id="p-description" name="description" maxlength="4000">${escapeHtml(product?.description ?? '')}</textarea>
      </div>

      <div class="field-row">
        <div class="field">
          <label for="p-slug">Identificador en la URL (opcional)</label>
          <input class="input" id="p-slug" name="slug" value="${value('slug')}" maxlength="160" />
          <p class="field__hint">Si lo dejas vacío se genera del nombre.</p>
        </div>
        <div class="field">
          <label for="p-sku">SKU (opcional)</label>
          <input class="input" id="p-sku" name="sku" value="${value('sku')}" maxlength="64" />
        </div>
      </div>

      <label class="check">
        <input type="checkbox" id="p-active" name="active" ${product?.active === false ? '' : 'checked'} />
        <span>Publicado en la tienda</span>
      </label>

      <p class="small muted mt-4">
        ${isNew ? 'El producto se creará publicado.' : `Creado el ${escapeHtml(new Date(product.createdAt).toLocaleDateString('es-CO'))}.`}
      </p>
    </form>
  `;
}

/* --- Lógica de la página -------------------------------------------------- */

export async function mountProducts(container, ctx) {
  const state = {
    q: ctx.params.q ?? '',
    categoria: ctx.params.categoria ?? '',
    estado: ctx.params.estado ?? 'todos',
    orden: ctx.params.orden ?? 'recientes',
    page: Number(ctx.params.pagina) || 1,
    perPage: 20,
  };

  let categories = [];
  let colors = [];
  let lastData = null;

  async function loadLookups() {
    const [categoriesResponse, settingsResponse] = await Promise.all([
      api.categories.list(),
      api.settings.get(),
    ]);
    categories = categoriesResponse.items;
    colors = settingsResponse.colors;
  }

  async function refresh({ syncUrl = false } = {}) {
    if (syncUrl) {
      ctx.navigate('/productos', {
        q: state.q || undefined,
        categoria: state.categoria || undefined,
        estado: state.estado !== 'todos' ? state.estado : undefined,
        orden: state.orden !== 'recientes' ? state.orden : undefined,
        pagina: state.page > 1 ? state.page : undefined,
      });
    }
    lastData = await api.products.list(state);
    container.innerHTML = pageHtml(lastData, state, categories);
  }

  await loadLookups();
  await refresh();

  /* --- Acciones de la tabla --------------------------------------------- */

  bindActions(container, {
    input: {
      search: debounce((input) => {
        state.q = input.value.trim();
        state.page = 1;
        refresh({ syncUrl: true }).catch((error) => toast(error.message, { type: 'error' }));
      }, 340),
    },
    change: {
      'filter-category': (select) => {
        state.categoria = select.value;
        state.page = 1;
        refresh({ syncUrl: true }).catch((error) => toast(error.message, { type: 'error' }));
      },
      'filter-status': (select) => {
        state.estado = select.value;
        state.page = 1;
        refresh({ syncUrl: true }).catch((error) => toast(error.message, { type: 'error' }));
      },
      sort: (select) => {
        state.orden = select.value;
        state.page = 1;
        refresh({ syncUrl: true }).catch((error) => toast(error.message, { type: 'error' }));
      },
      'stock-set': async (input) => {
        const value = Math.max(0, Math.floor(Number(input.value) || 0));
        try {
          const { product } = await api.products.patchStock(input.dataset.id, { stock: value });
          input.value = product.stock;
          toast(`Stock de ${product.name}: ${product.stock} unidades.`, { type: 'success' });
          await refresh();
        } catch (error) {
          toast(error.message, { type: 'error' });
          await refresh();
        }
      },
    },
    click: {
      reset: () => {
        Object.assign(state, { q: '', categoria: '', estado: 'todos', orden: 'recientes', page: 1 });
        refresh({ syncUrl: true }).catch((error) => toast(error.message, { type: 'error' }));
      },
      page: (button) => {
        const next = Number(button.dataset.page);
        if (!Number.isFinite(next) || next < 1) return;
        state.page = next;
        refresh({ syncUrl: true })
          .then(() => container.scrollIntoView({ block: 'start' }))
          .catch((error) => toast(error.message, { type: 'error' }));
      },
      'stock-step': async (button) => {
        const delta = Number(button.dataset.delta);
        try {
          const { product } = await api.products.patchStock(button.dataset.id, { delta });
          toast(`Stock de ${product.name}: ${product.stock} unidades.`, { type: 'success' });
          await refresh();
        } catch (error) {
          toast(error.message, { type: 'error' });
        }
      },
      toggle: async (button) => {
        const active = button.dataset.active !== 'true';
        try {
          const { product } = await api.products.update(button.dataset.id, { active });
          toast(product.active ? `${product.name} se publicó en la tienda.` : `${product.name} se ocultó de la tienda.`, {
            type: 'success',
          });
          await refresh();
        } catch (error) {
          toast(error.message, { type: 'error' });
        }
      },
      remove: async (button) => {
        const confirmed = await confirmAction({
          title: 'Eliminar producto',
          message: `¿Seguro que quieres eliminar «${button.dataset.name}»? El histórico de ventas se conserva, pero el producto desaparece de la tienda y no se puede deshacer.`,
          confirmLabel: 'Eliminar',
          danger: true,
        });
        if (!confirmed) return;

        try {
          await api.products.remove(button.dataset.id);
          toast('Producto eliminado.', { type: 'success' });
          await loadLookups();
          await refresh();
        } catch (error) {
          toast(error.message, { type: 'error' });
        }
      },
      edit: async (button) => {
        try {
          const { product } = await api.products.get(button.dataset.id);
          openProductEditor(product);
        } catch (error) {
          toast(error.message, { type: 'error' });
        }
      },
      new: () => openProductEditor(null),
    },
  });

  /* --- Editor ------------------------------------------------------------ */

  function openProductEditor(product) {
    const selected = {
      sizes: [...(product?.sizes ?? [])],
      colors: [...(product?.colors ?? [])],
      tags: [...(product?.tags ?? [])],
    };
    const isNew = !product;
    const extraSizes = () => selected.sizes.filter((size) => !COMMON_SIZES.includes(size));

    const { root } = openLayer({
      variant: 'drawer',
      title: isNew ? 'Nuevo producto' : `Editar: ${product.name}`,
      body: productFormHtml(product, categories, colors),
      footer: `
        <button class="btn btn--ghost" type="button" data-cancel>Cancelar</button>
        <button class="btn btn--accent" type="submit" form="product-form">
          ${icon('check', { size: 16 })} ${isNew ? 'Crear producto' : 'Guardar cambios'}
        </button>
      `,
    });

    // El formulario vive en el cuerpo del cajón; se envía desde el botón del pie.
    const form = root.querySelector('#product-form');
    const footer = root.querySelector('.drawer__foot');
    form.id = 'product-form';

    root.querySelector('[data-cancel]')?.addEventListener('click', () => root.querySelector('[data-layer-close]')?.click());

    /* Chips */
    function repaint() {
      const sizeBox = root.querySelector('#size-chips');
      const colorBox = root.querySelector('#color-chips');
      const tagBox = root.querySelector('#tag-chips');
      if (sizeBox) sizeBox.innerHTML = chipsHtml(COMMON_SIZES, selected.sizes, 'toggle-size');
      if (colorBox) colorBox.innerHTML = chipsHtml(colors, selected.colors, 'toggle-color', { withColor: true });
      if (tagBox) tagBox.innerHTML = chipsHtml(TAGS, selected.tags, 'toggle-tag');
    }

    form.addEventListener('click', (event) => {
      const chip = event.target.closest('[data-action^="toggle-"]');
      if (!chip) return;
      event.preventDefault();

      const KEY_BY_ACTION = {
        'toggle-size': 'sizes',
        'toggle-color': 'colors',
        'toggle-tag': 'tags',
      };
      const key = KEY_BY_ACTION[chip.dataset.action];
      const value = chip.dataset.value;
      const list = selected[key];
      if (!list) return;

      const index = list.indexOf(value);
      if (index === -1) list.push(value);
      else list.splice(index, 1);
      repaint();
    });

    /* Envío */
    let saving = false;

    const clearErrors = () => {
      form.querySelectorAll('[data-error]').forEach((element) => {
        element.classList.add('hidden');
        element.textContent = '';
      });
      form.querySelectorAll('[aria-invalid]').forEach((element) => element.removeAttribute('aria-invalid'));
    };

    const showErrors = (details) => {
      for (const [field, message] of Object.entries(details ?? {})) {
        const box = form.querySelector(`[data-error="${field}"]`);
        const input = form.elements[field];
        if (box) {
          box.textContent = message;
          box.classList.remove('hidden');
        }
        if (input) input.setAttribute('aria-invalid', 'true');
      }
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (saving) return;
      saving = true;
      clearErrors();

      // Las tallas del campo libre se suman a las elegidas en los chips.
      const extras = String(form.elements['p-sizes-extra']?.value ?? '')
        .split(',')
        .map((size) => size.trim())
        .filter(Boolean);
      const sizes = [...new Set([...selected.sizes, ...extras])];

      const payload = {
        name: form.elements.name.value.trim(),
        description: form.elements.description.value.trim(),
        price: Number(form.elements.price.value),
        compareAtPrice: form.elements.compareAtPrice.value === '' ? null : Number(form.elements.compareAtPrice.value),
        categoryId: form.elements.categoryId.value,
        stock: Number(form.elements.stock.value),
        sizes,
        colors: selected.colors,
        tags: selected.tags,
        material: form.elements.material.value.trim() || null,
        fit: form.elements.fit.value.trim() || null,
        active: form.elements.active.checked,
        ...(form.elements.slug.value.trim() ? { slug: form.elements.slug.value.trim() } : {}),
        ...(form.elements.sku.value.trim() ? { sku: form.elements.sku.value.trim() } : {}),
      };

      try {
        if (isNew) {
          const { product: created } = await api.products.create(payload);
          toast(`Producto «${created.name}» creado.`, { type: 'success' });
        } else {
          const { product: updated } = await api.products.update(product.id, payload);
          toast(`Cambios guardados en «${updated.name}».`, { type: 'success' });
        }
        root.querySelector('[data-layer-close]')?.click();
        await loadLookups();
        await refresh();
      } catch (error) {
        saving = false;
        if (error.status === 422 || error.status === 400) {
          showErrors(error.details);
          toast(error.message, { type: 'warning' });
        } else {
          toast(error.message, { type: 'error' });
        }
      }
    });

    void footer;
  }

  return () => {};
}

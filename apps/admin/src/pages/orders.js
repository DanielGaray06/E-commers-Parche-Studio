/* ===========================================================================
   Página: Pedidos
   ---------------------------------------------------------------------------
   * Lista con filtros por estado, búsqueda y rango de fechas.
   * Detalle con el cambio de estado. Al confirmar se descuenta stock; al
     cancelar se devuelve. La API avisa si no alcanza el inventario.
   * Registro de ventas de mostrador (canal `manual`).
   * Enlace para reenviar el pedido por WhatsApp con el mensaje regenerado.
   =========================================================================== */

import { api } from '../lib/api.js';
import {
  STATUS_LABELS,
  STATUS_ORDER,
  bindActions,
  channelBadge,
  confirmAction,
  debounce,
  escapeAttr,
  escapeHtml,
  formatCurrency,
  formatDateTime,
  formatNumber,
  openLayer,
  paginationHtml,
  statusBadge,
  toast,
} from '../lib/ui.js';
import { icon } from '../lib/icons.js';

/* --- Lista ---------------------------------------------------------------- */

function pageHtml(data, state) {
  const tabs = [
    { value: 'todos', label: 'Todos' },
    ...STATUS_ORDER.map((status) => ({ value: status, label: STATUS_LABELS[status] })),
  ]
    .map(
      (tab) => `
      <button class="btn btn--sm ${state.estado === tab.value ? 'btn--primary' : 'btn--outline'}"
        type="button" data-action="tab" data-estado="${tab.value}">${escapeHtml(tab.label)}</button>
    `,
    )
    .join('');

  const rows = data.items
    .map(
      (order) => `
      <tr>
        <td class="nowrap">
          <span class="cell-strong mono">${escapeHtml(order.reference)}</span>
          <span class="cell-sub">${escapeHtml(formatDateTime(order.createdAt))}</span>
        </td>
        <td>
          ${escapeHtml(order.customer.name)}
          <span class="cell-sub">${escapeHtml(order.customer.phone ?? order.customer.neighborhood ?? '—')}</span>
        </td>
        <td class="nowrap">
          ${channelBadge(order.channel)}
        </td>
        <td class="nowrap">${formatNumber(order.itemCount)} prenda(s)</td>
        <td class="num">${formatCurrency(order.total)}</td>
        <td>${statusBadge(order.status)}</td>
        <td>
          <div class="actions">
            <button class="btn btn--outline btn--sm" type="button" data-action="open" data-id="${escapeAttr(order.id)}">
              Ver
            </button>
          </div>
        </td>
      </tr>
    `,
    )
    .join('');

  return `
    <section class="card">
      <div class="toolbar toolbar--tabs">${tabs}</div>

      <div class="toolbar">
        <label class="toolbar__search">
          ${icon('search', { size: 16 })}
          <input class="input" type="search" placeholder="Buscar por referencia, nombre o teléfono…"
            value="${escapeAttr(state.q)}" data-action="search" aria-label="Buscar pedidos" />
        </label>

        <label class="row small muted" style="gap:var(--sp-2)">
          Desde
          <input class="input" type="date" value="${escapeAttr(state.desde)}" data-action="desde" style="width:auto" />
        </label>

        <label class="row small muted" style="gap:var(--sp-2)">
          Hasta
          <input class="input" type="date" value="${escapeAttr(state.hasta)}" data-action="hasta" style="width:auto" />
        </label>

        <span class="toolbar__spacer"></span>

        <button class="btn btn--accent" type="button" data-action="new-sale">
          ${icon('plus', { size: 16 })} Registrar venta
        </button>
      </div>

      ${
        data.items.length === 0
          ? `<div class="empty">
               ${icon('receipt', { size: 30 })}
               <h3>No hay pedidos con estos filtros</h3>
               <p>Cuando alguien pida por WhatsApp, el pedido aparecerá aquí como <strong>pendiente</strong>.</p>
             </div>`
          : `<div class="table-wrap">
               <table class="table">
                 <thead>
                   <tr>
                     <th>Pedido</th><th>Cliente</th><th>Canal</th><th>Prendas</th>
                     <th class="num">Total</th><th>Estado</th><th></th>
                   </tr>
                 </thead>
                 <tbody>${rows}</tbody>
               </table>
             </div>
             ${paginationHtml(data.page, data.pages, data.total, data.perPage)}`
      }
    </section>

    <div class="notice notice--info">
      ${icon('info', { size: 18 })}
      <div>
        <strong>El stock se mueve al confirmar</strong>
        <p class="small">
          Un pedido recién llegado por WhatsApp está <strong>pendiente</strong> y no descuenta inventario.
          Al pasarlo a <strong>confirmado</strong> sí se descuenta; si lo cancelas, se devuelve.
        </p>
      </div>
    </div>
  `;
}

/* --- Detalle -------------------------------------------------------------- */

function detailHtml(order) {
  const items = order.items
    .map(
      (item) => `
      <div class="line-item">
        <span>${escapeHtml(item.name)}</span>
        <span class="line-item__total">${formatCurrency(item.lineTotal)}</span>
        <span class="line-item__meta">
          ${item.size ? `Talla ${escapeHtml(item.size)} · ` : ''}${escapeHtml(item.color ?? 'sin color')} ·
          ${formatNumber(item.quantity)} × ${formatCurrency(item.unitPrice)}
        </span>
      </div>
    `,
    )
    .join('');

  const statusButtons = STATUS_ORDER.map(
    (status) => `
    <button class="btn btn--sm ${status === order.status ? 'btn--primary' : 'btn--outline'}"
      type="button" data-status="${status}" ${status === order.status ? 'disabled' : ''}>
      ${escapeHtml(STATUS_LABELS[status])}
    </button>
  `,
  ).join('');

  return `
    <div class="row row--between mb-4">
      <span class="mono strong">${escapeHtml(order.reference)}</span>
      <span class="row" style="gap:var(--sp-2)">${statusBadge(order.status)} ${channelBadge(order.channel)}</span>
    </div>

    <h3 class="card__title">Prendas</h3>
    <div class="mt-4">${items}</div>

    <div class="totals">
      <div class="totals__row"><span>Subtotal</span><span>${formatCurrency(order.subtotal)}</span></div>
      <div class="totals__row">
        <span>Envío</span>
        <span>${order.shippingPending ? '<span class="muted">Por confirmar</span>' : formatCurrency(order.shipping)}</span>
      </div>
      <div class="totals__row totals__row--total"><span>Total</span><span>${formatCurrency(order.total)}</span></div>
    </div>

    <h3 class="card__title mt-4" style="margin-top:var(--sp-6)">Datos de entrega</h3>
    <dl class="detail-list mt-4">
      <dt>Nombre</dt><dd>${escapeHtml(order.customer.name)}</dd>
      <dt>Teléfono</dt><dd>${escapeHtml(order.customer.phone ?? '—')}</dd>
      <dt>Barrio</dt><dd>${escapeHtml(order.customer.neighborhood ?? '—')}</dd>
      <dt>Dirección</dt><dd>${escapeHtml(order.customer.address ?? '—')}</dd>
      <dt>Entrega</dt><dd>${order.customer.deliveryMethod === 'recoger' ? 'Recoge con la tienda' : 'A domicilio'}</dd>
      <dt>Observaciones</dt><dd>${escapeHtml(order.customer.notes ?? '—')}</dd>
      <dt>Creado</dt><dd>${escapeHtml(formatDateTime(order.createdAt))}</dd>
      ${order.confirmedAt ? `<dt>Confirmado</dt><dd>${escapeHtml(formatDateTime(order.confirmedAt))}</dd>` : ''}
      ${order.deliveredAt ? `<dt>Entregado</dt><dd>${escapeHtml(formatDateTime(order.deliveredAt))}</dd>` : ''}
      ${order.createdBy ? `<dt>Registró</dt><dd>${escapeHtml(order.createdBy.name)}</dd>` : ''}
    </dl>

    <h3 class="card__title" style="margin-top:var(--sp-6)">Cambiar estado</h3>
    <div class="status-actions" data-status-actions>${statusButtons}</div>

    <h3 class="card__title" style="margin-top:var(--sp-6)">Corregir datos de entrega</h3>
    <form id="order-edit-form" class="mt-4" novalidate>
      <div class="field">
        <label for="o-name">Nombre</label>
        <input class="input" id="o-name" name="name" value="${escapeAttr(order.customer.name)}" />
      </div>
      <div class="field-row">
        <div class="field">
          <label for="o-phone">Teléfono</label>
          <input class="input" id="o-phone" name="phone" value="${escapeAttr(order.customer.phone ?? '')}" />
        </div>
        <div class="field">
          <label for="o-neighborhood">Barrio</label>
          <input class="input" id="o-neighborhood" name="neighborhood" value="${escapeAttr(order.customer.neighborhood ?? '')}" />
        </div>
      </div>
      <div class="field">
        <label for="o-address">Dirección</label>
        <input class="input" id="o-address" name="address" value="${escapeAttr(order.customer.address ?? '')}" />
      </div>
      <div class="field">
        <label for="o-notes">Observaciones</label>
        <textarea class="textarea" id="o-notes" name="notes">${escapeHtml(order.customer.notes ?? '')}</textarea>
      </div>
      <button class="btn btn--outline" type="submit">Guardar datos</button>
    </form>
  `;
}

/* --- Venta manual --------------------------------------------------------- */

function saleLineHtml(line, index, products) {
  const product = products.find((item) => item.id === line.productId);
  const sizes = product?.sizes ?? [];
  const colors = product?.colors ?? [];

  return `
    <div class="line-item" data-line="${index}">
      <div class="field-row" style="width:100%">
        <div class="field" style="margin-bottom:0">
          <span class="label">Prenda</span>
          <select class="select" data-action="line-product" data-index="${index}">
            <option value="">Elige una prenda…</option>
            ${products
              .map(
                (item) =>
                  `<option value="${escapeAttr(item.id)}" ${line.productId === item.id ? 'selected' : ''}>${escapeHtml(item.name)} — ${formatCurrency(item.price)}</option>`,
              )
              .join('')}
          </select>
        </div>
        <div class="field" style="margin-bottom:0">
          <span class="label">Talla</span>
          <select class="select" data-action="line-size" data-index="${index}" ${sizes.length === 0 ? 'disabled' : ''}>
            <option value="">${sizes.length === 0 ? '—' : 'Elige…'}</option>
            ${sizes
              .map((size) => `<option value="${escapeAttr(size)}" ${line.size === size ? 'selected' : ''}>${escapeHtml(size)}</option>`)
              .join('')}
          </select>
        </div>
        <div class="field" style="margin-bottom:0">
          <span class="label">Color</span>
          <select class="select" data-action="line-color" data-index="${index}" ${colors.length === 0 ? 'disabled' : ''}>
            <option value="">${colors.length === 0 ? '—' : 'Elige…'}</option>
            ${colors
              .map((color) => `<option value="${escapeAttr(color)}" ${line.color === color ? 'selected' : ''}>${escapeHtml(color)}</option>`)
              .join('')}
          </select>
        </div>
        <div class="field" style="margin-bottom:0">
          <span class="label">Cantidad</span>
          <input class="input" type="number" min="1" step="1" value="${line.quantity}" data-action="line-qty" data-index="${index}" />
        </div>
      </div>
      <span class="line-item__meta">
        ${product ? `Stock disponible: ${formatNumber(product.stock)}` : 'Sin prenda seleccionada'}
      </span>
      <button class="icon-btn icon-btn--danger" type="button" data-action="line-remove" data-index="${index}"
        aria-label="Quitar esta prenda" style="align-self:start">${icon('trash', { size: 15 })}</button>
    </div>
  `;
}

function saleFormHtml(products) {
  return `
    <form id="sale-form" novalidate>
      <div class="field-row">
        <div class="field">
          <label for="s-name">Nombre de quien recibe</label>
          <input class="input" id="s-name" name="name" placeholder="Ej: Daniel Garay" required />
        </div>
        <div class="field">
          <label for="s-phone">Teléfono (opcional)</label>
          <input class="input" id="s-phone" name="phone" placeholder="Ej: 300 000 0000" />
        </div>
      </div>

      <div class="field-row">
        <div class="field">
          <label for="s-neighborhood">Barrio o sector</label>
          <input class="input" id="s-neighborhood" name="neighborhood" placeholder="Ej: Laureles" />
        </div>
        <div class="field">
          <label for="s-method">Entrega</label>
          <select class="select" id="s-method" name="deliveryMethod">
            <option value="domicilio">A domicilio</option>
            <option value="recoger">Recoge con la tienda</option>
          </select>
        </div>
      </div>

      <div class="field">
        <label for="s-address">Dirección (opcional)</label>
        <input class="input" id="s-address" name="address" placeholder="Ej: Cra 43 # 10-20" />
      </div>

      <h3 class="card__title" style="margin-top:var(--sp-5)">Prendas</h3>
      <div id="sale-lines" class="mt-4"></div>
      <button class="btn btn--outline btn--sm mt-4" type="button" data-action="add-line">
        ${icon('plus', { size: 15 })} Añadir prenda
      </button>

      <div class="field-row mt-4">
        <div class="field">
          <label for="s-status">Estado de la venta</label>
          <select class="select" id="s-status" name="status">
            <option value="entregado" selected>Entregado (venta ya hecha)</option>
            <option value="confirmado">Confirmado</option>
            <option value="enviado">Enviado</option>
            <option value="pendiente">Pendiente</option>
          </select>
        </div>
        <div class="field">
          <label for="s-date">Fecha de la venta</label>
          <input class="input" type="date" id="s-date" name="date" />
          <p class="field__hint">Déjala vacía para usar hoy.</p>
        </div>
      </div>

      <div class="field">
        <label for="s-notes">Observaciones</label>
        <textarea class="textarea" id="s-notes" name="notes" rows="2"></textarea>
      </div>

      <p class="error-text hidden" id="sale-error" role="alert"></p>
    </form>
  `;
}

/* --- Página --------------------------------------------------------------- */

export async function mountOrders(container, ctx) {
  const state = {
    estado: ctx.params.estado ?? 'todos',
    q: ctx.params.q ?? '',
    desde: ctx.params.desde ?? '',
    hasta: ctx.params.hasta ?? '',
    page: Number(ctx.params.pagina) || 1,
    perPage: 20,
  };

  let catalog = [];

  async function refresh({ syncUrl = false } = {}) {
    if (syncUrl) {
      ctx.navigate('/pedidos', {
        estado: state.estado !== 'todos' ? state.estado : undefined,
        q: state.q || undefined,
        desde: state.desde || undefined,
        hasta: state.hasta || undefined,
        pagina: state.page > 1 ? state.page : undefined,
      });
    }
    const data = await api.orders.list(state);
    container.innerHTML = pageHtml(data, state);
  }

  await refresh();

  bindActions(container, {
    input: {
      search: debounce((input) => {
        state.q = input.value.trim();
        state.page = 1;
        refresh({ syncUrl: true }).catch((error) => toast(error.message, { type: 'error' }));
      }, 340),
    },
    change: {
      desde: (input) => {
        state.desde = input.value;
        state.page = 1;
        refresh({ syncUrl: true }).catch((error) => toast(error.message, { type: 'error' }));
      },
      hasta: (input) => {
        state.hasta = input.value;
        state.page = 1;
        refresh({ syncUrl: true }).catch((error) => toast(error.message, { type: 'error' }));
      },
    },
    click: {
      tab: (button) => {
        state.estado = button.dataset.estado;
        state.page = 1;
        refresh({ syncUrl: true }).catch((error) => toast(error.message, { type: 'error' }));
      },
      page: (button) => {
        const next = Number(button.dataset.page);
        if (!Number.isFinite(next) || next < 1) return;
        state.page = next;
        refresh({ syncUrl: true }).catch((error) => toast(error.message, { type: 'error' }));
      },
      open: async (button) => {
        try {
          const { order } = await api.orders.get(button.dataset.id);
          openOrderDetail(order);
        } catch (error) {
          toast(error.message, { type: 'error' });
        }
      },
      'new-sale': async () => {
        try {
          const response = await api.catalog();
          catalog = response.products;
        } catch (error) {
          toast(`No pude cargar el catálogo: ${error.message}`, { type: 'error' });
          return;
        }
        openSaleForm();
      },
    },
  });

  /* --- Detalle del pedido ------------------------------------------------ */

  function openOrderDetail(order) {
    const { root, close } = openLayer({
      variant: 'drawer',
      title: 'Detalle del pedido',
      body: detailHtml(order),
      footer: `
        <button class="btn btn--ghost" type="button" data-delete>${icon('trash', { size: 16 })} Eliminar</button>
        <button class="btn btn--whatsapp" type="button" data-whatsapp>${icon('whatsapp', { size: 18 })} Reenviar por WhatsApp</button>
      `,
    });

    // Cambio de estado
    root.querySelector('[data-status-actions]')?.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-status]');
      if (!button) return;
      const next = button.dataset.status;
      button.disabled = true;

      try {
        const { order: updated } = await api.orders.setStatus(order.id, next);
        toast(`Pedido ${updated.reference}: ${STATUS_LABELS[updated.status]}.`, { type: 'success' });
        close();
        await refresh();
      } catch (error) {
        button.disabled = false;
        toast(error.message, { type: 'error' });
      }
    });

    // Corrección de datos
    root.querySelector('#order-edit-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      try {
        await api.orders.update(order.id, {
          customer: {
            name: form.elements.name.value.trim(),
            phone: form.elements.phone.value.trim() || null,
            neighborhood: form.elements.neighborhood.value.trim() || null,
            address: form.elements.address.value.trim() || null,
            notes: form.elements.notes.value.trim() || null,
          },
        });
        toast('Datos del pedido actualizados.', { type: 'success' });
        close();
        await refresh();
      } catch (error) {
        toast(error.message, { type: 'error' });
      }
    });

    // Reenviar por WhatsApp
    root.querySelector('[data-whatsapp]')?.addEventListener('click', async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      try {
        const { whatsappUrl } = await api.orders.whatsapp(order.id);
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      } catch (error) {
        toast(error.message, { type: 'error' });
      } finally {
        button.disabled = false;
      }
    });

    // Eliminar
    root.querySelector('[data-delete]')?.addEventListener('click', async () => {
      const confirmed = await confirmAction({
        title: 'Eliminar pedido',
        message: `Se borrará el pedido ${order.reference} del registro. Esto NO devuelve stock: si el pedido está confirmado, cancélalo primero.`,
        confirmLabel: 'Eliminar',
        danger: true,
      });
      if (!confirmed) return;

      try {
        await api.orders.remove(order.id);
        toast('Pedido eliminado.', { type: 'success' });
        close();
        await refresh();
      } catch (error) {
        toast(error.message, { type: 'error' });
      }
    });
  }

  /* --- Venta manual ------------------------------------------------------ */

  function openSaleForm() {
    /** @type {Array<{ productId: string, size: string, color: string, quantity: number }>} */
    let lines = [{ productId: '', size: '', color: '', quantity: 1 }];

    const { root, close } = openLayer({
      variant: 'modal',
      title: 'Registrar venta',
      body: saleFormHtml(catalog),
      footer: `
        <button class="btn btn--ghost" type="button" data-cancel>Cancelar</button>
        <button class="btn btn--accent" type="submit" form="sale-form">${icon('check', { size: 16 })} Guardar venta</button>
      `,
    });

    const form = root.querySelector('#sale-form');
    const linesBox = root.querySelector('#sale-lines');
    const errorBox = root.querySelector('#sale-error');

    function paintLines() {
      linesBox.innerHTML = lines.map((line, index) => saleLineHtml(line, index, catalog)).join('');
    }
    paintLines();

    root.querySelector('[data-cancel]')?.addEventListener('click', () => close());

    form.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-action]');
      if (!trigger) return;
      const action = trigger.dataset.action;
      const index = Number(trigger.dataset.index);

      if (action === 'add-line') {
        lines = [...lines, { productId: '', size: '', color: '', quantity: 1 }];
        paintLines();
        return;
      }

      if (action === 'line-remove') {
        lines = lines.filter((_, position) => position !== index);
        if (lines.length === 0) lines = [{ productId: '', size: '', color: '', quantity: 1 }];
        paintLines();
      }
    });

    form.addEventListener('change', (event) => {
      const trigger = event.target.closest('[data-action]');
      if (!trigger) return;
      const action = trigger.dataset.action;
      const index = Number(trigger.dataset.index);
      const line = lines[index];
      if (!line) return;

      if (action === 'line-product') {
        // Al cambiar de prenda se reinician talla y color (cada prenda tiene los suyos).
        lines[index] = { ...line, productId: trigger.value, size: '', color: '' };
        paintLines();
      } else if (action === 'line-size') {
        lines[index] = { ...line, size: trigger.value };
      } else if (action === 'line-color') {
        lines[index] = { ...line, color: trigger.value };
      } else if (action === 'line-qty') {
        lines[index] = { ...line, quantity: Math.max(1, Math.floor(Number(trigger.value) || 1)) };
      }
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorBox.classList.add('hidden');

      const valid = lines.filter((line) => line.productId);
      if (valid.length === 0) {
        errorBox.textContent = 'Agrega al menos una prenda.';
        errorBox.classList.remove('hidden');
        return;
      }

      const dateValue = form.elements.date.value;
      const payload = {
        customer: {
          name: form.elements.name.value.trim(),
          phone: form.elements.phone.value.trim() || null,
          neighborhood: form.elements.neighborhood.value.trim() || null,
          address: form.elements.address.value.trim() || null,
          deliveryMethod: form.elements.deliveryMethod.value,
          notes: form.elements.notes.value.trim() || null,
        },
        items: valid.map((line) => ({
          productId: line.productId,
          size: line.size || null,
          color: line.color || null,
          quantity: line.quantity,
        })),
        status: form.elements.status.value,
        channel: 'manual',
        ...(dateValue ? { createdAt: new Date(`${dateValue}T12:00:00`).toISOString() } : {}),
      };

      try {
        const { order } = await api.orders.create(payload);
        toast(`Venta ${order.reference} registrada por ${formatCurrency(order.total)}.`, { type: 'success' });
        close();
        await refresh();
      } catch (error) {
        const details = error.details;
        errorBox.textContent = Array.isArray(details) ? details.join(' ') : error.message;
        errorBox.classList.remove('hidden');
      }
    });

    form.elements.name?.focus();
  }

  return () => {};
}

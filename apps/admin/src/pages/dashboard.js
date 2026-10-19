/* ===========================================================================
   Página: Tablero
   ---------------------------------------------------------------------------
   Responde a tres preguntas del dueño: cuánto vendí, qué se vende más y qué
   se está agotando. Los pedidos `pendiente` se muestran aparte y nunca se
   suman a las ventas: abrir WhatsApp no confirma nada.
   =========================================================================== */

import { api } from '../lib/api.js';
import { barChart, rankingList } from '../lib/charts.js';
import { STATUS_LABELS, channelBadge, deltaBadge, escapeHtml, formatCurrency, formatDayLabel, formatNumber, statusBadge, toast } from '../lib/ui.js';
import { icon } from '../lib/icons.js';

const RANGES = [
  { days: 7, label: '7 días' },
  { days: 30, label: '30 días' },
  { days: 90, label: '90 días' },
];

function kpiCard({ label, value, meta, iconName, accent = false }) {
  return `
    <article class="kpi ${accent ? 'kpi--accent' : ''}">
      <span class="kpi__label">${icon(iconName, { size: 15 })} ${escapeHtml(label)}</span>
      <span class="kpi__value">${value}</span>
      <span class="kpi__meta">${meta}</span>
    </article>
  `;
}

function dashboardHtml(data) {
  const { kpis, salesSeries, topProducts, statusBreakdown, inventory, recentOrders, range } = data;

  const statusRow = statusBreakdown
    .map(
      (entry) => `
      <div class="row row--between" style="padding:6px 0">
        ${statusBadge(entry.status)}
        <span class="small muted">${entry.count} pedido(s) · ${formatCurrency(entry.total)}</span>
      </div>
    `,
    )
    .join('');

  const lowStockRows = inventory.lowStock
    .map(
      (product) => `
      <div class="row row--between" style="padding:6px 0">
        <span>
          <span class="cell-strong">${escapeHtml(product.name)}</span>
          <span class="cell-sub">${escapeHtml(product.category)} · ${escapeHtml(product.sku)}</span>
        </span>
        <span class="badge ${product.stock === 0 ? 'badge--danger' : 'badge--warning'}">
          ${product.stock === 0 ? 'Agotado' : `${product.stock} u`}
        </span>
      </div>
    `,
    )
    .join('');

  const recentRows = recentOrders
    .map(
      (order) => `
      <tr>
        <td class="nowrap"><span class="mono">${escapeHtml(order.reference)}</span></td>
        <td>${escapeHtml(order.customer.name)}<span class="cell-sub">${escapeHtml(order.customer.neighborhood ?? '—')}</span></td>
        <td class="nowrap">${channelBadge(order.channel)}</td>
        <td>${statusBadge(order.status)}</td>
        <td class="num">${formatCurrency(order.total)}</td>
      </tr>
    `,
    )
    .join('');

  return `
    <div class="toolbar" style="border:1px solid var(--c-line);border-radius:var(--r-lg);background:var(--c-white)">
      <span class="strong">${icon('filter', { size: 15 })} Periodo</span>
      ${RANGES.map(
        (item) => `
        <button class="btn btn--sm ${item.days === range.days ? 'btn--primary' : 'btn--outline'}"
          type="button" data-action="range" data-days="${item.days}">${item.label}</button>
      `,
      ).join('')}
      <span class="toolbar__spacer"></span>
      <span class="small muted">Del ${formatDayLabel(range.from)} al ${formatDayLabel(range.to)}</span>
    </div>

    <div class="kpi-grid">
      ${kpiCard({
        label: 'Ventas confirmadas',
        iconName: 'coins',
        accent: true,
        value: formatCurrency(kpis.revenue),
        meta: `${deltaBadge(kpis.revenueChange)} <span>vs. periodo anterior</span>`,
      })}
      ${kpiCard({
        label: 'Pedidos vendidos',
        iconName: 'receipt',
        value: formatNumber(kpis.orders),
        meta: `${deltaBadge(kpis.ordersChange)} <span>vs. periodo anterior</span>`,
      })}
      ${kpiCard({
        label: 'Ticket promedio',
        iconName: 'cart',
        value: formatCurrency(kpis.averageTicket),
        meta: `<span>${formatNumber(kpis.units)} unidades vendidas</span>`,
      })}
      ${kpiCard({
        label: 'Por confirmar',
        iconName: 'alert',
        value: formatNumber(kpis.pendingOrders),
        meta: `<span>${formatCurrency(kpis.pendingRevenue)} sin confirmar</span>`,
      })}
    </div>

    <section class="card">
      <div class="card__head">
        <h2 class="card__title">Ventas por día</h2>
        <span class="toolbar__spacer"></span>
        <span class="card__hint">Solo pedidos confirmados, enviados o entregados</span>
      </div>
      <div class="card__body">${barChart(salesSeries)}</div>
    </section>

    <div class="section-grid grid-2">
      <section class="card">
        <div class="card__head">
          <h2 class="card__title">${icon('box', { size: 18 })} Productos más vendidos</h2>
        </div>
        <div class="card__body">${rankingList(topProducts)}</div>
      </section>

      <section class="card">
        <div class="card__head">
          <h2 class="card__title">${icon('clipboard', { size: 18 })} Pedidos por estado</h2>
        </div>
        <div class="card__body">${statusRow}</div>
      </section>
    </div>

    <div class="section-grid grid-2">
      <section class="card">
        <div class="card__head">
          <h2 class="card__title">${icon('alert', { size: 18 })} Inventario por agotarse</h2>
          <span class="toolbar__spacer"></span>
          <span class="card__hint">${inventory.lowStockThreshold} unidades o menos</span>
        </div>
        <div class="card__body">
          ${lowStockRows || '<p class="muted small">Todo el catálogo publicado tiene stock suficiente.</p>'}
          <p class="small muted mt-4">
            ${formatNumber(inventory.outOfStock)} producto(s) agotado(s) de ${formatNumber(inventory.activeProducts)} publicados.
          </p>
        </div>
      </section>

      <section class="card">
        <div class="card__head">
          <h2 class="card__title">${icon('receipt', { size: 18 })} Últimos pedidos</h2>
        </div>
        <div class="card__body card__body--flush">
          ${
            recentOrders.length === 0
              ? '<div class="empty"><p>Todavía no hay pedidos registrados.</p></div>'
              : `<div class="table-wrap"><table class="table">
                  <thead><tr><th>Pedido</th><th>Cliente</th><th>Canal</th><th>Estado</th><th class="num">Total</th></tr></thead>
                  <tbody>${recentRows}</tbody>
                </table></div>`
          }
        </div>
      </section>
    </div>

    <div class="notice notice--info">
      ${icon('info', { size: 18 })}
      <div>
        <strong>Cómo se cuentan las ventas</strong>
        <p class="small">
          Solo suman los pedidos en estado ${data.definitions.saleStatuses
            .map((status) => STATUS_LABELS[status] ?? status)
            .join(', ')}.
          Los <strong>pendientes</strong> aparecen aparte porque todavía no los confirmó nadie, y los
          cancelados no suman nunca.
        </p>
      </div>
    </div>
  `;
}

export async function mountDashboard(container, ctx) {
  let days = Number(ctx.params.dias) || 30;

  async function render() {
    const data = await api.dashboard(days);
    container.innerHTML = dashboardHtml(data);
  }

  await render();

  container.addEventListener('click', async (event) => {
    const trigger = event.target.closest('[data-action="range"]');
    if (!trigger) return;
    const next = Number(trigger.dataset.days);
    if (!Number.isFinite(next) || next === days) return;
    days = next;
    ctx.navigate('/', { dias: days });
    try {
      await render();
    } catch (error) {
      toast(error.message, { type: 'error' });
    }
  });

  return () => {};
}

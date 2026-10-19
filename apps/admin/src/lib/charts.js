/* ===========================================================================
   Gráficos
   ---------------------------------------------------------------------------
   Se dibujan a mano con SVG y HTML: sin librerías externas. Para un panel que
   solo necesita una serie de ventas y unos rankings, una dependencia de
   gráficos sería más peso que ayuda.
   =========================================================================== */

import { escapeAttr, escapeHtml, formatCurrency, formatNumber } from './ui.js';

/**
 * Gráfico de barras de la serie diaria.
 * @param {Array<{ day: string, revenue: number, orders: number }>} series
 */
export function barChart(series) {
  if (!series || series.length === 0) {
    return '<p class="muted small">Sin datos en el periodo.</p>';
  }

  const max = Math.max(...series.map((point) => point.revenue), 1);
  const hasData = series.some((point) => point.revenue > 0);

  const columns = series
    .map((point) => {
      const height = Math.round((point.revenue / max) * 100);
      const date = new Date(`${point.day}T12:00:00`);
      const label = date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
      return `
        <div class="chart__col">
          <span class="chart__tooltip">${escapeHtml(label)} · ${escapeHtml(formatCurrency(point.revenue))} · ${point.orders} pedido(s)</span>
          <div class="chart__bar" style="height:${Math.max(height, 1)}%"></div>
        </div>
      `;
    })
    .join('');

  const first = new Date(`${series[0].day}T12:00:00`);
  const last = new Date(`${series[series.length - 1].day}T12:00:00`);
  const shortDate = (date) => date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });

  return `
    <div class="chart" role="img" aria-label="Ventas por día del periodo seleccionado">
      ${columns}
    </div>
    <div class="chart-legend">
      <span>${escapeHtml(shortDate(first))}</span>
      <span class="muted">${hasData ? `Máximo diario: ${escapeHtml(formatCurrency(max))}` : 'Sin ventas en el periodo'}</span>
      <span>${escapeHtml(shortDate(last))}</span>
    </div>
  `;
}

/**
 * Ranking horizontal (productos más vendidos).
 * @param {Array<{ name: string, units: number, revenue: number }>} items
 */
export function rankingList(items, { emptyMessage = 'Todavía no hay ventas en el periodo.' } = {}) {
  if (!items || items.length === 0) {
    return `<p class="muted small">${escapeHtml(emptyMessage)}</p>`;
  }

  const max = Math.max(...items.map((item) => item.units), 1);

  return `
    <div class="bar-list">
      ${items
        .map(
          (item) => `
        <div class="bar-list__row">
          <span class="bar-list__name" title="${escapeAttr(item.name)}">${escapeHtml(item.name)}</span>
          <span class="bar-list__value">${formatNumber(item.units)} u · ${escapeHtml(formatCurrency(item.revenue))}</span>
          <span class="bar-list__track"><span class="bar-list__fill" style="width:${Math.round((item.units / max) * 100)}%"></span></span>
        </div>
      `,
        )
        .join('')}
    </div>
  `;
}

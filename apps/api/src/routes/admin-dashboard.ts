/* ===========================================================================
   Rutas del tablero (métricas de ventas)
   ---------------------------------------------------------------------------
   Definiciones honestas para no inflar las cifras:

   * "Ventas" son los pedidos en estados confirmado / enviado / entregado.
     Un pedido `pendiente` NO es una venta: todavía no lo confirmó nadie.
   * Los pedidos `cancelado` se reportan aparte y nunca suman.
   * La serie diaria se agrupa por día natural (hora local del servidor).

   La agregación se hace en memoria: para el volumen de una tienda local
   (cientos de pedidos al mes) es más simple y más portable que depender de
   funciones de fecha específicas de MySQL.
   =========================================================================== */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { parseQuery } from '../lib/validate.js';
import { serializeOrder, orderInclude, ORDER_STATUSES, type OrderStatus } from '../lib/orders.js';
import { requireAuth } from '../lib/auth.js';
import { LOW_STOCK_THRESHOLD } from './admin-products.js';

const SALE_STATUSES: OrderStatus[] = ['confirmado', 'enviado', 'entregado'];

const querySchema = z.object({
  dias: z.coerce.number().int().min(1).max(365).default(30),
});

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

export const adminDashboardRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  app.get('/api/admin/dashboard', async (request, reply) => {
    const { dias } = parseQuery(querySchema, request.query);

    const today = startOfDay(new Date());
    const rangeStart = addDays(today, -(dias - 1));
    const previousStart = addDays(rangeStart, -dias);

    const [current, previous, statusCounts, lowStock, recentOrders, activeProducts, pendingStock] =
      await prisma.$transaction([
        prisma.order.findMany({
          where: { createdAt: { gte: rangeStart } },
          include: { items: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.order.findMany({
          where: { createdAt: { gte: previousStart, lt: rangeStart } },
          select: { total: true, status: true },
        }),
        prisma.order.groupBy({
          by: ['status'],
          where: { createdAt: { gte: rangeStart } },
          orderBy: { status: 'asc' },
          _count: true,
          _sum: { total: true },
        }),
        prisma.product.findMany({
          where: { active: true, stock: { lte: LOW_STOCK_THRESHOLD } },
          include: { category: true },
          orderBy: [{ stock: 'asc' }, { name: 'asc' }],
          take: 12,
        }),
        prisma.order.findMany({
          include: orderInclude,
          orderBy: { createdAt: 'desc' },
          take: 8,
        }),
        prisma.product.count({ where: { active: true } }),
        prisma.product.count({ where: { active: true, stock: { lte: 0 } } }),
      ]);

    /* --- Sumas del periodo ------------------------------------------------ */

    const sales = current.filter((order) => SALE_STATUSES.includes(order.status as OrderStatus));
    const pending = current.filter((order) => order.status === 'pendiente');
    const canceled = current.filter((order) => order.status === 'cancelado');

    const revenue = sales.reduce((total, order) => total + order.total, 0);
    const units = sales.reduce(
      (total, order) => total + order.items.reduce((sum, item) => sum + item.quantity, 0),
      0,
    );
    const previousRevenue = previous
      .filter((order) => SALE_STATUSES.includes(order.status as OrderStatus))
      .reduce((total, order) => total + order.total, 0);
    const previousOrders = previous.filter((order) =>
      SALE_STATUSES.includes(order.status as OrderStatus),
    ).length;

    /* --- Serie diaria ----------------------------------------------------- */

    const buckets = new Map<string, { day: string; revenue: number; orders: number }>();
    for (let index = 0; index < dias; index += 1) {
      const date = addDays(rangeStart, index);
      buckets.set(dayKey(date), { day: dayKey(date), revenue: 0, orders: 0 });
    }
    for (const order of sales) {
      const bucket = buckets.get(dayKey(order.createdAt));
      if (!bucket) continue;
      bucket.revenue += order.total;
      bucket.orders += 1;
    }

    /* --- Productos más vendidos ------------------------------------------- */

    const productTotals = new Map<
      string,
      { productId: string | null; name: string; units: number; revenue: number; orders: number }
    >();
    for (const order of sales) {
      for (const item of order.items) {
        const key = item.productId ?? `nombre:${item.name}`;
        const entry =
          productTotals.get(key) ??
          { productId: item.productId, name: item.name, units: 0, revenue: 0, orders: 0 };
        entry.units += item.quantity;
        entry.revenue += item.lineTotal;
        entry.orders += 1;
        productTotals.set(key, entry);
      }
    }
    const topProducts = [...productTotals.values()].sort((a, b) => b.units - a.units).slice(0, 10);

    /* --- Respuesta -------------------------------------------------------- */

    const statusBreakdown = ORDER_STATUSES.map((status) => {
      const row = statusCounts.find((entry) => entry.status === status);
      return {
        status,
        count: row?._count ?? 0,
        total: row?._sum?.total ?? 0,
      };
    });

    reply.code(200);
    return {
      range: {
        days: dias,
        from: rangeStart.toISOString(),
        to: new Date().toISOString(),
      },
      kpis: {
        revenue,
        orders: sales.length,
        averageTicket: sales.length > 0 ? Math.round(revenue / sales.length) : 0,
        units,
        pendingOrders: pending.length,
        pendingRevenue: pending.reduce((total, order) => total + order.total, 0),
        canceledOrders: canceled.length,
        revenueChange: percentChange(revenue, previousRevenue),
        ordersChange: percentChange(sales.length, previousOrders),
      },
      salesSeries: [...buckets.values()],
      topProducts,
      statusBreakdown,
      inventory: {
        activeProducts,
        outOfStock: pendingStock,
        lowStockThreshold: LOW_STOCK_THRESHOLD,
        lowStock: lowStock.map((product) => ({
          id: product.id,
          name: product.name,
          sku: product.sku,
          stock: product.stock,
          price: product.price,
          category: product.category.name,
        })),
      },
      recentOrders: recentOrders.map(serializeOrder),
      definitions: {
        saleStatuses: SALE_STATUSES,
        note: 'Las ventas cuentan solo los pedidos confirmados, enviados o entregados. Los pendientes se muestran aparte porque aún no están confirmados por la tienda.',
      },
    };
  });
};

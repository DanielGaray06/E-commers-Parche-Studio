/* ===========================================================================
   Rutas de administración de pedidos
   ---------------------------------------------------------------------------
   * Listar y filtrar pedidos (estado, búsqueda, rango de fechas).
   * Ver el detalle de un pedido.
   * Cambiar el estado: al confirmar se descuenta stock; al cancelar se devuelve.
   * Registrar una venta a mano (canal `manual`).
   * Volver a generar el mensaje de WhatsApp de un pedido.
   =========================================================================== */

import type { FastifyPluginAsync } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { notFound } from '../lib/http.js';
import { parseBody, parseQuery } from '../lib/validate.js';
import { getColors, getStoreConfig } from '../lib/settings.js';
import {
  buildOrderMessage,
  buildWhatsAppUrl,
  changeOrderStatus,
  computeShipping,
  createOrder,
  ORDER_STATUSES,
  orderInclude,
  serializeOrder,
} from '../lib/orders.js';
import { currentUserId, requireAuth } from '../lib/auth.js';
import { manualOrderSchema, orderStatusSchema, orderUpdateSchema } from '../schemas.js';

const listQuerySchema = z.object({
  estado: z.union([z.enum(ORDER_STATUSES), z.literal('todos')]).default('todos'),
  q: z.string().trim().max(120).optional(),
  desde: z.string().trim().optional(),
  hasta: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
});

function parseDate(value: string | undefined, endOfDay = false): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value.length <= 10 ? `${value}T${endOfDay ? '23:59:59' : '00:00:00'}` : value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export const adminOrderRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  app.get('/api/admin/orders', async (request, reply) => {
    const query = parseQuery(listQuerySchema, request.query);

    const where: Prisma.OrderWhereInput = {};
    if (query.estado !== 'todos') where.status = query.estado;

    const from = parseDate(query.desde);
    const to = parseDate(query.hasta, true);
    if (from || to) {
      where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
    }

    if (query.q) {
      where.OR = [
        { reference: { contains: query.q } },
        { customerName: { contains: query.q } },
        { customerPhone: { contains: query.q } },
        { neighborhood: { contains: query.q } },
      ];
    }

    const [items, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.porPagina,
        take: query.porPagina,
      }),
      prisma.order.count({ where }),
    ]);

    reply.code(200);
    return {
      items: items.map(serializeOrder),
      total,
      page: query.page,
      perPage: query.porPagina,
      pages: Math.max(1, Math.ceil(total / query.porPagina)),
    };
  });

  app.get('/api/admin/orders/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const order = await prisma.order.findUnique({ where: { id }, include: orderInclude });
    if (!order) throw notFound('El pedido no existe.');
    reply.code(200);
    return { order: serializeOrder(order) };
  });

  /** Venta registrada a mano (mostrador, feria, pedido por teléfono…). */
  app.post('/api/admin/orders', async (request, reply) => {
    const body = parseBody(manualOrderSchema, request.body);
    const config = await getStoreConfig();

    const order = await createOrder(
      {
        customer: {
          name: body.customer.name,
          phone: body.customer.phone,
          neighborhood: body.customer.neighborhood,
          address: body.customer.address,
          deliveryMethod: body.customer.deliveryMethod ?? null,
          notes: body.customer.notes,
        },
        items: body.items,
        channel: body.channel,
        status: body.status,
        createdById: currentUserId(request),
        createdAt: body.createdAt,
        onlyActive: false,
      },
      config,
    );

    reply.code(201);
    return { order: serializeOrder(order) };
  });

  /** Cambia el estado y ajusta el inventario según corresponda. */
  app.patch('/api/admin/orders/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(orderStatusSchema, request.body);
    const order = await changeOrderStatus(id, body.status);
    reply.code(200);
    return { order: serializeOrder(order) };
  });

  /** Corrige los datos de entrega o las observaciones. */
  app.put('/api/admin/orders/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(orderUpdateSchema, request.body);

    const existing = await prisma.order.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw notFound('El pedido no existe.');

    const data: Prisma.OrderUpdateInput = {};
    const customer = body.customer ?? {};
    if (customer.name !== undefined) data.customerName = customer.name;
    if (customer.phone !== undefined) data.customerPhone = customer.phone;
    if (customer.neighborhood !== undefined) data.neighborhood = customer.neighborhood;
    if (customer.address !== undefined) data.address = customer.address;
    if (customer.deliveryMethod !== undefined) data.deliveryMethod = customer.deliveryMethod;
    if (body.notes !== undefined) data.notes = body.notes;
    if (customer.notes !== undefined) data.notes = customer.notes;

    const order = await prisma.order.update({ where: { id }, data, include: orderInclude });
    reply.code(200);
    return { order: serializeOrder(order) };
  });

  /** Regenera el mensaje de WhatsApp con los datos actuales de configuración. */
  app.get('/api/admin/orders/:id/whatsapp', async (request, reply) => {
    const { id } = request.params as { id: string };
    const order = await prisma.order.findUnique({ where: { id }, include: orderInclude });
    if (!order) throw notFound('El pedido no existe.');

    const [config, colors] = await Promise.all([getStoreConfig(), getColors()]);

    const message = buildOrderMessage({
      reference: order.reference,
      items: order.items.map((item) => ({
        name: item.name,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
      customer: {
        name: order.customerName,
        neighborhood: order.neighborhood,
        address: order.address,
        deliveryMethod: order.deliveryMethod,
        phone: order.customerPhone,
        notes: order.notes,
      },
      subtotal: order.subtotal,
      shipping: computeShipping(order.subtotal, config),
      total: order.total,
      greeting: config.whatsapp.greeting,
      colors,
    });

    reply.code(200);
    return { message, whatsappUrl: buildWhatsAppUrl(message, config.whatsapp.number) };
  });

  /** Elimina un pedido del registro (por ejemplo, una prueba). No repone stock. */
  app.delete('/api/admin/orders/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.order.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw notFound('El pedido no existe.');

    await prisma.order.delete({ where: { id } });
    reply.code(200);
    return { deleted: true, id };
  });
};

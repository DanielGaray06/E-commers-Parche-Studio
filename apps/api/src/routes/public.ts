/* ===========================================================================
   Rutas públicas (las que consume la tienda)
   ---------------------------------------------------------------------------
   * GET  /api/public/bootstrap  → configuración + colores + categorías + catálogo
   * POST /api/public/orders     → registra el pedido y devuelve el mensaje de
                                  WhatsApp ya armado

   El catálogo se sirve en UNA sola petición (con caché en Redis) para que la
   tienda cargue rápido incluso en conexiones lentas.
   =========================================================================== */

import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { cacheGet, cacheSet, CATALOG_CACHE_PREFIX } from '../lib/cache.js';
import { serializeCategory, serializeProduct } from '../lib/mappers.js';
import { getColors, getStoreConfig } from '../lib/settings.js';
import {
  buildOrderMessage,
  buildWhatsAppUrl,
  computeShipping,
  createOrder,
  serializeOrder,
} from '../lib/orders.js';
import { parseBody } from '../lib/validate.js';
import { publicOrderSchema } from '../schemas.js';

const CACHE_KEY = `${CATALOG_CACHE_PREFIX}:bootstrap:v1`;
const CACHE_TTL_SECONDS = 45;

export const publicRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/public/bootstrap', async (_request, reply) => {
    const cached = await cacheGet<unknown>(CACHE_KEY);
    if (cached) {
      reply.header('x-parche-cache', 'hit');
      return cached;
    }

    const [config, colors, categories, products] = await Promise.all([
      getStoreConfig(),
      getColors(),
      prisma.category.findMany({
        orderBy: [{ position: 'asc' }, { name: 'asc' }],
        include: { _count: { select: { products: { where: { active: true } } } } },
      }),
      prisma.product.findMany({
        where: { active: true },
        orderBy: { createdAt: 'desc' },
        include: { category: true },
      }),
    ]);

    const payload = {
      config,
      colors,
      categories: categories.map(serializeCategory),
      products: products.map(serializeProduct),
      generatedAt: new Date().toISOString(),
    };

    await cacheSet(CACHE_KEY, payload, CACHE_TTL_SECONDS);
    reply.header('x-parche-cache', 'miss');
    return payload;
  });

  app.post('/api/public/orders', async (request, reply) => {
    const body = parseBody(publicOrderSchema, request.body);

    const config = await getStoreConfig();

    const order = await createOrder(
      {
        customer: {
          name: body.customer.name,
          phone: body.customer.phone,
          neighborhood: body.customer.neighborhood,
          address: body.customer.address,
          deliveryMethod: body.customer.deliveryMethod ?? 'domicilio',
          notes: body.customer.notes,
        },
        items: body.items,
        channel: 'whatsapp',
        status: 'pendiente',
        onlyActive: true,
      },
      config,
    );

    const colors = await getColors();
    const shipping = computeShipping(order.subtotal, config);

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
      shipping,
      total: order.total,
      greeting: config.whatsapp.greeting,
      colors,
    });

    reply.code(201);
    return {
      order: serializeOrder(order),
      message,
      whatsappUrl: buildWhatsAppUrl(message, config.whatsapp.number),
      whatsappIsPlaceholder: config.whatsapp.isPlaceholder,
      note: 'El pedido queda PENDIENTE: la tienda lo confirma por WhatsApp.',
    };
  });
};

/* ===========================================================================
   Rutas de administración de productos
   ---------------------------------------------------------------------------
   Aquí está el control de precios, stock, tallas, colores y visibilidad.
   Cada cambio invalida la caché del catálogo público para que la tienda
   muestre los datos nuevos de inmediato.
   =========================================================================== */

import type { FastifyPluginAsync } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { badRequest, conflict, notFound } from '../lib/http.js';
import { invalidateCatalogCache } from '../lib/cache.js';
import { parseBody, parseQuery } from '../lib/validate.js';
import { serializeList, serializeProduct } from '../lib/mappers.js';
import { requireAuth } from '../lib/auth.js';
import { slugify, productCreateSchema, productUpdateSchema, stockPatchSchema } from '../schemas.js';

/* --- Utilidades ----------------------------------------------------------- */

async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const root = slugify(base) || 'producto';
  let candidate = root;
  let suffix = 2;
  for (;;) {
    const found = await prisma.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!found || found.id === ignoreId) return candidate;
    candidate = `${root}-${suffix}`;
    suffix += 1;
    if (suffix > 500) return `${root}-${Date.now()}`;
  }
}

async function generateSku(categorySlug: string): Promise<string> {
  const prefix = slugify(categorySlug).slice(0, 3).toUpperCase() || 'GEN';
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const random = String(Math.floor(1000 + Math.random() * 9000));
    const candidate = `${prefix}-${random}`;
    const found = await prisma.product.findUnique({ where: { sku: candidate }, select: { id: true } });
    if (!found) return candidate;
  }
  return `${prefix}-${Date.now()}`;
}

async function resolveCategoryId(slug: string): Promise<string> {
  const category = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
  if (!category) throw badRequest(`La categoría "${slug}" no existe.`);
  return category.id;
}

function listsData(input: {
  images?: string[];
  sizes?: string[];
  colors?: string[];
  tags?: string[];
}): Prisma.ProductUncheckedUpdateInput {
  const data: Prisma.ProductUncheckedUpdateInput = {};
  if (input.images !== undefined) data.images = serializeList(input.images);
  if (input.sizes !== undefined) data.sizes = serializeList(input.sizes);
  if (input.colors !== undefined) data.colors = serializeList(input.colors);
  if (input.tags !== undefined) data.tags = serializeList(input.tags);
  return data;
}

/* --- Filtros de listado --------------------------------------------------- */

const listQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  categoria: z.string().trim().max(120).optional(),
  estado: z.enum(['todos', 'activos', 'inactivos', 'agotados', 'bajos']).default('todos'),
  orden: z
    .enum(['recientes', 'nombre', 'precio-asc', 'precio-desc', 'stock-asc', 'stock-desc'])
    .default('recientes'),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
});

const SORTS: Record<string, Prisma.ProductOrderByWithRelationInput> = {
  recientes: { createdAt: 'desc' },
  nombre: { name: 'asc' },
  'precio-asc': { price: 'asc' },
  'precio-desc': { price: 'desc' },
  'stock-asc': { stock: 'asc' },
  'stock-desc': { stock: 'desc' },
};

/** Umbral a partir del cual avisamos que queda poco inventario. */
export const LOW_STOCK_THRESHOLD = 5;

export function buildProductWhere(query: z.infer<typeof listQuerySchema>): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};

  if (query.categoria) where.category = { slug: query.categoria };
  if (query.q) {
    where.OR = [
      { name: { contains: query.q } },
      { slug: { contains: query.q } },
      { sku: { contains: query.q } },
      { description: { contains: query.q } },
    ];
  }

  switch (query.estado) {
    case 'activos':
      where.active = true;
      break;
    case 'inactivos':
      where.active = false;
      break;
    case 'agotados':
      where.stock = { lte: 0 };
      break;
    case 'bajos':
      where.stock = { gt: 0, lte: LOW_STOCK_THRESHOLD };
      break;
    default:
      break;
  }

  return where;
}

/* --- Rutas ---------------------------------------------------------------- */

export const adminProductRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  /** Listado con búsqueda, filtros, orden y paginación. */
  app.get('/api/admin/products', async (request, reply) => {
    const query = parseQuery(listQuerySchema, request.query);
    const where = buildProductWhere(query);

    const [items, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: SORTS[query.orden] ?? SORTS.recientes,
        skip: (query.page - 1) * query.porPagina,
        take: query.porPagina,
      }),
      prisma.product.count({ where }),
    ]);

    reply.code(200);
    return {
      items: items.map(serializeProduct),
      total,
      page: query.page,
      perPage: query.porPagina,
      pages: Math.max(1, Math.ceil(total / query.porPagina)),
      lowStockThreshold: LOW_STOCK_THRESHOLD,
    };
  });

  app.get('/api/admin/products/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const product = await prisma.product.findUnique({ where: { id }, include: { category: true } });
    if (!product) throw notFound('El producto no existe.');
    reply.code(200);
    return { product: serializeProduct(product) };
  });

  app.post('/api/admin/products', async (request, reply) => {
    const body = parseBody(productCreateSchema, request.body);
    const categoryId = await resolveCategoryId(body.categoryId);
    const slug = await uniqueSlug(body.slug?.trim() || body.name);
    const sku = body.sku?.trim() || (await generateSku(body.categoryId));

    const product = await prisma.product.create({
      data: {
        name: body.name,
        slug,
        sku,
        description: body.description,
        price: body.price,
        compareAtPrice: body.compareAtPrice ?? null,
        categoryId,
        images: serializeList(body.images),
        sizes: serializeList(body.sizes),
        colors: serializeList(body.colors),
        tags: serializeList(body.tags),
        stock: body.stock,
        material: body.material,
        fit: body.fit,
        active: body.active,
      },
      include: { category: true },
    });

    await invalidateCatalogCache();
    reply.code(201);
    return { product: serializeProduct(product) };
  });

  app.put('/api/admin/products/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(productUpdateSchema, request.body);

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw notFound('El producto no existe.');

    const data: Prisma.ProductUncheckedUpdateInput = {
      ...listsData(body),
    };

    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.price !== undefined) data.price = body.price;
    if (body.compareAtPrice !== undefined) data.compareAtPrice = body.compareAtPrice;
    if (body.stock !== undefined) data.stock = body.stock;
    if (body.material !== undefined) data.material = body.material;
    if (body.fit !== undefined) data.fit = body.fit;
    if (body.active !== undefined) data.active = body.active;
    if (body.categoryId !== undefined) data.categoryId = await resolveCategoryId(body.categoryId);
    if (body.slug !== undefined && body.slug.trim() !== '') {
      data.slug = await uniqueSlug(body.slug, id);
    }
    if (body.sku !== undefined && body.sku.trim() !== '') {
      const taken = await prisma.product.findFirst({
        where: { sku: body.sku.trim(), NOT: { id } },
        select: { id: true },
      });
      if (taken) throw conflict(`El SKU "${body.sku.trim()}" ya lo usa otro producto.`);
      data.sku = body.sku.trim();
    }

    const product = await prisma.product.update({
      where: { id },
      data,
      include: { category: true },
    });

    await invalidateCatalogCache();
    reply.code(200);
    return { product: serializeProduct(product) };
  });

  /** Ajuste rápido de inventario desde la tabla del panel. */
  app.patch('/api/admin/products/:id/stock', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(stockPatchSchema, request.body);

    const existing = await prisma.product.findUnique({ where: { id }, select: { stock: true } });
    if (!existing) throw notFound('El producto no existe.');

    const next = body.stock ?? existing.stock + (body.delta ?? 0);
    if (next < 0) throw badRequest('El stock no puede quedar en negativo.');

    const product = await prisma.product.update({
      where: { id },
      data: { stock: next },
      include: { category: true },
    });

    await invalidateCatalogCache();
    reply.code(200);
    return { product: serializeProduct(product) };
  });

  /**
   * Elimina un producto. El histórico de ventas se conserva: las líneas de
   * pedido guardan su propia copia del nombre y del precio (productId pasa a
   * nulo), así que los reportes del pasado no cambian.
   */
  app.delete('/api/admin/products/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw notFound('El producto no existe.');

    await prisma.product.delete({ where: { id } });
    await invalidateCatalogCache();

    reply.code(200);
    return { deleted: true, id };
  });
};

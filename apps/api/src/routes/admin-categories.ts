/* ===========================================================================
   Rutas de administración de categorías
   =========================================================================== */

import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { badRequest, notFound } from '../lib/http.js';
import { invalidateCatalogCache } from '../lib/cache.js';
import { parseBody } from '../lib/validate.js';
import { serializeCategory } from '../lib/mappers.js';
import { requireAuth } from '../lib/auth.js';
import { categoryCreateSchema, categoryUpdateSchema, slugify } from '../schemas.js';

export const adminCategoryRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  app.get('/api/admin/categories', async (_request, reply) => {
    const categories = await prisma.category.findMany({
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
    reply.code(200);
    return { items: categories.map(serializeCategory) };
  });

  app.post('/api/admin/categories', async (request, reply) => {
    const body = parseBody(categoryCreateSchema, request.body);
    const slug = slugify(body.slug?.trim() || body.name);
    if (!slug) throw badRequest('No pudimos generar un identificador para la categoría.');

    const exists = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
    if (exists) throw badRequest(`Ya existe una categoría con el identificador "${slug}".`);

    const category = await prisma.category.create({
      data: {
        slug,
        name: body.name,
        blurb: body.blurb || null,
        icon: body.icon || 'tag',
        position: body.position ?? 0,
      },
      include: { _count: { select: { products: true } } },
    });

    await invalidateCatalogCache();
    reply.code(201);
    return { category: serializeCategory(category) };
  });

  app.put('/api/admin/categories/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(categoryUpdateSchema, request.body);

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw notFound('La categoría no existe.');

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.blurb !== undefined) data.blurb = body.blurb || null;
    if (body.icon !== undefined) data.icon = body.icon || 'tag';
    if (body.position !== undefined) data.position = body.position;
    if (body.slug !== undefined && body.slug.trim() !== '') {
      const slug = slugify(body.slug);
      const taken = await prisma.category.findFirst({ where: { slug, NOT: { id } }, select: { id: true } });
      if (taken) throw badRequest(`El identificador "${slug}" ya está en uso.`);
      data.slug = slug;
    }

    const category = await prisma.category.update({
      where: { id },
      data,
      include: { _count: { select: { products: true } } },
    });

    await invalidateCatalogCache();
    reply.code(200);
    return { category: serializeCategory(category) };
  });

  /** Solo se permite borrar categorías vacías: los productos no se reasignan solos. */
  app.delete('/api/admin/categories/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!existing) throw notFound('La categoría no existe.');
    if (existing._count.products > 0) {
      throw badRequest(
        `La categoría tiene ${existing._count.products} producto(s). Muévelos a otra categoría antes de eliminarla.`,
      );
    }

    await prisma.category.delete({ where: { id } });
    await invalidateCatalogCache();
    reply.code(200);
    return { deleted: true, id };
  });
};

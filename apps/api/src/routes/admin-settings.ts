/* ===========================================================================
   Rutas de ajustes
   ---------------------------------------------------------------------------
   Permiten cambiar desde el panel lo que antes solo vivía en el código:
   número de WhatsApp, cobertura, costo de envío, barra superior, contacto…
   Al guardar se invalida la caché para que la tienda lo refleje enseguida.
   =========================================================================== */

import type { FastifyPluginAsync } from 'fastify';
import { invalidateCatalogCache } from '../lib/cache.js';
import { parseBody } from '../lib/validate.js';
import { getColors, getStoreConfig, saveColors, saveStoreConfig } from '../lib/settings.js';
import { requireAuth } from '../lib/auth.js';
import { colorsSchema } from '../schemas.js';

export const adminSettingsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  app.get('/api/admin/settings', async (_request, reply) => {
    const [config, colors] = await Promise.all([getStoreConfig(), getColors()]);
    reply.code(200);
    return { config, colors };
  });

  /** Guarda un subconjunto de la configuración (se combina con lo existente). */
  app.put('/api/admin/settings', async (request, reply) => {
    const config = await saveStoreConfig(request.body ?? {});
    await invalidateCatalogCache();
    reply.code(200);
    return { config };
  });

  app.put('/api/admin/settings/colors', async (request, reply) => {
    const { colors } = parseBody(colorsSchema, request.body);
    const saved = await saveColors(colors);
    await invalidateCatalogCache();
    reply.code(200);
    return { colors: saved };
  });
};

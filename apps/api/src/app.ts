/* ===========================================================================
   Construcción de la aplicación Fastify
   =========================================================================== */

import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { env } from './env.js';
import { HttpError } from './lib/http.js';
import { pingDatabase } from './lib/prisma.js';
import { cacheStatus } from './lib/cache.js';
import { authRoutes } from './routes/auth.js';
import { publicRoutes } from './routes/public.js';
import { adminProductRoutes } from './routes/admin-products.js';
import { adminCategoryRoutes } from './routes/admin-categories.js';
import { adminOrderRoutes } from './routes/admin-orders.js';
import { adminDashboardRoutes } from './routes/admin-dashboard.js';
import { adminSettingsRoutes } from './routes/admin-settings.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: env.isProduction
      ? { level: 'info' }
      : {
          level: 'info',
          transport: undefined,
        },
    trustProxy: true,
    bodyLimit: 1024 * 1024, // 1 MB: suficiente para un pedido o un producto
  });

  /* --- Seguridad y utilidades transversales ------------------------------ */

  await app.register(cors, {
    origin: env.corsOrigins.length > 0 ? env.corsOrigins : false,
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  });

  // Límite general: protege la API de abusos sin molestar al uso normal.
  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: '1 minute',
    allowList: [],
  });

  /* --- Manejo uniforme de errores ---------------------------------------- */

  app.setErrorHandler((error: Error & { statusCode?: number }, request, reply) => {
    if (error instanceof HttpError) {
      reply.code(error.statusCode);
      return {
        error: {
          code: error.code,
          message: error.message,
          details: error.details ?? null,
        },
      };
    }

    // Errores de validación del propio Fastify (JSON malformado, etc.)
    const statusCode = typeof error.statusCode === 'number' ? error.statusCode : 500;
    if (statusCode >= 500) {
      request.log.error({ err: error }, 'Error no controlado');
      reply.code(500);
      return {
        error: {
          code: 'error_interno',
          message: 'Ocurrió un error inesperado. Intenta de nuevo.',
          details: null,
        },
      };
    }

    reply.code(statusCode);
    return {
      error: { code: 'solicitud_invalida', message: error.message, details: null },
    };
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.code(404);
    return { error: { code: 'no_encontrado', message: 'La ruta solicitada no existe.', details: null } };
  });

  /* --- Estado del sistema ------------------------------------------------ */

  app.get('/api/health', async (_request, reply) => {
    const database = await pingDatabase();
    const cache = cacheStatus();
    reply.code(database ? 200 : 503);
    return {
      ok: database,
      service: 'parche-studio-api',
      version: '0.2.0',
      database: { connected: database },
      cache,
      uptime: Math.round(process.uptime()),
      time: new Date().toISOString(),
    };
  });

  /* --- Rutas ------------------------------------------------------------- */

  await app.register(authRoutes);
  await app.register(publicRoutes);
  await app.register(adminProductRoutes);
  await app.register(adminCategoryRoutes);
  await app.register(adminOrderRoutes);
  await app.register(adminDashboardRoutes);
  await app.register(adminSettingsRoutes);

  return app;
}

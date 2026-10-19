/* ===========================================================================
   Arranque del servidor
   =========================================================================== */

import { buildApp } from './app.js';
import { env } from './env.js';
import { prisma, pingDatabase } from './lib/prisma.js';
import { disconnectCache, ensureCache } from './lib/cache.js';

async function main(): Promise<void> {
  const app = await buildApp();

  const database = await pingDatabase();
  if (!database) {
    app.log.error(
      'No hay conexión con MySQL. Revisa DATABASE_URL y que el servidor esté encendido (pnpm infra:up).',
    );
  }

  // Redis es opcional: si no responde, solo se pierde la caché.
  const cache = await ensureCache();
  app.log.info(
    cache ? 'Redis conectado: catálogo en caché activo.' : 'Redis no disponible: la API sigue sin caché.',
  );

  await app.listen({ host: env.HOST, port: env.PORT });

  app.log.info(`Tienda y panel pueden consumir la API en http://${env.HOST}:${env.PORT}`);

  /* --- Cierre ordenado --------------------------------------------------- */

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info(`Recibí ${signal}: cerrando la API…`);
    try {
      await app.close();
      await disconnectCache();
      await prisma.$disconnect();
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('[api] No pude arrancar el servidor:', error);
  process.exit(1);
});

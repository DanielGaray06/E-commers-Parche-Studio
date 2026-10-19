/* ===========================================================================
   Cliente Prisma (una sola instancia por proceso)
   =========================================================================== */

import { PrismaClient } from '@prisma/client';
import { env } from '../env.js';

declare global {
  // eslint-disable-next-line no-var
  var __parchePrisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__parchePrisma ??
  new PrismaClient({
    log: env.isProduction ? ['error'] : ['warn', 'error'],
  });

if (!env.isProduction) {
  // En desarrollo, tsx recarga el proceso: reutilizamos la instancia para no
  // agotar el pool de conexiones de MySQL.
  globalThis.__parchePrisma = prisma;
}

/** Comprueba la conexión con la base de datos (usado por /api/health). */
export async function pingDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

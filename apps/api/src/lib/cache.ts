/* ===========================================================================
   Caché con Redis (opcional y tolerante a fallos)
   ---------------------------------------------------------------------------
   Redis se usa para dos cosas concretas:
   * Guardar en caché el catálogo público (se lee en cada visita a la tienda).
   * Llevar el contador de intentos de inicio de sesión del panel.

   Regla de diseño: si Redis no está disponible, la API sigue funcionando.
   La caché se degrada a "sin caché" y el limitador de intentos pasa a usar
   memoria del proceso. Nunca se cae una petición por culpa de Redis.
   =========================================================================== */

import { createClient, type RedisClientType } from 'redis';
import { env } from '../env.js';

type RedisClient = RedisClientType<Record<string, never>, Record<string, never>, Record<string, never>>;

let client: RedisClient | null = null;
let connecting: Promise<void> | null = null;
let available = false;

function getClient(): RedisClient | null {
  if (!client) {
    const instance = createClient({ url: env.REDIS_URL });
    instance.on('error', () => {
      available = false;
    });
    instance.on('ready', () => {
      available = true;
    });
    instance.on('end', () => {
      available = false;
    });
    client = instance as unknown as RedisClient;
  }
  return client;
}

/** Conecta de forma perezosa; devuelve false si Redis no responde. */
export async function ensureCache(): Promise<boolean> {
  if (available) return true;
  const instance = getClient();
  if (!instance) return false;

  if (!connecting) {
    connecting = instance
      .connect()
      .then(() => {
        available = true;
      })
      .catch(() => {
        available = false;
      })
      .finally(() => {
        connecting = null;
      });
  }
  await connecting;
  return available;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!(await ensureCache())) return null;
  try {
    const raw = await getClient()!.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (!(await ensureCache())) return;
  try {
    await getClient()!.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch {
    /* silencio: la caché es un lujo, no un requisito */
  }
}

/** Borra claves por patrón (por ejemplo `catalogo:*` al editar un producto). */
export async function cacheInvalidate(pattern: string): Promise<void> {
  if (!(await ensureCache())) return;
  try {
    const keys = await getClient()!.keys(pattern);
    if (keys.length > 0) await getClient()!.del(keys);
  } catch {
    /* silencio */
  }
}

/** Contador con expiración; devuelve el valor acumulado. */
export async function cacheIncrement(key: string, ttlSeconds: number): Promise<number> {
  if (!(await ensureCache())) return 0;
  try {
    const total = await getClient()!.incr(key);
    if (total === 1) await getClient()!.expire(key, ttlSeconds);
    return total;
  } catch {
    return 0;
  }
}

export async function cacheDelete(key: string): Promise<void> {
  if (!(await ensureCache())) return;
  try {
    await getClient()!.del(key);
  } catch {
    /* silencio */
  }
}

/** Prefijo de las claves que guardan el catálogo público. */
export const CATALOG_CACHE_PREFIX = 'parche:catalogo';

/** Se llama tras cualquier cambio en productos, categorías o ajustes. */
export async function invalidateCatalogCache(): Promise<void> {
  await cacheInvalidate(`${CATALOG_CACHE_PREFIX}*`);
}

export function cacheStatus(): { configured: boolean; connected: boolean } {
  return { configured: Boolean(env.REDIS_URL), connected: available };
}

export async function disconnectCache(): Promise<void> {
  if (client && available) {
    try {
      await client.quit();
    } catch {
      /* silencio */
    }
  }
  available = false;
}

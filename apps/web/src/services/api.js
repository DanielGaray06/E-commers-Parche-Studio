/* ===========================================================================
   Cliente de la API para la tienda
   ---------------------------------------------------------------------------
   Principio de diseño: la tienda NUNCA se queda en blanco por culpa de la API.
   Si la llamada falla (servidor apagado, sin red, despliegue estático sin
   backend), se sigue usando el catálogo y la configuración que vienen en el
   código, y el visitante puede comprar igual por WhatsApp.

   Base de la URL:
   * En desarrollo, Vite redirige /api hacia la API (ver vite.config.js).
   * En producción se puede apuntar a otro dominio con VITE_API_URL.
   =========================================================================== */

const BASE = import.meta.env.VITE_API_URL ?? '';

/** Tiempo máximo de espera para no dejar la portada en blanco. */
const TIMEOUT_MS = 6000;

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'error', details = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      signal: controller.signal,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    window.clearTimeout(timer);
    throw new ApiError(
      error?.name === 'AbortError'
        ? 'La tienda tardó demasiado en responder.'
        : 'No pudimos conectar con la tienda en línea.',
      { code: 'sin_conexion' },
    );
  }
  window.clearTimeout(timer);

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ApiError(payload?.error?.message ?? 'No pudimos completar la operación.', {
      status: response.status,
      code: payload?.error?.code ?? 'error',
      details: payload?.error?.details ?? null,
    });
  }

  return payload;
}

/**
 * Trae la configuración, la paleta y el catálogo en una sola petición.
 * @returns {Promise<null | { config: object, colors: object[], categories: object[], products: object[] }>}
 */
export async function fetchBootstrap() {
  try {
    return await request('/api/public/bootstrap');
  } catch (error) {
    console.warn('[PARCHE] No pude cargar el catálogo en línea:', error.message);
    return null;
  }
}

/**
 * Registra el pedido en la tienda y devuelve el mensaje oficial de WhatsApp.
 * Si falla, se lanza ApiError para que el llamador decida (no se pierde la
 * compra: el mensaje local sigue disponible).
 */
export function registerOrder(payload) {
  return request('/api/public/orders', { method: 'POST', body: payload });
}

/** ¿Está configurada una API remota explícita? */
export const hasRemoteApi = Boolean(BASE);

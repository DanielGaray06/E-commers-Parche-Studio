/* ===========================================================================
   Cliente de la API
   ---------------------------------------------------------------------------
   En desarrollo, Vite redirige /api hacia http://127.0.0.1:3001 (ver
   vite.config.js), así que el panel habla con la API por el mismo origen y no
   hay que lidiar con CORS. En producción se puede apuntar a otro dominio con
   la variable VITE_API_URL.
   =========================================================================== */

import { clearSession, getToken } from './session.js';

const BASE = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'error', details = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function toQuery(params) {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

async function request(path, { method = 'GET', body, params, auth = false } = {}) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';

  if (auth) {
    const token = getToken();
    if (token) headers.authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${BASE}${path}${toQuery(params)}`, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new ApiError('No pude contactar con la API. ¿Está encendida en el puerto 3001?', {
      code: 'sin_conexion',
    });
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    // Sesión vencida: se cierra sesión y se vuelve al acceso.
    if (response.status === 401 && auth) clearSession();

    throw new ApiError(payload?.error?.message ?? `Error ${response.status}.`, {
      status: response.status,
      code: payload?.error?.code ?? 'error',
      details: payload?.error?.details ?? null,
    });
  }

  return payload;
}

export const api = {
  health: () => request('/api/health'),

  login: (email, password) =>
    request('/api/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request('/api/auth/me', { auth: true }),

  dashboard: (dias = 30) => request('/api/admin/dashboard', { auth: true, params: { dias } }),

  products: {
    list: (params) => request('/api/admin/products', { auth: true, params }),
    get: (id) => request(`/api/admin/products/${id}`, { auth: true }),
    create: (data) => request('/api/admin/products', { method: 'POST', auth: true, body: data }),
    update: (id, data) =>
      request(`/api/admin/products/${id}`, { method: 'PUT', auth: true, body: data }),
    patchStock: (id, payload) =>
      request(`/api/admin/products/${id}/stock`, { method: 'PATCH', auth: true, body: payload }),
    remove: (id) => request(`/api/admin/products/${id}`, { method: 'DELETE', auth: true }),
  },

  categories: {
    list: () => request('/api/admin/categories', { auth: true }),
    create: (data) => request('/api/admin/categories', { method: 'POST', auth: true, body: data }),
    update: (id, data) =>
      request(`/api/admin/categories/${id}`, { method: 'PUT', auth: true, body: data }),
    remove: (id) => request(`/api/admin/categories/${id}`, { method: 'DELETE', auth: true }),
  },

  orders: {
    list: (params) => request('/api/admin/orders', { auth: true, params }),
    get: (id) => request(`/api/admin/orders/${id}`, { auth: true }),
    create: (data) => request('/api/admin/orders', { method: 'POST', auth: true, body: data }),
    update: (id, data) => request(`/api/admin/orders/${id}`, { method: 'PUT', auth: true, body: data }),
    setStatus: (id, status) =>
      request(`/api/admin/orders/${id}/status`, { method: 'PATCH', auth: true, body: { status } }),
    remove: (id) => request(`/api/admin/orders/${id}`, { method: 'DELETE', auth: true }),
    whatsapp: (id) => request(`/api/admin/orders/${id}/whatsapp`, { auth: true }),
  },

  settings: {
    get: () => request('/api/admin/settings', { auth: true }),
    save: (patch) => request('/api/admin/settings', { method: 'PUT', auth: true, body: patch }),
    saveColors: (colors) =>
      request('/api/admin/settings/colors', { method: 'PUT', auth: true, body: { colors } }),
  },

  /** Catálogo público: se usa en el panel para elegir productos al vender. */
  catalog: () => request('/api/public/bootstrap'),
};

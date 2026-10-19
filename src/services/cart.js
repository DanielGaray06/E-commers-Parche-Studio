/* ===========================================================================
   Servicio de carrito
   ---------------------------------------------------------------------------
   REGLA IMPORTANTE: en LocalStorage solo se guardan referencias (id de producto,
   talla, color y cantidad). El precio y el stock SIEMPRE se resuelven contra el
   catálogo actual, para que un cambio de precio no quede "congelado" en el
   navegador del cliente.

   El carrito es un pequeño store observable: las vistas se suscriben con
   `subscribe()` y se vuelven a pintar cuando algo cambia.
   =========================================================================== */

import { getProductById, isSoldOut } from './catalog.js';
import { site } from '../config/site.config.js';
import { validateQuantity } from '../utils/validators.js';

const STORAGE_KEY = 'parche.cart.v1';
const MAX_QUANTITY_PER_LINE = 20;

/** @type {{ productId: string, size: string, color: string, quantity: number }[]} */
let items = [];
const listeners = new Set();

/* --- Notificaciones ------------------------------------------------------- */

function notify() {
  for (const listener of listeners) listener();
}

/** Suscribe una función a los cambios del carrito. Devuelve un `unsubscribe`. */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/* --- Persistencia --------------------------------------------------------- */

function safeRead() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* modo privado o cuota llena: el carrito sigue funcionando en memoria */
  }
}

const lineKey = (productId, size, color) => `${productId}::${size}::${color}`;

/** Carga el carrito guardado y descarta lo que ya no sea válido. */
export function init() {
  items = safeRead()
    .map((item) => ({
      productId: String(item?.productId ?? ''),
      size: String(item?.size ?? ''),
      color: String(item?.color ?? ''),
      quantity: Math.max(1, Math.floor(Number(item?.quantity) || 1)),
    }))
    .filter((item) => {
      const product = getProductById(item.productId);
      if (!product || isSoldOut(product)) return false;
      if (item.size && !product.sizes.includes(item.size)) return false;
      if (item.color && !product.colors.includes(item.color)) return false;
      return true;
    })
    .map((item) => ({
      ...item,
      quantity: Math.min(item.quantity, maxFor(item.productId)),
    }))
    // Une líneas duplicadas que hayan quedado por versiones anteriores.
    .reduce((acc, item) => {
      const key = lineKey(item.productId, item.size, item.color);
      const existing = acc.find((entry) => lineKey(entry.productId, entry.size, entry.color) === key);
      if (existing) existing.quantity = Math.min(existing.quantity + item.quantity, maxFor(item.productId));
      else acc.push(item);
      return acc;
    }, []);

  persist();
  notify();
}

function maxFor(productId) {
  const product = getProductById(productId);
  const stock = product?.stock ?? 0;
  return Math.max(1, Math.min(stock, MAX_QUANTITY_PER_LINE));
}

/* --- Lectura -------------------------------------------------------------- */

/** Líneas resueltas contra el catálogo (producto, precio y totales reales). */
export function getLines() {
  return items
    .map((item) => {
      const product = getProductById(item.productId);
      if (!product) return null;
      return {
        key: lineKey(item.productId, item.size, item.color),
        product,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        unitPrice: product.price,
        lineTotal: product.price * item.quantity,
      };
    })
    .filter(Boolean);
}

/** Cantidad total de unidades en el carrito. */
export function getCount() {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function isEmpty() {
  return items.length === 0;
}

export function getSubtotal() {
  return getLines().reduce((total, line) => total + line.lineTotal, 0);
}

/**
 * Información de envío.
 * ⚠️ No se inventan tarifas: si `shipping.cost` es null, el envío queda
 * "pendiente de confirmación".
 */
export function getShipping() {
  const subtotal = getSubtotal();
  const { cost, costLabel, freeFrom } = site.shipping;

  if (subtotal === 0) return { amount: 0, label: costLabel, isPending: true };

  if (typeof cost === 'number') {
    if (typeof freeFrom === 'number' && subtotal >= freeFrom) {
      return { amount: 0, label: 'Gratis', isPending: false };
    }
    return { amount: cost, label: null, isPending: false };
  }

  return { amount: null, label: costLabel, isPending: true };
}

/** Total estimado = subtotal + envío (solo si el envío está confirmado). */
export function getTotal() {
  const shipping = getShipping();
  return getSubtotal() + (shipping.isPending ? 0 : shipping.amount);
}

export function findLine(key) {
  return getLines().find((line) => line.key === key) ?? null;
}

/* --- Escritura ------------------------------------------------------------ */

/**
 * Agrega un producto al carrito.
 * @returns {{ ok: boolean, reason?: string }}
 */
export function add({ productId, size = '', color = '', quantity = 1 }) {
  const product = getProductById(productId);
  if (!product) return { ok: false, reason: 'El producto ya no está disponible.' };
  if (isSoldOut(product)) return { ok: false, reason: 'Este producto está agotado.' };
  if (product.sizes.length > 0 && !product.sizes.includes(size)) {
    return { ok: false, reason: 'Selecciona una talla disponible.' };
  }
  if (product.colors.length > 0 && !product.colors.includes(color)) {
    return { ok: false, reason: 'Selecciona un color disponible.' };
  }

  const check = validateQuantity(quantity, maxFor(productId));
  if (!check.valid) return { ok: false, reason: check.reason };

  const key = lineKey(productId, size, color);
  const existing = items.find((item) => lineKey(item.productId, item.size, item.color) === key);

  if (existing) {
    const next = existing.quantity + quantity;
    if (next > maxFor(productId)) {
      return { ok: false, reason: `Ya tienes el máximo disponible (${maxFor(productId)}) en el carrito.` };
    }
    existing.quantity = next;
  } else {
    items.push({ productId, size, color, quantity });
  }

  persist();
  notify();
  return { ok: true };
}

/** Fija la cantidad exacta de una línea. */
export function setQuantity(key, quantity) {
  const item = items.find((entry) => lineKey(entry.productId, entry.size, entry.color) === key);
  if (!item) return { ok: false, reason: 'La línea ya no existe.' };

  const value = Math.floor(Number(quantity));
  if (value <= 0) return remove(key);

  const check = validateQuantity(value, maxFor(item.productId));
  if (!check.valid) return { ok: false, reason: check.reason };

  item.quantity = value;
  persist();
  notify();
  return { ok: true };
}

export function increment(key) {
  const line = findLine(key);
  if (!line) return { ok: false };
  return setQuantity(key, line.quantity + 1);
}

export function decrement(key) {
  const line = findLine(key);
  if (!line) return { ok: false };
  return setQuantity(key, line.quantity - 1);
}

export function remove(key) {
  items = items.filter((item) => lineKey(item.productId, item.size, item.color) !== key);
  persist();
  notify();
  return { ok: true };
}

export function clear() {
  items = [];
  persist();
  notify();
}

/**
 * Verifica el carrito antes de armar el pedido.
 * Detecta productos agotados o cantidades por encima del stock actual.
 */
export function validate() {
  const issues = [];
  for (const line of getLines()) {
    if (line.product.stock <= 0) {
      issues.push(`${line.product.name}: se agotó mientras comprabas.`);
    } else if (line.quantity > line.product.stock) {
      issues.push(
        `${line.product.name}: solo quedan ${line.product.stock} unidades (tienes ${line.quantity}).`,
      );
    }
  }
  return { valid: issues.length === 0, issues };
}

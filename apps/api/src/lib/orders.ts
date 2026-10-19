/* ===========================================================================
   Dominio de pedidos
   ---------------------------------------------------------------------------
   Modelo de stock — "se reserva al confirmar":

   * Al crear un pedido desde la tienda queda en estado `pendiente` y NO se
     descuenta stock. Es lo correcto porque abrir WhatsApp no confirma nada:
     el pedido puede quedar en el aire o cancelarse.
   * Al pasar a `confirmado` (o `enviado`/`entregado`, por si el dueño salta
     pasos) se descuenta el stock de forma atómica. Si no alcanza, la
     operación falla completa y no queda nada a medias.
   * Si se vuelve a un estado sin stock aplicado (`pendiente`/`cancelado`),
     el stock se devuelve.

   No hay columna extra que "recuerde" si el stock se aplicó: se deduce del
   estado anterior y del nuevo. Menos campos que puedan quedar inconsistentes.
   =========================================================================== */

import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { conflict, notFound, unprocessable } from './http.js';
import { colorName, type ColorOption } from './settings.js';
import type { StoreConfig } from '../data/store-defaults.js';

/* --- Estados -------------------------------------------------------------- */

export const ORDER_STATUSES = [
  'pendiente',
  'confirmado',
  'enviado',
  'entregado',
  'cancelado',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export const ORDER_CHANNELS = ['whatsapp', 'manual'] as const;
export type OrderChannel = (typeof ORDER_CHANNELS)[number];

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && (ORDER_STATUSES as readonly string[]).includes(value);
}

/** Estados en los que el stock ya está descontado del inventario. */
const STOCK_APPLIED: readonly OrderStatus[] = ['confirmado', 'enviado', 'entregado'];

function appliesStock(status: OrderStatus): boolean {
  return STOCK_APPLIED.includes(status);
}

/* --- Consultas reutilizables ---------------------------------------------- */

export const orderInclude = {
  items: { orderBy: { name: 'asc' } },
  createdBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.OrderInclude;

export type OrderWithItems = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

/* --- Utilidades ----------------------------------------------------------- */

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Igual que en la tienda: "$89.000". */
export function formatCurrency(value: number): string {
  return copFormatter.format(Number.isFinite(value) ? value : 0);
}

/** Referencia legible del pedido: PS-261019-4821 (mismo formato que la tienda). */
export function generateOrderReference(date = new Date()): string {
  const stamp = [
    String(date.getFullYear()).slice(2),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');
  const random = String(Math.floor(1000 + Math.random() * 9000));
  return `PS-${stamp}-${random}`;
}

/* --- Envío ---------------------------------------------------------------- */

export interface ShippingInfo {
  amount: number | null;
  label: string | null;
  isPending: boolean;
}

/**
 * Calcula el envío con la misma regla que la tienda y que el carrito.
 * REGLA DEL PROYECTO: si no hay tarifa real configurada (`cost: null`), el
 * envío queda "pendiente de confirmación" y no se suma al total.
 */
export function computeShipping(subtotal: number, config: StoreConfig): ShippingInfo {
  const { cost, costLabel, freeFrom } = config.shipping;

  if (subtotal === 0) return { amount: 0, label: costLabel, isPending: true };

  if (typeof cost === 'number') {
    if (typeof freeFrom === 'number' && subtotal >= freeFrom) {
      return { amount: 0, label: 'Gratis', isPending: false };
    }
    return { amount: cost, label: null, isPending: false };
  }

  return { amount: null, label: costLabel, isPending: true };
}

/* --- Mensaje de WhatsApp -------------------------------------------------- */

export interface MessageInput {
  reference: string;
  items: Array<{
    name: string;
    size: string | null;
    color: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  customer: {
    name: string;
    neighborhood: string | null;
    address: string | null;
    deliveryMethod: string | null;
    phone: string | null;
    notes: string | null;
  };
  subtotal: number;
  shipping: ShippingInfo;
  total: number;
  greeting: string;
  colors: ColorOption[];
}

/**
 * Construye el mensaje del pedido. Reproduce exactamente el formato que ya
 * estaba verificado en la tienda: la API pasa a ser la única fuente de verdad
 * del texto, de modo que tienda y panel generan el mismo mensaje.
 */
export function buildOrderMessage(input: MessageInput): string {
  const { items, customer, subtotal, shipping, total, reference, greeting, colors } = input;

  const shippingLine = () => {
    if (shipping.isPending) return 'Por confirmar (según tu barrio)';
    if (shipping.amount === 0) return 'Gratis';
    return formatCurrency(shipping.amount ?? 0);
  };

  const blocks: string[] = [];

  blocks.push(greeting);
  blocks.push('');
  blocks.push(`*Pedido ${reference}*`);
  blocks.push('');

  items.forEach((item, index) => {
    const color = colorName(colors, item.color);
    blocks.push(`${index + 1}. ${item.name}`);
    if (item.size) blocks.push(`   • Talla: ${item.size}`);
    if (color) blocks.push(`   • Color: ${color}`);
    blocks.push(`   • Cantidad: ${item.quantity}`);
    blocks.push(`   • Precio unitario: ${formatCurrency(item.unitPrice)}`);
    blocks.push(`   • Subtotal: ${formatCurrency(item.lineTotal)}`);
    blocks.push('');
  });

  blocks.push('*Resumen*');
  blocks.push(`Subtotal: ${formatCurrency(subtotal)}`);
  blocks.push(`Envío: ${shippingLine()}`);
  blocks.push(`Total estimado: ${formatCurrency(total)}`);
  blocks.push('');

  blocks.push('*Datos de entrega*');
  blocks.push(`Nombre: ${customer.name ?? ''}`);
  blocks.push(`Barrio o sector: ${customer.neighborhood ?? ''}`);
  if (customer.address) blocks.push(`Dirección: ${customer.address}`);
  if (customer.deliveryMethod) {
    blocks.push(
      `Entrega: ${customer.deliveryMethod === 'domicilio' ? 'A domicilio' : 'Recoger con la tienda'}`,
    );
  }
  if (customer.phone) blocks.push(`Contacto: ${customer.phone}`);
  if (customer.notes) blocks.push(`Observaciones: ${customer.notes}`);
  blocks.push('');

  blocks.push(
    '¿Me confirman disponibilidad, costo de envío y tiempo de entrega? El pedido queda *pendiente de confirmación* por parte de la tienda.',
  );

  return blocks.join('\n');
}

/** Enlace oficial de WhatsApp con el mensaje codificado. */
export function buildWhatsAppUrl(message: string, number: string): string {
  const clean = String(number).replace(/[^0-9]/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

/* --- Entrada de pedidos --------------------------------------------------- */

export interface CreateOrderItemInput {
  productId: string;
  size?: string | null;
  color?: string | null;
  quantity: number;
}

export interface CreateOrderInput {
  customer: {
    name: string;
    phone?: string | null;
    neighborhood?: string | null;
    address?: string | null;
    deliveryMethod?: string | null;
    notes?: string | null;
  };
  items: CreateOrderItemInput[];
  channel?: OrderChannel;
  status?: OrderStatus;
  createdById?: string | null;
  /** Permite registrar ventas pasadas desde el panel (por defecto: ahora). */
  createdAt?: Date;
  /** La tienda solo puede pedir productos activos; el panel puede vender cualquiera. */
  onlyActive?: boolean;
}

/**
 * Crea un pedido recalculando SIEMPRE los precios contra la base de datos.
 * Nunca se confía en el precio que envíe el navegador.
 */
export async function createOrder(input: CreateOrderInput, config: StoreConfig) {
  if (input.items.length === 0) {
    throw unprocessable('El pedido no tiene prendas.');
  }

  const ids = [...new Set(input.items.map((item) => item.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: ids } } });
  const byId = new Map(products.map((product) => [product.id, product]));

  const items: Array<{
    productId: string;
    name: string;
    size: string | null;
    color: string | null;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }> = [];

  const problems: string[] = [];

  for (const raw of input.items) {
    const product = byId.get(raw.productId);
    const quantity = Math.floor(Number(raw.quantity));

    if (!product) {
      problems.push('Una de las prendas ya no existe en el catálogo.');
      continue;
    }
    if (input.onlyActive && !product.active) {
      problems.push(`${product.name}: ya no está publicado en la tienda.`);
      continue;
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      problems.push(`${product.name}: cantidad inválida.`);
      continue;
    }

    const sizes = JSON.parse(product.sizes) as string[];
    const colors = JSON.parse(product.colors) as string[];
    const size = raw.size ? String(raw.size) : null;
    const color = raw.color ? String(raw.color) : null;

    if (sizes.length > 0 && (!size || !sizes.includes(size))) {
      problems.push(`${product.name}: debes elegir una talla disponible.`);
      continue;
    }
    if (colors.length > 0 && (!color || !colors.includes(color))) {
      problems.push(`${product.name}: debes elegir un color disponible.`);
      continue;
    }
    // La disponibilidad se verifica al crear, pero el stock se descuenta al
    // confirmar. Así nadie compra lo que ya no hay, sin reservar de más.
    if (product.stock < quantity) {
      problems.push(
        product.stock === 0
          ? `${product.name}: se agotó.`
          : `${product.name}: solo quedan ${product.stock} unidades.`,
      );
      continue;
    }

    items.push({
      productId: product.id,
      name: product.name,
      size,
      color,
      unitPrice: product.price,
      quantity,
      lineTotal: product.price * quantity,
    });
  }

  if (problems.length > 0) {
    throw unprocessable('No pudimos registrar el pedido.', problems);
  }

  const subtotal = items.reduce((total, item) => total + item.lineTotal, 0);
  const shipping = computeShipping(subtotal, config);
  const total = subtotal + (shipping.isPending ? 0 : shipping.amount ?? 0);

  const status: OrderStatus = input.status ?? 'pendiente';
  const channel: OrderChannel = input.channel ?? 'whatsapp';

  // Un pedido creado ya como confirmado/entregado (venta manual) descuenta
  // stock de inmediato.
  return prisma.$transaction(async (tx) => {
    if (appliesStock(status)) {
      for (const item of items) {
        const updated = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count === 0) {
          throw conflict(`Sin stock suficiente para ${item.name}.`);
        }
      }
    }

    let reference = generateOrderReference();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const exists = await tx.order.findUnique({ where: { reference }, select: { id: true } });
      if (!exists) break;
      reference = generateOrderReference();
    }

    const now = new Date();
    const createdAt = input.createdAt ?? now;
    return tx.order.create({
      data: {
        reference,
        status,
        channel,
        customerName: input.customer.name,
        customerPhone: input.customer.phone ?? null,
        neighborhood: input.customer.neighborhood ?? null,
        address: input.customer.address ?? null,
        deliveryMethod: input.customer.deliveryMethod ?? null,
        notes: input.customer.notes ?? null,
        subtotal,
        shipping: shipping.isPending ? 0 : shipping.amount ?? 0,
        shippingPending: shipping.isPending,
        total,
        createdById: input.createdById ?? null,
        createdAt,
        confirmedAt: appliesStock(status) ? createdAt : null,
        deliveredAt: status === 'entregado' ? createdAt : null,
        canceledAt: status === 'cancelado' ? createdAt : null,
        items: { create: items },
      },
      include: orderInclude,
    });
  });
}

/* --- Cambio de estado ----------------------------------------------------- */

export async function changeOrderStatus(orderId: string, next: OrderStatus) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: orderInclude });
  if (!order) throw notFound('El pedido no existe.');

  const previous = order.status as OrderStatus;
  if (previous === next) return order;

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    // Pasa a un estado con stock aplicado: descontamos.
    if (!appliesStock(previous) && appliesStock(next)) {
      const missing: string[] = [];
      for (const item of order.items) {
        if (!item.productId) continue;
        const updated = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count === 0) missing.push(item.name);
      }
      if (missing.length > 0) {
        throw conflict(
          `No hay stock suficiente para confirmar el pedido: ${missing.join(', ')}.`,
          missing,
        );
      }
    }

    // Vuelve a un estado sin stock aplicado: devolvemos.
    if (appliesStock(previous) && !appliesStock(next)) {
      for (const item of order.items) {
        if (!item.productId) continue;
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    return tx.order.update({
      where: { id: orderId },
      data: {
        status: next,
        confirmedAt: appliesStock(next) ? (order.confirmedAt ?? now) : null,
        deliveredAt: next === 'entregado' ? (order.deliveredAt ?? now) : null,
        canceledAt: next === 'cancelado' ? now : null,
      },
      include: orderInclude,
    });
  });
}

/* --- Serialización para la API -------------------------------------------- */

export function serializeOrder(order: OrderWithItems) {
  return {
    id: order.id,
    reference: order.reference,
    status: order.status,
    statusLabel: ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status,
    channel: order.channel,
    customer: {
      name: order.customerName,
      phone: order.customerPhone,
      neighborhood: order.neighborhood,
      address: order.address,
      deliveryMethod: order.deliveryMethod,
      notes: order.notes,
    },
    subtotal: order.subtotal,
    shipping: order.shipping,
    shippingPending: order.shippingPending,
    total: order.total,
    itemCount: order.items.reduce((total, item) => total + item.quantity, 0),
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.name,
      size: item.size,
      color: item.color,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
    createdBy: order.createdBy ?? null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    confirmedAt: order.confirmedAt?.toISOString() ?? null,
    deliveredAt: order.deliveredAt?.toISOString() ?? null,
    canceledAt: order.canceledAt?.toISOString() ?? null,
  };
}

export type SerializedOrder = ReturnType<typeof serializeOrder>;

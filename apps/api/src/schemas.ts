/* ===========================================================================
   Esquemas de validación (Zod)
   ---------------------------------------------------------------------------
   Toda la entrada de la API se valida aquí antes de tocar la base de datos.
   Los mensajes están en español porque varios se muestran en el panel.
   =========================================================================== */

import { z } from 'zod';
import { ORDER_CHANNELS, ORDER_STATUSES } from './lib/orders.js';

/* --- Utilidades ----------------------------------------------------------- */

export function slugify(text: string): string {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 150);
}

const optionalString = (max: number) =>
  z
    .union([z.string().trim().max(max), z.literal(''), z.null()])
    .optional()
    .transform((value) => {
      if (value === undefined || value === null) return null;
      const clean = String(value).trim();
      return clean === '' ? null : clean;
    });

const stringList = (max: number) =>
  z.array(z.string().trim().min(1).max(80)).max(max).transform((list) => [
    ...new Set(list.map((item) => item.trim()).filter(Boolean)),
  ]);

/* --- Autenticación -------------------------------------------------------- */

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Escribe un correo válido.'),
  password: z.string().min(1, 'Escribe tu contraseña.').max(200),
});

/* --- Productos ------------------------------------------------------------ */

export const productCreateSchema = z.object({
  name: z.string().trim().min(2, 'El nombre es obligatorio.').max(160),
  slug: z.string().trim().max(160).optional(),
  sku: z.string().trim().max(64).optional(),
  description: z.string().trim().max(4000).default(''),
  price: z.coerce.number().int('El precio debe ser un número entero.').min(0).max(1_000_000_000),
  compareAtPrice: z
    .union([z.coerce.number().int().min(0).max(1_000_000_000), z.null()])
    .optional()
    .default(null),
  categoryId: z.string().trim().min(1, 'Elige una categoría.'),
  images: stringList(8).default([]),
  sizes: stringList(20).default([]),
  colors: stringList(20).default([]),
  tags: stringList(10).default([]),
  stock: z.coerce.number().int('El stock debe ser un número entero.').min(0).max(1_000_000).default(0),
  material: optionalString(160),
  fit: optionalString(120),
  active: z.boolean().default(true),
});

export const productUpdateSchema = productCreateSchema.partial();

export const stockPatchSchema = z
  .object({
    /** Fija el stock a un valor absoluto. */
    stock: z.coerce.number().int().min(0).max(1_000_000).optional(),
    /** Suma o resta unidades respecto al valor actual. */
    delta: z.coerce.number().int().min(-1_000_000).max(1_000_000).optional(),
  })
  .refine((data) => data.stock !== undefined || data.delta !== undefined, {
    message: 'Indica `stock` o `delta`.',
  });

/* --- Categorías ----------------------------------------------------------- */

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(2, 'El nombre es obligatorio.').max(120),
  slug: z.string().trim().max(120).optional(),
  blurb: z.string().trim().max(255).optional().default(''),
  icon: z.string().trim().max(40).optional().default('tag'),
  position: z.coerce.number().int().min(0).max(999).optional().default(0),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

/* --- Pedidos -------------------------------------------------------------- */

export const orderItemSchema = z.object({
  productId: z.string().trim().min(1),
  size: z.string().trim().max(32).nullish(),
  color: z.string().trim().max(32).nullish(),
  quantity: z.coerce.number().int().min(1).max(999),
});

export const orderCustomerSchema = z.object({
  name: z.string().trim().min(2, 'Escribe el nombre de quien recibe.').max(160),
  phone: optionalString(40),
  neighborhood: optionalString(120),
  address: optionalString(255),
  deliveryMethod: z.enum(['domicilio', 'recoger']).nullish(),
  notes: optionalString(1000),
});

/** Pedido enviado desde la tienda pública. */
export const publicOrderSchema = z.object({
  customer: orderCustomerSchema,
  items: z.array(orderItemSchema).min(1, 'El carrito está vacío.').max(50),
});

/** Venta registrada a mano desde el panel. */
export const manualOrderSchema = z.object({
  customer: orderCustomerSchema,
  items: z.array(orderItemSchema).min(1, 'Agrega al menos una prenda.').max(50),
  status: z.enum(ORDER_STATUSES).default('entregado'),
  channel: z.enum(ORDER_CHANNELS).default('manual'),
  /** Fecha de la venta (por defecto, ahora). */
  createdAt: z.coerce.date().optional(),
});

export const orderUpdateSchema = z.object({
  customer: orderCustomerSchema.partial().optional(),
  notes: optionalString(1000),
});

export const orderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

/* --- Ajustes -------------------------------------------------------------- */

export const colorsSchema = z.object({
  colors: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(40),
        name: z.string().trim().min(1).max(60),
        hex: z
          .string()
          .trim()
          .regex(/^#[0-9a-fA-F]{3,8}$/, 'El color debe estar en formato hexadecimal (#rrggbb).'),
      }),
    )
    .max(60),
});

/* --- Filtros de listado --------------------------------------------------- */

export const paginationSchema = z.object({
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type ManualOrderInput = z.infer<typeof manualOrderSchema>;
export type PublicOrderInput = z.infer<typeof publicOrderSchema>;

/* ===========================================================================
   Traducción entre la base de datos y la forma que consume la interfaz
   ---------------------------------------------------------------------------
   Dos decisiones que conviene tener presentes:

   1. Los campos de lista (imágenes, tallas, colores, etiquetas) se guardan en
      MySQL como texto JSON. Aquí es donde se convierten de ida y vuelta.

   2. La tienda identifica las categorías por su `slug` ("camisetas"), no por
      el id interno de la base de datos. Por eso la API pública expone
      `category: <slug>`, manteniendo las URLs `#/catalogo?categoria=buzos`
      que ya funcionan en la tienda.
   =========================================================================== */

import type { Category, Product } from '@prisma/client';

/* --- Listas en JSON ------------------------------------------------------- */

export function parseList(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}

export function serializeList(values: unknown): string {
  if (!Array.isArray(values)) return '[]';
  return JSON.stringify(values.map((item) => String(item).trim()).filter(Boolean));
}

/* --- Categorías ----------------------------------------------------------- */

export interface SerializedCategory {
  id: string;
  slug: string;
  name: string;
  blurb: string;
  icon: string;
  position: number;
  productCount?: number;
}

export function serializeCategory(
  category: Category & { _count?: { products: number } },
): SerializedCategory {
  return {
    id: category.slug,
    slug: category.slug,
    name: category.name,
    blurb: category.blurb ?? '',
    icon: category.icon ?? 'tag',
    position: category.position,
    ...(category._count ? { productCount: category._count.products } : {}),
  };
}

/* --- Productos ------------------------------------------------------------ */

export interface SerializedProduct {
  id: string;
  sku: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  category: string;
  images: string[];
  sizes: string[];
  colors: string[];
  stock: number;
  tags: string[];
  material: string;
  fit: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Convierte un producto de la base de datos a la forma que ya espera la
 * tienda (`category` en vez de `categoryId`, listas en vez de texto JSON).
 */
export function serializeProduct(product: Product & { category?: Category | null }): SerializedProduct {
  return {
    id: product.id,
    sku: product.sku,
    slug: product.slug,
    name: product.name,
    description: product.description,
    price: product.price,
    compareAtPrice: product.compareAtPrice ?? null,
    category: product.category?.slug ?? product.categoryId,
    images: parseList(product.images),
    sizes: parseList(product.sizes),
    colors: parseList(product.colors),
    stock: product.stock,
    tags: parseList(product.tags),
    material: product.material ?? '',
    fit: product.fit ?? '',
    active: product.active,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

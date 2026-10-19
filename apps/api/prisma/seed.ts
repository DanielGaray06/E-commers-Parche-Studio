/* ===========================================================================
   Seed — siembra inicial de la base de datos
   ---------------------------------------------------------------------------
   Qué hace:
     1. Crea (o actualiza) el usuario administrador del panel.
     2. Copia a MySQL las categorías, los productos y la configuración que hoy
        viven en `apps/web/src/data/products.js` y `site.config.js`.
     3. Guarda la paleta de colores editable desde el panel.

   Regla importante: por defecto NO sobreescribe lo que ya existe. Si el
   propietario cambió un precio en el panel, volver a sembrar no lo revierte.
   Usa `--reset` si de verdad quieres volver a los valores del código.

   Uso:
     pnpm db:seed              # siembra lo que falte
     pnpm db:seed -- --reset   # sobreescribe catálogo y configuración
     pnpm db:seed -- --demo    # añade pedidos de ejemplo (marcados DEMO)
     pnpm db:seed -- --clear-demo   # borra los pedidos de ejemplo y repone stock
   =========================================================================== */

import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password.js';
import { createOrder } from '../src/lib/orders.js';
import { replaceStoreConfig, saveColors, getStoreConfig } from '../src/lib/settings.js';
import { SETTINGS_KEY, COLORS_KEY } from '../src/data/store-defaults.js';

// Datos actuales de la tienda (única fuente: los archivos de la app web).
import { site } from '../../web/src/config/site.config.js';
import { categories as webCategories, products as webProducts, COLORS } from '../../web/src/data/products.js';

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const RESET = args.includes('--reset');
const WITH_DEMO = args.includes('--demo');
const CLEAR_DEMO = args.includes('--clear-demo');

const DEMO_PREFIX = '⚠️ DEMO';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@parche.studio';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Parche2026*';
const ADMIN_NAME = process.env.ADMIN_NAME ?? 'Administrador';

const log = (message: string) => console.log(`  ${message}`);

/* --- 1. Usuario administrador --------------------------------------------- */

async function seedAdmin(): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

  if (!existing) {
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        passwordHash: await hashPassword(ADMIN_PASSWORD),
        role: 'admin',
      },
    });
    log(`Usuario administrador creado: ${ADMIN_EMAIL}`);
    log('La contraseña inicial está en apps/api/.env (ADMIN_PASSWORD). Cámbiala.');
    return;
  }

  if (RESET) {
    await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: { passwordHash: await hashPassword(ADMIN_PASSWORD), active: true },
    });
    log(`Contraseña del administrador restablecida desde .env (${ADMIN_EMAIL}).`);
  } else {
    log(`El administrador ${ADMIN_EMAIL} ya existe: no lo toco.`);
  }
}

/* --- 2. Categorías -------------------------------------------------------- */

async function seedCategories(): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  for (const [index, category] of webCategories.entries()) {
    const data = {
      slug: category.id,
      name: category.name,
      blurb: category.blurb ?? null,
      icon: category.icon ?? 'tag',
      position: index,
    };

    // El id de la categoría ES su slug ("camisetas"): así el catálogo de la
    // tienda, la API y la base de datos hablan exactamente del mismo modo.
    const existing = await prisma.category.findUnique({ where: { id: category.id } });

    if (!existing) {
      await prisma.category.create({ data: { id: category.id, ...data } });
      log(`Categoría creada: ${category.name}`);
    } else if (RESET) {
      await prisma.category.update({ where: { id: category.id }, data });
      log(`Categoría actualizada: ${category.name}`);
    }

    map.set(category.id, category.id);
  }

  return map;
}

/* --- 3. Productos --------------------------------------------------------- */

async function seedProducts(categoryIds: Map<string, string>): Promise<void> {
  let created = 0;
  let skipped = 0;

  for (const product of webProducts) {
    const categoryId = categoryIds.get(product.category);
    if (!categoryId) {
      log(`AVISO: la categoría "${product.category}" no existe; salto ${product.name}.`);
      continue;
    }

    const data = {
      sku: product.id.toUpperCase(),
      slug: product.slug,
      name: product.name,
      description: product.description,
      price: product.price,
      compareAtPrice: product.compareAtPrice ?? null,
      categoryId,
      images: JSON.stringify(product.images ?? []),
      sizes: JSON.stringify(product.sizes ?? []),
      colors: JSON.stringify(product.colors ?? []),
      tags: JSON.stringify(product.tags ?? []),
      stock: product.stock,
      material: product.material ?? null,
      fit: product.fit ?? null,
      active: true,
      createdAt: new Date(product.createdAt),
    };

    const existing = await prisma.product.findUnique({ where: { id: product.id } });

    if (!existing) {
      await prisma.product.create({ data: { id: product.id, ...data } });
      created += 1;
    } else if (RESET) {
      await prisma.product.update({ where: { id: product.id }, data });
      created += 1;
    } else {
      skipped += 1;
    }
  }

  log(`Productos: ${created} escritos, ${skipped} respetados (ya existían).`);
}

/* --- 4. Configuración y colores ------------------------------------------- */

async function seedSettings(): Promise<void> {
  const existing = await prisma.setting.findUnique({ where: { key: SETTINGS_KEY } });

  if (!existing || RESET) {
    await replaceStoreConfig(site as never);
    log('Configuración de la tienda sembrada (marca, WhatsApp, cobertura, envío…).');
  } else {
    log('La configuración ya existía: no la sobreescribo.');
  }

  const colorsRow = await prisma.setting.findUnique({ where: { key: COLORS_KEY } });
  if (!colorsRow || RESET) {
    await saveColors(
      Object.entries(COLORS).map(([id, color]) => ({
        id,
        name: (color as { name: string }).name,
        hex: (color as { hex: string }).hex,
      })),
    );
    log(`Paleta de colores sembrada (${Object.keys(COLORS).length} colores).`);
  } else {
    log('La paleta de colores ya existía: no la sobreescribo.');
  }
}

/* --- 5. Pedidos de ejemplo (opcional) ------------------------------------- */

interface DemoOrder {
  daysAgo: number;
  status: 'pendiente' | 'entregado';
  name: string;
  neighborhood: string;
  items: Array<{ productId: string; size: string; color: string; quantity: number }>;
}

const DEMO_ORDERS: DemoOrder[] = [
  { daysAgo: 0, status: 'pendiente', name: 'Cliente de ejemplo 1', neighborhood: 'El Poblado', items: [{ productId: 'cam-001', size: 'M', color: 'negro', quantity: 1 }, { productId: 'acc-001', size: 'Única', color: 'negro', quantity: 1 }] },
  { daysAgo: 1, status: 'entregado', name: 'Cliente de ejemplo 2', neighborhood: 'Laureles', items: [{ productId: 'buz-001', size: 'L', color: 'gris', quantity: 1 }] },
  { daysAgo: 2, status: 'entregado', name: 'Cliente de ejemplo 3', neighborhood: 'Belén', items: [{ productId: 'pan-001', size: '32', color: 'azul', quantity: 1 }, { productId: 'cam-002', size: 'M', color: 'blanco', quantity: 1 }] },
  { daysAgo: 4, status: 'entregado', name: 'Cliente de ejemplo 4', neighborhood: 'Robledo', items: [{ productId: 'cam-001', size: 'L', color: 'blanco', quantity: 2 }] },
  { daysAgo: 5, status: 'entregado', name: 'Cliente de ejemplo 5', neighborhood: 'La América', items: [{ productId: 'cha-001', size: 'M', color: 'azul', quantity: 1 }] },
  { daysAgo: 7, status: 'entregado', name: 'Cliente de ejemplo 6', neighborhood: 'Centro', items: [{ productId: 'acc-002', size: 'Única', color: 'vino', quantity: 2 }, { productId: 'acc-004', size: 'Única', color: 'negro', quantity: 1 }] },
  { daysAgo: 9, status: 'entregado', name: 'Cliente de ejemplo 7', neighborhood: 'Laureles', items: [{ productId: 'buz-002', size: 'M', color: 'verde', quantity: 1 }] },
  { daysAgo: 11, status: 'entregado', name: 'Cliente de ejemplo 8', neighborhood: 'El Poblado', items: [{ productId: 'cam-003', size: 'L', color: 'gris', quantity: 1 }, { productId: 'pan-003', size: 'M', color: 'negro', quantity: 1 }] },
  { daysAgo: 14, status: 'entregado', name: 'Cliente de ejemplo 9', neighborhood: 'Belén', items: [{ productId: 'cam-001', size: 'S', color: 'naranja', quantity: 1 }] },
  { daysAgo: 17, status: 'entregado', name: 'Cliente de ejemplo 10', neighborhood: 'Envigado (zona limítrofe)', items: [{ productId: 'cha-002', size: 'M', color: 'negro', quantity: 1 }] },
  { daysAgo: 21, status: 'entregado', name: 'Cliente de ejemplo 11', neighborhood: 'Robledo', items: [{ productId: 'pan-002', size: '34', color: 'verde', quantity: 1 }, { productId: 'acc-001', size: 'Única', color: 'negro', quantity: 1 }] },
  { daysAgo: 26, status: 'entregado', name: 'Cliente de ejemplo 12', neighborhood: 'La América', items: [{ productId: 'buz-001', size: 'XL', color: 'negro', quantity: 1 }] },
];

async function seedDemoOrders(): Promise<void> {
  const already = await prisma.order.count({ where: { customerName: { startsWith: DEMO_PREFIX } } });
  if (already > 0) {
    log(`Ya hay ${already} pedidos de ejemplo; no añado más.`);
    return;
  }

  const config = await getStoreConfig();
  const available = new Set(
    (await prisma.product.findMany({ select: { id: true } })).map((product) => product.id),
  );

  let created = 0;
  for (const demo of DEMO_ORDERS) {
    const items = demo.items.filter((item) => available.has(item.productId));
    if (items.length === 0) continue;

    const date = new Date();
    date.setDate(date.getDate() - demo.daysAgo);
    date.setHours(10 + (demo.daysAgo % 8), 30, 0, 0);

    try {
      await createOrder(
        {
          customer: {
            name: `${DEMO_PREFIX} ${demo.name}`,
            neighborhood: demo.neighborhood,
            address: 'Dirección de ejemplo',
            deliveryMethod: 'domicilio',
            phone: '300 000 0000',
            notes: 'Pedido de ejemplo para probar el tablero. Bórralo cuando quieras.',
          },
          items,
          channel: 'whatsapp',
          status: demo.status,
          createdAt: date,
        },
        config,
      );
      created += 1;
    } catch (error) {
      log(`No pude crear un pedido de ejemplo: ${(error as Error).message}`);
    }
  }

  log(`${created} pedidos de ejemplo creados. Todos empiezan por «${DEMO_PREFIX}».`);
}

async function clearDemoOrders(): Promise<void> {
  const orders = await prisma.order.findMany({
    where: { customerName: { startsWith: DEMO_PREFIX } },
    include: { items: true },
  });

  if (orders.length === 0) {
    log('No hay pedidos de ejemplo que borrar.');
    return;
  }

  const withStock = new Set(['confirmado', 'enviado', 'entregado']);

  await prisma.$transaction(async (tx) => {
    for (const order of orders) {
      // Devolvemos el stock de los pedidos que lo habían descontado.
      if (withStock.has(order.status)) {
        for (const item of order.items) {
          if (!item.productId) continue;
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
      await tx.order.delete({ where: { id: order.id } });
    }
  });

  log(`${orders.length} pedidos de ejemplo eliminados y stock repuesto.`);
}

/* --- Ejecución ------------------------------------------------------------ */

async function main(): Promise<void> {
  console.log('\nPARCHE Studio — siembra de datos\n');

  if (CLEAR_DEMO) {
    await clearDemoOrders();
    console.log('\nListo.\n');
    return;
  }

  await seedAdmin();
  const categoryIds = await seedCategories();
  await seedProducts(categoryIds);
  await seedSettings();

  if (WITH_DEMO) {
    await seedDemoOrders();
  }

  const [categories, products, orders, users] = await Promise.all([
    prisma.category.count(),
    prisma.product.count(),
    prisma.order.count(),
    prisma.user.count(),
  ]);

  console.log('\nResumen de la base de datos:');
  console.log(`  · Categorías: ${categories}`);
  console.log(`  · Productos:  ${products}`);
  console.log(`  · Pedidos:    ${orders}`);
  console.log(`  · Usuarios:   ${users}`);
  console.log('\nListo.\n');
}

main()
  .catch((error) => {
    console.error('\n[semilla] Falló la siembra:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

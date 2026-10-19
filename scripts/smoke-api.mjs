/* ===========================================================================
   Prueba de humo de la API
   ---------------------------------------------------------------------------
   Recorre los flujos reales (tienda → pedido → panel → estados) contra una
   API encendida y comprueba que las cifras cuadren. Sirve para verificar la
   instalación y para detectar regresiones tras un cambio.

   Uso:  node scripts/smoke-api.mjs   (con la API encendida)
   =========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHmac } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const envPath = join(here, '..', 'apps', 'api', '.env');

/** Lee apps/api/.env sin imprimir jamás su contenido. */
function readEnv() {
  const values = {};
  try {
    for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (!match) continue;
      values[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* si no existe el .env, se usan los valores por defecto */
  }
  return values;
}

const env = readEnv();
const BASE = process.env.API_URL ?? 'http://127.0.0.1:3001';
const ADMIN_EMAIL = env.ADMIN_EMAIL ?? 'admin@parche.studio';
const ADMIN_PASSWORD = env.ADMIN_PASSWORD ?? 'Parche2026*';

/**
 * Firma un JWT HS256 igual que la API, sin dependencias.
 * Sirve para comprobar que la firma, por sí sola, no da acceso: el usuario
 * tiene que seguir existiendo y estar activo.
 */
function signTokenFor(payload, secret) {
  const encode = (value) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = encode({ alg: 'HS256', typ: 'JWT' }) + '.' + encode({ ...payload, iat: now, exp: now + 600 });
  const signature = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

let passed = 0;
let failed = 0;
const failures = [];

function check(label, condition, extra = '') {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    failures.push(label);
    console.log(`  ✗ ${label}${extra ? ` — ${extra}` : ''}`);
  }
}

async function api(path, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  return { status: response.status, headers: response.headers, payload };
}

const money = (value) => `$${new Intl.NumberFormat('es-CO').format(value)}`;

async function main() {
  console.log(`\nPrueba de humo contra ${BASE}\n`);

  /* --- 1. Estado del sistema -------------------------------------------- */
  console.log('1) Estado del sistema');
  const health = await api('/api/health');
  check('GET /api/health responde 200', health.status === 200, `recibido ${health.status}`);
  check('MySQL conectado', health.payload?.database?.connected === true);
  check('Redis conectado (caché)', health.payload?.cache?.connected === true);

  /* --- 2. Catálogo público ---------------------------------------------- */
  console.log('\n2) Catálogo público (lo que ve la tienda)');
  const bootstrap = await api('/api/public/bootstrap');
  check('GET /api/public/bootstrap responde 200', bootstrap.status === 200);
  const products = bootstrap.payload?.products ?? [];
  const categories = bootstrap.payload?.categories ?? [];
  check('Devuelve 20 productos activos', products.length === 20, `recibidos ${products.length}`);
  check('Devuelve 5 categorías', categories.length === 5, `recibidas ${categories.length}`);
  check('Cada producto trae precio y stock', products.every((p) => typeof p.price === 'number' && typeof p.stock === 'number'));
  check('Los productos exponen la categoría por slug', products.every((p) => typeof p.category === 'string' && !p.categoryId));
  check('La configuración conserva el nº de WhatsApp de demostración', bootstrap.payload?.config?.whatsapp?.isPlaceholder === true);
  check('La paleta de colores viaja con el catálogo', (bootstrap.payload?.colors ?? []).length === 10);

  const cacheMiss = bootstrap.headers.get('x-parche-cache');
  const bootstrap2 = await api('/api/public/bootstrap');
  check('La segunda lectura sale de la caché de Redis', bootstrap2.headers.get('x-parche-cache') === 'hit', `1ª: ${cacheMiss}, 2ª: ${bootstrap2.headers.get('x-parche-cache')}`);

  /* --- 3. Seguridad ------------------------------------------------------ */
  console.log('\n3) Seguridad del panel');
  const noToken = await api('/api/admin/dashboard');
  check('Sin token, el panel responde 401', noToken.status === 401, `recibido ${noToken.status}`);

  const badLogin = await api('/api/auth/login', {
    method: 'POST',
    body: { email: ADMIN_EMAIL, password: 'clave-incorrecta' },
  });
  check('Contraseña incorrecta → 401', badLogin.status === 401, `recibido ${badLogin.status}`);

  const login = await api('/api/auth/login', {
    method: 'POST',
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  check('Inicio de sesión correcto → 200', login.status === 200, `recibido ${login.status}`);
  const token = login.payload?.token;
  check('Devuelve un token de sesión', typeof token === 'string' && token.length > 40);
  check('No devuelve el hash de la contraseña', !JSON.stringify(login.payload ?? {}).includes('passwordHash'));

  const me = await api('/api/auth/me', { token });
  check('GET /api/auth/me identifica al administrador', me.payload?.user?.email === ADMIN_EMAIL);

  // La firma correcta no basta: un token emitido para un usuario que ya no
  // existe (o desactivado) debe dejar de servir de inmediato.
  if (env.JWT_SECRET) {
    const ghostToken = signTokenFor(
      { sub: 'usuario-que-no-existe', email: 'fantasma@parche.studio', role: 'admin' },
      env.JWT_SECRET,
    );
    const ghost = await api('/api/admin/dashboard', { token: ghostToken });
    check('Un token firmado para un usuario inexistente se rechaza → 401', ghost.status === 401, `recibido ${ghost.status}`);
  }

  // La prueba no asume una base vacía: puede haber pedidos demo o reales.
  // Se toman las cifras de partida y se comprueban los incrementos.
  const baseDashboard = await api('/api/admin/dashboard?dias=30', { token });
  const baseOrders = baseDashboard.payload?.kpis?.orders ?? 0;
  const baseRevenue = baseDashboard.payload?.kpis?.revenue ?? 0;
  const baseOrdersTotal = (await api('/api/admin/orders?porPagina=1', { token })).payload?.total ?? 0;
  const baseUnitsOf = (payload, id) =>
    (payload?.topProducts ?? []).find((product) => product.productId === id)?.units ?? 0;
  const baseAcc004Units = baseUnitsOf(baseDashboard.payload, 'acc-004');

  /* --- 4. Pedido desde la tienda ---------------------------------------- */
  console.log('\n4) Pedido desde la tienda (reserva al confirmar)');
  const before = await api('/api/admin/products?q=cam-001&porPagina=5', { token });
  const camiseta = before.payload?.items?.find((p) => p.id === 'cam-001');
  check('Encuentro el producto cam-001 por búsqueda', Boolean(camiseta));
  const stockBefore = camiseta?.stock ?? 0;

  const created = await api('/api/public/orders', {
    method: 'POST',
    body: {
      customer: {
        name: 'Prueba de humo',
        neighborhood: 'Laureles',
        address: 'Calle 1 # 2-3',
        deliveryMethod: 'domicilio',
        phone: '300 000 0000',
        notes: 'Pedido generado por la prueba de humo.',
      },
      items: [
        { productId: 'cam-001', size: 'M', color: 'negro', quantity: 2 },
        { productId: 'acc-001', size: 'Única', color: 'negro', quantity: 1 },
      ],
    },
  });
  check('POST /api/public/orders responde 201', created.status === 201, `recibido ${created.status}`);
  const order = created.payload?.order;
  check('El pedido nace en estado pendiente', order?.status === 'pendiente');
  check('Se recalcula el subtotal en el servidor', order?.subtotal === 89000 * 2 + 79000, `subtotal ${order?.subtotal}`);
  check('El envío queda pendiente de confirmación', order?.shippingPending === true);
  check('El total no incluye un envío inventado', order?.total === order?.subtotal);
  check('Genera una referencia legible PS-…', /^PS-\d{6}-\d{4}$/.test(order?.reference ?? ''), order?.reference);
  check('Devuelve el enlace de WhatsApp', String(created.payload?.whatsappUrl ?? '').startsWith('https://wa.me/'));
  check('El mensaje incluye la referencia del pedido', String(created.payload?.message ?? '').includes(order?.reference ?? 'x'));
  check('El mensaje avisa que queda pendiente de confirmación', String(created.payload?.message ?? '').includes('pendiente de confirmación'));

  const afterCreate = await api('/api/admin/products?q=cam-001&porPagina=5', { token });
  const stockAfterCreate = afterCreate.payload?.items?.[0]?.stock ?? -1;
  check('Un pedido pendiente NO descuenta stock', stockAfterCreate === stockBefore, `antes ${stockBefore}, después ${stockAfterCreate}`);

  /* --- 5. Confirmar y cancelar (inventario) ------------------------------ */
  console.log('\n5) Estados del pedido y efecto en el inventario');
  const confirmed = await api(`/api/admin/orders/${order.id}/status`, {
    method: 'PATCH',
    token,
    body: { status: 'confirmado' },
  });
  check('Confirmar el pedido responde 200', confirmed.status === 200, `recibido ${confirmed.status}`);
  check('El pedido queda confirmado', confirmed.payload?.order?.status === 'confirmado');

  const afterConfirm = await api('/api/admin/products?q=cam-001&porPagina=5', { token });
  const stockAfterConfirm = afterConfirm.payload?.items?.[0]?.stock ?? -1;
  check('Confirmar descuenta stock', stockAfterConfirm === stockBefore - 2, `esperado ${stockBefore - 2}, obtenido ${stockAfterConfirm}`);

  const canceled = await api(`/api/admin/orders/${order.id}/status`, {
    method: 'PATCH',
    token,
    body: { status: 'cancelado' },
  });
  check('Cancelar el pedido responde 200', canceled.status === 200);
  const afterCancel = await api('/api/admin/products?q=cam-001&porPagina=5', { token });
  const stockAfterCancel = afterCancel.payload?.items?.[0]?.stock ?? -1;
  check('Cancelar devuelve el stock', stockAfterCancel === stockBefore, `esperado ${stockBefore}, obtenido ${stockAfterCancel}`);

  /* --- 6. Validaciones de negocio --------------------------------------- */
  console.log('\n6) Validaciones de negocio');
  const soldOut = await api('/api/public/orders', {
    method: 'POST',
    body: {
      customer: { name: 'Prueba agotado', neighborhood: 'Centro' },
      items: [{ productId: 'cam-004', size: 'M', color: 'crema', quantity: 1 }],
    },
  });
  check('No se puede pedir un producto agotado → 422', soldOut.status === 422, `recibido ${soldOut.status}`);

  const noSize = await api('/api/public/orders', {
    method: 'POST',
    body: {
      customer: { name: 'Prueba sin talla', neighborhood: 'Centro' },
      items: [{ productId: 'cam-001', quantity: 1 }],
    },
  });
  check('No se puede pedir sin talla → 422', noSize.status === 422, `recibido ${noSize.status}`);

  const tampered = await api('/api/public/orders', {
    method: 'POST',
    body: {
      customer: { name: 'Prueba precio falso', neighborhood: 'Centro' },
      items: [{ productId: 'cam-001', size: 'M', color: 'negro', quantity: 1, price: 1 }],
    },
  });
  check('Un precio manipulado se ignora (se usa el del servidor)', tampered.payload?.order?.subtotal === 89000, `subtotal ${tampered.payload?.order?.subtotal}`);
  if (tampered.payload?.order?.id) await api(`/api/admin/orders/${tampered.payload.order.id}`, { method: 'DELETE', token });

  /* --- 7. Panel: tablero y gestión -------------------------------------- */
  console.log('\n7) Panel: tablero y gestión de productos');
  const dashboard = await api('/api/admin/dashboard?dias=30', { token });
  check('GET /api/admin/dashboard responde 200', dashboard.status === 200);
  check('Devuelve la serie diaria de 30 días', (dashboard.payload?.salesSeries ?? []).length === 30);
  check(
    'Un pedido pendiente no suma a las ventas',
    (dashboard.payload?.kpis?.orders ?? -1) === baseOrders,
    `esperado ${baseOrders}, obtenido ${dashboard.payload?.kpis?.orders}`,
  );
  check('Sí informa los pendientes por confirmar', dashboard.payload?.kpis?.pendingOrders >= 0);
  check('El desglose por estado trae los 5 estados', (dashboard.payload?.statusBreakdown ?? []).length === 5);
  check('Publica la definición de «venta» (transparencia)', Array.isArray(dashboard.payload?.definitions?.saleStatuses));
  check('Lista el inventario bajo', Array.isArray(dashboard.payload?.inventory?.lowStock));

  const lowStock = dashboard.payload?.inventory?.lowStock ?? [];
  check('cam-004 (agotado) aparece en el inventario bajo', lowStock.some((p) => p.id === 'cam-004'));

  const stockPatch = await api('/api/admin/products/cam-001/stock', {
    method: 'PATCH',
    token,
    body: { stock: stockBefore },
  });
  check('PATCH de stock responde 200', stockPatch.status === 200);

  const manual = await api('/api/admin/orders', {
    method: 'POST',
    token,
    body: {
      customer: { name: 'Venta de mostrador (prueba)', neighborhood: 'Centro' },
      items: [{ productId: 'acc-004', size: 'Única', color: 'negro', quantity: 3 }],
      status: 'entregado',
    },
  });
  check('Registrar una venta manual responde 201', manual.status === 201, `recibido ${manual.status}`);
  check('La venta manual nace entregada', manual.payload?.order?.status === 'entregado');
  check('La venta manual descuenta stock al crearse', manual.payload?.order?.items?.[0]?.quantity === 3);

  const dash2 = await api('/api/admin/dashboard?dias=30', { token });
  check(
    'El tablero ya cuenta la venta manual',
    (dash2.payload?.kpis?.orders ?? -1) === baseOrders + 1,
    `esperado ${baseOrders + 1}, obtenido ${dash2.payload?.kpis?.orders}`,
  );
  check(
    'La venta manual suma ingresos',
    (dash2.payload?.kpis?.revenue ?? -1) === baseRevenue + 3 * 55000,
    `esperado ${baseRevenue + 3 * 55000}, obtenido ${dash2.payload?.kpis?.revenue}`,
  );
  check(
    'Los más vendidos incluyen el producto de la venta',
    baseUnitsOf(dash2.payload, 'acc-004') === baseAcc004Units + 3,
    `acc-004: ${baseAcc004Units} → ${baseUnitsOf(dash2.payload, 'acc-004')}`,
  );

  /* --- 8. Ajustes ------------------------------------------------------- */
  console.log('\n8) Ajustes editables desde el panel');
  const settings = await api('/api/admin/settings', { token });
  check('GET /api/admin/settings responde 200', settings.status === 200);
  check('La configuración trae la marca y la cobertura', Boolean(settings.payload?.config?.brand?.name) && Array.isArray(settings.payload?.config?.coverage?.areas));

  const savedShipping = await api('/api/admin/settings', {
    method: 'PUT',
    token,
    body: { shipping: { cost: null, costLabel: 'Pendiente de confirmación' } },
  });
  check('Guardar un ajuste responde 200', savedShipping.status === 200);
  const invalidate = await api('/api/public/bootstrap');
  check('Guardar ajustes invalida la caché del catálogo', invalidate.headers.get('x-parche-cache') === 'miss', `recibido ${invalidate.headers.get('x-parche-cache')}`);

  // Se devuelven los ajustes a como estaban: la prueba no debe dejar huella.
  const originalShipping = settings.payload?.config?.shipping ?? {};
  await api('/api/admin/settings', { method: 'PUT', token, body: { shipping: originalShipping } });

  /* --- 9. Limpieza ------------------------------------------------------ */
  console.log('\n9) Limpieza de los datos de prueba');
  const allOrders = await api('/api/admin/orders?porPagina=100', { token });
  const toDelete = (allOrders.payload?.items ?? []).filter((item) =>
    item.customer.name.startsWith('Prueba') || item.customer.name.includes('prueba'),
  );
  for (const item of toDelete) {
    if (item.status === 'entregado' || item.status === 'confirmado') {
      await api(`/api/admin/orders/${item.id}/status`, { method: 'PATCH', token, body: { status: 'cancelado' } });
    }
    await api(`/api/admin/orders/${item.id}`, { method: 'DELETE', token });
  }
  check('Pedidos de prueba eliminados', toDelete.length >= 2, `eliminados ${toDelete.length}`);

  const finalOrders = await api('/api/admin/orders?porPagina=100', { token });
  check(
    'La base queda como estaba (sin pedidos de prueba)',
    finalOrders.payload?.total === baseOrdersTotal,
    `esperado ${baseOrdersTotal}, quedan ${finalOrders.payload?.total}`,
  );

  /* --- Resumen ---------------------------------------------------------- */
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Resultado: ${passed} comprobaciones correctas, ${failed} fallidas.`);
  if (failed > 0) {
    console.log('Fallaron:');
    for (const item of failures) console.log(`  · ${item}`);
  }
  console.log(`${'─'.repeat(60)}\n`);

  process.exitCode = failed === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error('\nLa prueba de humo no pudo completarse:', error.message);
  process.exitCode = 1;
});

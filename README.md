# PARCHE Studio

Tienda de ropa urbana para **Medellín** con tres piezas que se hablan entre sí:

| Pieza | Carpeta | Puerto | Qué hace |
| --- | --- | --- | --- |
| Tienda | `apps/web` | 5173 | Catálogo, carrito y cierre del pedido por WhatsApp |
| Panel | `apps/admin` | 5174 | Ventas, productos, stock, precios, pedidos y ajustes |
| API | `apps/api` | 3001 | Reglas de negocio, persistencia y autenticación |

**Stack:** JavaScript moderno (ESM) + Vite en el front, Fastify 5 + TypeScript + Zod + Prisma
en el backend, **MySQL** para los datos y **Redis** para caché y límite de intentos.
Monorepo con **pnpm workspaces**.

> ⚠️ **Estado: demostración.** El número de WhatsApp es un marcador de lugar y los pedidos de
> ejemplo están marcados `⚠️ DEMO`. Los precios, las políticas y la cobertura de entrega deben
> ser aprobados por el negocio antes de publicar. Nada de eso se inventó como si fuera real.

---

## 1. Puesta en marcha

Requisitos: **Node 20+**, **pnpm 10+**, **MySQL** y **Redis**.

```bash
pnpm install

cp apps/api/.env.example apps/api/.env    # y cambia JWT_SECRET y ADMIN_PASSWORD
pnpm infra:up                             # arranca MySQL y Redis locales
pnpm db:setup                             # crea tablas y siembra catálogo + admin
pnpm dev                                  # tienda :5173 · panel :5174 · API :3001
```

`pnpm infra:up` usa MySQL y Redis instalados con **Scoop** (a nivel de usuario, sin
administrador). Si ya usas Docker, salta ese paso y ejecuta `docker compose up -d`:
las credenciales y los puertos son los mismos.

Comandos del día a día:

```bash
pnpm infra:status        # ¿están arriba MySQL y Redis?
pnpm infra:down          # detenerlos
pnpm dev:web             # solo la tienda
pnpm dev:admin           # solo el panel
pnpm dev:api             # solo la API
pnpm build               # compila las tres apps
node scripts/smoke-api.mjs   # prueba de humo end-to-end (57 comprobaciones)
```

### Variables de entorno

Todo lo sensible vive en `apps/api/.env` (ignorado por git):

| Variable | Para qué |
| --- | --- |
| `DATABASE_URL` | Cadena de conexión de MySQL |
| `REDIS_URL` | Redis para la caché del catálogo y el rate limit |
| `JWT_SECRET` | Firma de las sesiones del panel (genera una propia) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Usuario que crea la primera siembra |
| `CORS_ORIGIN` | Orígenes permitidos (tienda y panel) |

En producción, la tienda puede apuntar a otra URL de API con `VITE_API_URL`.

---

## 2. El panel de administración

Entra en <http://localhost:5174> con el correo y la contraseña definidos en `.env`.
La primera vez, `pnpm db:setup` crea ese usuario (la contraseña se guarda con `scrypt`,
nunca en texto plano).

| Sección | Qué permite |
| --- | --- |
| **Tablero** | Ventas del periodo, ticket promedio, pedidos por confirmar, serie diaria, más vendidos, inventario bajo y últimos pedidos |
| **Productos** | Crear, editar y archivar productos; stock con botones ±; precios; tallas, colores y etiquetas |
| **Pedidos** | Buscar y filtrar; ver el detalle; cambiar estado; corregir datos de entrega; registrar una **venta de mostrador** |
| **Ajustes** | WhatsApp, marca, contacto, cobertura, envíos, beneficios, redes y paleta de colores |

### Qué cuenta como «venta»

Solo los pedidos **confirmado**, **enviado** y **entregado** suman a las ventas. Los
**pendiente** se muestran aparte (aún no confirmados por el negocio) y los **cancelado**
no suman. La propia API publica esta definición en `/api/admin/dashboard` para que la
interfaz no pueda contradecirla.

### Cómo se mueve el stock

Un pedido de la tienda nace **pendiente y no descuenta stock**: el cliente abrió WhatsApp,
pero la tienda todavía no confirmó disponibilidad. Al pasar a **confirmado** (o enviado /
entregado) el stock se descuenta de forma atómica; al volver a **pendiente** o **cancelado**
se devuelve. Así el inventario nunca se compromete por un pedido que no existe.

Los precios **siempre se recalculan en el servidor**: el precio que envíe el navegador se
ignora, de modo que nadie puede comprar una camiseta por $1 editando la petición.

---

## 3. La tienda y el pedido por WhatsApp

1. El cliente filtra el catálogo (los filtros viven en la URL: `#/catalogo?cat=camisetas`).
2. Elige talla y color (obligatorios) y añade al carrito.
3. En `#/carrito` completa nombre, barrio, dirección y observaciones.
4. Pulsa **Revisar pedido** → la API registra el pedido y devuelve la referencia (`PS-…`).
5. El mensaje exacto se muestra antes de enviarlo y se abre `https://wa.me/<numero>?text=…`.

El carrito guarda solo referencias (`productId`, talla, color, cantidad) en LocalStorage:
el precio y el stock se resuelven siempre contra el catálogo vigente.

**Abrir WhatsApp no confirma el pedido.** Ni la interfaz ni el mensaje lo dan por hecho: el
pedido queda `pendiente` hasta que la tienda responda y lo confirme en el panel.

### Si la API no responde

La tienda no se queda en blanco: usa el catálogo y la configuración que vienen en el código
(`apps/web/src/data/products.js`, `src/config/site.config.js`) y permite enviar el pedido por
WhatsApp igualmente, avisando de que **no quedó registrado en línea**. Es una degradación
consciente: es mejor vender por el chat que mostrar un error.

---

## 4. Estructura del monorepo

```
apps/
├─ web/                       Tienda (sitio estático + Vite)
│  ├─ src/config/             Configuración inicial del negocio
│  ├─ src/data/               Catálogo y textos de respaldo
│  ├─ src/services/           Catálogo, carrito, WhatsApp y cliente de la API
│  ├─ src/components/         Piezas de interfaz (sin listeners propios)
│  ├─ src/pages/              Portada, catálogo, producto, checkout, info
│  ├─ src/styles/             tokens.css + base + componentes + páginas
│  └─ src/main.js             Arranque, router por hash y delegación de eventos
├─ admin/                     Panel (SPA sin framework)
│  ├─ src/lib/                api, sesión, UI (drawers, modales, toasts), gráficas
│  ├─ src/pages/              login, tablero, productos, pedidos, ajustes
│  └─ src/styles/admin.css
└─ api/                       API (Fastify + Prisma)
   ├─ src/lib/                auth, pedidos, ajustes, caché, mappers, validación
   ├─ src/routes/             auth, public, admin-products, admin-orders, …
   └─ prisma/                 schema.prisma y seed.ts
scripts/
├─ infra.mjs                  Arranca/detiene MySQL y Redis (Scoop)
└─ smoke-api.mjs              Prueba de humo end-to-end
```

### Decisiones de arquitectura (y por qué)

- **MySQL**, por indicación del negocio. Prisma aísla el SQL; si algún día cambia el motor,
  el cambio se concentra en `schema.prisma` y la cadena de conexión.
- **Monorepo con pnpm workspaces** en lugar de tres repos: la tienda, el panel y la API
  comparten contrato y se versionan juntos; un cambio de contrato se prueba en el mismo commit.
- **Sin framework en el front.** El catálogo y el panel son formularios y listas: HTML
  renderizado con plantillas de texto, un router por hash y delegación de eventos en un solo
  punto (`data-action`). Cero dependencias de runtime en la tienda.
- **Los ids son los del catálogo web** (`cam-001`, `camisetas`): la tienda, la API y la base
  de datos hablan el mismo idioma y un carrito guardado antes de la API sigue funcionando.
- **`Setting` (clave → JSON)** para todo lo editable: el panel escribe ajustes sin migraciones
  cada vez que el negocio quiere cambiar un texto o un número.
- **Precios en enteros (COP)**, sin decimales ni `float`: evita errores de redondeo.
- **`OrderItem` guarda copia de nombre y precio**: si mañana cambia el precio del producto, el
  pedido histórico sigue mostrando lo que se cobró.
- **Redis** solo para caché del catálogo (invalidada al escribir) y rate limit del login. Si
  Redis cae, la API sigue funcionando sin caché.

### Contrato público

`GET /api/public/bootstrap` devuelve catálogo, categorías, paleta y configuración en una sola
petición (con `x-parche-cache: hit|miss`). `POST /api/public/orders` valida stock y variantes,
recalcula precios y devuelve `{ order, message, whatsappUrl }` para que la tienda muestre
exactamente el mensaje que se enviará.

---

## 5. Datos: siembra, demo y reinicio

```bash
pnpm db:setup                              # tablas + catálogo + admin + ajustes

pnpm --filter @parche/api seed:demo         # 12 pedidos de ejemplo (⚠️ DEMO)
pnpm --filter @parche/api seed:clear-demo   # los borra y repone el stock

pnpm --filter @parche/api seed -- --reset   # sobreescribe catálogo y ajustes
```

La siembra **no pisa** datos existentes salvo con `--reset`. Los pedidos demo son opcionales:
existen para que el tablero no aparezca vacío en la primera revisión, y se distingue a simple
vista porque el nombre del cliente empieza por `⚠️ DEMO`.

### Migraciones

El esquema vive en `apps/api/prisma/schema.prisma` y está versionado en
`apps/api/prisma/migrations/`. En desarrollo se puede sincronizar con `prisma db push`
(lo que hace `pnpm db:setup`); para desplegar en producción, aplique las migraciones:

```bash
pnpm db:migrate     # prisma migrate deploy
```

---

## 6. Docker y WSL: por qué están pendientes

El equipo tiene la **virtualización desactivada en la BIOS (AMD-V)**, así que WSL2 no arranca
y Docker Desktop no puede usarse todavía. Se necesita:

1. Reiniciar y activar **SVM Mode / AMD-V** en la BIOS.
2. Instalar WSL2 (`wsl --install`) y Docker Desktop.
3. `docker compose up -d`.

Mientras tanto, MySQL y Redis corren de forma nativa con Scoop (`pnpm infra:up`), con las
mismas credenciales que el `docker-compose.yml` ya preparado. No hay que cambiar el `.env`
para pasar de un camino al otro.

> Nota de hardware: este portátil (AMD A12-9720P, 4 núcleos) va justo con Docker Desktop más
> tres servidores de desarrollo. El camino nativo es también el más rápido aquí.

---

## 7. Accesibilidad y rendimiento

- HTML semántico, enlace «saltar al contenido», `aria-live` para avisos, foco visible,
  `aria-invalid` en formularios y `aria-pressed` en las variantes.
- Contraste conforme a **WCAG AA** y respeto a `prefers-reduced-motion`.
- Mobile-first; sin desbordamiento horizontal en 320 px.
- La tienda no carga ninguna dependencia de runtime: ~30 KB de JS y ~8 KB de CSS comprimidos.

---

## 8. Antes de publicar

- [ ] Poner el **número de WhatsApp real** en Ajustes (y dejar de ser marcador de lugar).
- [ ] Cargar el catálogo y las **fotos reales** (4:5, ~1200 × 1500 px, en `apps/web/public/images/productos/`).
- [ ] Confirmar con el negocio los **barrios y zonas** de entrega.
- [ ] Definir el **costo de envío** (hoy se muestra «por confirmar», nunca inventado).
- [ ] Revisar y aprobar los textos legales de `apps/web/src/data/content.js`.
- [ ] Desactivar el **modo demostración** en Ajustes.
- [ ] Borrar los pedidos demo (`seed:clear-demo`) y cambiar `ADMIN_PASSWORD`.
- [ ] Configurar el dominio y las variables de entorno de producción.

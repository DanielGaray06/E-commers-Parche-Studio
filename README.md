# PARCHE Studio

Tienda online de ropa urbana para **Medellín**. El catálogo se explora en el navegador y
el pedido se cierra **por WhatsApp** (sin pasarela de pagos ni cuentas de usuario).

El proyecto está construido **sin backend**: es un sitio estático que puede publicarse en
cualquier hosting (Netlify, Vercel, GitHub Pages, Nginx, un VPS…).

> ⚠️ **Estado: demostración.** Precios, textos legales, datos de contacto y el número de
> WhatsApp son **provisionales**. Todo lo que hay que reemplazar está marcado con `⚠️ DEMO`.

---

## 1. Puesta en marcha

Requisitos: **Node 20+** y **pnpm**.

```bash
pnpm install
pnpm dev        # http://localhost:5173
```

Otros comandos:

```bash
pnpm build      # genera la carpeta dist/ lista para publicar
pnpm preview    # sirve dist/ localmente en http://localhost:4173
```

---

## 2. Configuración del negocio (lo único que debe tocar el propietario)

Casi todo se edita en **un solo archivo**: `src/config/site.config.js`.

| Qué configurar | Dónde | Notas |
| --- | --- | --- |
| Número de WhatsApp | `whatsapp.number` | Formato internacional sin `+` ni espacios: `573001234567`. Pon `isPlaceholder: false` al configurarlo |
| Nombre, eslogan, ciudad | `brand` | |
| Barra superior comercial | `topbar` | `enabled: false` la oculta |
| Correo, teléfono, dirección, horario, redes | `contact` | |
| Costo de envío | `shipping.cost` | **Déjalo en `null`** hasta tener tarifas reales: el pedido lo mostrará como “pendiente de confirmación” |
| Envío gratis desde | `shipping.freeFrom` | `null` para desactivarlo |
| Cobertura (zonas con entrega) | `coverage.areas` | **Debe confirmarlo el negocio.** El sitio no promete entregas fuera de esta lista |
| Beneficios de compra | `benefits` | Se muestran en la portada |
| Textos del hero | `hero` | |
| Aviso de demostración | `demoMode` | Ponlo en `false` al publicar la versión final |

### Catálogo de productos

Los productos viven en `src/data/products.js`.

```js
{
  id: 'cam-001',                    // identificador único
  slug: 'camiseta-parche-original', // usado en la URL #/producto/<slug>
  name: 'Camiseta Parche Original',
  description: '…',
  price: 89000,                     // pesos colombianos, sin decimales
  compareAtPrice: 125000,           // opcional: precio anterior (genera la etiqueta de descuento)
  category: 'camisetas',            // camisetas | pantalones | buzos | chaquetas | accesorios
  images: [],                       // vacío => portada provisional generada automáticamente
  sizes: ['S', 'M', 'L', 'XL'],
  colors: ['negro', 'blanco'],      // ids de la paleta COLORS
  stock: 24,                        // 0 => se muestra como AGOTADO y no se puede comprar
  tags: ['nuevo', 'destacado', 'rebaja'],
  material: '100% algodón peinado 180 g/m²',
  fit: 'Corte regular',
  createdAt: '2026-09-20',          // usado para ordenar por novedades
}
```

### Fotografías reales

El catálogo de demostración **no incluye fotos**. En lugar de inventar imágenes, la tienda
genera una portada gráfica de marca (SVG en memoria, sin peticiones de red).

Para usar fotos reales:

1. Guarda las imágenes en `public/images/productos/` (proporción **4:5**, ~1200 × 1500 px).
2. Escríbelas en el campo `images` del producto:

```js
images: ['/images/productos/camiseta-1.jpg', '/images/productos/camiseta-2.jpg'],
```

La portada generada deja de usarse automáticamente en cuanto hay una foto real.

### Textos legales e informativos

Están en `src/data/content.js` (quiénes somos, preguntas frecuentes, entregas, cambios y
devoluciones, privacidad, contacto, cobertura). **Todo el texto es provisional** y debe ser
revisado y aprobado por el propietario y, cuando aplique, por un asesor legal.

---

## 3. Cómo funciona la compra por WhatsApp

1. El cliente agrega prendas al carrito (talla, color y cantidad son obligatorios).
2. En `#/carrito` completa nombre, barrio/sector, dirección y observaciones.
3. Pulsa **Revisar pedido** y ve **el mensaje exacto** que se enviará.
4. Pulsa **Enviar pedido por WhatsApp**, que abre `https://wa.me/<numero>?text=<mensaje>`.

El mensaje incluye: saludo, referencia del pedido, cada prenda con talla, color, cantidad,
precio unitario y subtotal, el resumen (subtotal, envío, total), los datos de entrega y una
pregunta final para confirmar disponibilidad y condiciones.

**Abrir WhatsApp no confirma el pedido.** La interfaz y el propio mensaje lo dejan claro:
la tienda responde confirmando disponibilidad, envío y tiempo de entrega.

---

## 4. Estructura del proyecto

```
src/
├─ config/
│  ├─ site.config.js     Configuración del negocio (WhatsApp, cobertura, contacto…)
│  └─ theme.config.js    Colores de marca accesibles desde JavaScript
├─ data/
│  ├─ products.js        Catálogo + categorías + paleta de colores
│  └─ content.js         Textos de las páginas informativas y del pie
├─ services/
│  ├─ catalog.js         Búsqueda, filtros, orden y productos relacionados
│  ├─ cart.js            Estado del carrito + persistencia en LocalStorage
│  └─ whatsapp.js        Construcción del mensaje y del enlace wa.me
├─ components/           Piezas de interfaz reutilizables
│  ├─ header.js          Barra superior, cabecera, navegación y menú móvil
│  ├─ footer.js          Pie de página
│  ├─ productCard.js     Tarjeta y rejilla de productos
│  ├─ cartDrawer.js      Carrito lateral
│  ├─ filters.js         Panel de filtros y selector de orden
│  └─ toast.js           Notificaciones accesibles
├─ pages/
│  ├─ home.js            Portada
│  ├─ catalog.js         Catálogo con filtros en la URL
│  ├─ product.js         Detalle de producto
│  ├─ checkout.js        Carrito y finalización del pedido
│  └─ info.js            Páginas informativas
├─ utils/
│  ├─ format.js          Formato de moneda COP y textos
│  ├─ dom.js             Utilidades de DOM y escapado seguro
│  ├─ validators.js      Validación del formulario y de la cobertura
│  ├─ icons.js           Iconos SVG en línea
│  └─ placeholder.js     Portadas gráficas provisionales
├─ styles/
│  ├─ tokens.css         Design tokens (color, tipografía, espacio…)
│  ├─ base.css           Reset, accesibilidad y utilidades
│  ├─ components.css     Estilos de componentes
│  └─ pages.css          Estilos por página + responsive
├─ router.js             Enrutador por hash
└─ main.js               Arranque, enrutado y delegación de eventos
```

### Decisiones de arquitectura (y por qué)

- **Vite en lugar de HTML/CSS/JS “a mano”.** Da servidor de desarrollo con recarga
  instantánea, resolución de módulos ES y empaquetado optimizado (minificado, *tree-shaking*,
  *sourcemaps*) sin coste de configuración. Un sitio estático sin empaquetador obligaría a
  gestionar a mano las dependencias entre módulos y a renunciar a la optimización de producción.
- **Sin React, TypeScript, base de datos ni backend.** El catálogo es pequeño y estático, el
  carrito cabe en LocalStorage y el checkout es un enlace a WhatsApp: no hay estado de servidor,
  ni autenticación, ni pagos. Añadir un framework o una API solo aumentaría la complejidad de
  despliegue y mantenimiento sin resolver ningún problema real de esta primera versión.
  Si en el futuro hacen falta cuentas de usuario, inventario en tiempo real o pasarela de pagos,
  el punto natural de extensión es convertir `services/` en llamadas a una API.
- **Enrutado por hash (`#/catalogo`).** Permite desplegar en cualquier hosting estático sin
  configurar reescrituras del servidor, y los filtros quedan en la URL (compartibles y con
  “atrás” funcional).
- **Delegación de eventos.** Toda acción de la interfaz se declara con `data-action="…"` y se
  resuelve en un único punto (`main.js`). Los componentes son plantillas de texto sin listeners
  propios, lo que evita fugas de memoria al repintar y mantiene la lógica en un solo sitio.
- **El carrito guarda referencias, no precios.** En LocalStorage solo se almacenan
  `productId`, talla, color y cantidad; el precio y el stock se resuelven siempre contra el
  catálogo actual, de modo que un cambio de precio no quede “congelado” en el navegador del cliente.

---

## 5. Accesibilidad y SEO

- HTML semántico, enlace “saltar al contenido”, regiones `aria-live` para avisos y carrito.
- Navegación por teclado, foco visible, `aria-pressed` en selectores de variantes y
  `aria-invalid` en los campos del formulario.
- Contraste de texto conforme a **WCAG AA** (texto oscuro sobre el naranja de marca).
- Se respeta `prefers-reduced-motion`: las animaciones (marquesina, transiciones) se desactivan.
- `title` y `description` por página, datos estructurados `ClothingStore` con `areaServed: Medellín`
  y `robots.txt`.

---

## 6. Rendimiento

- CSS y JS divididos por responsabilidad y empaquetados en un único archivo por tipo (~27 KB
  de JS y ~8 KB de CSS comprimidos).
- Imágenes con `loading="lazy"`, `decoding="async"` y proporción fija declarada (`width`/`height`)
  para evitar saltos de diseño.
- Sin dependencias de runtime: cero *frameworks* en el bundle final.

---

## 7. Publicación

```bash
pnpm build   # genera dist/
```

Sube el contenido de `dist/` al hosting. Antes de publicar:

- [ ] Reemplazar el número de WhatsApp y poner `isPlaceholder: false`.
- [ ] Cargar el catálogo real y las fotografías.
- [ ] Confirmar las zonas de cobertura con el negocio.
- [ ] Definir el costo de envío (o dejarlo como “por confirmar”).
- [ ] Revisar y aprobar todos los textos legales de `src/data/content.js`.
- [ ] Poner `demoMode: false` para ocultar el aviso de demostración.
- [ ] Actualizar el dominio en `index.html` (canonical, Open Graph) y en `public/robots.txt`.

---

## 8. Pendiente de definir con el negocio

- Número de WhatsApp real y canales de atención definitivos.
- Lista final de barrios y zonas cubiertas.
- Costo de envío y umbral de envío gratis.
- Políticas de cambios, devoluciones y tratamiento de datos (revisión legal).
- Fotografía editorial del catálogo.

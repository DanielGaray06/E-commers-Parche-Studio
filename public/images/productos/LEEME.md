# Fotografías de producto

Coloca aquí las fotos reales del catálogo, por ejemplo:

```
public/images/productos/camiseta-parche-original-1.jpg
public/images/productos/camiseta-parche-original-2.jpg
```

Recomendaciones:

- Proporción **4:5** (vertical), por ejemplo 1200 × 1500 px.
- Peso por imagen por debajo de ~300 KB (exporta en WebP o JPG optimizado).
- Fondo y luz consistentes entre todas las fotos (composición editorial).
- Al menos 2-3 fotos por prenda (frente, espalda y detalle).

Luego registra las rutas en `src/data/products.js`:

```js
{
  id: 'cam-001',
  images: [
    '/images/productos/camiseta-parche-original-1.jpg',
    '/images/productos/camiseta-parche-original-2.jpg',
  ],
  // ...
}
```

Mientras un producto no tenga fotos (`images: []`), la tienda genera
automáticamente una portada gráfica provisional de marca.

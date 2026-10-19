import { defineConfig } from 'vite';

// ---------------------------------------------------------------------------
// Configuración de Vite — tienda
// ---------------------------------------------------------------------------
// Usamos hash routing (#/catalogo) para que el sitio pueda desplegarse en
// cualquier hosting estático (Netlify, Vercel, GitHub Pages, un servidor
// Apache/Nginx) sin necesidad de reglas de reescritura en el servidor.
//
// En desarrollo, /api se redirige a la API local para no tener que configurar
// CORS ni una URL absoluta. En producción se puede apuntar a otro dominio con
// la variable VITE_API_URL.
// ---------------------------------------------------------------------------
export default defineConfig({
  server: {
    port: 5173,
    open: false,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // El catálogo es pequeño; un único bundle por tipo de recurso es suficiente.
    assetsInlineLimit: 4096,
  },
});

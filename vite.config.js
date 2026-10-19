import { defineConfig } from 'vite';

// ---------------------------------------------------------------------------
// Configuración de Vite
// ---------------------------------------------------------------------------
// Usamos hash routing (#/catalogo) para que el sitio pueda desplegarse en
// cualquier hosting estático (Netlify, Vercel, GitHub Pages, un servidor
// Apache/Nginx) sin necesidad de reglas de reescritura en el servidor.
// ---------------------------------------------------------------------------
export default defineConfig({
  server: {
    port: 5173,
    open: false,
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

import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

// ---------------------------------------------------------------------------
// Panel de administración
// ---------------------------------------------------------------------------
// * Puerto 5174 (la tienda usa 5173) para poder tener ambos abiertos.
// * El panel NO incluye el código de la tienda: son dos aplicaciones separadas
//   que se pueden desplegar en sitios distintos (el panel incluso detrás de
//   una URL privada).
// * Se reutiliza el archivo de tokens de diseño de la tienda para que ambas
//   interfaces compartan color, tipografía y espaciado. Es lo único que se
//   comparte entre las dos apps, y a propósito.
// ---------------------------------------------------------------------------
export default defineConfig({
  resolve: {
    alias: {
      '@tokens': fileURLToPath(new URL('../web/src/styles/tokens.css', import.meta.url)),
    },
  },
  server: {
    port: 5174,
    open: false,
    // Permite leer (solo en desarrollo) el archivo de tokens de la tienda.
    fs: { allow: ['..', '../..'] },
    proxy: {
      // En desarrollo el panel habla con la API por el mismo origen: sin CORS.
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4174,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});

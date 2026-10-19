# AGENTS.md — PARCHE Studio

Instrucciones para agentes que trabajen en este repositorio.

## Contexto

Tienda estática (Vite + JavaScript moderno, sin framework) para **PARCHE Studio**, marca de
ropa urbana de Medellín. El canal de compra es **WhatsApp**. No hay backend, ni base de datos,
ni pasarela de pagos. Sitio en español (`es-CO`).

## Comandos

```bash
pnpm install
pnpm dev        # servidor de desarrollo en http://localhost:5173
pnpm build      # build de producción en dist/
pnpm preview    # sirve dist/
```

No hay suite de tests todavía. Antes de dar algo por terminado: **`pnpm build` debe pasar** y,
si el cambio afecta a la interfaz, **verifícalo en el navegador**.

## Reglas del proyecto

1. **Sin datos inventados.** No inventes precios, direcciones, teléfonos, políticas, tiempos de
   entrega ni tarifas de envío. Todo dato provisional se marca con `⚠️ DEMO` y el propietario
   debe poder reemplazarlo desde `src/config/site.config.js` o `src/data/`.
2. **Un solo lugar de configuración.** Si agregas un dato configurable (un texto, un número, un
   interruptor), va en `site.config.js` o en `data/`, nunca incrustado en un componente.
3. **El envío nunca se inventa.** Mientras `shipping.cost` sea `null`, el pedido lo muestra como
   “pendiente de confirmación”.
4. **Cobertura explícita.** No prometas entregas fuera de `coverage.areas`.
5. **Abrir WhatsApp no confirma el pedido.** Mantén ese mensaje en la interfaz y en el texto
   generado.
6. **No agregues dependencias de runtime** sin justificarlo. El bundle debe seguir sin frameworks.
7. **Sin TypeScript ni React** en esta versión: la decisión está documentada en el README.

## Convenciones de código

- Módulos ES con **imports relativos y extensión `.js`**.
- Comentarios y textos de interfaz **en español**; identificadores en inglés salvo términos de
  dominio (`camisetas`, `buzos`…).
- Los componentes exportan **plantillas de texto (string HTML)**, no nodos con listeners.
- Toda acción de interfaz se declara con `data-action="…"` y se resuelve en `main.js`.
- **Escapa siempre** los datos dinámicos con `escapeHtml` / `escapeAttr` (`utils/dom.js`).
- Estilos: usa los **tokens** de `styles/tokens.css`; no escribas colores ni espaciados en duro.
- Respeta `prefers-reduced-motion` en cualquier animación nueva.

## Estructura

Ver la sección 4 del `README.md`. En resumen: `config/` (ajustes), `data/` (catálogo y textos),
`services/` (lógica), `components/` (UI reutilizable), `pages/` (vistas), `utils/` (helpers),
`styles/` (CSS).

## Accesibilidad

Mantén: HTML semántico, foco visible, navegación por teclado, `aria-pressed` en selectores de
variantes, `aria-live` en avisos y contraste WCAG AA.

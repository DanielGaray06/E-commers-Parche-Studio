/* ===========================================================================
   Valores por defecto de la configuración de la tienda
   ---------------------------------------------------------------------------
   IMPORTANTE: la fuente de verdad de la configuración es la tabla `settings`
   de la base de datos, que se siembra con los valores que hoy viven en
   `apps/web/src/config/site.config.js` (ver `prisma/seed.ts`).

   Lo de aquí abajo es SOLO una red de seguridad para que la API pueda
   responder si alguien borra la fila de configuración. Si ves estos textos en
   la tienda, ejecuta `pnpm db:seed`.
   =========================================================================== */

export const SETTINGS_KEY = 'store';
export const COLORS_KEY = 'colors';

/** Paleta de colores del catálogo (id → nombre visible + muestra en pantalla). */
export const DEFAULT_COLORS = [
  { id: 'negro', name: 'Negro', hex: '#111112' },
  { id: 'blanco', name: 'Blanco', hex: '#f7f7f5' },
  { id: 'gris', name: 'Gris jaspe', hex: '#8b8b90' },
  { id: 'arena', name: 'Arena', hex: '#d8cbb8' },
  { id: 'verde', name: 'Verde militar', hex: '#4d5a3a' },
  { id: 'azul', name: 'Azul denim', hex: '#3b5878' },
  { id: 'vino', name: 'Vino', hex: '#6d2436' },
  { id: 'naranja', name: 'Naranja', hex: '#ff4d00' },
  { id: 'crema', name: 'Crema', hex: '#efe7d8' },
  { id: 'cafe', name: 'Café', hex: '#5c4433' },
];

export interface StoreConfig {
  brand: {
    name: string;
    logoPrimary: string;
    logoAccent: string;
    tagline: string;
    city: string;
  };
  demoMode: boolean;
  demoNotice: string;
  topbar: { enabled: boolean; message: string; linkLabel: string; linkHref: string };
  contact: {
    email: string;
    phoneDisplay: string;
    address: string;
    hours: string;
    social: Array<{ label: string; href: string; handle: string }>;
  };
  whatsapp: {
    number: string;
    isPlaceholder: boolean;
    displayNumber: string;
    ctaLabel: string;
    greeting: string;
  };
  currency: { locale: string; code: string; symbol: string; decimals: number };
  shipping: {
    cost: number | null;
    costLabel: string;
    note: string;
    freeFrom: number | null;
    etaLabel: string;
  };
  coverage: {
    city: string;
    region: string;
    areas: string[];
    message: string;
    outsideMessage: string;
    disclaimer: string;
  };
  benefits: Array<{ icon: string; title: string; text: string }>;
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    primaryCta: { label: string; href: string };
    secondaryCta: { label: string; href: string };
  };
}

/**
 * Configuración mínima de emergencia. No pretende ser la configuración real:
 * únicamente evita que la tienda quede sin datos si falta la fila en la base.
 */
export const DEFAULT_STORE_CONFIG: StoreConfig = {
  brand: {
    name: 'PARCHE Studio',
    logoPrimary: 'PARCHE',
    logoAccent: 'STUDIO',
    tagline: 'Ropa urbana hecha para la calle',
    city: 'Medellín',
  },
  demoMode: true,
  demoNotice:
    'Configuración sin sembrar: ejecuta «pnpm db:seed» o edita los ajustes desde el panel.',
  topbar: { enabled: false, message: '', linkLabel: '', linkHref: '' },
  contact: {
    email: '',
    phoneDisplay: '',
    address: '',
    hours: '',
    social: [],
  },
  whatsapp: {
    number: '573000000000',
    isPlaceholder: true,
    displayNumber: '',
    ctaLabel: 'Pedir por WhatsApp',
    greeting: '¡Hola PARCHE Studio! 👋 Quiero hacer un pedido:',
  },
  currency: { locale: 'es-CO', code: 'COP', symbol: '$', decimals: 0 },
  shipping: {
    cost: null,
    costLabel: 'Pendiente de confirmación',
    note: 'El costo de envío se confirma por WhatsApp según tu barrio.',
    freeFrom: null,
    etaLabel: '',
  },
  coverage: {
    city: 'Medellín',
    region: 'Antioquia',
    areas: [],
    message: '',
    outsideMessage:
      'Tu ubicación parece estar fuera de nuestra cobertura actual. Escríbenos por WhatsApp para confirmar la entrega.',
    disclaimer: '',
  },
  benefits: [],
  hero: {
    eyebrow: '',
    title: 'Ropa urbana',
    subtitle: '',
    primaryCta: { label: 'Ver catálogo', href: '#/catalogo' },
    secondaryCta: { label: 'Novedades', href: '#/catalogo?orden=recientes' },
  },
};

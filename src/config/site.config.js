/* ===========================================================================
   PARCHE Studio — CONFIGURACIÓN CENTRAL DEL NEGOCIO
   ---------------------------------------------------------------------------
   Este es el ÚNICO archivo que el propietario debe editar para poner la tienda
   en producción. Todo lo marcado con ⚠️ DEMO debe reemplazarse por datos reales
   antes de publicar el sitio.

   Regla del proyecto: no inventar datos reales. Los valores de demostración
   están marcados explícitamente y se muestran como provisionales en la tienda.
   =========================================================================== */

export const site = {
  /* --- Marca ------------------------------------------------------------- */
  brand: {
    name: 'PARCHE Studio',
    /** Se muestra partido para dar jerarquía tipográfica en el logotipo. */
    logoPrimary: 'PARCHE',
    logoAccent: 'STUDIO',
    tagline: 'Ropa urbana hecha para la calle',
    city: 'Medellín',
  },

  /* --- Aviso de demostración --------------------------------------------- */
  /** Si es true, el sitio muestra un banner avisando que los datos son de ejemplo. */
  demoMode: true,
  demoNotice:
    'Sitio de demostración: precios, datos de contacto y políticas son provisionales y están pendientes de aprobación.',

  /* --- Barra superior comercial (configurable) --------------------------- */
  topbar: {
    enabled: true,
    message: 'Envío gratis en Medellín por compras superiores a $250.000 ⚠️ DEMO',
    linkLabel: 'Ver cobertura',
    linkHref: '#/informacion/cobertura',
  },

  /* --- Contacto y redes -------------------------------------------------- */
  contact: {
    /** ⚠️ DEMO — reemplazar por el correo real. */
    email: 'hola@parchestudio.example',
    /** ⚠️ DEMO — teléfono de atención (formato local, solo informativo). */
    phoneDisplay: '+57 300 000 0000',
    /** ⚠️ DEMO — dirección exacta pendiente de confirmación del negocio. */
    address: 'Medellín, Antioquia, Colombia (dirección exacta por confirmar)',
    hours: 'Lunes a sábado, 9:00 a.m. – 7:00 p.m. ⚠️ DEMO',
    social: [
      { label: 'Instagram', href: 'https://instagram.com/', handle: '@parche.studio' },
      { label: 'TikTok', href: 'https://tiktok.com/', handle: '@parche.studio' },
      { label: 'Facebook', href: 'https://facebook.com/', handle: 'PARCHE Studio' },
    ],
  },

  /* --- WhatsApp (canal principal de compra) ------------------------------ */
  whatsapp: {
    /**
     * ⚠️ DEMO — NÚMERO MARCADOR DE LUGAR.
     * Formato internacional, sin espacios, sin "+", sin guiones.
     * Ejemplo real para Colombia: 573001234567
     */
    number: '573000000000',
    isPlaceholder: true,
    displayNumber: '+57 300 000 0000',
    /** Texto del botón principal del sitio. */
    ctaLabel: 'Pedir por WhatsApp',
    /** Saludo inicial del mensaje generado automáticamente. */
    greeting: '¡Hola PARCHE Studio! 👋 Quiero hacer un pedido:',
  },

  /* --- Moneda ------------------------------------------------------------ */
  currency: {
    locale: 'es-CO',
    code: 'COP',
    symbol: '$',
    /** Redondeo a pesos enteros (COP no usa decimales). */
    decimals: 0,
  },

  /* --- Envío ------------------------------------------------------------- */
  /**
   * ⚠️ IMPORTANTE: no se inventan tarifas de envío.
   * Mientras `cost` sea null, el pedido mostrará el envío como
   * "pendiente de confirmación" y el mensaje de WhatsApp lo indicará así.
   */
  shipping: {
    cost: null, // Ej: 12000  (déjalo en null hasta tener tarifas reales)
    costLabel: 'Pendiente de confirmación',
    /** Nota que se muestra junto al subtotal. */
    note: 'El costo de envío se confirma por WhatsApp según tu barrio.',
    freeFrom: 250000, // ⚠️ DEMO — umbral de envío gratis (null para desactivar)
    etaLabel: 'Entrega el mismo día o al día siguiente ⚠️ DEMO',
  },

  /* --- Cobertura geográfica (configurable en un solo lugar) -------------- */
  coverage: {
    city: 'Medellín',
    region: 'Antioquia',
    /** Zonas cubiertas. ⚠️ DEMO — el negocio debe confirmar cuáles aplican. */
    areas: [
      'El Poblado',
      'Laureles',
      'Belén',
      'Envigado (zona limítrofe)',
      'Robledo',
      'La América',
      'Centro',
    ],
    /** Mensaje principal de la sección de cobertura. */
    message:
      'Por ahora entregamos únicamente en Medellín y las zonas confirmadas por la tienda. Si estás fuera de estas zonas, escríbenos antes de pedir para revisar si podemos llevarte el pedido.',
    /** Se muestra a quien indica una ubicación fuera de cobertura. */
    outsideMessage:
      'Tu ubicación parece estar fuera de nuestra cobertura actual. Escríbenos por WhatsApp para confirmar si podemos realizar la entrega.',
    /** Aviso visible de que la lista es provisional. */
    disclaimer: 'La lista de zonas es preliminar y está pendiente de confirmación del negocio. ⚠️ DEMO',
  },

  /* --- Beneficios de compra --------------------------------------------- */
  benefits: [
    {
      icon: 'truck',
      title: 'Entrega en Medellín',
      text: 'Despachos locales con entrega el mismo día o al día siguiente. ⚠️ DEMO',
    },
    {
      icon: 'whatsapp',
      title: 'Compra por WhatsApp',
      text: 'Armas tu pedido, lo revisas y nos lo envías en un solo mensaje.',
    },
    {
      icon: 'exchange',
      title: 'Cambios fáciles',
      text: 'Tienes 5 días para solicitar cambio de talla. Condiciones por confirmar. ⚠️ DEMO',
    },
    {
      icon: 'shield',
      title: 'Pago contra entrega',
      text: 'Paga al recibir tu pedido en Medellín. Sujeto a confirmación de la tienda.',
    },
  ],

  /* --- Hero de la página principal -------------------------------------- */
  hero: {
    eyebrow: 'Nueva colección · Medellín',
    title: 'Ropa con calle, hecha en Medellín',
    subtitle:
      'Prendas urbanas versátiles, pensadas para el día a día. Elige tus tallas, arma tu pedido y confírmalo por WhatsApp.',
    primaryCta: { label: 'Ver catálogo', href: '#/catalogo' },
    secondaryCta: { label: 'Novedades', href: '#/catalogo?orden=recientes' },
  },
};

/** Texto corto que se muestra cuando un dato es provisional. */
export const DEMO_TAG = '⚠️ DEMO';

/**
 * Helper de uso interno: indica si el número de WhatsApp sigue siendo el
 * marcador de lugar. Se usa para avisar al cliente en el mensaje generado.
 */
export const whatsappIsPlaceholder = () => site.whatsapp.isPlaceholder;

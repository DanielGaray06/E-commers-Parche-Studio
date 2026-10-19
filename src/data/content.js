/* ===========================================================================
   Contenidos informativos — PARCHE Studio
   ---------------------------------------------------------------------------
   ⚠️ TODO el texto de este archivo es PROVISIONAL. No constituye asesoría legal
   ni políticas comerciales definitivas. Debe ser revisado y aprobado por el
   propietario del negocio (y, si aplica, por un asesor legal) antes de publicar.
   =========================================================================== */

export const PROVISIONAL = {
  label: 'Texto provisional',
  note: 'Este contenido está pendiente de revisión y aprobación por parte del negocio.',
};

export const infoPages = {
  'quienes-somos': {
    slug: 'quienes-somos',
    eyebrow: 'La marca',
    title: 'Quiénes somos',
    intro:
      'PARCHE Studio nace en Medellín con la idea de vestir la calle: prendas urbanas, versátiles y bien hechas, para gente que se mueve por la ciudad todos los días.',
    sections: [
      {
        heading: 'Nuestra idea',
        paragraphs: [
          'Creemos que la ropa debe acompañar el ritmo de la ciudad: cómoda, resistente y con personalidad. Por eso seleccionamos prendas de uso diario que combinan solas.',
          'Trabajamos con colecciones cortas y cuidamos cada detalle, desde la tela hasta cómo llega tu pedido.',
        ],
      },
      {
        heading: 'Dónde estamos',
        paragraphs: [
          'Somos una tienda local y atendemos por ahora únicamente en Medellín y las zonas que confirmamos con cada cliente.',
          'La historia completa de la marca, el equipo y el taller deben ser escritos por el propietario.',
        ],
      },
    ],
  },

  'preguntas-frecuentes': {
    slug: 'preguntas-frecuentes',
    eyebrow: 'Ayuda',
    title: 'Preguntas frecuentes',
    intro: 'Resolvemos las dudas más comunes antes de comprar.',
    faq: [
      {
        q: '¿Cómo hago mi pedido?',
        a: 'Elige tus prendas, selecciona talla y color, y agrégalas al carrito. Cuando estés listo, completa tus datos de entrega y envía el pedido por WhatsApp. Nosotros confirmamos disponibilidad y las condiciones de entrega.',
      },
      {
        q: '¿Puedo pagar en línea?',
        a: 'Por ahora no. El pedido se cierra por WhatsApp y el pago se acuerda directamente con la tienda (por ejemplo, contra entrega en Medellín). Las opciones de pago están por confirmar.',
      },
      {
        q: '¿Hacen entregas en toda Colombia?',
        a: 'No en esta primera versión. Atendemos únicamente Medellín y las zonas confirmadas por la tienda. Si estás fuera de esas zonas, escríbenos para revisar tu caso.',
      },
      {
        q: '¿Cómo sé qué talla pedir?',
        a: 'Cada producto indica las tallas disponibles y su tipo de corte (regular, oversize, slim). Si tienes dudas, envíanos tus medidas por WhatsApp y te ayudamos a elegir.',
      },
      {
        q: '¿Los colores de las fotos son exactos?',
        a: 'Los colores pueden variar un poco según la pantalla. Las fotos definitivas del catálogo están pendientes de producción.',
      },
      {
        q: '¿Puedo cambiar una prenda?',
        a: 'Sí, sujeto a las condiciones de cambios y devoluciones de la tienda. Revisa esa sección o escríbenos por WhatsApp.',
      },
    ],
  },

  entregas: {
    slug: 'entregas',
    eyebrow: 'Envíos',
    title: 'Información de entregas',
    intro:
      'Entregamos en Medellín. Los tiempos y costos definitivos deben ser confirmados por el negocio.',
    sections: [
      {
        heading: 'Zonas de entrega',
        paragraphs: [
          'Por ahora cubrimos Medellín y las zonas confirmadas por la tienda. Consulta la sección de Cobertura para ver el detalle.',
        ],
      },
      {
        heading: 'Tiempos',
        paragraphs: [
          'El tiempo estimado es de entrega el mismo día o al día siguiente, según la zona y la hora en que se confirme el pedido.',
          '⚠️ DEMO — Los tiempos reales deben ser definidos por el propietario.',
        ],
      },
      {
        heading: 'Costos',
        paragraphs: [
          'El costo de envío se confirma por WhatsApp según tu barrio. No publicamos tarifas hasta que el negocio las defina.',
          'Si tu compra supera el monto configurado para envío gratis, el envío no tendrá costo dentro de la cobertura. ⚠️ DEMO',
        ],
      },
    ],
  },

  'cambios-y-devoluciones': {
    slug: 'cambios-y-devoluciones',
    eyebrow: 'Posventa',
    title: 'Cambios y devoluciones',
    intro:
      'Queremos que quedes conforme con tu compra. Estas condiciones son provisionales y están pendientes de aprobación.',
    sections: [
      {
        heading: 'Cambios',
        paragraphs: [
          'Puedes solicitar el cambio de talla o color dentro de los días definidos por la tienda, siempre que la prenda esté sin uso, con etiquetas y en su empaque original.',
          '⚠️ DEMO — Plazo y condiciones exactas por confirmar.',
        ],
      },
      {
        heading: 'Devoluciones',
        paragraphs: [
          'Si tu pedido llega con un defecto de fábrica, escríbenos por WhatsApp con fotos y tu número de pedido para gestionar la solución.',
          'Las condiciones de reembolso y los plazos deben ser definidos por el negocio conforme a la normativa colombiana aplicable.',
        ],
      },
    ],
  },

  privacidad: {
    slug: 'privacidad',
    eyebrow: 'Legal',
    title: 'Privacidad y tratamiento de datos',
    intro:
      'Respetamos tus datos. Este texto es una base provisional y debe ser revisado y ajustado a la Ley 1581 de 2012 y demás normativa colombiana por un asesor legal.',
    sections: [
      {
        heading: 'Qué datos usamos',
        paragraphs: [
          'Cuando envías un pedido, usamos tu nombre y la información de entrega (barrio, dirección y observaciones) únicamente para gestionar y coordinar tu compra por WhatsApp.',
          'El carrito guarda temporalmente tus productos en tu propio navegador (LocalStorage). No se envía a ningún servidor de la tienda.',
        ],
      },
      {
        heading: 'Tus derechos',
        paragraphs: [
          'Puedes solicitar conocer, actualizar o eliminar tus datos escribiendo a nuestro correo o por WhatsApp.',
          '⚠️ DEMO — El canal de atención y los plazos de respuesta deben ser definidos por el negocio.',
        ],
      },
    ],
  },

  contacto: {
    slug: 'contacto',
    eyebrow: 'Hablemos',
    title: 'Contacto',
    intro: 'Estamos para ayudarte a elegir tu próxima prenda.',
    sections: [
      {
        heading: 'Atención',
        paragraphs: [
          'El canal más rápido es WhatsApp: allí confirmamos disponibilidad, envíos y pago.',
          '⚠️ DEMO — Los datos de contacto reales deben ser proporcionados por el propietario.',
        ],
      },
    ],
  },

  cobertura: {
    slug: 'cobertura',
    eyebrow: 'Dónde llegamos',
    title: 'Cobertura de entrega',
    intro:
      'Atendemos por ahora únicamente Medellín y las zonas confirmadas por la tienda. Si estás fuera, escríbenos antes de pedir.',
    sections: [
      {
        heading: 'Cómo funciona',
        paragraphs: [
          'Al completar tu pedido te pedimos el barrio o sector. Si está dentro de la cobertura, continuamos con la coordinación por WhatsApp.',
          'Si tu ubicación está fuera de la lista de zonas, te avisaremos para que consultes con la tienda antes de continuar.',
        ],
      },
    ],
  },
};

/** Orden en el que aparecen las páginas en el pie de página. */
export const infoPageOrder = [
  'quienes-somos',
  'preguntas-frecuentes',
  'entregas',
  'cobertura',
  'cambios-y-devoluciones',
  'privacidad',
  'contacto',
];

/** Grupos del pie de página. */
export const footerGroups = [
  {
    title: 'Tienda',
    links: [
      { label: 'Catálogo', href: '#/catalogo' },
      { label: 'Novedades', href: '#/catalogo?orden=recientes' },
      { label: 'Destacados', href: '#/catalogo?orden=destacados' },
    ],
  },
  {
    title: 'Ayuda',
    links: [
      { label: 'Quiénes somos', href: '#/informacion/quienes-somos' },
      { label: 'Preguntas frecuentes', href: '#/informacion/preguntas-frecuentes' },
      { label: 'Entregas', href: '#/informacion/entregas' },
      { label: 'Cobertura', href: '#/informacion/cobertura' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Cambios y devoluciones', href: '#/informacion/cambios-y-devoluciones' },
      { label: 'Privacidad', href: '#/informacion/privacidad' },
      { label: 'Contacto', href: '#/informacion/contacto' },
    ],
  },
];

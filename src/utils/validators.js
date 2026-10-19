/* ===========================================================================
   Validaciones del pedido
   ---------------------------------------------------------------------------
   Devuelven objetos { valid, errors } para poder mostrarlos en el formulario
   sin depender de ninguna librería externa.
   =========================================================================== */

import { site } from '../config/site.config.js';
import { normalizeText } from './dom.js';

/** Valida los datos de entrega antes de generar el mensaje de WhatsApp. */
export function validateCustomer(customer = {}) {
  const errors = {};

  const nombre = String(customer.nombre ?? '').trim();
  if (nombre.length < 3) errors.nombre = 'Escribe tu nombre completo (mínimo 3 letras).';
  else if (nombre.length > 80) errors.nombre = 'El nombre es demasiado largo.';

  if (customer.entrega === 'domicilio') {
    const direccion = String(customer.direccion ?? '').trim();
    if (direccion.length < 5) errors.direccion = 'Indica la dirección donde recibirás el pedido.';
  }

  const barrio = String(customer.barrio ?? '').trim();
  if (barrio.length < 3) errors.barrio = 'Indica tu barrio o sector en Medellín.';

  const telefono = String(customer.telefono ?? '').trim();
  if (telefono && !/^[0-9+\s()-]{7,20}$/.test(telefono)) {
    errors.telefono = 'Revisa el número de contacto.';
  }

  if (String(customer.observaciones ?? '').length > 500) {
    errors.observaciones = 'Las observaciones no deben superar los 500 caracteres.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Indica si un barrio/sector parece cubierto.
 * Solo es una AYUDA para la interfaz: la tienda siempre confirma por WhatsApp.
 */
export function isWithinCoverage(barrio = '') {
  const needle = normalizeText(barrio);
  if (!needle) return false;
  return site.coverage.areas.some((area) => {
    const areaNorm = normalizeText(area);
    return needle.includes(areaNorm) || areaNorm.includes(needle);
  });
}

/** Comprueba que una cantidad sea un entero positivo dentro del stock. */
export function validateQuantity(quantity, max = Infinity) {
  const value = Number(quantity);
  if (!Number.isInteger(value) || value < 1) return { valid: false, reason: 'La cantidad mínima es 1.' };
  if (value > max) return { valid: false, reason: `Solo hay ${max} unidades disponibles.` };
  return { valid: true };
}

/** Comprueba que el correo tenga un formato razonable (opcional en esta versión). */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email ?? '').trim());
}

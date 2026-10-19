/* ===========================================================================
   Servicio de WhatsApp — canal principal de compra
   ---------------------------------------------------------------------------
   Genera el mensaje del pedido y construye el enlace oficial:
   https://wa.me/NUMERO?text=MENSAJE_CODIFICADO

   El mensaje se codifica con encodeURIComponent, por lo que los acentos, los
   saltos de línea, los emojis y los símbolos como "$" o "*" viajan seguros.
   =========================================================================== */

import { site, whatsappIsPlaceholder } from '../config/site.config.js';
import { formatCurrency } from '../utils/format.js';
import { colorInfo } from './catalog.js';

/** ¿Sigue configurado el número de demostración? */
export const isPlaceholderNumber = whatsappIsPlaceholder;

/** Texto del envío según su estado (nunca se inventa una tarifa). */
function shippingLine(shipping) {
  if (shipping.isPending) return 'Por confirmar (según tu barrio)';
  if (shipping.amount === 0) return 'Gratis';
  return formatCurrency(shipping.amount);
}

/**
 * Construye el mensaje del pedido listo para enviar.
 * @param {{
 *   lines: Array<{ product: object, size: string, color: string, quantity: number, unitPrice: number, lineTotal: number }>,
 *   customer: { nombre?: string, barrio?: string, direccion?: string, entrega?: string, telefono?: string, observaciones?: string },
 *   subtotal: number,
 *   shipping: { amount: number|null, label: string|null, isPending: boolean },
 *   total: number,
 *   orderRef: string
 * }} order
 */
export function buildOrderMessage(order) {
  const { lines, customer, subtotal, shipping, total, orderRef } = order;
  const currency = (value) => formatCurrency(value);

  const blocks = [];

  blocks.push(site.whatsapp.greeting);
  blocks.push('');

  blocks.push(`*Pedido ${orderRef}*`);
  blocks.push('');

  lines.forEach((line, index) => {
    const color = colorInfo(line.color).name;
    blocks.push(`${index + 1}. ${line.product.name}`);
    if (line.size) blocks.push(`   • Talla: ${line.size}`);
    if (color) blocks.push(`   • Color: ${color}`);
    blocks.push(`   • Cantidad: ${line.quantity}`);
    blocks.push(`   • Precio unitario: ${currency(line.unitPrice)}`);
    blocks.push(`   • Subtotal: ${currency(line.lineTotal)}`);
    blocks.push('');
  });

  blocks.push('*Resumen*');
  blocks.push(`Subtotal: ${currency(subtotal)}`);
  blocks.push(`Envío: ${shippingLine(shipping)}`);
  blocks.push(`Total estimado: ${currency(total)}`);
  blocks.push('');

  blocks.push('*Datos de entrega*');
  blocks.push(`Nombre: ${customer.nombre ?? ''}`);
  blocks.push(`Barrio o sector: ${customer.barrio ?? ''}`);
  if (customer.direccion) blocks.push(`Dirección: ${customer.direccion}`);
  if (customer.entrega) {
    blocks.push(`Entrega: ${customer.entrega === 'domicilio' ? 'A domicilio' : 'Recoger con la tienda'}`);
  }
  if (customer.telefono) blocks.push(`Contacto: ${customer.telefono}`);
  if (customer.observaciones) blocks.push(`Observaciones: ${customer.observaciones}`);
  blocks.push('');

  blocks.push(
    '¿Me confirman disponibilidad, costo de envío y tiempo de entrega? El pedido queda *pendiente de confirmación* por parte de la tienda.',
  );

  return blocks.join('\n');
}

/** Construye el enlace oficial de WhatsApp con el mensaje codificado. */
export function buildWhatsAppUrl(message, number = site.whatsapp.number) {
  const cleanNumber = String(number).replace(/[^0-9]/g, '');
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
}

/** Abre WhatsApp en una pestaña nueva. */
export function openWhatsApp(message) {
  const url = buildWhatsAppUrl(message);
  window.open(url, '_blank', 'noopener,noreferrer');
  return url;
}

/** Enlace corto para el botón "Consultar por WhatsApp" (sin pedido). */
export function contactUrl(text = '¡Hola PARCHE Studio! Tengo una pregunta:') {
  return buildWhatsAppUrl(text);
}

/** Referencia legible del pedido: PS-261019-4821 */
export function generateOrderRef(date = new Date()) {
  const stamp = [
    String(date.getFullYear()).slice(2),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');
  const random = String(Math.floor(1000 + Math.random() * 9000));
  return `PS-${stamp}-${random}`;
}

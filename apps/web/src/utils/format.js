import { site } from '../config/site.config.js';

/**
 * Formatea un número como precio en la moneda configurada (COP por defecto).
 * Salida típica: "$89.000"
 */
export function formatCurrency(value) {
  const { locale, decimals } = site.currency;
  const amount = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: site.currency.code,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/** Formatea un número simple con separadores de miles. */
export function formatNumber(value, locale = site.currency.locale) {
  return new Intl.NumberFormat(locale).format(Number(value) || 0);
}

/** Calcula el porcentaje de descuento entre precio anterior y actual. */
export function discountPercent(price, compareAtPrice) {
  if (!compareAtPrice || compareAtPrice <= price) return 0;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

/** Pluraliza de forma sencilla: 1 artículo / 3 artículos. */
export function pluralize(count, singular, plural = `${singular}s`) {
  return count === 1 ? `${count} ${singular}` : `${count} ${plural}`;
}

/** Convierte un texto en un slug seguro para URLs. */
export function slugify(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Corta un texto sin partir palabras. */
export function truncate(text, max = 120) {
  const value = String(text ?? '');
  if (value.length <= max) return value;
  return `${value.slice(0, value.lastIndexOf(' ', max)).trim()}…`;
}

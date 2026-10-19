/* ===========================================================================
   Configuración editable desde el panel (tabla `settings`)
   ---------------------------------------------------------------------------
   Se guarda como una fila por clave y un JSON serializado como valor. Así el
   panel puede editar la marca, el número de WhatsApp, la cobertura o el envío
   sin tocar el código ni volver a desplegar la tienda.
   =========================================================================== */

import { prisma } from './prisma.js';
import {
  SETTINGS_KEY,
  COLORS_KEY,
  DEFAULT_STORE_CONFIG,
  DEFAULT_COLORS,
  type StoreConfig,
} from '../data/store-defaults.js';

export interface ColorOption {
  id: string;
  name: string;
  hex: string;
}

/* --- Utilidades ----------------------------------------------------------- */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Combina recursivamente la configuración guardada sobre los valores por
 * defecto. Esto permite añadir campos nuevos al código sin romper bases de
 * datos ya existentes (los campos nuevos toman su valor por defecto).
 */
function deepMerge<T>(base: T, patch: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(patch)) {
    return (patch === undefined ? base : (patch as T));
  }
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    const current = (base as Record<string, unknown>)[key];
    result[key] = isPlainObject(current) && isPlainObject(value) ? deepMerge(current, value) : value;
  }
  return result as T;
}

async function readSetting<T>(key: string): Promise<T | null> {
  const row = await prisma.setting.findUnique({ where: { key } });
  if (!row) return null;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return null;
  }
}

async function writeSetting(key: string, value: unknown): Promise<void> {
  const serialized = JSON.stringify(value);
  await prisma.setting.upsert({
    where: { key },
    create: { key, value: serialized },
    update: { value: serialized },
  });
}

/* --- API pública ---------------------------------------------------------- */

export async function getStoreConfig(): Promise<StoreConfig> {
  const stored = await readSetting<Partial<StoreConfig>>(SETTINGS_KEY);
  if (!stored) return DEFAULT_STORE_CONFIG;
  return deepMerge(DEFAULT_STORE_CONFIG, stored);
}

export async function saveStoreConfig(patch: unknown): Promise<StoreConfig> {
  const current = await getStoreConfig();
  const next = deepMerge(current, patch);
  await writeSetting(SETTINGS_KEY, next);
  return next;
}

export async function replaceStoreConfig(config: StoreConfig): Promise<StoreConfig> {
  await writeSetting(SETTINGS_KEY, config);
  return config;
}

export async function getColors(): Promise<ColorOption[]> {
  const stored = await readSetting<ColorOption[]>(COLORS_KEY);
  if (!Array.isArray(stored) || stored.length === 0) return DEFAULT_COLORS;
  return stored
    .filter((color) => isPlainObject(color) && typeof color.id === 'string')
    .map((color) => ({
      id: String(color.id),
      name: String(color.name ?? color.id),
      hex: String(color.hex ?? '#111112'),
    }));
}

export async function saveColors(colors: ColorOption[]): Promise<ColorOption[]> {
  const clean = colors
    .filter((color) => color && typeof color.id === 'string' && color.id.trim() !== '')
    .map((color) => ({
      id: color.id.trim(),
      name: (color.name ?? color.id).trim(),
      hex: /^#[0-9a-fA-F]{3,8}$/.test(String(color.hex)) ? String(color.hex) : '#111112',
    }));

  await writeSetting(COLORS_KEY, clean);
  return clean;
}

/** Nombre visible de un color; si no está en la paleta, devuelve su id. */
export function colorName(colors: ColorOption[], id: string | null | undefined): string {
  if (!id) return '';
  return colors.find((color) => color.id === id)?.name ?? id;
}

/* ===========================================================================
   Validación de variables de entorno
   ---------------------------------------------------------------------------
   Falla rápido y con un mensaje claro si falta algo crítico: es mejor que la
   API no arranque a que arranque con una configuración incompleta (por
   ejemplo, sin clave de firma de sesiones).
   =========================================================================== */

import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().positive().max(65535).default(3001),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria (cadena de conexión a MySQL).'),

  /** Redis es opcional: si no está disponible, la API funciona sin caché. */
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),

  /** Lista separada por comas de orígenes permitidos (tienda y panel). */
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:5174'),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET debe tener al menos 16 caracteres.'),
  JWT_EXPIRES_IN: z.string().default('12h'),

  /** Datos del administrador que crea el seed. */
  ADMIN_EMAIL: z.string().default('admin@parche.studio'),
  ADMIN_PASSWORD: z.string().default('Parche2026*'),
  ADMIN_NAME: z.string().default('Administrador'),

  /** Número de WhatsApp por defecto al sembrar la base de datos. */
  STORE_WHATSAPP_NUMBER: z.string().default('573000000000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const problems = parsed.error.issues
    .map((issue) => `  · ${issue.path.join('.') || '(raíz)'}: ${issue.message}`)
    .join('\n');
  console.error(`\n[config] La configuración del entorno no es válida:\n${problems}\n`);
  console.error('[config] Revisa apps/api/.env (puedes partir de .env.example).\n');
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === 'production',
  corsOrigins: parsed.data.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};

export type Env = typeof env;

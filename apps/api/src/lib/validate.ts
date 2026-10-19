/* ===========================================================================
   Ayudantes de validación
   =========================================================================== */

import { z, type ZodTypeAny } from 'zod';
import { unprocessable } from './http.js';

/** Convierte los errores de Zod en un mapa { campo: mensaje }. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}

function parse<T extends ZodTypeAny>(schema: T, data: unknown, message: string): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw unprocessable(message, fieldErrors(result.error));
  }
  return result.data as z.infer<T>;
}

export function parseBody<T extends ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  return parse(schema, data, 'Revisa los datos enviados.');
}

export function parseQuery<T extends ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  return parse(schema, data, 'Los filtros de la consulta no son válidos.');
}

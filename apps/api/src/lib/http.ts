/* ===========================================================================
   Errores HTTP y utilidades de respuesta
   =========================================================================== */

export class HttpError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, message: string, code = 'error', details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new HttpError(400, message, 'solicitud_invalida', details);

export const unauthorized = (message = 'Credenciales inválidas.') =>
  new HttpError(401, message, 'no_autorizado');

export const forbidden = (message = 'No tienes permisos para esta acción.') =>
  new HttpError(403, message, 'prohibido');

export const notFound = (message = 'Recurso no encontrado.') =>
  new HttpError(404, message, 'no_encontrado');

export const conflict = (message: string, details?: unknown) =>
  new HttpError(409, message, 'conflicto', details);

export const unprocessable = (message: string, details?: unknown) =>
  new HttpError(422, message, 'datos_invalidos', details);

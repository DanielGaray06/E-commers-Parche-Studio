/* ===========================================================================
   Autenticación del panel
   ---------------------------------------------------------------------------
   Sesiones con JWT firmado. El token viaja en la cabecera
   `Authorization: Bearer <token>` y se valida en cada ruta /api/admin/*.

   No se implementan refrescos de token: el panel pide iniciar sesión de nuevo
   cuando el token expira (`JWT_EXPIRES_IN`, 12 h por defecto). Es simple y
   suficiente para una tienda con un solo operador o pocos.
   =========================================================================== */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { unauthorized } from './http.js';
import { prisma } from './prisma.js';

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: TokenPayload;
    user: TokenPayload;
  }
}

export function signToken(
  app: FastifyInstance,
  user: { id: string; email: string; role: string },
): string {
  return app.jwt.sign({ sub: user.id, email: user.email, role: user.role });
}

/**
 * preHandler que exige una sesión válida.
 *
 * Además de la firma y la expiración del token se comprueba que el usuario
 * siga existiendo y activo: si alguien lo elimina o lo desactiva, su sesión
 * deja de servir en la siguiente petición en lugar de seguir viva hasta que
 * caduque el JWT (12 h). Es una consulta por clave primaria y el panel hace
 * muy pocas peticiones, así que el coste es despreciable frente al riesgo.
 */
export async function requireAuth(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    throw unauthorized('Tu sesión no es válida o expiró. Inicia sesión de nuevo.');
  }

  const user = await prisma.user.findUnique({
    where: { id: request.user.sub },
    select: { active: true },
  });

  if (!user || !user.active) {
    throw unauthorized('Tu usuario ya no tiene acceso. Inicia sesión de nuevo.');
  }
}

/** Identificador del usuario autenticado. */
export function currentUserId(request: FastifyRequest): string {
  return request.user.sub;
}

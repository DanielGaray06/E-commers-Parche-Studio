/* ===========================================================================
   Rutas de autenticación
   =========================================================================== */

import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { unauthorized } from '../lib/http.js';
import { verifyPassword, hashPassword } from '../lib/password.js';
import { currentUserId, requireAuth, signToken } from '../lib/auth.js';
import { parseBody } from '../lib/validate.js';
import { loginSchema } from '../schemas.js';

/** Hash de descarte: se usa para gastar el mismo tiempo cuando el correo no existe. */
let decoyHash: string | null = null;
async function getDecoyHash(): Promise<string> {
  decoyHash ??= await hashPassword('usuario-inexistente');
  return decoyHash;
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/api/auth/login',
    {
      config: {
        // Frena los intentos por fuerza bruta: 12 intentos por minuto y IP.
        rateLimit: { max: 12, timeWindow: '1 minute' },
      },
    },
    async (request, reply) => {
      const body = parseBody(loginSchema, request.body);

      const user = await prisma.user.findUnique({ where: { email: body.email } });

      // Aunque el usuario no exista, se verifica contra un hash real para no
      // revelar (por el tiempo de respuesta) qué correos están registrados.
      const storedHash = user?.passwordHash ?? (await getDecoyHash());
      const passwordOk = await verifyPassword(body.password, storedHash);

      if (!user || !user.active || !passwordOk) {
        throw unauthorized('Correo o contraseña incorrectos.');
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      const token = signToken(app, user);
      reply.code(200);
      return {
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      };
    },
  );

  app.get('/api/auth/me', { preHandler: requireAuth }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: currentUserId(request) },
      select: { id: true, email: true, name: true, role: true, lastLoginAt: true },
    });
    if (!user) throw unauthorized('La cuenta ya no existe.');
    reply.code(200);
    return { user };
  });
};

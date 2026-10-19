/* ===========================================================================
   Hash de contraseñas con scrypt (módulo nativo de Node)
   ---------------------------------------------------------------------------
   ¿Por qué scrypt y no bcrypt/argon2?
   * Es parte de la biblioteca estándar de Node: cero dependencias nativas,
     sin compilación y sin descargas de binarios (clave en este equipo).
   * Es un algoritmo de hashing lento y con coste de memoria, diseñado
     precisamente para contraseñas.

   Formato almacenado (una sola cadena, autodescriptiva y versionable):
     scrypt$<N>$<r>$<p>$<saltBase64>$<hashBase64>
   =========================================================================== */

import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

const KEY_LENGTH = 64;
const PARAMS: Required<Pick<ScryptOptions, 'N' | 'r' | 'p'>> = { N: 16384, r: 8, p: 1 };
const MAX_MEM = 128 * PARAMS.N * PARAMS.r * 2;

function scryptAsync(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

/** Genera el hash de una contraseña en texto plano. */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(plain.normalize('NFKC'), salt, KEY_LENGTH, {
    ...PARAMS,
    maxmem: MAX_MEM,
  });

  return [
    'scrypt',
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString('base64'),
    key.toString('base64'),
  ].join('$');
}

/** Compara una contraseña en texto plano con el hash almacenado. */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6) return false;

  const [, rawN, rawR, rawP, saltB64, hashB64] = parts as [
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  const N = Number(rawN);
  const r = Number(rawR);
  const p = Number(rawP);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;

  const expected = Buffer.from(hashB64, 'base64');
  const salt = Buffer.from(saltB64, 'base64');

  try {
    const actual = await scryptAsync(plain.normalize('NFKC'), salt, expected.length, {
      N,
      r,
      p,
      maxmem: 128 * N * r * 2,
    });
    // timingSafeEqual exige buffers del mismo tamaño; ya lo garantizamos
    // derivando con la longitud del hash almacenado.
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

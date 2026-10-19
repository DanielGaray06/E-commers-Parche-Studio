/* ===========================================================================
   Sesión del panel
   ---------------------------------------------------------------------------
   El token se guarda en localStorage para no pedir la contraseña en cada
   recarga. Es aceptable en este contexto (panel interno, sin datos de
   tarjetas); si algún día se expone a internet conviene pasar a cookies
   httpOnly, que es lo que evita el robo del token por XSS.
   =========================================================================== */

const TOKEN_KEY = 'parche.admin.token';
const USER_KEY = 'parche.admin.user';

function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function readUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

let token = readToken();
let user = readUser();

const listeners = new Set();

function notify() {
  for (const listener of listeners) listener({ token, user });
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getToken() {
  return token;
}

export function getUser() {
  return user;
}

export function isAuthenticated() {
  return Boolean(token);
}

export function setSession({ token: newToken, user: newUser }) {
  token = newToken;
  user = newUser;
  try {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
  } catch {
    /* modo privado: la sesión dura lo que dure la pestaña */
  }
  notify();
}

export function clearSession() {
  token = null;
  user = null;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* sin problema */
  }
  notify();
}

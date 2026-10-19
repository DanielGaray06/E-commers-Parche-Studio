/* ===========================================================================
   Pantalla de acceso
   =========================================================================== */

import { api } from '../lib/api.js';
import { setSession } from '../lib/session.js';
import { escapeHtml, toast } from '../lib/ui.js';
import { icon } from '../lib/icons.js';

export async function mountLogin(container) {
  container.className = 'login';
  container.innerHTML = `
    <div class="login__card">
      <span class="login__brand">PARCHE <em>STUDIO</em></span>
      <p class="login__sub">Panel de administración · Medellín</p>

      <form id="login-form" novalidate>
        <div class="field">
          <label for="login-email">Correo</label>
          <input class="input" id="login-email" name="email" type="email" autocomplete="username"
            placeholder="admin@parche.studio" required />
        </div>

        <div class="field">
          <label for="login-password">Contraseña</label>
          <input class="input" id="login-password" name="password" type="password"
            autocomplete="current-password" required />
        </div>

        <p class="error-text hidden" id="login-error" role="alert"></p>

        <button class="btn btn--accent" type="submit" id="login-submit" style="width:100%">
          ${icon('lock', { size: 16 })} Entrar
        </button>
      </form>

      <div class="notice notice--info mt-4">
        ${icon('info', { size: 18 })}
        <div>
          <strong>Primera vez</strong>
          <p class="small">
            El usuario administrador y su contraseña inicial se definen en
            <code>apps/api/.env</code> y se crean con <code>pnpm db:seed</code>.
          </p>
        </div>
      </div>
    </div>
  `;

  const form = container.querySelector('#login-form');
  const errorBox = container.querySelector('#login-error');
  const submit = container.querySelector('#login-submit');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.classList.add('hidden');
    submit.disabled = true;
    submit.textContent = 'Entrando…';

    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;

    try {
      const data = await api.login(email, password);
      setSession({ token: data.token, user: data.user });
      toast(`Bienvenido, ${data.user.name}.`, { type: 'success' });
    } catch (error) {
      errorBox.innerHTML = `${icon('alert', { size: 14 })} ${escapeHtml(error.message)}`;
      errorBox.classList.remove('hidden');
      form.elements.password.value = '';
      form.elements.password.focus();
    } finally {
      submit.disabled = false;
      submit.innerHTML = `${icon('lock', { size: 16 })} Entrar`;
    }
  });

  form.elements.email.focus();
}

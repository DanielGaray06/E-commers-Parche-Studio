/* ===========================================================================
   Página: Ajustes
   ---------------------------------------------------------------------------
   Aquí el dueño cambia sin tocar código lo que antes solo vivía en
   site.config.js: marca, WhatsApp, cobertura, envío, contacto, barra superior,
   beneficios y la paleta de colores.

   Truco de implementación: cada campo declara su ruta dentro de la
   configuración con `data-config="brand.name"`. Al guardar se recorre el
   formulario y se reconstruye el objeto anidado. Así añadir un campo nuevo es
   solo escribir el HTML, sin tocar la lógica.
   =========================================================================== */

import { api } from '../lib/api.js';
import { bindActions, escapeAttr, escapeHtml, toast } from '../lib/ui.js';
import { icon } from '../lib/icons.js';

/* --- Plantillas de filas repetibles --------------------------------------- */

function socialRowHtml(social = { label: '', href: '', handle: '' }) {
  return `
    <div class="field-row social-row" style="margin-bottom:var(--sp-3)">
      <input class="input" data-field="label" placeholder="Red (Instagram)" value="${escapeAttr(social.label)}" />
      <input class="input" data-field="href" placeholder="https://…" value="${escapeAttr(social.href)}" />
      <input class="input" data-field="handle" placeholder="@usuario" value="${escapeAttr(social.handle)}" />
      <button class="icon-btn icon-btn--danger" type="button" data-action="remove-row" aria-label="Quitar esta red">
        ${icon('trash', { size: 15 })}
      </button>
    </div>
  `;
}

function benefitRowHtml(benefit = { icon: 'truck', title: '', text: '' }) {
  return `
    <div class="field-row benefit-row" style="margin-bottom:var(--sp-3)">
      <input class="input" data-field="icon" placeholder="Icono (truck, whatsapp…)" value="${escapeAttr(benefit.icon)}" />
      <input class="input" data-field="title" placeholder="Título" value="${escapeAttr(benefit.title)}" />
      <input class="input" data-field="text" placeholder="Descripción" value="${escapeAttr(benefit.text)}" />
      <button class="icon-btn icon-btn--danger" type="button" data-action="remove-row" aria-label="Quitar este beneficio">
        ${icon('trash', { size: 15 })}
      </button>
    </div>
  `;
}

function colorRowHtml(color = { id: '', name: '', hex: '#111112' }) {
  return `
    <div class="field-row color-row" style="margin-bottom:var(--sp-3);align-items:center">
      <input class="input" data-field="id" placeholder="identificador (negro)" value="${escapeAttr(color.id)}" />
      <input class="input" data-field="name" placeholder="Nombre visible" value="${escapeAttr(color.name)}" />
      <input class="input" type="color" data-field="hex" value="${escapeAttr(color.hex)}" style="padding:2px;height:2.6rem" />
      <button class="icon-btn icon-btn--danger" type="button" data-action="remove-row" aria-label="Quitar este color">
        ${icon('trash', { size: 15 })}
      </button>
    </div>
  `;
}

/* --- Formulario ----------------------------------------------------------- */

function settingsHtml(config, colors) {
  return `
    <form id="settings-form" data-action="settings-form">
      ${
        config.demoMode
          ? `<div class="notice notice--warning">
               ${icon('alert', { size: 20 })}
               <div>
                 <strong>El sitio está en modo demostración</strong>
                 <p class="small">${escapeHtml(config.demoNotice)}</p>
                 <p class="small">Cuando tengas los datos reales (número de WhatsApp, cobertura, políticas), desactiva el modo demostración aquí abajo.</p>
               </div>
             </div>`
          : ''
      }

      <div class="section-grid grid-2">
        <section class="card">
          <div class="card__head"><h2 class="card__title">Marca</h2></div>
          <div class="card__body">
            <div class="field">
              <label for="s-brand-name">Nombre</label>
              <input class="input" id="s-brand-name" data-config="brand.name" value="${escapeAttr(config.brand.name)}" />
            </div>
            <div class="field-row">
              <div class="field">
                <label for="s-logo-primary">Logotipo (parte 1)</label>
                <input class="input" id="s-logo-primary" data-config="brand.logoPrimary" value="${escapeAttr(config.brand.logoPrimary)}" />
              </div>
              <div class="field">
                <label for="s-logo-accent">Logotipo (parte 2)</label>
                <input class="input" id="s-logo-accent" data-config="brand.logoAccent" value="${escapeAttr(config.brand.logoAccent)}" />
              </div>
            </div>
            <div class="field">
              <label for="s-tagline">Lema</label>
              <input class="input" id="s-tagline" data-config="brand.tagline" value="${escapeAttr(config.brand.tagline)}" />
            </div>
            <div class="field">
              <label for="s-city">Ciudad</label>
              <input class="input" id="s-city" data-config="brand.city" value="${escapeAttr(config.brand.city)}" />
            </div>
            <label class="check">
              <input type="checkbox" data-config="demoMode" data-type="boolean" ${config.demoMode ? 'checked' : ''} />
              <span>Mostrar el aviso de sitio en demostración</span>
            </label>
            <div class="field mt-4">
              <label for="s-demo-notice">Texto del aviso</label>
              <textarea class="textarea" id="s-demo-notice" data-config="demoNotice" rows="2">${escapeHtml(config.demoNotice)}</textarea>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card__head">
            <h2 class="card__title">${icon('whatsapp', { size: 18 })} WhatsApp</h2>
          </div>
          <div class="card__body">
            <div class="field">
              <label for="s-wa-number">Número (formato internacional, sin + ni espacios)</label>
              <input class="input" id="s-wa-number" data-config="whatsapp.number" value="${escapeAttr(config.whatsapp.number)}" placeholder="573001234567" />
              <p class="field__hint">Ejemplo para Colombia: 573001234567</p>
            </div>
            <div class="field">
              <label for="s-wa-display">Número visible en el sitio</label>
              <input class="input" id="s-wa-display" data-config="whatsapp.displayNumber" value="${escapeAttr(config.whatsapp.displayNumber)}" placeholder="+57 300 000 0000" />
            </div>
            <label class="check">
              <input type="checkbox" data-config="whatsapp.isPlaceholder" data-type="boolean" ${config.whatsapp.isPlaceholder ? 'checked' : ''} />
              <span>Sigue siendo un número de ejemplo (la tienda lo avisa antes de enviar)</span>
            </label>
            <div class="field mt-4">
              <label for="s-wa-cta">Texto del botón principal</label>
              <input class="input" id="s-wa-cta" data-config="whatsapp.ctaLabel" value="${escapeAttr(config.whatsapp.ctaLabel)}" />
            </div>
            <div class="field">
              <label for="s-wa-greeting">Saludo del mensaje automático</label>
              <textarea class="textarea" id="s-wa-greeting" data-config="whatsapp.greeting" rows="2">${escapeHtml(config.whatsapp.greeting)}</textarea>
            </div>
          </div>
        </section>
      </div>

      <section class="card mt-4" style="margin-top:var(--sp-5)">
        <div class="card__head">
          <h2 class="card__title">${icon('truck', { size: 18 })} Envío y cobertura</h2>
        </div>
        <div class="card__body">
          <div class="notice notice--info mb-4">
            ${icon('info', { size: 18 })}
            <p class="small">
              Deja el <strong>costo de envío vacío</strong> mientras no tengas tarifas reales: la tienda lo mostrará
              como «pendiente de confirmación» y no sumará un valor inventado al total.
            </p>
          </div>

          <div class="field-row">
            <div class="field">
              <label for="s-ship-cost">Costo de envío (COP)</label>
              <input class="input" id="s-ship-cost" type="number" min="0" step="1000" data-config="shipping.cost" data-type="number" value="${config.shipping.cost ?? ''}" placeholder="Vacío = por confirmar" />
            </div>
            <div class="field">
              <label for="s-ship-freefrom">Envío gratis desde (COP)</label>
              <input class="input" id="s-ship-freefrom" type="number" min="0" step="1000" data-config="shipping.freeFrom" data-type="number" value="${config.shipping.freeFrom ?? ''}" placeholder="Vacío = desactivado" />
            </div>
          </div>

          <div class="field">
            <label for="s-ship-label">Etiqueta cuando no hay tarifa</label>
            <input class="input" id="s-ship-label" data-config="shipping.costLabel" value="${escapeAttr(config.shipping.costLabel)}" />
          </div>

          <div class="field">
            <label for="s-ship-note">Nota que ve el cliente</label>
            <input class="input" id="s-ship-note" data-config="shipping.note" value="${escapeAttr(config.shipping.note)}" />
          </div>

          <div class="field">
            <label for="s-ship-eta">Tiempo de entrega</label>
            <input class="input" id="s-ship-eta" data-config="shipping.etaLabel" value="${escapeAttr(config.shipping.etaLabel)}" />
          </div>

          <div class="field-row">
            <div class="field">
              <label for="s-cov-city">Ciudad</label>
              <input class="input" id="s-cov-city" data-config="coverage.city" value="${escapeAttr(config.coverage.city)}" />
            </div>
            <div class="field">
              <label for="s-cov-region">Departamento</label>
              <input class="input" id="s-cov-region" data-config="coverage.region" value="${escapeAttr(config.coverage.region)}" />
            </div>
          </div>

          <div class="field">
            <label for="s-cov-areas">Zonas con entrega (una por línea)</label>
            <textarea class="textarea" id="s-cov-areas" data-config="coverage.areas" data-type="lines" rows="7">${escapeHtml(config.coverage.areas.join('\n'))}</textarea>
            <p class="field__hint">Solo escribe zonas que de verdad cubras: la tienda las usa para orientar al cliente.</p>
          </div>

          <div class="field">
            <label for="s-cov-message">Mensaje de cobertura</label>
            <textarea class="textarea" id="s-cov-message" data-config="coverage.message" rows="2">${escapeHtml(config.coverage.message)}</textarea>
          </div>

          <div class="field">
            <label for="s-cov-outside">Mensaje para quien está fuera de cobertura</label>
            <textarea class="textarea" id="s-cov-outside" data-config="coverage.outsideMessage" rows="2">${escapeHtml(config.coverage.outsideMessage)}</textarea>
          </div>

          <div class="field">
            <label for="s-cov-disclaimer">Aviso de zonas provisionales</label>
            <input class="input" id="s-cov-disclaimer" data-config="coverage.disclaimer" value="${escapeAttr(config.coverage.disclaimer)}" />
          </div>
        </div>
      </section>

      <section class="card" style="margin-top:var(--sp-5)">
        <div class="card__head"><h2 class="card__title">Contacto y redes</h2></div>
        <div class="card__body">
          <div class="field-row">
            <div class="field">
              <label for="s-mail">Correo</label>
              <input class="input" id="s-mail" type="email" data-config="contact.email" value="${escapeAttr(config.contact.email)}" />
            </div>
            <div class="field">
              <label for="s-phone">Teléfono visible</label>
              <input class="input" id="s-phone" data-config="contact.phoneDisplay" value="${escapeAttr(config.contact.phoneDisplay)}" />
            </div>
          </div>

          <div class="field">
            <label for="s-address">Dirección</label>
            <input class="input" id="s-address" data-config="contact.address" value="${escapeAttr(config.contact.address)}" />
          </div>

          <div class="field">
            <label for="s-hours">Horario</label>
            <input class="input" id="s-hours" data-config="contact.hours" value="${escapeAttr(config.contact.hours)}" />
          </div>

          <span class="label" style="display:block;margin-top:var(--sp-4)">Redes sociales</span>
          <div id="social-rows" class="mt-4">
            ${config.contact.social.map(socialRowHtml).join('')}
          </div>
          <button class="btn btn--outline btn--sm" type="button" data-action="add-social">
            ${icon('plus', { size: 15 })} Añadir red
          </button>
        </div>
      </section>

      <section class="card" style="margin-top:var(--sp-5)">
        <div class="card__head"><h2 class="card__title">Portada y beneficios</h2></div>
        <div class="card__body">
          <div class="field">
            <label for="s-hero-eyebrow">Antetítulo de portada</label>
            <input class="input" id="s-hero-eyebrow" data-config="hero.eyebrow" value="${escapeAttr(config.hero.eyebrow)}" />
          </div>
          <div class="field">
            <label for="s-hero-title">Título de portada</label>
            <input class="input" id="s-hero-title" data-config="hero.title" value="${escapeAttr(config.hero.title)}" />
          </div>
          <div class="field">
            <label for="s-hero-subtitle">Subtítulo de portada</label>
            <textarea class="textarea" id="s-hero-subtitle" data-config="hero.subtitle" rows="2">${escapeHtml(config.hero.subtitle)}</textarea>
          </div>

          <span class="label" style="display:block;margin-top:var(--sp-4)">Beneficios destacados</span>
          <div id="benefit-rows" class="mt-4">
            ${config.benefits.map(benefitRowHtml).join('')}
          </div>
          <button class="btn btn--outline btn--sm" type="button" data-action="add-benefit">
            ${icon('plus', { size: 15 })} Añadir beneficio
          </button>
        </div>
      </section>

      <section class="card" style="margin-top:var(--sp-5)">
        <div class="card__head"><h2 class="card__title">Barra superior</h2></div>
        <div class="card__body">
          <label class="check">
            <input type="checkbox" data-config="topbar.enabled" data-type="boolean" ${config.topbar.enabled ? 'checked' : ''} />
            <span>Mostrar la barra superior en la tienda</span>
          </label>
          <div class="field mt-4">
            <label for="s-topbar-message">Mensaje</label>
            <input class="input" id="s-topbar-message" data-config="topbar.message" value="${escapeAttr(config.topbar.message)}" />
          </div>
          <div class="field-row">
            <div class="field">
              <label for="s-topbar-label">Texto del enlace</label>
              <input class="input" id="s-topbar-label" data-config="topbar.linkLabel" value="${escapeAttr(config.topbar.linkLabel)}" />
            </div>
            <div class="field">
              <label for="s-topbar-href">Destino del enlace</label>
              <input class="input" id="s-topbar-href" data-config="topbar.linkHref" value="${escapeAttr(config.topbar.linkHref)}" />
            </div>
          </div>
        </div>
      </section>

      <div class="row" style="margin-top:var(--sp-5)">
        <button class="btn btn--accent" type="submit">${icon('check', { size: 16 })} Guardar cambios</button>
        <span class="small muted">Los cambios se publican en la tienda de inmediato.</span>
      </div>
    </form>

    <section class="card" style="margin-top:var(--sp-5)">
      <div class="card__head">
        <h2 class="card__title">${icon('tag', { size: 18 })} Paleta de colores</h2>
        <span class="toolbar__spacer"></span>
        <span class="card__hint">Se usa en los filtros de la tienda y al editar productos</span>
      </div>
      <div class="card__body">
        <div id="color-rows">
          ${colors.map(colorRowHtml).join('')}
        </div>
        <div class="row">
          <button class="btn btn--outline btn--sm" type="button" data-action="add-color">
            ${icon('plus', { size: 15 })} Añadir color
          </button>
          <button class="btn btn--primary btn--sm" type="button" data-action="save-colors">
            ${icon('check', { size: 15 })} Guardar paleta
          </button>
        </div>
      </div>
    </section>
  `;
}

/* --- Lectura del formulario ---------------------------------------------- */

function collectConfig(root) {
  const config = {};

  root.querySelectorAll('[data-config]').forEach((input) => {
    const path = input.dataset.config.split('.');
    const type = input.dataset.type ?? 'string';

    let value;
    if (type === 'boolean') value = input.checked;
    else if (type === 'number') value = input.value.trim() === '' ? null : Number(input.value);
    else if (type === 'lines') value = input.value.split('\n').map((line) => line.trim()).filter(Boolean);
    else value = input.value.trim();

    let target = config;
    path.forEach((key, index) => {
      if (index === path.length - 1) {
        target[key] = value;
        return;
      }
      if (!target[key] || typeof target[key] !== 'object') target[key] = {};
      target = target[key];
    });
  });

  const readRows = (selector, fields) =>
    [...root.querySelectorAll(`${selector} .field-row, ${selector} .benefit-row, ${selector} .social-row`)]
      .map((row) => {
        const entry = {};
        for (const field of fields) {
          const input = row.querySelector(`[data-field="${field}"]`);
          entry[field] = input ? input.value.trim() : '';
        }
        return entry;
      })
      .filter((entry) => Object.values(entry).some(Boolean));

  config.benefits = readRows('#benefit-rows', ['icon', 'title', 'text']).map((benefit) => ({
    icon: benefit.icon || 'truck',
    title: benefit.title,
    text: benefit.text,
  }));

  if (!config.contact) config.contact = {};
  config.contact.social = readRows('#social-rows', ['label', 'href', 'handle']);

  return config;
}

function collectColors(root) {
  return [...root.querySelectorAll('#color-rows .color-row')]
    .map((row) => ({
      id: row.querySelector('[data-field="id"]').value.trim(),
      name: row.querySelector('[data-field="name"]').value.trim(),
      hex: row.querySelector('[data-field="hex"]').value,
    }))
    .filter((color) => color.id);
}

/* --- Página --------------------------------------------------------------- */

export async function mountSettings(container) {
  const { config, colors } = await api.settings.get();

  container.innerHTML = settingsHtml(config, colors);

  bindActions(container, {
    submit: {
      'settings-form': async (form) => {
        const submit = form.querySelector('[type="submit"]');
        submit.disabled = true;

        try {
          const patch = collectConfig(container);
          const response = await api.settings.save(patch);
          toast('Ajustes guardados. La tienda ya muestra los cambios.', { type: 'success' });
          // Se vuelve a pintar con lo que confirmó el servidor (fuente de verdad).
          container.innerHTML = settingsHtml(response.config, colors);
        } catch (error) {
          toast(error.message, { type: 'error' });
        } finally {
          submit.disabled = false;
        }
      },
    },
    click: {
      'add-social': () => addRow('#social-rows', socialRowHtml()),
      'add-benefit': () => addRow('#benefit-rows', benefitRowHtml()),
      'add-color': () => addRow('#color-rows', colorRowHtml()),
      'remove-row': (button) => button.closest('.field-row')?.remove(),
      'save-colors': async (button) => {
        const list = collectColors(container);
        if (list.length === 0) {
          toast('La paleta no puede quedar vacía.', { type: 'warning' });
          return;
        }
        button.disabled = true;
        try {
          const response = await api.settings.saveColors(list);
          toast(`Paleta guardada (${response.colors.length} colores).`, { type: 'success' });
        } catch (error) {
          toast(error.message, { type: 'error' });
        } finally {
          button.disabled = false;
        }
      },
    },
  });

  return () => {};
}

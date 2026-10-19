/* ===========================================================================
   Página: Información
   ---------------------------------------------------------------------------
   Páginas: quiénes somos, preguntas frecuentes, entregas, cobertura, cambios y
   devoluciones, privacidad y contacto.

   ⚠️ Todo el texto proviene de `src/data/content.js` y es PROVISIONAL.
   =========================================================================== */

import { site } from '../config/site.config.js';
import { infoPages, infoPageOrder, PROVISIONAL } from '../data/content.js';
import { escapeHtml, escapeAttr } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { contactUrl } from '../services/whatsapp.js';

function notFound() {
  return `
    <div class="container">
      <div class="empty-state empty-state--wide">
        <span class="empty-state__icon">${icon('search', { size: 30 })}</span>
        <h1>No encontramos esta página</h1>
        <p>Puede que el enlace esté roto o que la sección ya no exista.</p>
        <a class="btn btn--primary" href="#/">Volver al inicio</a>
      </div>
    </div>
  `;
}

function provisionalNotice() {
  return `
    <div class="notice notice--warning" role="note">
      ${icon('alert', { size: 18 })}
      <p><strong>${escapeHtml(PROVISIONAL.label)}:</strong> ${escapeHtml(PROVISIONAL.note)}</p>
    </div>
  `;
}

function sectionsHtml(sections = []) {
  return sections
    .map(
      (section) => `
      <section class="prose__section">
        ${section.heading ? `<h2>${escapeHtml(section.heading)}</h2>` : ''}
        ${(section.paragraphs ?? []).map((text) => `<p>${escapeHtml(text)}</p>`).join('')}
        ${
          section.list
            ? `<ul class="prose__list">${section.list.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
            : ''
        }
      </section>`,
    )
    .join('');
}

function faqHtml(faq = []) {
  return `
    <div class="faq">
      ${faq
        .map(
          (item, index) => `
        <details class="faq__item" ${index === 0 ? 'open' : ''}>
          <summary>
            <span>${escapeHtml(item.q)}</span>
            ${icon('chevronDown', { size: 20 })}
          </summary>
          <div class="faq__answer"><p>${escapeHtml(item.a)}</p></div>
        </details>`,
        )
        .join('')}
    </div>
  `;
}

function coverageBlock() {
  const areas = site.coverage.areas.map((area) => `<li>${escapeHtml(area)}</li>`).join('');
  return `
    <section class="prose__section coverage">
      <h2>Zonas con entrega</h2>
      <ul class="tag-list">${areas}</ul>
      <p class="hint hint--warn">${icon('alert', { size: 14 })} ${escapeHtml(site.coverage.disclaimer)}</p>
      <p>${escapeHtml(site.coverage.outsideMessage)}</p>
      <a class="btn btn--whatsapp" href="${escapeAttr(contactUrl('¡Hola! Quiero confirmar si hacen entrega en mi zona.'))}"
        target="_blank" rel="noopener noreferrer">
        ${icon('whatsapp', { size: 18 })} Consultar mi zona
      </a>
    </section>
  `;
}

function contactBlock() {
  const rows = [
    { icon: 'whatsapp', label: 'WhatsApp', value: site.contact.phoneDisplay },
    { icon: 'mail', label: 'Correo', value: site.contact.email },
    { icon: 'mapPin', label: 'Ubicación', value: site.contact.address },
    { icon: 'clock', label: 'Horario', value: site.contact.hours },
  ];
  const social = site.contact.social
    .map(
      (network) =>
        `<li><a href="${escapeAttr(network.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(network.label)} · ${escapeHtml(network.handle)}</a></li>`,
    )
    .join('');

  return `
    <section class="prose__section">
      <h2>Canales de atención</h2>
      <ul class="contact-list">
        ${rows
          .map(
            (row) => `
          <li>
            <span class="contact-list__icon">${icon(row.icon, { size: 20 })}</span>
            <span>
              <strong>${escapeHtml(row.label)}</strong>
              <span>${escapeHtml(row.value)}</span>
            </span>
          </li>`,
          )
          .join('')}
      </ul>

      <h2>Redes sociales</h2>
      <ul class="prose__list">${social}</ul>

      <a class="btn btn--whatsapp btn--lg" href="${escapeAttr(contactUrl())}" target="_blank" rel="noopener noreferrer">
        ${icon('whatsapp', { size: 20 })} Escribir por WhatsApp
      </a>
    </section>
  `;
}

export function infoPage(route = {}) {
  const slug = route.params?.slug ?? '';
  const page = infoPages[slug];
  if (!page) return notFound();

  const sidebar = infoPageOrder
    .map((key) => {
      const item = infoPages[key];
      if (!item) return '';
      return `<li><a href="#/informacion/${escapeAttr(key)}" ${key === slug ? 'aria-current="page"' : ''}>${escapeHtml(item.title)}</a></li>`;
    })
    .join('');

  return `
    <div class="container info-page">
      <nav class="breadcrumb" aria-label="Ruta de navegación">
        <ol>
          <li><a href="#/">Inicio</a></li>
          <li><a href="#/informacion/${escapeAttr(slug)}" aria-current="page">${escapeHtml(page.title)}</a></li>
        </ol>
      </nav>

      <div class="info-page__layout">
        <aside class="info-page__nav" aria-label="Secciones de información">
          <p class="info-page__nav-title">Información</p>
          <ul>${sidebar}</ul>
        </aside>

        <article class="prose">
          <header class="page-head">
            <p class="eyebrow">${escapeHtml(page.eyebrow)}</p>
            <h1>${escapeHtml(page.title)}</h1>
            <p>${escapeHtml(page.intro)}</p>
          </header>

          ${provisionalNotice()}
          ${slug === 'cobertura' ? coverageBlock() : ''}
          ${slug === 'contacto' ? contactBlock() : ''}
          ${page.sections ? sectionsHtml(page.sections) : ''}
          ${page.faq ? faqHtml(page.faq) : ''}
        </article>
      </div>
    </div>
  `;
}

export function notFoundPage(route = {}) {
  const path = escapeHtml(route.path ?? '');
  return `
    <div class="container">
      <div class="empty-state empty-state--wide">
        <span class="empty-state__icon">${icon('alert', { size: 30 })}</span>
        <h1>Página no encontrada</h1>
        <p>La dirección <code>${path}</code> no existe en esta tienda.</p>
        <div class="empty-state__actions">
          <a class="btn btn--primary" href="#/">Ir al inicio</a>
          <a class="btn btn--outline" href="#/catalogo">Ver catálogo</a>
        </div>
      </div>
    </div>
  `;
}

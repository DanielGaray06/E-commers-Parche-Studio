/* ===========================================================================
   Componente: pie de página
   ---------------------------------------------------------------------------
   Todo el contenido (contacto, redes, cobertura, políticas) proviene de
   `site.config.js` y `content.js`, de modo que el propietario pueda editarlo
   sin tocar el diseño.
   =========================================================================== */

import { site } from '../config/site.config.js';
import { footerGroups, PROVISIONAL } from '../data/content.js';
import { escapeHtml, escapeAttr } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { contactUrl } from '../services/whatsapp.js';

const SOCIAL_ICONS = { Instagram: 'instagram', TikTok: 'tiktok', Facebook: 'facebook' };

function groupHtml(group) {
  const links = group.links
    .map((link) => `<li><a href="${escapeAttr(link.href)}">${escapeHtml(link.label)}</a></li>`)
    .join('');
  return `
    <div class="footer__group">
      <h3 class="footer__title">${escapeHtml(group.title)}</h3>
      <ul class="footer__list">${links}</ul>
    </div>
  `;
}

export function footerHtml() {
  const social = site.contact.social
    .map(
      (network) => `
        <a class="footer__social" href="${escapeAttr(network.href)}" target="_blank" rel="noopener noreferrer"
           aria-label="${escapeAttr(network.label)} de ${escapeAttr(site.brand.name)}">
          ${icon(SOCIAL_ICONS[network.label] ?? 'sparkle', { size: 20 })}
          <span>${escapeHtml(network.handle)}</span>
        </a>`,
    )
    .join('');

  return `
    <footer class="site-footer">
      <div class="container">
        <div class="footer__cta">
          <div>
            <p class="eyebrow">Compra fácil</p>
            <h2 class="footer__cta-title">Arma tu pedido y confírmalo por WhatsApp</h2>
            <p class="footer__cta-text">${escapeHtml(site.shipping.etaLabel)}</p>
          </div>
          <div class="footer__cta-actions">
            <a class="btn btn--whatsapp btn--lg" href="${escapeAttr(contactUrl())}" target="_blank" rel="noopener noreferrer">
              ${icon('whatsapp', { size: 20 })} ${escapeHtml(site.whatsapp.ctaLabel)}
            </a>
            <a class="btn btn--outline btn--lg" href="#/catalogo">Ver catálogo</a>
          </div>
        </div>

        <div class="footer__grid">
          <div class="footer__brand">
            <span class="brand__text">${escapeHtml(site.brand.logoPrimary)}<em>${escapeHtml(site.brand.logoAccent)}</em></span>
            <p>${escapeHtml(site.brand.tagline)}. Tienda local con entregas en ${escapeHtml(site.coverage.city)}.</p>
            <div class="footer__social-list">${social}</div>
          </div>

          ${footerGroups.map(groupHtml).join('')}

          <div class="footer__group">
            <h3 class="footer__title">Contacto</h3>
            <ul class="footer__list footer__contact">
              <li>${icon('whatsapp', { size: 18 })} <span>${escapeHtml(site.contact.phoneDisplay)}</span></li>
              <li>${icon('mail', { size: 18 })} <span>${escapeHtml(site.contact.email)}</span></li>
              <li>${icon('mapPin', { size: 18 })} <span>${escapeHtml(site.contact.address)}</span></li>
              <li>${icon('clock', { size: 18 })} <span>${escapeHtml(site.contact.hours)}</span></li>
            </ul>
            <p class="footer__coverage">
              ${icon('truck', { size: 16 })}
              Entrega solo en ${escapeHtml(site.coverage.city)} y zonas confirmadas.
            </p>
          </div>
        </div>

        <div class="footer__bottom">
          <p>© ${new Date().getFullYear()} ${escapeHtml(site.brand.name)}. Todos los derechos reservados.</p>
          <p class="footer__prov">${escapeHtml(PROVISIONAL.label)}: ${escapeHtml(PROVISIONAL.note)}</p>
        </div>
      </div>
    </footer>
  `;
}

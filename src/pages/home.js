/* ===========================================================================
   Página: Inicio
   ---------------------------------------------------------------------------
   Estructura: hero → beneficios → categorías → destacados → novedades →
   cobertura + llamado a la acción por WhatsApp.
   =========================================================================== */

import { site } from '../config/site.config.js';
import { escapeHtml, escapeAttr } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { formatCurrency, pluralize } from '../utils/format.js';
import { productGrid } from '../components/productCard.js';
import { getFeatured, getNewest, getCategories, countByCategory } from '../services/catalog.js';
import { brandPlaceholder } from '../utils/placeholder.js';
import { contactUrl } from '../services/whatsapp.js';

const CATEGORY_ICONS = {
  camisetas: 'tee',
  pantalones: 'pants',
  buzos: 'hoodie',
  chaquetas: 'jacket',
  accesorios: 'cap',
};

function heroHtml() {
  const { hero } = site;
  return `
    <section class="hero">
      <div class="container hero__inner">
        <div class="hero__content fade-in">
          <p class="eyebrow">${escapeHtml(hero.eyebrow)}</p>
          <h1 class="hero__title">${escapeHtml(hero.title)}</h1>
          <p class="hero__subtitle">${escapeHtml(hero.subtitle)}</p>
          <div class="hero__actions">
            <a class="btn btn--accent btn--lg" href="${escapeAttr(hero.primaryCta.href)}">
              ${escapeHtml(hero.primaryCta.label)} ${icon('arrowRight', { size: 18 })}
            </a>
            <a class="btn btn--outline btn--lg" href="${escapeAttr(hero.secondaryCta.href)}">
              ${escapeHtml(hero.secondaryCta.label)}
            </a>
          </div>
          <ul class="hero__facts">
            <li>${icon('truck', { size: 18 })} Entrega en ${escapeHtml(site.coverage.city)}</li>
            <li>${icon('whatsapp', { size: 18 })} Pedido por WhatsApp</li>
            <li>${icon('shield', { size: 18 })} Pago contra entrega</li>
          </ul>
        </div>
        <div class="hero__media fade-in">
          <img
            src="${brandPlaceholder({ label: site.brand.name }) }"
            alt="Imagen de portada provisional de ${escapeAttr(site.brand.name)}: silueta de prenda sobre fondo neutro"
            width="1200" height="1400" fetchpriority="high"
          />
          <p class="hero__media-note">Imagen de demostración — pendiente de fotografía editorial real.</p>
        </div>
      </div>
    </section>
  `;
}

function marqueeHtml() {
  const words = ['Hecho para la calle', 'Medellín', 'Nueva colección', 'Pide por WhatsApp', 'Estilo urbano'];
  const content = words.map((word) => `<span>${escapeHtml(word)}</span><i aria-hidden="true">✳</i>`).join('');
  return `
    <div class="marquee" aria-hidden="true">
      <div class="marquee__track">${content}${content}</div>
    </div>
  `;
}

function benefitsHtml() {
  return `
    <section class="section section--tight benefits" aria-label="Beneficios de compra">
      <div class="container">
        <ul class="benefits__grid">
          ${site.benefits
            .map(
              (benefit) => `
            <li class="benefit">
              <span class="benefit__icon">${icon(benefit.icon, { size: 24 })}</span>
              <div>
                <h3 class="benefit__title">${escapeHtml(benefit.title)}</h3>
                <p class="benefit__text">${escapeHtml(benefit.text)}</p>
              </div>
            </li>`,
            )
            .join('')}
        </ul>
      </div>
    </section>
  `;
}

function categoriesHtml() {
  const cards = getCategories()
    .map(
      (category) => `
        <a class="cat-card" href="#/catalogo?categoria=${escapeAttr(category.id)}">
          <span class="cat-card__icon">${icon('sparkle', { size: 22 })}</span>
          <span class="cat-card__name">${escapeHtml(category.name)}</span>
          <span class="cat-card__blurb">${escapeHtml(category.blurb)}</span>
          <span class="cat-card__count">${pluralize(countByCategory(category.id), 'prenda')}</span>
        </a>`,
    )
    .join('');

  return `
    <section class="section" aria-labelledby="cat-title">
      <div class="container">
        <div class="section-head">
          <div>
            <p class="eyebrow">Explora</p>
            <h2 id="cat-title">Compra por categoría</h2>
          </div>
        </div>
        <div class="cat-grid">${cards}</div>
      </div>
    </section>
  `;
}

function featuredHtml() {
  const products = getFeatured(4);
  if (products.length === 0) return '';
  return `
    <section class="section section--surface" aria-labelledby="featured-title">
      <div class="container">
        <div class="section-head">
          <div>
            <p class="eyebrow">Favoritos de la casa</p>
            <h2 id="featured-title">Destacados</h2>
            <p>Las prendas que más se están llevando esta temporada.</p>
          </div>
          <a class="btn btn--outline" href="#/catalogo?orden=destacados">
            Ver todos ${icon('arrowRight', { size: 18 })}
          </a>
        </div>
        ${productGrid(products)}
      </div>
    </section>
  `;
}

function newestHtml() {
  const products = getNewest(4);
  if (products.length === 0) return '';
  return `
    <section class="section" aria-labelledby="new-title">
      <div class="container">
        <div class="section-head">
          <div>
            <p class="eyebrow">Recién llegado</p>
            <h2 id="new-title">Novedades</h2>
            <p>Lo último que entró al taller.</p>
          </div>
          <a class="btn btn--outline" href="#/catalogo?orden=recientes">
            Ver novedades ${icon('arrowRight', { size: 18 })}
          </a>
        </div>
        ${productGrid(products)}
      </div>
    </section>
  `;
}

function coverageHtml() {
  const areas = site.coverage.areas.map((area) => `<li>${escapeHtml(area)}</li>`).join('');
  return `
    <section class="section section--surface" id="cobertura" aria-labelledby="coverage-title">
      <div class="container coverage">
        <div class="coverage__text">
          <p class="eyebrow">Dónde llegamos</p>
          <h2 id="coverage-title">Entrega en ${escapeHtml(site.coverage.city)}</h2>
          <p>${escapeHtml(site.coverage.message)}</p>
          <p class="coverage__disclaimer">${icon('alert', { size: 16 })} ${escapeHtml(site.coverage.disclaimer)}</p>
          <a class="link-arrow" href="#/informacion/cobertura">Ver cobertura completa ${icon('arrowRight', { size: 18 })}</a>
        </div>
        <div class="coverage__list">
          <p class="coverage__list-title">Zonas (provisional)</p>
          <ul class="tag-list">${areas}</ul>
        </div>
      </div>
    </section>
  `;
}

function howToBuyHtml() {
  const steps = [
    { title: 'Arma tu pedido', text: 'Elige talla y color y agrégalo al carrito.', icon: 'cart' },
    { title: 'Revisa y completa', text: 'Indica tu barrio y datos de entrega.', icon: 'check' },
    { title: 'Envía por WhatsApp', text: 'Recibes confirmación de disponibilidad y envío.', icon: 'whatsapp' },
  ];
  return `
    <section class="section" aria-labelledby="how-title">
      <div class="container">
        <div class="section-head">
          <div>
            <p class="eyebrow">Así de fácil</p>
            <h2 id="how-title">Cómo comprar</h2>
          </div>
        </div>
        <ol class="steps">
          ${steps
            .map(
              (step, index) => `
            <li class="step">
              <span class="step__num">${String(index + 1).padStart(2, '0')}</span>
              <span class="step__icon">${icon(step.icon, { size: 22 })}</span>
              <h3 class="step__title">${escapeHtml(step.title)}</h3>
              <p class="step__text">${escapeHtml(step.text)}</p>
            </li>`,
            )
            .join('')}
        </ol>
      </div>
    </section>
  `;
}

function whatsappCtaHtml() {
  const { shipping } = site;
  const freeLine =
    typeof shipping.freeFrom === 'number'
      ? `Envío gratis desde ${formatCurrency(shipping.freeFrom)} dentro de la cobertura. ⚠️ DEMO`
      : '';
  return `
    <section class="section cta-band">
      <div class="container cta-band__inner">
        <div>
          <h2 class="cta-band__title">¿Listo para pedir?</h2>
          <p class="cta-band__text">
            Te confirmamos disponibilidad y el costo de envío por WhatsApp. ${escapeHtml(freeLine)}
          </p>
        </div>
        <div class="cta-band__actions">
          <a class="btn btn--whatsapp btn--lg" href="${escapeAttr(contactUrl())}" target="_blank" rel="noopener noreferrer">
            ${icon('whatsapp', { size: 20 })} ${escapeHtml(site.whatsapp.ctaLabel)}
          </a>
          <a class="btn btn--primary btn--lg" href="#/catalogo">Ir al catálogo</a>
        </div>
      </div>
    </section>
  `;
}

/** HTML completo de la portada. */
export function homePage() {
  return `
    ${heroHtml()}
    ${marqueeHtml()}
    ${benefitsHtml()}
    ${categoriesHtml()}
    ${featuredHtml()}
    ${newestHtml()}
    ${howToBuyHtml()}
    ${coverageHtml()}
    ${whatsappCtaHtml()}
  `;
}

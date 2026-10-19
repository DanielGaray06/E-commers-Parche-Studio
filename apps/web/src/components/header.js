/* ===========================================================================
   Componente: encabezado (barra superior + cabecera + navegación + menú móvil)
   =========================================================================== */

import { site } from '../config/site.config.js';
import { escapeHtml, escapeAttr, qs } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { getCategories } from '../services/catalog.js';
import { getCount } from '../services/cart.js';
import { contactUrl } from '../services/whatsapp.js';

function topbarHtml() {
  if (!site.topbar.enabled) return '';
  const { message, linkLabel, linkHref } = site.topbar;
  return `
    <div class="topbar">
      <p class="topbar__msg">${escapeHtml(message)}</p>
      ${linkLabel ? `<a class="topbar__link" href="${escapeAttr(linkHref)}">${escapeHtml(linkLabel)}</a>` : ''}
    </div>
  `;
}

function demoStripHtml() {
  if (!site.demoMode) return '';
  return `
    <div class="demo-strip" role="note">
      <span>${escapeHtml(site.demoNotice)}</span>
    </div>
  `;
}

function categoryNavHtml() {
  const items = getCategories()
    .map(
      (category) => `
        <li>
          <a href="#/catalogo?categoria=${escapeAttr(category.id)}">${escapeHtml(category.name)}</a>
        </li>`,
    )
    .join('');
  return `
    <nav class="catnav" aria-label="Categorías">
      <ul class="catnav__list">
        <li><a href="#/catalogo">Todo</a></li>
        ${items}
        <li><a class="catnav__cta" href="#/catalogo?orden=recientes">Novedades</a></li>
      </ul>
    </nav>
  `;
}

function mobileMenuHtml() {
  const categories = getCategories()
    .map(
      (category) => `
        <li><a href="#/catalogo?categoria=${escapeAttr(category.id)}" data-action="close-mobile-menu">
          ${escapeHtml(category.name)}</a></li>`,
    )
    .join('');

  return `
    <div class="mobile-menu" id="mobile-menu" aria-hidden="true">
      <div class="mobile-menu__panel" role="dialog" aria-modal="true" aria-label="Menú de navegación">
        <div class="mobile-menu__head">
          <span class="brand__text brand__text--sm">${escapeHtml(site.brand.logoPrimary)}<em>${escapeHtml(site.brand.logoAccent)}</em></span>
          <button class="icon-btn" type="button" data-action="close-mobile-menu" aria-label="Cerrar menú">
            ${icon('close', { size: 22 })}
          </button>
        </div>

        <form class="mobile-menu__search" data-action="search-form" role="search">
          <label class="sr-only" for="mobile-search">Buscar productos</label>
          <input class="input" id="mobile-search" type="search" name="q" placeholder="Buscar prendas…" />
          <button class="btn btn--primary" type="submit" aria-label="Buscar">${icon('search', { size: 18 })}</button>
        </form>

        <nav aria-label="Categorías (móvil)">
          <p class="mobile-menu__label">Categorías</p>
          <ul class="mobile-menu__list">${categories}</ul>
        </nav>

        <nav aria-label="Información (móvil)">
          <p class="mobile-menu__label">Información</p>
          <ul class="mobile-menu__list">
            <li><a href="#/informacion/quienes-somos" data-action="close-mobile-menu">Quiénes somos</a></li>
            <li><a href="#/informacion/entregas" data-action="close-mobile-menu">Entregas y cobertura</a></li>
            <li><a href="#/informacion/preguntas-frecuentes" data-action="close-mobile-menu">Preguntas frecuentes</a></li>
            <li><a href="#/informacion/contacto" data-action="close-mobile-menu">Contacto</a></li>
          </ul>
        </nav>

        <a class="btn btn--whatsapp btn--block btn--lg" href="${escapeAttr(contactUrl())}"
           target="_blank" rel="noopener noreferrer" data-action="close-mobile-menu">
          ${icon('whatsapp', { size: 20 })} Escribir por WhatsApp
        </a>
      </div>
    </div>
  `;
}

/** HTML completo del encabezado. */
export function headerHtml() {
  return `
    ${topbarHtml()}
    ${demoStripHtml()}
    <header class="site-header" id="site-header">
      <div class="container header__row">
        <button class="icon-btn header__burger" type="button" data-action="open-mobile-menu"
          aria-label="Abrir menú" aria-controls="mobile-menu" aria-expanded="false">
          ${icon('menu', { size: 24 })}
        </button>

        <a class="brand" href="#/" aria-label="${escapeAttr(site.brand.name)} — Inicio">
          <span class="brand__text">${escapeHtml(site.brand.logoPrimary)}<em>${escapeHtml(site.brand.logoAccent)}</em></span>
          <span class="brand__tag">${escapeHtml(site.brand.city)}</span>
        </a>

        <form class="header__search" data-action="search-form" role="search">
          <label class="sr-only" for="header-search">Buscar productos</label>
          <span class="header__search-icon">${icon('search', { size: 18 })}</span>
          <input id="header-search" class="header__search-input" type="search" name="q"
            placeholder="Buscar prendas, categorías…" autocomplete="off" />
        </form>

        <div class="header__actions">
          <a class="icon-btn header__search-toggle" href="#/catalogo" aria-label="Buscar">
            ${icon('search', { size: 22 })}
          </a>
          <a class="icon-btn header__whatsapp" href="#/informacion/contacto" aria-label="Contacto por WhatsApp">
            ${icon('whatsapp', { size: 22 })}
          </a>
          <button class="icon-btn cart-btn" type="button" data-action="open-cart"
            aria-label="Abrir carrito" aria-controls="cart-drawer">
            ${icon('cart', { size: 22 })}
            <span class="cart-btn__count" id="cart-count" data-empty="true">0</span>
          </button>
        </div>
      </div>
      ${categoryNavHtml()}
    </header>
    ${mobileMenuHtml()}
  `;
}

/** Actualiza el contador del carrito (no re-renderiza el encabezado). */
export function updateCartBadge() {
  const badge = qs('#cart-count');
  if (!badge) return;
  const count = getCount();
  badge.textContent = count > 99 ? '99+' : String(count);
  badge.dataset.empty = count === 0 ? 'true' : 'false';
  const button = badge.closest('.cart-btn');
  if (button) button.setAttribute('aria-label', `Abrir carrito (${count} ${count === 1 ? 'artículo' : 'artículos'})`);
}

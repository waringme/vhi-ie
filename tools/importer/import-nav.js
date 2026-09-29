/* eslint-disable */
/* global WebImporter */

/**
 * Import script: vhi.ie global header -> /nav fragment.
 *
 * Output structure (flat, one top-level <div> per section):
 *   1. brand     <p><img logo></p><p><a>Home page</a></p>
 *   2. tools     <ul><li><a>Search</a></li><li><a>Contact Us</a></li><li><a>Login</a></li></ul>
 *   3..n panels  <p><strong>Trigger</strong></p>
 *                [<p>Subcategory</p>] <ul><li><img icon> <a>Title</a> Description</li></ul> ...
 *                [<p><a>See all ...</a></p>]
 *                <p><img card></p><p><strong>Card title</strong></p><p>Card text</p><p><a>Card link</a></p>
 * (headings are avoided: the importer adds id= attributes to them, which the nav fragment disallows)
 *
 * Images are referenced from the locally downloaded copies in content/images/nav/.
 */

const IMAGE_DIR = 'images/nav/';

function slug(url) {
  const file = decodeURIComponent(url.split('/').pop().split('?')[0]);
  return file.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/-+/g, '-');
}

function text(el) {
  return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
}

function absolute(href, base) {
  try {
    return new URL(href, base).href;
  } catch (e) {
    return href;
  }
}

function img(document, src, alt, prefix = '') {
  const i = document.createElement('img');
  i.src = `${IMAGE_DIR}${prefix}${slug(src)}`;
  i.alt = alt || '';
  return i;
}

function link(document, href, label, base) {
  const a = document.createElement('a');
  a.href = absolute(href, base);
  a.textContent = label;
  return a;
}

function para(document, ...children) {
  const p = document.createElement('p');
  children.forEach((c) => p.append(c));
  return p;
}

function buildBrand(document, header, base) {
  const section = document.createElement('div');
  const logoLink = header.querySelector('.mega-header__top-panel-logo');
  const logoImg = logoLink && logoLink.querySelector('img');
  if (logoLink && logoImg) {
    // image and home link as separate paragraphs: a linked image does not survive
    // conversion to Universal Editor components (it becomes an empty button)
    section.append(para(document, img(document, logoImg.getAttribute('src'), 'Vhi')));
    section.append(para(document, link(document, logoLink.getAttribute('href'), 'Home page', base)));
  }
  return section;
}

function buildTools(document, header, base) {
  const section = document.createElement('div');
  const ul = document.createElement('ul');
  header.querySelectorAll('.mega-header__top-panel-links > a').forEach((a) => {
    const label = text(a) || a.getAttribute('aria-label') || '';
    const li = document.createElement('li');
    li.append(link(document, a.getAttribute('href'), label.replace(/ button$/i, ''), base));
    ul.append(li);
  });
  section.append(ul);
  return section;
}

function buildPanel(document, item, base) {
  const section = document.createElement('div');
  const label = document.createElement('strong');
  label.textContent = text(item.querySelector('.mega-header__nav-item-button'));
  section.append(para(document, label));

  const dropdown = item.querySelector('.mega-header__dropdown');
  dropdown.querySelectorAll('.mega-header__subcategory').forEach((cat) => {
    const title = text(cat.querySelector('.mega-header__subcategory-title'));
    if (title) section.append(para(document, title));
    const ul = document.createElement('ul');
    cat.querySelectorAll('a.mega-header__subcategory-link').forEach((a) => {
      const li = document.createElement('li');
      const icon = a.querySelector('img');
      if (icon) li.append(img(document, icon.getAttribute('src'), '', 'icon-'), ' ');
      li.append(link(document, a.getAttribute('href'), text(a.querySelector('.mega-header__subcategory-link-title')), base));
      const desc = text(a.querySelector('.mega-header__subcategory-link-description'));
      if (desc) li.append(` ${desc}`);
      ul.append(li);
    });
    section.append(ul);
  });

  dropdown.querySelectorAll('.mega-header__category-link-button').forEach((a) => {
    section.append(para(document, link(document, a.getAttribute('href'), text(a), base)));
  });

  dropdown.querySelectorAll('.mega-header__feature-card').forEach((card) => {
    const cardImg = card.querySelector('img');
    if (cardImg) section.append(para(document, img(document, cardImg.getAttribute('src'), cardImg.getAttribute('alt') || '', 'card-')));
    const title = text(card.querySelector('.mega-header__feature-card-title'));
    if (title) {
      const strong = document.createElement('strong');
      strong.textContent = title;
      section.append(para(document, strong));
    }
    const desc = text(card.querySelector('.mega-header__feature-card-description'));
    if (desc) section.append(para(document, desc));
    const cta = card.querySelector('a');
    if (cta) section.append(para(document, link(document, cta.getAttribute('href'), text(cta), base)));
  });

  return section;
}

export default {
  transform: (payload) => {
    const { document, params } = payload;
    const base = params.originalURL;
    const header = document.querySelector('header .mega-header, header');

    // sections are separated by <hr> (the importer turns each into a top-level <div>)
    const sections = [buildBrand(document, header, base), buildTools(document, header, base)];
    header.querySelectorAll('.mega-header__nav-item').forEach((item) => {
      sections.push(buildPanel(document, item, base));
    });
    const main = document.createElement('div');
    sections.forEach((section, i) => {
      if (i > 0) main.append(document.createElement('hr'));
      main.append(...section.childNodes);
    });

    return [{
      element: main,
      path: '/nav',
      report: {
        title: 'nav',
        panels: header.querySelectorAll('.mega-header__nav-item').length,
      },
    }];
  },
};

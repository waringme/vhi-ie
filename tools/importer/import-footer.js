/* eslint-disable */
/* global WebImporter */

/**
 * Import script: vhi.ie global footer -> /footer fragment.
 *
 * Output structure (flat, one top-level <div> per section, separated by <hr>):
 *   1. brand         <p><img logo></p><p><a>Home page</a></p>
 *   2..n columns     <p><strong>Title</strong></p> <ul><li><a>link</a></li>…</ul>
 *                    (connect column: social <ul> of image links, CTA <p><a>, phone <p><a tel:>,
 *                     then a second part <p><strong>Download the Vhi App</strong></p><p><a><img></a>…</p>)
 *   n+1 bottom bar   <ul><li><a>legal link</a></li>…</ul>
 *   n+2 legal        <p>regulatory text</p><p>address / copyright</p>
 *
 * Images are referenced from the locally downloaded copies in content/images/footer/.
 * Headings are avoided (the importer adds id= attributes, which the fragment disallows).
 */

const IMAGE_DIR = 'images/footer/';

function text(el) {
  return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
}

function fileName(src, fallback) {
  const name = decodeURIComponent(src.split('/').pop().split('?')[0]).toLowerCase();
  return fallback || name.replace(/[^a-z0-9.]+/g, '-');
}

function img(document, src, alt, name) {
  const i = document.createElement('img');
  i.src = `${IMAGE_DIR}${fileName(src, name)}`;
  i.alt = alt || '';
  return i;
}

function link(document, href, base, ...children) {
  const a = document.createElement('a');
  a.href = new URL(href, base).href;
  children.forEach((c) => a.append(c));
  return a;
}

function para(document, ...children) {
  const p = document.createElement('p');
  children.forEach((c) => p.append(c));
  return p;
}

function title(document, label) {
  const strong = document.createElement('strong');
  strong.textContent = label;
  return para(document, strong);
}

function list(document, anchors, base, withImages) {
  const ul = document.createElement('ul');
  anchors.forEach((a) => {
    const li = document.createElement('li');
    const icon = a.querySelector('img');
    if (withImages && icon) {
      li.append(link(document, a.getAttribute('href'), base, img(document, icon.getAttribute('src'), icon.getAttribute('alt'))));
    } else {
      li.append(link(document, a.getAttribute('href'), base, text(a)));
    }
    ul.append(li);
  });
  return ul;
}

function buildBrand(document, footer, base) {
  const nodes = [];
  const logoLink = footer.querySelector('.mega-footer__logo-link');
  const logoImg = logoLink && logoLink.querySelector('img');
  if (logoImg) {
    // image and home link as separate paragraphs: a linked image does not survive
    // conversion to Universal Editor components (it becomes an empty button)
    nodes.push(para(document, img(document, logoImg.getAttribute('src'), logoImg.getAttribute('alt') || 'Vhi logo', 'vhi-logo-footer.svg')));
    nodes.push(para(document, link(document, logoLink.getAttribute('href'), base, 'Home page')));
  }
  return nodes;
}

function buildColumn(document, section, base) {
  const nodes = [];
  const heading = section.querySelector('.mega-footer__main-section-title');
  if (heading) nodes.push(title(document, text(heading)));

  const links = [...section.querySelectorAll('.mega-footer__main-section-item-link')];
  if (links.length) nodes.push(list(document, links, base, false));

  const social = [...section.querySelectorAll('.mega-footer__social-link')];
  if (social.length) nodes.push(list(document, social, base, true));

  section.querySelectorAll('.mega-footer__cta-button').forEach((a) => {
    nodes.push(para(document, link(document, a.getAttribute('href'), base, text(a))));
  });
  section.querySelectorAll('.mega-footer__phone').forEach((a) => {
    nodes.push(para(document, link(document, a.getAttribute('href'), base, text(a))));
  });

  const apps = section.querySelector('.mega-footer__mobile-apps');
  if (apps) {
    const appsTitle = apps.querySelector('.mega-footer__mobile-apps-title, h2, h3, p');
    if (appsTitle) nodes.push(title(document, text(appsTitle)));
    const badges = [...apps.querySelectorAll('a')].map((a) => {
      const badge = a.querySelector('img');
      return link(document, a.getAttribute('href'), base, img(document, badge.getAttribute('src'), badge.getAttribute('alt')));
    });
    if (badges.length) nodes.push(para(document, ...badges));
  }
  return nodes;
}

export default {
  transform: (payload) => {
    const { document, params } = payload;
    const base = params.originalURL;
    const footer = document.querySelector('footer .mega-footer, footer');

    const sections = [buildBrand(document, footer, base)];
    footer.querySelectorAll('.mega-footer__main-section').forEach((section) => {
      sections.push(buildColumn(document, section, base));
    });
    const bottom = [...footer.querySelectorAll('.mega-footer__bottom-item-link')];
    if (bottom.length) sections.push([list(document, bottom, base, false)]);
    const legal = [footer.querySelector('.mega-footer__legal'), footer.querySelector('.mega-footer__copyright')]
      .filter(Boolean)
      .map((el) => para(document, text(el)));
    if (legal.length) sections.push(legal);

    // sections are separated by <hr> (the importer turns each into a top-level <div>)
    const main = document.createElement('div');
    sections.filter((nodes) => nodes.length).forEach((nodes, i) => {
      if (i > 0) main.append(document.createElement('hr'));
      main.append(...nodes);
    });

    return [{
      element: main,
      path: '/footer',
      report: {
        title: 'footer',
        columns: footer.querySelectorAll('.mega-footer__main-section').length,
      },
    }];
  },
};

/**
 * Fetches the footer fragment. /content first (local preview), then site root (DA/EDS).
 * @returns {Promise<Element[]>} top-level section elements
 */
async function fetchFooterSections() {
  let resp = await fetch('/content/footer.plain.html');
  if (!resp.ok) resp = await fetch('/footer.plain.html');
  if (!resp.ok) return [];
  const tpl = document.createElement('template');
  tpl.innerHTML = await resp.text();
  // relative media paths are relative to the fragment, not the current page
  tpl.content.querySelectorAll('img[src], source[srcset]').forEach((media) => {
    const attr = media.tagName === 'IMG' ? 'src' : 'srcset';
    const value = media.getAttribute(attr);
    if (!/^(https?:|data:|\/)/.test(value)) media.setAttribute(attr, new URL(value, resp.url).href);
  });
  return [...tpl.content.children].filter((section) => section.tagName === 'DIV');
}

function el(tag, className, ...children) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  children.filter(Boolean).forEach((c) => node.append(c));
  return node;
}

const isTitle = (node) => node.tagName === 'P' && node.children.length === 1
  && node.firstElementChild.tagName === 'STRONG' && !node.querySelector('a');
const imageOnly = (a) => !!a.querySelector('img') && !a.textContent.trim();

function lazyImages(root) {
  root.querySelectorAll('img').forEach((img) => { img.loading = 'lazy'; });
}

/**
 * Decorates one column part: title, link lists, image-link lists (social), single-link
 * paragraphs (tel: -> phone, otherwise CTA) and image-link paragraphs (badges).
 */
function buildPart(nodes) {
  const part = el('div', 'footer-column-part');
  nodes.forEach((node) => {
    if (isTitle(node)) {
      part.append(el('p', 'footer-column-title', node.textContent.trim()));
    } else if (node.tagName === 'UL') {
      const links = [...node.querySelectorAll('a')];
      node.className = links.length && links.every(imageOnly) ? 'footer-social' : 'footer-links';
      part.append(node);
    } else if (node.tagName === 'P') {
      const links = [...node.querySelectorAll('a')];
      if (links.length && links.every(imageOnly)) {
        part.classList.add('footer-badges');
        part.append(el('div', 'footer-badge-list', ...links));
      } else if (links.length === 1) {
        const a = links[0];
        a.className = a.href.startsWith('tel:') ? 'footer-phone' : 'footer-cta';
        part.append(a);
      } else {
        part.append(node);
      }
    }
  });
  return part;
}

function buildColumn(section) {
  const column = el('div', 'footer-column');
  let current = [];
  [...section.children].forEach((node) => {
    if (isTitle(node) && current.length) {
      column.append(buildPart(current));
      current = [];
    }
    current.push(node);
  });
  if (current.length) column.append(buildPart(current));
  return column;
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const sections = await fetchFooterSections();
  if (!sections.length) return;

  const inner = el('div', 'footer-inner');
  const columns = el('div', 'footer-columns');
  sections.forEach((section) => {
    const first = section.firstElementChild;
    const links = [...section.querySelectorAll('a')];
    if (first && isTitle(first)) {
      columns.append(buildColumn(section));
    } else if (links.length === 1 && imageOnly(links[0])) {
      inner.append(el('div', 'footer-brand', links[0]));
    } else if (section.querySelector('ul')) {
      const list = section.querySelector('ul');
      list.className = 'footer-bottom-links';
      inner.append(list);
    } else {
      inner.append(el('div', 'footer-legal', ...section.children));
    }
  });
  // columns sit after the brand, before the bottom links / legal text
  const brand = inner.querySelector('.footer-brand');
  if (brand) brand.after(columns);
  else inner.prepend(columns);

  lazyImages(inner);
  block.textContent = '';
  block.append(el('div', 'footer-band', inner));
}

// media query match that indicates desktop width
const isDesktop = window.matchMedia('(width >= 900px)');

/**
 * Fetches the nav fragment. /content first (local preview), then site root (DA/EDS).
 * @returns {Promise<Element[]>} top-level section elements
 */
async function fetchNavSections() {
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) resp = await fetch('/nav.plain.html');
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

function textOf(node) {
  return node.textContent.replace(/\s+/g, ' ').trim();
}

/**
 * Leftover text of a list item once its image and link are removed (the link description).
 */
function trailingText(li) {
  const clone = li.cloneNode(true);
  clone.querySelectorAll('a, picture, img').forEach((n) => n.remove());
  return textOf(clone);
}

function buildBrand(section) {
  const brand = el('div', 'nav-brand');
  const link = section.querySelector('a');
  if (link) {
    // logo may be authored inside the link or as a separate image before a text link
    const logo = section.querySelector('picture') || section.querySelector('img');
    const label = textOf(link) || 'Home page';
    if (logo && !link.contains(logo)) link.replaceChildren(logo);
    link.className = '';
    link.setAttribute('aria-label', label);
    brand.append(link);
  }
  return brand;
}

function buildTools(section) {
  const tools = el('div', 'nav-tools');
  const links = [...section.querySelectorAll('a')];
  links.forEach((a, i) => {
    const label = textOf(a);
    if (/search/i.test(label)) {
      a.classList.add('nav-tool-search');
      a.setAttribute('aria-label', label);
      a.textContent = '';
    } else if (i === links.length - 1) {
      a.classList.add('nav-tool', 'nav-tool-accent');
    } else {
      a.classList.add('nav-tool', 'nav-tool-outline');
    }
    if (/log ?in/i.test(label)) a.classList.add('nav-tool-login');
    tools.append(a);
  });
  return tools;
}

function buildLink(li) {
  const a = li.querySelector('a');
  if (!a) return null;
  const link = el('a', 'nav-link');
  link.href = a.href;
  const img = li.querySelector('img');
  if (img) {
    img.className = 'nav-link-icon';
    img.alt = '';
    img.loading = 'lazy';
    link.append(img);
  }
  const desc = trailingText(li);
  link.append(el(
    'span',
    'nav-link-text',
    el('span', 'nav-link-title', textOf(a)),
    desc ? el('span', 'nav-link-desc', desc) : null,
  ));
  return el('li', null, link);
}

function buildCard(nodes) {
  const card = el('aside', 'nav-card');
  const content = el('div', 'nav-card-content');
  nodes.forEach((node) => {
    const img = node.querySelector('img');
    const a = node.querySelector('a');
    if (img) {
      img.loading = 'lazy';
      card.prepend(el('div', 'nav-card-image', node.querySelector('picture') || img));
    } else if (a) {
      a.className = 'nav-card-link';
      content.append(a);
    } else if (node.matches('strong') || node.querySelector('strong')) {
      content.append(el('p', 'nav-card-title', textOf(node)));
    } else {
      content.append(el('p', 'nav-card-desc', textOf(node)));
    }
  });
  card.append(content);
  return card;
}

/**
 * Builds a trigger + megamenu panel from a nav section:
 * <p><strong>Label</strong></p> [<p>Group</p>] <ul>links</ul> … [<p><a>More</a></p>]
 * <p><img></p><p><strong>Card title</strong></p><p>Card text</p><p><a>CTA</a></p>
 */
function buildPanelItem(section, index) {
  const nodes = [...section.children];
  const labelNode = nodes.shift();
  const label = textOf(labelNode);

  const groups = [];
  const more = [];
  const cardNodes = [];
  let pendingTitle = null;
  nodes.forEach((node) => {
    const inCard = cardNodes.length > 0;
    if (!inCard && node.tagName === 'UL') {
      const items = [...node.children].map(buildLink).filter(Boolean);
      groups.push({ title: pendingTitle, items });
      pendingTitle = null;
    } else if (inCard || node.querySelector('img')) {
      cardNodes.push(node);
    } else if (node.querySelector('a')) {
      more.push(node.querySelector('a'));
    } else if (textOf(node)) {
      pendingTitle = textOf(node);
    }
  });

  const panelId = `nav-panel-${index}`;
  const trigger = el('button', 'nav-trigger', el('span', null, label));
  trigger.type = 'button';
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', panelId);

  const layout = groups.length > 1 ? 'nav-groups-multi' : 'nav-groups-single';
  const list = el('ul', `nav-groups ${layout}`);
  groups.forEach((group) => {
    list.append(el(
      'li',
      'nav-group',
      group.title ? el('p', 'nav-group-title', group.title) : null,
      el('ul', 'nav-links', ...group.items),
    ));
  });

  const main = el('div', 'nav-panel-main', list);
  if (more.length) {
    more.forEach((a) => { a.className = 'nav-more-link'; });
    main.append(el('div', 'nav-panel-more', ...more));
  }

  const panel = el(
    'div',
    'nav-panel',
    el('div', 'nav-panel-inner', main, cardNodes.length ? buildCard(cardNodes) : null),
  );
  panel.id = panelId;
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', label);

  return el('li', 'nav-item', trigger, panel);
}

function closeAllPanels(nav, except) {
  nav.querySelectorAll('.nav-trigger[aria-expanded="true"]').forEach((t) => {
    if (t !== except) t.setAttribute('aria-expanded', 'false');
  });
  const anyOpen = !!nav.querySelector('.nav-trigger[aria-expanded="true"]');
  nav.classList.toggle('nav-panel-open', anyOpen);
}

function toggleMenu(nav, force) {
  const hamburger = nav.querySelector('.nav-hamburger button');
  const expanded = force !== undefined ? !force : hamburger.getAttribute('aria-expanded') === 'true';
  hamburger.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  hamburger.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  document.body.style.overflowY = !expanded && !isDesktop.matches ? 'hidden' : '';
  if (expanded) closeAllPanels(nav);
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const sections = await fetchNavSections();
  if (!sections.length) return;
  const [brandSection, toolsSection, ...panelSections] = sections;

  const nav = el('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'Main navigation');
  nav.setAttribute('aria-expanded', 'false');

  const hamburgerButton = el('button', null, el('span', 'nav-hamburger-icon'));
  hamburgerButton.type = 'button';
  hamburgerButton.setAttribute('aria-controls', 'nav');
  hamburgerButton.setAttribute('aria-expanded', 'false');
  hamburgerButton.setAttribute('aria-label', 'Open navigation');
  const hamburger = el('div', 'nav-hamburger', hamburgerButton);

  const top = el(
    'div',
    'nav-top',
    el('div', 'nav-top-inner', buildBrand(brandSection), buildTools(toolsSection), hamburger),
  );
  const list = el('ul', 'nav-list', ...panelSections.map(buildPanelItem));
  // mobile menu repeats the secondary tool links (e.g. Contact Us) at the bottom
  const menuTools = [...top.querySelectorAll('.nav-tool-outline')].map((a) => {
    const clone = a.cloneNode(true);
    clone.className = 'nav-menu-tool';
    return clone;
  });
  const navSections = el('div', 'nav-sections', list, el('div', 'nav-menu-tools', ...menuTools));
  nav.append(top, navSections);

  hamburgerButton.addEventListener('click', () => toggleMenu(nav));

  list.querySelectorAll('.nav-trigger').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const open = trigger.getAttribute('aria-expanded') === 'true';
      closeAllPanels(nav, trigger);
      trigger.setAttribute('aria-expanded', open ? 'false' : 'true');
      nav.classList.toggle('nav-panel-open', !!nav.querySelector('.nav-trigger[aria-expanded="true"]'));
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Escape') return;
    const openTrigger = nav.querySelector('.nav-trigger[aria-expanded="true"]');
    if (openTrigger) {
      closeAllPanels(nav);
      openTrigger.focus();
    } else if (!isDesktop.matches && nav.getAttribute('aria-expanded') === 'true') {
      toggleMenu(nav, false);
      hamburgerButton.focus();
    }
  });

  document.addEventListener('click', (e) => {
    if (isDesktop.matches && !nav.contains(e.target)) closeAllPanels(nav);
  });

  // reset state when crossing the desktop/mobile breakpoint
  isDesktop.addEventListener('change', () => {
    closeAllPanels(nav);
    toggleMenu(nav, false);
  });

  const navWrapper = el('div', 'nav-wrapper', nav);
  block.textContent = '';
  block.append(navWrapper);
}

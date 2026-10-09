import {
  loadHeader,
  loadFooter,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  getMetadata,
} from './aem.js';

function initATJS(path, config) {
  window.targetGlobalSettings = config;
  return import(path);
}

function onDecoratedElement(fn) {
  if (document.querySelector('[data-block-status="loaded"],[data-section-status="loaded"]')) {
    fn();
    return;
  }

  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.target.tagName === 'BODY'
      || mutation.target.dataset.sectionStatus === 'loaded'
      || mutation.target.dataset.blockStatus === 'loaded')) {
      observer.disconnect();
      fn();
    }
  });
  observer.observe(document.querySelector('main'), {
    subtree: true,
    attributes: true,
    attributeFilter: ['data-block-status', 'data-section-status'],
  });
  observer.observe(document.querySelector('body'), { childList: true });
}

function toCssSelector(selector) {
  return selector.replace(/(\.\S+)?:eq\((\d+)\)/g, (_, className, index) => {
    const nthChild = `:nth-child(${Number(index) + 1}`;
    return `${nthChild}${className ? ` of ${className}` : ''})`;
  });
}

function getElementForOffer(offer) {
  return document.querySelector(offer.cssSelector || toCssSelector(offer.selector));
}

function getElementForMetric(metric) {
  return document.querySelector(toCssSelector(metric.selector));
}

async function getAndApplyOffers() {
  const response = await window.adobe.target.getOffers({ request: { execute: { pageLoad: {} } } });
  const { options = [], metrics = [] } = response?.execute?.pageLoad || {};
  onDecoratedElement(() => {
    window.adobe.target.applyOffers({ response });
    options.forEach((option) => {
      option.content = option.content.filter((offer) => !getElementForOffer(offer));
    });
    metrics.map((metric, index) => (getElementForMetric(metric) ? index : -1))
      .filter((index) => index >= 0)
      .reverse()
      .forEach((index) => metrics.splice(index, 1));
  });
}

const targetPagePath = '/about/media-releases-and-publications/2015/11';
const isTargetPage = window.location.pathname.replace(/\/$/, '') === targetPagePath;
const targetEnabled = getMetadata('target') || isTargetPage;
let atjsPromise = Promise.resolve();
if (targetEnabled) {
  atjsPromise = initATJS('./at.fix.min.js', {
    clientCode: 'adobeinternalags487',
    serverDomain: 'adobeinternalags487.tt.omtrdc.net',
    imsOrgId: '08FEAA655767BEDB7F000101@AdobeOrg',
    bodyHidingEnabled: false,
    cookieDomain: window.location.hostname,
    pageLoadEnabled: false,
    secureOnly: true,
    viewsEnabled: false,
    withWebGLRenderer: false,
  });
  document.addEventListener('at-library-loaded', getAndApplyOffers, { once: true });
}

/**
 * Moves all the attributes from a given elmenet to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveAttributes(from, to, attributes) {
  if (!attributes) {
    // eslint-disable-next-line no-param-reassign
    attributes = [...from.attributes].map(({ nodeName }) => nodeName);
  }
  attributes.forEach((attr) => {
    const value = from.getAttribute(attr);
    if (value) {
      to?.setAttribute(attr, value);
      from.removeAttribute(attr);
    }
  });
}

/**
 * Move instrumentation attributes from a given element to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveInstrumentation(from, to) {
  moveAttributes(
    from,
    to,
    [...from.attributes]
      .map(({ nodeName }) => nodeName)
      .filter((attr) => attr.startsWith('data-aue-') || attr.startsWith('data-richtext-')),
  );
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks() {
  try {
    // TODO: add auto block, if needed
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates formatted links to style them as buttons.
 * @param {HTMLElement} main The main container element
 */
export function decorateButtons(main) {
  main.querySelectorAll('p a[href]').forEach((a) => {
    a.title = a.title || a.textContent;
    const p = a.closest('p');
    const text = a.textContent.trim();

    // quick structural checks
    if (a.querySelector('img') || p.textContent.trim() !== text) return;

    // skip URL display links
    try {
      if (new URL(a.href).href === new URL(text, window.location).href) return;
    } catch { /* continue */ }

    // require authored formatting for buttonization
    const strong = a.closest('strong');
    const em = a.closest('em');
    if (!strong && !em) return;

    p.className = 'button-wrapper';
    a.className = 'button';
    if (strong && em) { // high-impact call-to-action
      a.classList.add('accent');
      const outer = strong.contains(em) ? strong : em;
      outer.replaceWith(a);
    } else if (strong) {
      a.classList.add('primary');
      strong.replaceWith(a);
    } else {
      a.classList.add('secondary');
      em.replaceWith(a);
    }
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  decorateButtons(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    if (targetEnabled) {
      await atjsPromise;
      await new Promise((resolve) => {
        window.setTimeout(async () => {
          await loadSection(main.querySelector('.section'), waitForFirstImage);
          resolve();
        }, 0);
      });
    } else {
      await loadSection(main.querySelector('.section'), waitForFirstImage);
    }
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  loadHeader(doc.querySelector('header'));

  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();

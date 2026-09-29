/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: vhi.ie site-wide cleanup.
 *
 * Selectors verified in migration-work/cleaned.html (captured DOM of
 * https://www1.vhi.ie/about/media-releases-and-publications/2015/11):
 *   header#header, footer.footer-area, #onetrust-consent-sdk, #ot-sdk-btn,
 *   div > #chatbot-settings (body > div:nth-of-type(2)), .QSIFeedbackButton,
 *   .dismissible-banner, h2.text-shelf__article-title, .text-shelf__content,
 *   .text-shelf__wrapper
 * #servisbot-app is injected at runtime (present in migration-work/visual-trees.json).
 */
const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

// Leading date prefixes in document titles, e.g. "31/08/2015 " or "30/08/2023 - "
const DATE_PREFIX = /^\s*\d{1,2}\/\d{1,2}\/\d{4}\s*(?:[-–—]\s*)?/;

function normText(str) {
  return (str || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

function isBlankNode(node) {
  return node.nodeType === 3 && normText(node.textContent) === '';
}

function hasMedia(el) {
  return !!el.querySelector('img, picture, video, iframe, table, a[href]');
}

function getDoc(element, payload) {
  return (payload && payload.document) || element.ownerDocument || document;
}

function getPageTitle(doc) {
  const og = doc.querySelector('meta[property="og:title"]');
  const titleEl = doc.querySelector('title');
  const candidates = [
    titleEl ? titleEl.textContent : '',
    doc.title || '',
    og ? og.getAttribute('content') : '',
  ];
  for (const c of candidates) {
    const t = normText(normText(c).replace(DATE_PREFIX, ''));
    if (t) return t;
  }
  return '';
}

function fixArticleTitle(element, doc) {
  const h2s = [...element.querySelectorAll('h2.text-shelf__article-title')];
  if (!h2s.length) return;
  h2s.forEach((h2, idx) => {
    let text = normText(h2.textContent);
    if (!text && idx === 0) text = getPageTitle(doc);
    if (text && idx === 0 && !element.querySelector('h1')) {
      const h1 = doc.createElement('h1');
      h1.textContent = text;
      h2.replaceWith(h1);
    } else if (!normText(h2.textContent)) {
      h2.remove();
    }
  });
}

function unwrapWrapperDivs(content) {
  let div = content.querySelector('div');
  while (div) {
    div.replaceWith(...div.childNodes);
    div = content.querySelector('div');
  }
}

function mergeLists(content) {
  content.querySelectorAll('ul, ol').forEach((list) => {
    if (!list.isConnected) return;
    let next = list.nextSibling;
    while (next) {
      if (isBlankNode(next)) {
        const skip = next;
        next = next.nextSibling;
        skip.remove();
        continue;
      }
      if (next.nodeType === 1 && next.tagName === list.tagName) {
        const merge = next;
        next = next.nextSibling;
        while (merge.firstChild) list.appendChild(merge.firstChild);
        merge.remove();
        continue;
      }
      break;
    }
  });
}

function stripEmptyNoise(content) {
  // Whitespace/&nbsp;-only inline formatting (e.g. <b><i>&nbsp;</i></b>)
  content.querySelectorAll('b, strong, i, em, span').forEach((el) => {
    if (el.isConnected && !normText(el.textContent) && !hasMedia(el)) {
      el.replaceWith(' ');
    }
  });
  // Trailing <br> at end of paragraphs / list items
  content.querySelectorAll('p, li').forEach((el) => {
    let last = el.lastChild;
    while (last && (isBlankNode(last) || (last.nodeType === 1 && last.tagName === 'BR'))) {
      const prev = last.previousSibling;
      last.remove();
      last = prev;
    }
  });
  // Empty / &nbsp;-only paragraphs, list items and lists
  content.querySelectorAll('p, li').forEach((el) => {
    if (!normText(el.textContent) && !hasMedia(el)) el.remove();
  });
  content.querySelectorAll('ul, ol').forEach((el) => {
    if (!el.querySelector('li')) el.remove();
  });
}

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Overlays / widgets that sit on top of the page
    WebImporter.DOMUtils.remove(element, [
      '#onetrust-consent-sdk',
      '#ot-sdk-btn',
      '.QSIFeedbackButton',
      '#servisbot-app',
    ]);
    // body > div:nth-of-type(2) - chatbot settings container
    element.querySelectorAll('#chatbot-settings').forEach((el) => {
      const wrapper = el.parentElement;
      if (wrapper && wrapper !== element && wrapper.tagName === 'DIV'
        && wrapper.parentElement && wrapper.parentElement.tagName === 'BODY') {
        wrapper.remove();
      } else {
        el.remove();
      }
    });
    // Empty dismissible banner container
    element.querySelectorAll('.dismissible-banner').forEach((el) => {
      if (!normText(el.textContent) && !hasMedia(el)) el.remove();
    });
  }

  if (hookName === TransformHook.afterTransform) {
    const doc = getDoc(element, payload);

    // Global chrome and non-content elements
    WebImporter.DOMUtils.remove(element, [
      'header#header',
      'footer.footer-area',
      'script',
      'iframe',
      'noscript',
      'link',
      'style',
    ]);

    // Article title: h2 -> h1, or fallback to document title
    fixArticleTitle(element, doc);

    // Strip the date prefix from the title used for page metadata
    const cleanTitle = getPageTitle(doc);
    if (cleanTitle) {
      const titleEl = doc.querySelector('title');
      if (titleEl) titleEl.textContent = cleanTitle;
      const og = doc.querySelector('meta[property="og:title"]');
      if (og) og.setAttribute('content', cleanTitle);
    }

    // Rich-text body normalisation
    element.querySelectorAll('.text-shelf__content').forEach((content) => {
      unwrapWrapperDivs(content);
      stripEmptyNoise(content);
      mergeLists(content);
    });
  }
}

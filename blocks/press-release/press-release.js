import { getMetadata } from '../../scripts/aem.js';

// AEM publish tier serving the content fragment JSON (override with the aem-publish-host metadata)
const DEFAULT_PUBLISH_HOST = 'https://publish-p147324-e2050468.adobeaemcloud.com';
const DAM_ROOT = '/content/dam';

/**
 * Base URL for AEM requests: same origin when running on AEM (author / Universal Editor),
 * otherwise the publish tier.
 */
function aemHost() {
  if (window.location.hostname.endsWith('.adobeaemcloud.com')) return '';
  return (getMetadata('aem-publish-host') || DEFAULT_PUBLISH_HOST).replace(/\/$/, '');
}

/**
 * Reads the fragment path authored in the block (a link or plain text).
 * @param {Element} block
 * @returns {string|null} e.g. /content/dam/vhi-ie/fragments/blue-september-2015
 */
function fragmentPath(block) {
  const link = block.querySelector('a');
  const raw = link ? link.getAttribute('href') : block.textContent;
  if (!raw) return null;
  const path = new URL(raw.trim(), window.location.origin).pathname.replace(/\.[a-z]+$/, '');
  return path.startsWith(DAM_ROOT) ? path : null;
}

async function fetchFragment(path) {
  const url = `${aemHost()}/api/assets${path.slice(DAM_ROOT.length)}.json`;
  const resp = await fetch(url, { credentials: aemHost() ? 'omit' : 'same-origin' });
  if (!resp.ok) throw new Error(`${resp.status} ${url}`);
  const json = await resp.json();
  const elements = json?.properties?.elements || {};
  return Object.fromEntries(Object.entries(elements).map(([name, element]) => [name, element?.value ?? '']));
}

function el(tag, className, ...children) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  children.filter(Boolean).forEach((c) => node.append(c));
  return node;
}

/** Rich text element value (HTML) as a section, or null when empty. */
function richText(html, className) {
  if (!html || !String(html).trim()) return null;
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  tpl.content.querySelectorAll('script, style, iframe').forEach((n) => n.remove());
  return el('div', className, tpl.content);
}

/** Formats the publication date like the source site, e.g. 31-Aug-2015. */
function formatDate(value) {
  if (!value) return '';
  const date = new Date(Number.isFinite(Number(value)) ? Number(value) : value);
  if (Number.isNaN(date.getTime())) return String(value);
  const month = date.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' });
  return `${String(date.getUTCDate()).padStart(2, '0')}-${month}-${date.getUTCFullYear()}`;
}

function buildImage(src, alt) {
  if (!src) return null;
  const img = el('img');
  img.src = src.startsWith('/') ? `${aemHost()}${src}` : src;
  img.alt = alt || '';
  img.loading = 'lazy';
  return el('p', 'press-release-image', el('picture', null, img));
}

function render(data) {
  const notes = richText(data.notesToEditors, 'press-release-notes');
  if (notes) {
    notes.prepend(el('p', null, el('strong', null, 'Notes to editors:')));
  }
  return el(
    'article',
    'press-release-article',
    data.title ? el('h1', null, data.title) : null,
    buildImage(data.image, data.imageAlt),
    richText(data.introduction, 'press-release-intro'),
    richText(data.keyPoints, 'press-release-key-points'),
    richText(data.body, 'press-release-body'),
    notes,
    data.byline ? el('p', 'press-release-byline', data.byline) : null,
    data.publicationDate ? el('p', 'press-release-date', formatDate(data.publicationDate)) : null,
  );
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const path = fragmentPath(block);
  block.textContent = '';
  if (!path) {
    block.append(el('p', 'press-release-message', 'Select a press release content fragment.'));
    return;
  }
  try {
    block.append(render(await fetchFragment(path)));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('press-release: could not load content fragment', e);
    block.append(el('p', 'press-release-message', `Could not load content fragment ${path}.`));
  }
}

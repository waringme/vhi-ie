import { getMetadata } from '../../scripts/aem.js';

// AEM publish tier serving the GraphQL persisted query (override: aem-publish-host metadata)
const DEFAULT_PUBLISH_HOST = 'https://publish-p147324-e2050468.adobeaemcloud.com';
// persisted query {configuration}/{query name}, see tools/cf-package/graphql/
const PERSISTED_QUERY = 'vhi-ie/press-release-by-path';
const DAM_ROOT = '/content/dam';
// how long visitors may see a cached fragment response (ms)
const CACHE_WINDOW = 5 * 60 * 1000;

/** True on AEM author / Universal Editor (pages served from the AEM host). */
function isAuthor() {
  return window.location.hostname.endsWith('.adobeaemcloud.com');
}

/** Base URL for AEM requests: same origin on author, otherwise the publish tier. */
function aemHost() {
  if (isAuthor()) return '';
  return (getMetadata('aem-publish-host') || DEFAULT_PUBLISH_HOST).replace(/\/$/, '');
}

/**
 * Reads the block fields: row 1 the fragment (link or text), row 2 the picked variation.
 * @param {Element} block
 * @returns {{path: string|null, variation: string}}
 */
function readConfig(block) {
  const [fragmentRow, variationRow] = [...block.children];
  const link = fragmentRow?.querySelector('a');
  const raw = (link ? link.getAttribute('href') : fragmentRow?.textContent)?.trim();
  let path = null;
  if (raw) {
    path = new URL(raw, window.location.origin).pathname.replace(/\.[a-z]+$/, '');
    if (!path.startsWith(DAM_ROOT)) path = null;
  }
  const variation = variationRow?.textContent.trim().toLowerCase().replace(/\s+/g, '_') || 'master';
  return { path, variation };
}

/**
 * Loads a press release fragment through the GraphQL persisted query and flattens it to
 * field values (rich text as HTML, image as a URL).
 */
async function fetchFragment(path, variation) {
  const host = aemHost();
  // AEM does not decode %2F in persisted query parameters: keep the slashes of the path
  const params = `;path=${encodeURI(path)};variation=${encodeURIComponent(variation)}`;
  // cache-bust: every request while authoring, otherwise per time window so published changes
  // show within minutes while the CDN can still cache the response
  const ts = isAuthor() ? Date.now() : Math.floor(Date.now() / CACHE_WINDOW) * CACHE_WINDOW;
  const url = `${host}/graphql/execute.json/${PERSISTED_QUERY}${params};ts=${ts}`;
  const resp = await fetch(url, { credentials: host ? 'omit' : 'same-origin' });
  if (!resp.ok) throw new Error(`${resp.status} ${url}`);
  const json = await resp.json().catch(() => {
    throw new Error(`no JSON from ${url}`);
  });
  const item = json?.data?.pressReleaseByPath?.item;
  if (!item) {
    const reason = json?.errors?.[0]?.message || 'content fragment not found';
    throw new Error(`${reason} (${url})`);
  }
  const html = (value) => value?.html ?? '';
  // GraphQL ImageRef system fields
  const { _path: imagePath, _authorUrl: authorUrl, _publishUrl: publishUrl } = item.image || {};
  return {
    title: item.title,
    publicationDate: item.publicationDate,
    byline: item.byline,
    image: (host ? publishUrl : authorUrl) || imagePath,
    imageAlt: item.imageAlt,
    introduction: html(item.introduction),
    keyPoints: html(item.keyPoints),
    body: html(item.body),
    notesToEditors: html(item.notesToEditors),
  };
}

function el(tag, className, ...children) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  children.filter(Boolean).forEach((c) => node.append(c));
  return node;
}

/**
 * Universal Editor instrumentation for a fragment field (author only), so the field can be
 * edited in context.
 */
function instrument(node, prop, type, label) {
  if (node && isAuthor()) {
    node.dataset.aueProp = prop;
    node.dataset.aueType = type;
    node.dataset.aueLabel = label;
  }
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
  return el('p', 'press-release-image', instrument(el('picture', null, img), 'image', 'media', 'Image'));
}

function render(data, path, variation) {
  const notesBody = instrument(richText(data.notesToEditors), 'notesToEditors', 'richtext', 'Notes to Editors');
  const notes = notesBody
    ? el('div', 'press-release-notes', el('p', null, el('strong', null, 'Notes to editors:')), notesBody)
    : null;
  const article = el(
    'article',
    'press-release-article',
    data.title ? instrument(el('h1', null, data.title), 'title', 'text', 'Title') : null,
    buildImage(data.image, data.imageAlt),
    instrument(richText(data.introduction, 'press-release-intro'), 'introduction', 'richtext', 'Introduction'),
    instrument(richText(data.keyPoints, 'press-release-key-points'), 'keyPoints', 'richtext', 'Key Points'),
    instrument(richText(data.body, 'press-release-body'), 'body', 'richtext', 'Body'),
    notes,
    data.byline ? instrument(el('p', 'press-release-byline', data.byline), 'byline', 'text', 'Byline') : null,
    data.publicationDate ? el('p', 'press-release-date', formatDate(data.publicationDate)) : null,
  );
  if (isAuthor()) {
    // the fragment variation as an editable resource in Universal Editor
    article.dataset.aueResource = `urn:aemconnection:${path}/jcr:content/data/${variation}`;
    article.dataset.aueType = 'reference';
    article.dataset.aueFilter = 'cf';
    article.dataset.aueLabel = `Press release (${variation})`;
  }
  return article;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const { path, variation } = readConfig(block);
  block.textContent = '';
  if (!path) {
    block.append(el('p', 'press-release-message', 'Select a press release content fragment.'));
    return;
  }
  try {
    block.append(render(await fetchFragment(path, variation), path, variation));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('press-release: could not load content fragment', e);
    // authors (on AEM / Universal Editor) get the reason; site visitors a short notice
    const detail = isAuthor() ? ` (${e.message})` : '';
    block.append(el('p', 'press-release-message', `Could not load content fragment ${path}${detail}.`));
  }
}

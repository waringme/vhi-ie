/* eslint-disable */
/* global WebImporter */

/**
 * Parser: press-release block.
 * Source: https://www1.vhi.ie/about/media-releases-and-publications/2015/11 (.text-shelf__wrapper)
 *
 * Press releases that have been converted to content fragments are imported as a single
 * Press Release block whose `fragment` field holds the content fragment path; the article
 * copy itself lives in the fragment. Releases without a fragment are left untouched and
 * import as default content.
 */

// source page path -> content fragment path
const FRAGMENTS = {
  '/about/media-releases-and-publications/2015/11': '/content/dam/vhi-ie/fragments/blue-september-2015',
};

export default function parse(element, { document, params }) {
  const path = new URL(params.originalURL).pathname.replace(/\/$/, '').replace(/\.html?$/, '');
  const fragment = FRAGMENTS[path];
  if (!fragment) return;

  const link = document.createElement('a');
  link.href = fragment;
  link.textContent = fragment;

  const cell = document.createDocumentFragment();
  cell.appendChild(document.createComment(' field:fragment '));
  cell.appendChild(link);

  const block = WebImporter.Blocks.createBlock(document, { name: 'Press Release', cells: [[cell]] });
  element.replaceWith(block);
}

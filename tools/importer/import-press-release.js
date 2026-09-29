/* eslint-disable */
/* global WebImporter */

// TRANSFORMER IMPORTS
import vhiCleanupTransformer from './transformers/vhi-cleanup.js';

// PARSER REGISTRY - press-release pages are default content only (no blocks)
const parsers = {};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  "name": "press-release",
  "description": "Single-column text article with article title heading followed by a rich-text body of paragraphs, optionally with bulleted lists and sub-sections; length varies",
  "urls": [
    "https://www1.vhi.ie/about/media-releases-and-publications/2015/1",
    "https://www1.vhi.ie/about/media-releases-and-publications/2015/10",
    "https://www1.vhi.ie/about/media-releases-and-publications/2015/11",
    "https://www1.vhi.ie/about/media-releases-and-publications/2015/12",
    "https://www1.vhi.ie/about/media-releases-and-publications/2015/13",
    "https://www1.vhi.ie/about/media-releases-and-publications/2015/14",
    "https://www1.vhi.ie/about/media-releases-and-publications/2015/15",
    "https://www1.vhi.ie/about/media-releases-and-publications/2015/2",
    "https://www1.vhi.ie/about/media-releases-and-publications/2015/3",
    "https://www1.vhi.ie/about/media-releases-and-publications/2015/4",
    "https://www1.vhi.ie/about/media-releases-and-publications/2015/5",
    "https://www1.vhi.ie/about/media-releases-and-publications/2015/6",
    "https://www1.vhi.ie/about/media-releases-and-publications/2015/7",
    "https://www1.vhi.ie/about/media-releases-and-publications/2015/9",
    "https://www1.vhi.ie/about/media-releases-and-publications/2016/1",
    "https://www1.vhi.ie/about/media-releases-and-publications/2016/10",
    "https://www1.vhi.ie/about/media-releases-and-publications/2016/11",
    "https://www1.vhi.ie/about/media-releases-and-publications/2016/12",
    "https://www1.vhi.ie/about/media-releases-and-publications/2016/13",
    "https://www1.vhi.ie/about/media-releases-and-publications/2016/14",
    "https://www1.vhi.ie/about/media-releases-and-publications/2016/2",
    "https://www1.vhi.ie/about/media-releases-and-publications/2016/3",
    "https://www1.vhi.ie/about/media-releases-and-publications/2016/4",
    "https://www1.vhi.ie/about/media-releases-and-publications/2016/5",
    "https://www1.vhi.ie/about/media-releases-and-publications/2016/6",
    "https://www1.vhi.ie/about/media-releases-and-publications/2016/7",
    "https://www1.vhi.ie/about/media-releases-and-publications/2016/8",
    "https://www1.vhi.ie/about/media-releases-and-publications/2016/9",
    "https://www1.vhi.ie/about/media-releases-and-publications/2017/1",
    "https://www1.vhi.ie/about/media-releases-and-publications/2017/2",
    "https://www1.vhi.ie/about/media-releases-and-publications/2017/3",
    "https://www1.vhi.ie/about/media-releases-and-publications/2017/4",
    "https://www1.vhi.ie/about/media-releases-and-publications/2017/5",
    "https://www1.vhi.ie/about/media-releases-and-publications/2017/6",
    "https://www1.vhi.ie/about/media-releases-and-publications/2017/7",
    "https://www1.vhi.ie/about/media-releases-and-publications/2017/8",
    "https://www1.vhi.ie/about/media-releases-and-publications/2018/1",
    "https://www1.vhi.ie/about/media-releases-and-publications/2018/10",
    "https://www1.vhi.ie/about/media-releases-and-publications/2018/11",
    "https://www1.vhi.ie/about/media-releases-and-publications/2018/12",
    "https://www1.vhi.ie/about/media-releases-and-publications/2018/13",
    "https://www1.vhi.ie/about/media-releases-and-publications/2018/2",
    "https://www1.vhi.ie/about/media-releases-and-publications/2018/3",
    "https://www1.vhi.ie/about/media-releases-and-publications/2018/4",
    "https://www1.vhi.ie/about/media-releases-and-publications/2018/5",
    "https://www1.vhi.ie/about/media-releases-and-publications/2018/6",
    "https://www1.vhi.ie/about/media-releases-and-publications/2018/7",
    "https://www1.vhi.ie/about/media-releases-and-publications/2018/8",
    "https://www1.vhi.ie/about/media-releases-and-publications/2018/9",
    "https://www1.vhi.ie/about/media-releases-and-publications/2019/1",
    "https://www1.vhi.ie/about/media-releases-and-publications/2019/10",
    "https://www1.vhi.ie/about/media-releases-and-publications/2019/2",
    "https://www1.vhi.ie/about/media-releases-and-publications/2019/3",
    "https://www1.vhi.ie/about/media-releases-and-publications/2019/4",
    "https://www1.vhi.ie/about/media-releases-and-publications/2019/5",
    "https://www1.vhi.ie/about/media-releases-and-publications/2019/6",
    "https://www1.vhi.ie/about/media-releases-and-publications/2019/7",
    "https://www1.vhi.ie/about/media-releases-and-publications/2019/8",
    "https://www1.vhi.ie/about/media-releases-and-publications/2019/9",
    "https://www1.vhi.ie/about/media-releases-and-publications/2020/1",
    "https://www1.vhi.ie/about/media-releases-and-publications/2020/10",
    "https://www1.vhi.ie/about/media-releases-and-publications/2020/11",
    "https://www1.vhi.ie/about/media-releases-and-publications/2020/12",
    "https://www1.vhi.ie/about/media-releases-and-publications/2020/13",
    "https://www1.vhi.ie/about/media-releases-and-publications/2020/14",
    "https://www1.vhi.ie/about/media-releases-and-publications/2020/15",
    "https://www1.vhi.ie/about/media-releases-and-publications/2020/2",
    "https://www1.vhi.ie/about/media-releases-and-publications/2020/3",
    "https://www1.vhi.ie/about/media-releases-and-publications/2020/4",
    "https://www1.vhi.ie/about/media-releases-and-publications/2020/5",
    "https://www1.vhi.ie/about/media-releases-and-publications/2020/6",
    "https://www1.vhi.ie/about/media-releases-and-publications/2020/7",
    "https://www1.vhi.ie/about/media-releases-and-publications/2020/8",
    "https://www1.vhi.ie/about/media-releases-and-publications/2020/9",
    "https://www1.vhi.ie/about/media-releases-and-publications/2021/1",
    "https://www1.vhi.ie/about/media-releases-and-publications/2021/10",
    "https://www1.vhi.ie/about/media-releases-and-publications/2021/2",
    "https://www1.vhi.ie/about/media-releases-and-publications/2021/3",
    "https://www1.vhi.ie/about/media-releases-and-publications/2021/4",
    "https://www1.vhi.ie/about/media-releases-and-publications/2021/5",
    "https://www1.vhi.ie/about/media-releases-and-publications/2021/6",
    "https://www1.vhi.ie/about/media-releases-and-publications/2021/7",
    "https://www1.vhi.ie/about/media-releases-and-publications/2021/8",
    "https://www1.vhi.ie/about/media-releases-and-publications/2021/9",
    "https://www1.vhi.ie/about/media-releases-and-publications/2022/1",
    "https://www1.vhi.ie/about/media-releases-and-publications/2022/10",
    "https://www1.vhi.ie/about/media-releases-and-publications/2022/11",
    "https://www1.vhi.ie/about/media-releases-and-publications/2022/2",
    "https://www1.vhi.ie/about/media-releases-and-publications/2022/3",
    "https://www1.vhi.ie/about/media-releases-and-publications/2022/4",
    "https://www1.vhi.ie/about/media-releases-and-publications/2022/5",
    "https://www1.vhi.ie/about/media-releases-and-publications/2022/6",
    "https://www1.vhi.ie/about/media-releases-and-publications/2022/7",
    "https://www1.vhi.ie/about/media-releases-and-publications/2022/8",
    "https://www1.vhi.ie/about/media-releases-and-publications/2022/9",
    "https://www1.vhi.ie/about/media-releases-and-publications/2023/1",
    "https://www1.vhi.ie/about/media-releases-and-publications/2023/10",
    "https://www1.vhi.ie/about/media-releases-and-publications/2023/11",
    "https://www1.vhi.ie/about/media-releases-and-publications/2023/12",
    "https://www1.vhi.ie/about/media-releases-and-publications/2023/13",
    "https://www1.vhi.ie/about/media-releases-and-publications/2023/2",
    "https://www1.vhi.ie/about/media-releases-and-publications/2023/3",
    "https://www1.vhi.ie/about/media-releases-and-publications/2023/4",
    "https://www1.vhi.ie/about/media-releases-and-publications/2023/5",
    "https://www1.vhi.ie/about/media-releases-and-publications/2023/6",
    "https://www1.vhi.ie/about/media-releases-and-publications/2023/7",
    "https://www1.vhi.ie/about/media-releases-and-publications/2023/8",
    "https://www1.vhi.ie/about/media-releases-and-publications/2023/9",
    "https://www1.vhi.ie/about/media-releases-and-publications/2024/1",
    "https://www1.vhi.ie/about/media-releases-and-publications/2024/10",
    "https://www1.vhi.ie/about/media-releases-and-publications/2024/11",
    "https://www1.vhi.ie/about/media-releases-and-publications/2024/12",
    "https://www1.vhi.ie/about/media-releases-and-publications/2024/2",
    "https://www1.vhi.ie/about/media-releases-and-publications/2024/3",
    "https://www1.vhi.ie/about/media-releases-and-publications/2024/4",
    "https://www1.vhi.ie/about/media-releases-and-publications/2024/5",
    "https://www1.vhi.ie/about/media-releases-and-publications/2024/6",
    "https://www1.vhi.ie/about/media-releases-and-publications/2024/7",
    "https://www1.vhi.ie/about/media-releases-and-publications/2024/8",
    "https://www1.vhi.ie/about/media-releases-and-publications/2024/9",
    "https://www1.vhi.ie/error-pages/404",
    "https://www1.vhi.ie/error-pages/500",
    "https://www1.vhi.ie/maintenance",
    "https://www1.vhi.ie/maintenance-pages/maintenance",
    "https://www1.vhi.ie/self-service-password-reset",
    "https://www1.vhi.ie/session-expired",
    "https://www1.vhi.ie/site-maintenance"
  ],
  "blocks": [],
  "sections": [
    {
      "id": "rc2",
      "name": "article",
      "selector": [
        ".text-shelf__wrapper",
        "#components"
      ],
      "style": null,
      "blocks": [],
      "defaultContent": [
        ".text-shelf__wrapper > h2.text-shelf__article-title",
        ".text-shelf__wrapper > div.text-shelf__content"
      ]
    }
  ]
};

// TRANSFORMER REGISTRY
// Section transformer is only needed for templates with 2+ sections; press-release has 1.
const transformers = [
  vhiCleanupTransformer,
];

/**
 * Execute all page transformers for a specific hook
 * @param {string} hookName - The hook name ('beforeTransform' or 'afterTransform')
 * @param {Element} element - The DOM element to transform
 * @param {Object} payload - The payload containing { document, url, html, params }
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = {
    ...payload,
    template: PAGE_TEMPLATE,
  };

  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration
 * @param {Document} document - The DOM document
 * @param {Object} template - The embedded PAGE_TEMPLATE object
 * @returns {Array} Array of block instances found on the page
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];

  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          section: blockDef.section || null,
        });
      });
    });
  });

  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;

    const main = document.body;

    // 1. Initial cleanup (overlays, cookie banner, widgets)
    executeTransformers('beforeTransform', main, payload);

    // 2-3. Find and parse blocks (none expected for this template)
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. Final cleanup (chrome removal, title h1, list merging, noise)
    executeTransformers('afterTransform', main, payload);

    // 5. WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Sanitized document path (root maps to /index)
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};

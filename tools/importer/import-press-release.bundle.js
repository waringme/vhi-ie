/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-press-release.js
  var import_press_release_exports = {};
  __export(import_press_release_exports, {
    default: () => import_press_release_default
  });

  // tools/importer/transformers/vhi-cleanup.js
  var TransformHook = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  var DATE_PREFIX = /^\s*\d{1,2}\/\d{1,2}\/\d{4}\s*(?:[-–—]\s*)?/;
  function normText(str) {
    return (str || "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
  }
  function isBlankNode(node) {
    return node.nodeType === 3 && normText(node.textContent) === "";
  }
  function hasMedia(el) {
    return !!el.querySelector("img, picture, video, iframe, table, a[href]");
  }
  function getDoc(element, payload) {
    return payload && payload.document || element.ownerDocument || document;
  }
  function getPageTitle(doc) {
    const og = doc.querySelector('meta[property="og:title"]');
    const titleEl = doc.querySelector("title");
    const candidates = [
      titleEl ? titleEl.textContent : "",
      doc.title || "",
      og ? og.getAttribute("content") : ""
    ];
    for (const c of candidates) {
      const t = normText(normText(c).replace(DATE_PREFIX, ""));
      if (t) return t;
    }
    return "";
  }
  function fixArticleTitle(element, doc) {
    const h2s = [...element.querySelectorAll("h2.text-shelf__article-title")];
    if (!h2s.length) return;
    h2s.forEach((h2, idx) => {
      let text = normText(h2.textContent);
      if (!text && idx === 0) text = getPageTitle(doc);
      if (text && idx === 0 && !element.querySelector("h1")) {
        const h1 = doc.createElement("h1");
        h1.textContent = text;
        h2.replaceWith(h1);
      } else if (!normText(h2.textContent)) {
        h2.remove();
      }
    });
  }
  function unwrapWrapperDivs(content) {
    let div = content.querySelector("div");
    while (div) {
      div.replaceWith(...div.childNodes);
      div = content.querySelector("div");
    }
  }
  function mergeLists(content) {
    content.querySelectorAll("ul, ol").forEach((list) => {
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
    content.querySelectorAll("b, strong, i, em, span").forEach((el) => {
      if (el.isConnected && !normText(el.textContent) && !hasMedia(el)) {
        el.replaceWith(" ");
      }
    });
    content.querySelectorAll("p, li").forEach((el) => {
      let last = el.lastChild;
      while (last && (isBlankNode(last) || last.nodeType === 1 && last.tagName === "BR")) {
        const prev = last.previousSibling;
        last.remove();
        last = prev;
      }
    });
    content.querySelectorAll("p, li").forEach((el) => {
      if (!normText(el.textContent) && !hasMedia(el)) el.remove();
    });
    content.querySelectorAll("ul, ol").forEach((el) => {
      if (!el.querySelector("li")) el.remove();
    });
  }
  function transform(hookName, element, payload) {
    if (hookName === TransformHook.beforeTransform) {
      WebImporter.DOMUtils.remove(element, [
        "#onetrust-consent-sdk",
        "#ot-sdk-btn",
        ".QSIFeedbackButton",
        "#servisbot-app"
      ]);
      element.querySelectorAll("#chatbot-settings").forEach((el) => {
        const wrapper = el.parentElement;
        if (wrapper && wrapper !== element && wrapper.tagName === "DIV" && wrapper.parentElement && wrapper.parentElement.tagName === "BODY") {
          wrapper.remove();
        } else {
          el.remove();
        }
      });
      element.querySelectorAll(".dismissible-banner").forEach((el) => {
        if (!normText(el.textContent) && !hasMedia(el)) el.remove();
      });
    }
    if (hookName === TransformHook.afterTransform) {
      const doc = getDoc(element, payload);
      WebImporter.DOMUtils.remove(element, [
        "header#header",
        "footer.footer-area",
        "script",
        "iframe",
        "noscript",
        "link",
        "style"
      ]);
      fixArticleTitle(element, doc);
      const cleanTitle = getPageTitle(doc);
      if (cleanTitle) {
        const titleEl = doc.querySelector("title");
        if (titleEl) titleEl.textContent = cleanTitle;
        const og = doc.querySelector('meta[property="og:title"]');
        if (og) og.setAttribute("content", cleanTitle);
      }
      element.querySelectorAll(".text-shelf__content").forEach((content) => {
        unwrapWrapperDivs(content);
        stripEmptyNoise(content);
        mergeLists(content);
      });
    }
  }

  // tools/importer/import-press-release.js
  var parsers = {};
  var PAGE_TEMPLATE = {
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
  var transformers = [
    transform
  ];
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), {
      template: PAGE_TEMPLATE
    });
    transformers.forEach((transformerFn) => {
      try {
        transformerFn.call(null, hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
  function findBlocksOnPage(document2, template) {
    const pageBlocks = [];
    template.blocks.forEach((blockDef) => {
      blockDef.instances.forEach((selector) => {
        const elements = document2.querySelectorAll(selector);
        if (elements.length === 0) {
          console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
        }
        elements.forEach((element) => {
          pageBlocks.push({
            name: blockDef.name,
            selector,
            element,
            section: blockDef.section || null
          });
        });
      });
    });
    console.log(`Found ${pageBlocks.length} block instances on page`);
    return pageBlocks;
  }
  var import_press_release_default = {
    transform: (payload) => {
      const { document: document2, url, params } = payload;
      const main = document2.body;
      executeTransformers("beforeTransform", main, payload);
      const pageBlocks = findBlocksOnPage(document2, PAGE_TEMPLATE);
      pageBlocks.forEach((block) => {
        if (!block.element.parentNode) return;
        const parser = parsers[block.name];
        if (parser) {
          try {
            parser(block.element, { document: document2, url, params });
          } catch (e) {
            console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
          }
        } else {
          console.warn(`No parser found for block: ${block.name}`);
        }
      });
      executeTransformers("afterTransform", main, payload);
      const hr = document2.createElement("hr");
      main.appendChild(hr);
      WebImporter.rules.createMetadata(main, document2);
      WebImporter.rules.transformBackgroundImages(main, document2);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, "");
      const path = WebImporter.FileUtils.sanitizePath(rawPath === "" ? "/index" : rawPath);
      return [{
        element: main,
        path,
        report: {
          title: document2.title,
          template: PAGE_TEMPLATE.name,
          blocks: pageBlocks.map((b) => b.name)
        }
      }];
    }
  };
  return __toCommonJS(import_press_release_exports);
})();

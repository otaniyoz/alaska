import { commonRules, formatString } from "./core.js";

function init() {
  const nodes = document.getElementsByClassName("alaska");

  for (const node of nodes) {
    const lang = node.lang !== "" ? node.lang : document.documentElement.getAttribute("lang");
    const rules = getRules(node, lang);
    if (skipNode(node, rules)) continue;
    formatNode(node, rules, lang);
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        const el = node.nodeType === 1 ? node : node.nodeType === 3 ? node.parentElement : null;
        if (!el) return;
        const alaskaRoot = el.closest(".alaska");
        if (!alaskaRoot) return;

        let lang, rules;
        if (alaskaRoot === el) {
          lang = el.lang !== "" ? el.lang : document.documentElement.getAttribute("lang");
          rules = getRules(el, lang);
        } else {
          const ctx = getInheritedContext(el);
          lang = ctx.lang;
          rules = getRules(el, ctx.lang, ctx.rules);
        }

        formatNode(node, rules, lang);
      });
    });
  });

  const observeTargets = document.getElementsByClassName("alaska-observe");
  for (const observeTarget of observeTargets) {
    observer.observe(observeTarget, { subtree: true, childList: true });
  }
}

function formatNode(node, inheritedRules, inheritedLang) {
  if (skipNode(node, inheritedRules)) return;

  const stack = [{ node, inheritedRules, inheritedLang }];
  while (stack.length > 0) {
    const { node, inheritedRules, inheritedLang } = stack.pop();
    if (node.hasChildNodes()) {
      const lang = node.lang !== "" ? node.lang : inheritedLang;
      const children = node.childNodes;
      for (let j = children.length - 1; j >= 0; j--) {
        const childNode = children[j];
        const ownRules = getRules(childNode, lang, inheritedRules);
        if (!skipNode(childNode, ownRules)) stack.push({ node: childNode, inheritedRules: ownRules, inheritedLang: lang });
      }
    } else {
      node.textContent = formatString(node.textContent, inheritedRules, inheritedLang);
    }
  }
}

function getInheritedContext(el) {
  const root = el.closest(".alaska");
  const rootLang = root.lang !== "" ? root.lang : document.documentElement.getAttribute("lang");
  const rootRules = getRules(root, rootLang);

  const path = [];
  let cur = el.parentElement;
  while (cur && cur !== root) {
    path.unshift(cur);
    cur = cur.parentElement;
  }

  let lang = rootLang;
  let rules = rootRules;
  for (const ancestor of path) {
    lang = ancestor.lang !== "" ? ancestor.lang : lang;
    rules = getRules(ancestor, lang, rules);
  }

  return { lang, rules };
}

function skipNode(node, rules) {
  rules = rules || {};
  const commentNodeOrWhitespace = node.nodeType === 8 || (node.nodeType === 3 && !/[^\t\n\r ]/.test(node.textContent));
  const alaskaSkip = node.classList !== undefined && node.classList.contains("alaska-skip");
  const semanticSkip = ["CODE", "PRE", "SAMP", "KBD"].includes(node.nodeName);
  return !node.textContent.length || commentNodeOrWhitespace || alaskaSkip || semanticSkip;
}

function getRules(node, _lang, rules) {
  const dataset = node.dataset;
  if (rules && !node.lang) {
    if (dataset === undefined) return rules;
    if (!Object.keys(dataset).length) return rules;
  }

  const datasetRules = {};
  if (dataset) {
    const validRuleKeys = new Set(Object.keys(commonRules));
    for (const key of Object.keys(dataset)) {
      if (!validRuleKeys.has(key)) continue;
      const val = dataset[key];
      if (val === "true") datasetRules[key] = true;
      else if (val === "false") datasetRules[key] = false;
      else datasetRules[key] = val;
    }
  }
  return { ...commonRules, ...(rules || {}), ...datasetRules };
}

if (typeof document !== "undefined") {
  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
}

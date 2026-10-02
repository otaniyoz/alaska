import { commonRules, formatString, mathRules } from "./core.js";

const SKIP_SELECTOR = "code, pre, samp, kbd, script, style, .alaska-skip";

function init() {
  const nodes = document.getElementsByClassName("alaska");

  for (const node of nodes) {
    if (node.parentElement?.closest(".alaska")) continue;
    if (node.closest(SKIP_SELECTOR)) continue;
    const lang = resolveLang(node);
    const rules = getRules(node, lang);
    if (skipNode(node, rules)) continue;
    formatNode(node, rules, lang);
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        const el = node.nodeType === 1 ? node : node.nodeType === 3 ? node.parentElement : null;
        if (!el) return;
        const root = outermostRoot(el);
        if (!root || el.closest(SKIP_SELECTOR)) return;

        const { lang, rules } = getContext(el, root);

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
      const lang = node.getAttribute("lang") || inheritedLang;
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

function resolveLang(el) {
  return el.closest("[lang]:not([lang=''])")?.getAttribute("lang");
}

function outermostRoot(el) {
  let root = el.closest(".alaska");
  while (root) {
    const outer = root.parentElement?.closest(".alaska");
    if (!outer) return root;
    root = outer;
  }
  return null;
}

function getContext(el, root) {
  const path = [];
  for (let cur = el; cur && cur !== root; cur = cur.parentElement) path.unshift(cur);

  const lang = resolveLang(el);
  let rules = getRules(root, lang);
  for (const node of path) rules = getRules(node, lang, rules);

  return { lang, rules };
}

function skipNode(node, rules) {
  rules = rules || {};
  const commentNodeOrWhitespace = node.nodeType === 8 || (node.nodeType === 3 && !/[^\t\n\r ]/.test(node.textContent));
  const alaskaSkip = node.classList !== undefined && node.classList.contains("alaska-skip");
  const semanticSkip = ["CODE", "PRE", "SAMP", "KBD", "SCRIPT", "STYLE"].includes(node.nodeName);
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
  let mathOverlay = {};
  if (dataset?.math === "true") mathOverlay = mathRules;
  else if (dataset?.math === "false") mathOverlay = Object.fromEntries(Object.keys(mathRules).map((k) => [k, commonRules[k]]));
  return { ...commonRules, ...(rules || {}), ...mathOverlay, ...datasetRules };
}

if (typeof document !== "undefined") {
  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
}

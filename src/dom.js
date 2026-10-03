import { blockTags, commonRules, formatString, mathRules, resetCarry } from "./core.js";

const SKIP_SELECTOR = "code, pre, samp, kbd, script, style, .alaska-skip";
const SKIP_TAGS = new Set(["code", "pre", "samp", "kbd"]);

function init() {
  const nodes = document.getElementsByClassName("alaska");

  for (const node of nodes) {
    if (node.parentElement?.closest(".alaska")) continue;
    if (node.closest(SKIP_SELECTOR)) continue;
    const lang = resolveLang(node);
    formatNode(node, getRules(node, lang), lang, {});
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      const carry = {};
      const atBlockStart = isBlock(mutation.target) && mutation.previousSibling === null;
      if (!atBlockStart) formatString("x", commonRules, undefined, carry);
      mutation.addedNodes.forEach((node) => {
        const el = node.nodeType === 1 ? node : node.nodeType === 3 ? node.parentElement : null;
        if (!el) return;
        const root = outermostRoot(el);
        if (!root || el.closest(SKIP_SELECTOR)) return;

        const { lang, rules } = getContext(el, root);

        formatNode(node, atBlockStart || isBlock(node) ? rules : { ...rules, placeTypographicQuotes: false }, lang, carry);
      });
    });
  });

  const observeTargets = document.getElementsByClassName("alaska-observe");
  for (const observeTarget of observeTargets) {
    observer.observe(observeTarget, { subtree: true, childList: true });
  }
}

function formatNode(node, inheritedRules, inheritedLang, carry) {
  const stack = [{ node, inheritedRules, inheritedLang }];
  while (stack.length > 0) {
    const { node, inheritedRules, inheritedLang, reset } = stack.pop();
    if (reset) {
      resetCarry(carry);
    } else if (node.nodeType === 3) {
      const text = node.textContent;
      const formatted = formatString(text, inheritedRules, inheritedLang, carry);
      if (formatted !== text) node.textContent = formatted;
    } else if (node.nodeType === 1) {
      const name = node.nodeName.toLowerCase();
      if (name === "script" || name === "style") continue;
      const block = blockTags.has(name);
      if (block) resetCarry(carry);
      if (SKIP_TAGS.has(name) || node.classList.contains("alaska-skip")) {
        if (!block) formatString("x", inheritedRules, inheritedLang, carry);
      } else if (name === "br") {
        formatString("\n", inheritedRules, inheritedLang, carry);
      } else if (node.hasChildNodes()) {
        if (block) stack.push({ reset: true });
        const lang = node.getAttribute("lang") || inheritedLang;
        const children = node.childNodes;
        for (let j = children.length - 1; j >= 0; j--) {
          const childNode = children[j];
          stack.push({ node: childNode, inheritedRules: getRules(childNode, lang, inheritedRules), inheritedLang: lang });
        }
      }
    }
  }
}

function isBlock(node) {
  return blockTags.has(node.nodeName.toLowerCase());
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

"use strict";

{
const MAX_INPUT_LENGTH = 2_000_000;

const commonRules = Object.fromEntries("placeNumberNbspWord placeThreeStops placeFractions placeArithmeticalSymbols placeMinusSign placeEmdash placeNumericRange placeCopyright placeNumeroSign placeMathematicalSymbols placeTypographyOrnamentation placeEmoticons placeCurrencySign placePercentSign placeNbsp placeHyphen placeTemperatureSign placeOrdinals placeMultiplicationSign formatInitials placeTypographicQuotes placeArrows".split(" ").map((k) => [k, k !== "placeArithmeticalSymbols"]));
const mathRules = { placeArithmeticalSymbols: true, placeEmdash: false, placeNumericRange: false, placeHyphen: false };

const ordinalMap = { st: "ˢᵗ", nd: "ⁿᵈ", rd: "ʳᵈ", th: "ᵗʰ" };
const shortWords = {
  en: new Set("a an at by for in of on or the to and but nor yet so as if".split(" ")),
  ru: new Set("а в во и к не на о об от по с со у из за до для или но же то бы ли".split(" ")),
};
const supportedLangs = new Set(["en", "ru"]);
const normalizeLang = (lang) => {
  const code = typeof lang === "string" ? lang.split("-", 1)[0].toLowerCase() : "";
  return supportedLangs.has(code) ? code : undefined;
};
const arithmeticOps = { "-": "−", "*": "⋅", "/": "∕", "+": "+", "=": "=" };
const currencyWordMap = { usd: "$", eur: "€", gbp: "£", jpy: "¥", cny: "CN¥", rub: "₽", kzt: "₸" };
const mathShortcodes = { "\\pm": "±", "\\prime": "′", "\\dprime": "″", "\\tprime": "‴", "\\qprime": "⁗", "\\infty": "∞", "\\leq": "⩽", "\\geq": "⩾", "\\neq": "≠", "\\approx": "≈", "\\sqrt": "√", "\\prod": "∏", "\\sum": "∑", "\\int": "∫", "\\partial": "∂", "\\therefore": "∴", "\\because": "∵", "\\forall": "∀", "\\exists": "∃", "\\in": "∈", "\\notin": "∉", "\\emptyset": "∅", "\\cup": "∪", "\\cap": "∩", "\\angle": "∠", "\\perp": "⊥", "\\parallel": "∥", "\\pi": "π", "\\epsilon": "ε", "\\alpha": "α", "\\beta": "β", "\\gamma": "γ", "\\delta": "δ", "\\theta": "θ", "\\lambda": "λ", "\\mu": "μ", "\\sigma": "σ", "\\phi": "φ", "\\omega": "ω", "\\deg": "°" };
const ornamentShortcodes = { "\\dinkus": "∗\u2060∗\u2060∗", "\\asterism": "⁂", "\\dagger": "†", "\\ddagger": "‡", "\\section": "§", "\\bullet": "•", "\\tainome": "◉", "\\dia": "⌀" };
const emoticonShortcodes = { "\\shrug": "¯\u2060\\\u2060\_\u2060(\u2060ツ\u2060)\u2060_\u2060/\u2060¯", "\\crying": "(\u2060⊤\u2060_\u2060⊤\u2060)", "\\dying": "(\u2060×\u2060_\u2060×\u2060)", "\\nervous": "(\u2060-\u2060_\u2060-\u2060;\u2060)", "\\cute": "(\u2060^\u2060.\u2060^\u2060)", "\\happy": "(\u2060^\u2060_\u2060_\u2060_\u2060_\u2060_\u2060_\u2060_\u2060_\u2060_\u2060^\u2060)", "\\surprised": "(\u2060\u00A0\u2060ⵔ\u2060.\u2060ⵔ\u2060\u00A0\u2060)", "\\angry": "(\u2060>\u2060_\u2060<\u2060)" };
const arrowShortcodes = { "\\arrn": "↑", "\\arrs": "↓", "\\arrne": "↗", "\\arrse": "↘", "\\arrsw": "↙", "\\arrnw": "↖" };

const isWhitespace = (char) => /[\s\u00A0\t]/.test(char);
const isDash = (tokens, i, rules) => tokens[i]?.type === "punct" && /^(-|--|\u2013|\u2014)$/.test(tokens[i].value) && !(rules.placeArrows && tokens[i].value === "-" && tokens[i + 1]?.type === "sym" && tokens[i + 1].value === ">");

function nextOf(tokens, i) {
  for (let j = i + 1; j < tokens.length; j++) {
    if (tokens[j].type !== "ws") return { token: tokens[j], index: j };
  }
  return null;
}

function prevOf(tokens, i) {
  for (let j = i - 1; j >= 0; j--) {
    if (tokens[j].type !== "ws") return { token: tokens[j], index: j };
  }
  return null;
}

function replaceRange(tokens, from, to, value) {
  tokens.splice(from, to - from + 1, { type: "other", value });
}

function replaceTokens(tokens, from, to, value) {
  tokens.splice(from, to - from + 1, ...tokenize(value));
}

function applyArithmeticOp(tokens, before, opMap) {
  const ws1 = tokens[before + 1];
  const op = tokens[before + 2];
  const ws2 = tokens[before + 3];
  const rhs = tokens[before + 4];

  const valid = ws1?.type === "ws" && op && (op.type === "punct" || op.type === "sym") && ws2?.type === "ws" && (rhs?.type === "num" || rhs?.type === "word" || rhs?.value === "(");
  if (!valid) return false;

  const replacement = opMap[op.value];
  if (!replacement) return false;

  ws1.value = "\u200A";
  if (replacement !== op.value) op.type = "other";
  op.value = replacement;
  ws2.value = "\u200A";
  return true;
}

function tokenize(text) {
  let pos = 0;
  const tokens = [];

  while (pos < text.length) {
    const start = pos;
    const char = text[pos];

    if (isWhitespace(char)) {
      let value = "";
      while (pos < text.length && isWhitespace(text[pos])) {
        value += text[pos++];
      }
      tokens.push({ type: "ws", value, start, end: pos });
    } else if (/[0-9]/.test(char)) {
      let value = "";
      while (pos < text.length && /[0-9.,]/.test(text[pos])) {
        value += text[pos++];
      }
      tokens.push({ type: "num", value, start, end: pos });
    } else if (/[$€¥£₽₸]/.test(char)) {
      tokens.push({ type: "curr", value: char, start, end: pos + 1 });
      pos++;
    } else if (char === "\\" && /[a-z]/.test(text[pos + 1])) {
      let value = "\\";
      pos++;
      while (pos < text.length && /[a-z]/.test(text[pos])) {
        value += text[pos++];
      }
      tokens.push({ type: "short", value, start, end: pos });
    } else if (/[.,!?:;'"\-–—()…\/]/.test(char)) {
      let value = char;
      if (char === "-" && text[pos + 1] === "-") {
        value = "--";
        pos += 2;
      } else if (char === "." && text[pos + 1] === "." && text[pos + 2] === ".") {
        value = "...";
        pos += 3;
      } else {
        pos++;
      }
      tokens.push({ type: "punct", value, start, end: pos });
    } else if (/[%#@&*+=<>~№©℗™®]/.test(char)) {
      tokens.push({ type: "sym", value: char, start, end: pos + 1 });
      pos++;
    } else if (/[\p{L}]/u.test(char)) {
      let value = "";
      while (pos < text.length && /[\p{L}]/u.test(text[pos])) {
        value += text[pos++];
      }
      tokens.push({ type: "word", value, start, end: pos });
    } else {
      tokens.push({ type: "other", value: char, start, end: pos + 1 });
      pos++;
    }
  }

  return tokens;
}

function formatString(text, rules, lang) {
  if (text.length > MAX_INPUT_LENGTH) return text;

  lang = normalizeLang(lang);
  const quotes = rules.placeTypographicQuotes && lang !== undefined;
  const tokens = tokenize(text);
  const stack = [];
  if (rules.placeCurrencySign) {
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type === "word") {
        const sym = currencyWordMap[tokens[i].value.toLowerCase()];
        if (sym) tokens[i] = { ...tokens[i], type: "curr", value: sym };
      }
    }
  }
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== "short") continue;
    const key = tokens[i].value.toLowerCase();
    const replacement = (rules.placeMathematicalSymbols && mathShortcodes[key]) || (rules.placeTypographyOrnamentation && ornamentShortcodes[key]) || (rules.placeEmoticons && emoticonShortcodes[key]) || (rules.placeArrows && arrowShortcodes[key]);
    if (!replacement) continue;
    const expanded = tokenize(replacement);
    tokens.splice(i, 1, ...expanded);
    i += expanded.length - 1;
  }
  for (let i = 0; quotes && i < tokens.length; i++) {
    const t = tokens[i];
    const prev = tokens[i - 1];
    const next = tokens[i + 1];

    if (t.type === "punct" && t.value === "'") {
      const prevIsLetter = prev?.type === "word";
      const nextIsLetter = next?.type === "word";
      const isApostrophe = prevIsLetter && nextIsLetter;

      if (isApostrophe) {
        t.quoteInfo = { isApostrophe: true };
        continue;
      }
    }

    if (t.type === "punct" && (t.value === '"' || t.value === "'")) {
      const prevIsOpening = prev && prev?.quoteInfo?.isOpening;
      const top = stack.length > 0 ? stack[stack.length - 1] : null;
      const sameCharOnStack = top?.char === t.value;
      const openContext = !prev || prev.type === "ws" || prevIsOpening || (prev.type === "punct" && /[,;:(\[]/.test(prev.value));
      const reopensNested = sameCharOnStack && prev?.type === "ws" && next?.type === "word";
      const isOpening = openContext && (!sameCharOnStack || reopensNested);

      if (isOpening) {
        const depth = stack.length;
        stack.push({ depth, char: t.value });
        t.quoteInfo = { isOpening: true, depth };
      } else {
        const opened = stack.pop();
        const depth = opened ? opened.depth : 0;
        t.quoteInfo = { isOpening: false, depth };
      }
    }
  }

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const prev = tokens[i - 1];
    const next = tokens[i + 1];
    const next2 = tokens[i + 2];
    const next3 = tokens[i + 3];

    if (t.type === "punct") {
      if (rules.placeArrows && t.value === "-" && next?.type === "sym" && next.value === ">") {
        replaceRange(tokens, i, i + 1, "\u2192");
      } else if (rules.placeNumericRange && t.value === "-" && prev?.type === "num" && (next?.type === "num" || !next || next.type === "ws")) {
        t.value = "\u2060\u2013\u2060";
      } else if (rules.placeMinusSign && t.value === "-" && (!prev || prev.type === "ws" || prev.value === "(" || prev.value === "[") && (next?.type === "num" || next?.type === "curr" || (rules.placeArithmeticalSymbols && next?.value === "("))) {
        t.value = "\u2212";
        t.type = "other";
      } else if (rules.placeThreeStops && (t.value === "..." || t.value === "…")) {
        t.value = "\u2060.\u2060.\u2060.\u2060";
      } else if (rules.placeEmdash && t.value === "--" && !isDash(tokens, i - 1, rules) && !isDash(tokens, i + 1, rules)) {
        const from = prev?.type === "ws" ? i - 1 : i;
        replaceTokens(tokens, from, next?.type === "ws" ? i + 1 : i, "\u00A0\u2014\u0020");
        i = from + 2;
      } else if (rules.placeEmdash && t.value === "-" && (!prev || (prev.type === "ws" && prev.value.includes("\n"))) && next?.type === "ws") {
        if (prev?.type === "ws") prev.value = prev.value.slice(0, prev.value.lastIndexOf("\n") + 1);
        t.value = "\u2014";
        next.value = "\u0020";
      } else if (rules.placeEmdash && t.value === "-" && prev?.type === "ws" && next?.type === "ws" && prevOf(tokens, i)?.token.type === "word" && ["word", "num", "curr"].includes(nextOf(tokens, i)?.token.type)) {
        prev.value = "\u00A0";
        t.value = "\u2014";
        next.value = "\u0020";
      } else if (rules.placeHyphen && t.value === "-" && prev?.type === "word" && next?.type === "word") {
        t.value = "\u2060-\u2060";
      } else if (quotes && (t.value === '"' || t.value === "'")) {
        const info = t.quoteInfo;
        if (!info) continue;
        if (info.isApostrophe) {
          t.value = "\u2019";
        } else {
          const depth = info.depth;
          if (info.isOpening) {
            if (depth % 2 === 0) t.value = lang === "en" ? "\u2018\u2060" : "\u00AB\u2060";
            else t.value = lang === "en" ? "\u201C\u2060" : "\u201E\u2060";
          } else {
            if (depth % 2 === 0) t.value = lang === "en" ? "\u2060\u2019" : "\u2060\u00BB";
            else t.value = lang === "en" ? "\u2060\u201D" : "\u2060\u201C";
          }
        }
      } else if (t.value === ")" && rules.placeArithmeticalSymbols) {
        applyArithmeticOp(tokens, i, arithmeticOps);
      } else if (rules.placeCopyright && t.value === "(") {
        if (next?.type === "word" && next2?.type === "punct" && next2.value === ")") {
          const pattern = "(" + next.value.toLowerCase() + ")";
          const map = { "(c)": "©", "(p)": "℗", "(tm)": "™", "(r)": "®" };
          const replacement = map[pattern];
          if (replacement) replaceRange(tokens, i, i + 2, replacement);
        }
      }
    } else if (t.type === "num") {
      if (rules.placeNumberNbspWord && next?.type === "ws" && next2?.type === "word") next.value = "\u00A0";

      if (rules.placeOrdinals && next?.type === "word" && /^(st|nd|rd|th)$/i.test(next.value)) {
        replaceTokens(tokens, i, i + 1, t.value + ordinalMap[next.value.toLowerCase()]);
        continue;
      }

      if (rules.placeFractions && next?.type === "punct" && next.value === "/" && next2?.type === "num" && prev?.value !== "/" && next3?.value !== "/") {
        if (next3?.type === "ws") next3.value = "\u00A0";
        replaceTokens(tokens, i, i + 2, t.value + "\u2044" + next2.value);
        i++;
        continue;
      }

      if (rules.placeArithmeticalSymbols) applyArithmeticOp(tokens, i, arithmeticOps);

      if (rules.placeMultiplicationSign) {
        const xTok = nextOf(tokens, i);
        if (xTok?.token.type === "word" && xTok.token.value.toLowerCase() === "x") {
          const numTok = nextOf(tokens, xTok.index);
          if (numTok?.token.type === "num") {
            for (let j = i + 1; j < xTok.index; j++) {
              tokens[j].value = "\u200A";
            }
            xTok.token.value = "×";
            xTok.token.type = "other";
            for (let j = xTok.index + 1; j < numTok.index; j++) {
              tokens[j].value = "\u200A";
            }
          }
        }
      }
    } else if (t.type === "curr" && rules.placeCurrencySign) {
      const n = nextOf(tokens, i);
      const p = prevOf(tokens, i);
      if (n?.token.type === "num") {
        replaceRange(tokens, i, n.index, t.value + "\u202F" + n.token.value);
      } else if (p?.token.type === "num") {
        replaceRange(tokens, p.index, i, t.value + "\u202F" + p.token.value);
        i = p.index;
      }
    } else if (t.type === "word") {
      if (rules.placeArithmeticalSymbols) applyArithmeticOp(tokens, i, arithmeticOps);

      if (rules.placeTemperatureSign && (t.value === "oC" || t.value === "oF") && prev?.type === "num") {
        replaceTokens(tokens, i - 1, i, prev.value + "\u202F\u00B0" + t.value[1]);
        i++;
      } else if (rules.placeNumeroSign && /^no$/i.test(t.value)) {
        if (next?.type === "punct" && next.value === ".") {
          if (next2?.type === "num") replaceRange(tokens, i, i + 1, "№\u202F\u2060");
          else if (next2?.type === "ws" && next3?.type === "num") replaceRange(tokens, i, i + 2, "№\u202F");
        }
      } else if (rules.placeNbsp && shortWords[lang]?.has(t.value.toLowerCase())) {
        if (next?.type === "ws") next.value = "\u00A0";
        else if (next?.type === "punct" && next.value === "," && next2?.type === "ws") next2.value = "\u00A0";
      } else if (rules.formatInitials && t.value.length <= 3 && /^[A-ZА-Я]/u.test(t.value) && next?.type === "punct" && next.value === ".") {
        const afterDot = nextOf(tokens, i + 1);
        const nextIsInitial = afterDot?.token.type === "word" && afterDot.token.value.length === 1 && /^[A-ZА-Я]/u.test(afterDot.token.value) && tokens[afterDot.index + 1]?.type === "punct" && tokens[afterDot.index + 1]?.value === ".";

        if (nextIsInitial) {
          next.value = ".\u202F";
          for (let j = i + 2; j < afterDot.index; j++) {
            tokens[j].value = "";
          }
        } else if (tokens[i + 2]?.type === "ws" && afterDot?.token.type === "word") {
          next.value = ".";
          for (let j = i + 2; j < afterDot.index; j++) {
            tokens[j].value = "\u00A0";
          }
        }
      }
    } else if (t.type === "sym") {
      if (rules.placeArrows && t.value === "<" && next?.type === "punct" && next.value === "-") {
        replaceRange(tokens, i, i + 1, "\u2190");
      } else if (rules.placePercentSign && t.value === "%") {
        if (prev?.type === "num") {
          let j = i + 1;
          while (tokens[j]?.type === "punct" && /^[.,]$/.test(tokens[j].value)) j++;
          if (tokens[j]?.type === "sym" && tokens[j].value === "%") continue;
          if (tokens[j]?.type === "num") {
            tokens[j].type = "other";
            continue;
          }
          replaceTokens(tokens, i - 1, i, "%\u202F" + prev.value);
          while (tokens[i + 2]?.type === "punct" && /^[.,]$/.test(tokens[i + 2].value)) tokens[i + 1].value += tokens.splice(i + 2, 1)[0].value;
        } else if (next?.type === "num") {
          replaceTokens(tokens, i, i, "%\u202F");
        }
      }
    }
  }

  return tokens.map((t) => t.value).join("");
}


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
}

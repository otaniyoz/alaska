"use strict";

{
const MAX_INPUT_LENGTH = 2_000_000;

const commonRules = Object.fromEntries("removePunctuationSpaces removeMultipleSpaces placeNumberNbspWord placeThreeStops placeFractions placeArithmeticalSymbols placeEmdash placeNumericRange placeCopyright placeNumeroSign placeMathematicalSymbols placeTypographyOrnamentation placeEmoticons placeCurrencySign placePercentSign placeNbsp placeHyphen placeTemperatureSign placeOrdinals placeMultiplicationSign formatInitials placeTypographicQuotes".split(" ").map((k) => [k, true]));

const ordinalMap = { st: "ˢᵗ", nd: "ⁿᵈ", rd: "ʳᵈ", th: "ᵗʰ" };
const shortWords = {
  en: new Set("a an at by for in of on or the to and but nor yet so as if".split(" ")),
  ru: new Set("а в во и к не на о об от по с со у из за до для или но же то бы ли".split(" ")),
};
const arithmeticOps = { "-": "−", "*": "⋅", "/": "∕", "+": "+", "=": "=" };
const currencyWordMap = { usd: "$", eur: "€", gbp: "£", jpy: "¥", cny: "CN¥", rub: "₽", kzt: "₸" };

const isWhitespace = (char) => /[\s\u00A0\t]/.test(char);

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

function applyArithmeticOp(tokens, before, opMap) {
  const ws1 = tokens[before + 1];
  const op = tokens[before + 2];
  const ws2 = tokens[before + 3];
  const rhs = tokens[before + 4];

  const valid = ws1?.type === "ws" && op && (op.type === "punct" || op.type === "sym") && ws2?.type === "ws" && rhs?.type === "num";
  if (!valid) return false;

  const replacement = opMap[op.value];
  if (!replacement) return false;

  ws1.value = "\u200A";
  op.value = replacement;
  ws2.value = "\u200A";
  return true;
}

function formatString(text, rules, lang) {
  if (text.length > MAX_INPUT_LENGTH) return text;

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
      const isOpening = !sameCharOnStack && (!prev || prev.type === "ws" || prevIsOpening || (prev.type === "punct" && /[,;:(\[]/.test(prev.value)));

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

    if (t.type === "ws") {
      if (rules.removeMultipleSpaces && t.value.length > 1) t.value = " ";
      if (rules.removePunctuationSpaces && next?.type === "punct" && /[.,!?:;]/.test(next.value)) t.value = "";
    } else if (t.type === "punct") {
      if (rules.placeNumericRange && t.value === "-" && prev?.type === "num" && (next?.type === "num" || !next || next.type === "ws")) {
        t.value = "\u2060\u2013\u2060";
      } else if (t.value === "-" && (next?.type === "num" || (next?.type === "punct" && next.value === "("))) {
        const p = prevOf(tokens, i);
        const isUnary = !p || (p.token.type !== "num" && p.token.value !== ")");
        if (isUnary && rules.placeArithmeticalSymbols) t.value = "−";
      } else if (rules.placeThreeStops && (t.value === "..." || t.value === "…")) {
        t.value = "\u2060.\u2060.\u2060.\u2060";
      } else if (rules.placeEmdash && t.value === "--") {
        t.value = "\u00A0\u2014\u0020";
        if (prev?.type === "ws") prev.value = "";
        if (next?.type === "ws") next.value = "";
      } else if (rules.placeEmdash && t.value === "-" && (!prev || (prev?.type === "ws" && prev.value.includes("\n"))) && next?.type === "ws" && next2?.type !== "num") {
        if (prev?.type === "ws") prev.value = prev.value.slice(0, prev.value.lastIndexOf("\n") + 1);
        replaceRange(tokens, i, i + 1, "\u2014\u0020");
      } else if (rules.placeEmdash && t.value === "-" && prev?.type === "ws" && next?.type === "ws" && next2?.type !== "num") {
        replaceRange(tokens, i - 1, i + 1, "\u00A0\u2014\u0020");
        i--;
      } else if (rules.placeHyphen && t.value === "-" && prev?.type === "word" && next?.type === "word") {
        t.value = "\u2060-\u2060";
      } else if (rules.placeTypographicQuotes && (t.value === '"' || t.value === "'")) {
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
        replaceRange(tokens, i, i + 1, t.value + ordinalMap[next.value.toLowerCase()]);
        continue;
      }

      if (rules.placeFractions && next?.type === "punct" && next.value === "/" && next2?.type === "num") {
        if (next3?.type === "ws") next3.value = "\u00A0";
        replaceRange(tokens, i, i + 2, t.value + "\u2044" + next2.value);
        continue;
      }

      if (t.type === "num" && rules.placeArithmeticalSymbols) applyArithmeticOp(tokens, i, arithmeticOps);

      if (rules.placeMultiplicationSign) {
        const xTok = nextOf(tokens, i);
        if (xTok?.token.type === "word" && xTok.token.value.toLowerCase() === "x") {
          const numTok = nextOf(tokens, xTok.index);
          if (numTok?.token.type === "num") {
            for (let j = i + 1; j < xTok.index; j++) {
              tokens[j].value = "\u200A";
            }
            xTok.token.value = "×";
            for (let j = xTok.index + 1; j < numTok.index; j++) {
              tokens[j].value = "\u200A";
            }
          }
        }
      }

      if (rules.placeArithmeticalSymbols) {
        const bop = nextOf(tokens, i);
        const usign = bop ? nextOf(tokens, bop.index) : null;
        const unum = usign ? nextOf(tokens, usign.index) : null;
        if (bop && usign && unum && (bop.token.type === "punct" || bop.token.type === "sym") && /[+\-*\/×÷=]/.test(bop.token.value) && usign.token.value === "-" && unum.token.type === "num") usign.token.value = "\u2212";
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
      if (rules.placeTemperatureSign && (t.value === "oC" || t.value === "oF") && prev?.type === "num") {
        replaceRange(tokens, i - 1, i, prev.value + "\u202F°" + t.value[1]);
        i--;
      } else if (rules.placeNumeroSign && /^no$/i.test(t.value)) {
        if (next?.type === "punct" && next.value === ".") {
          if (next2?.type === "num") replaceRange(tokens, i, i + 1, "№\u202F\u2060");
          else if (next2?.type === "ws" && next3?.type === "num") replaceRange(tokens, i, i + 2, "№\u202F");
        }
      } else if (rules.placeNbsp && next?.type === "ws" && shortWords[lang]?.has(t.value.toLowerCase())) {
        next.value = "\u00A0";
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
      if (rules.placePercentSign && t.value === "%") {
        if (prev?.type === "num") {
          replaceRange(tokens, i - 1, i, "%\u202F" + prev.value);
          i--;
        } else if (next?.type === "num") {
          t.value = "%\u202F";
        }
      }
    } else if (t.type === "short") {
      if (rules.placeEmoticons || rules.placeMathematicalSymbols || rules.placeTypographyOrnamentation) {
        const map = { "\\dia": "⌀", "\\deg": "°", "\\pm": "±", "\\prime": "′", "\\dprime": "″", "\\tprime": "‴", "\\qprime": "⁗", "\\infty": "∞", "\\leq": "⩽", "\\geq": "⩾", "\\neq": "≠", "\\approx": "≈", "\\sqrt": "√", "\\prod": "∏", "\\sum": "∑", "\\int": "∫", "\\partial": "∂", "\\therefore": "∴", "\\because": "∵", "\\forall": "∀", "\\exists": "∃", "\\in": "∈", "\\notin": "∉", "\\emptyset": "∅", "\\cup": "∪", "\\cap": "∩", "\\angle": "∠", "\\perp": "⊥", "\\parallel": "∥", "\\pi": "π", "\\epsilon": "ε", "\\alpha": "α", "\\beta": "β", "\\gamma": "γ", "\\delta": "δ", "\\theta": "θ", "\\lambda": "λ", "\\mu": "μ", "\\sigma": "σ", "\\phi": "φ", "\\omega": "ω", "\\dinkus": "∗\u2060∗\u2060∗", "\\asterism": "⁂", "\\dagger": "†", "\\ddagger": "‡", "\\section": "§", "\\bullet": "•", "\\tainome": "◉", "\\shrug": "¯\u2060\\\u2060\_\u2060(\u2060ツ\u2060)\u2060_\u2060/\u2060¯", "\\crying": "(\u2060⊤\u2060_\u2060⊤\u2060)", "\\dying": "(\u2060×\u2060_\u2060×\u2060)", "\\nervous": "(\u2060-\u2060_\u2060-\u2060;\u2060)", "\\cute": "(\u2060^\u2060.\u2060^\u2060)", "\\happy": "(\u2060^\u2060_\u2060_\u2060_\u2060_\u2060_\u2060_\u2060_\u2060_\u2060_\u2060^\u2060)", "\\surprised": "(\u2060\u00A0\u2060ⵔ\u2060.\u2060ⵔ\u2060\u00A0\u2060)", "\\angry": "(\u2060>\u2060_\u2060<\u2060)" };
        const replacement = map[t.value.toLowerCase()];
        if (replacement) t.value = replacement;
      }
    }
  }

  return tokens.map((t) => t.value).join("");
}


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
}

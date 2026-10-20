const MAX_INPUT_LENGTH = 2_000_000;

const commonRules = Object.fromEntries("placeNumberNbspWord placeArithmeticalSymbols placeMinusSign placeEmdash placeNumericRange placeMathematicalSymbols placeGreekSymbols placeTypographyOrnamentation placeEmoticons placeCurrencySymbols placeNbsp placeHyphen placeTemperatureSign placeMultiplicationSign formatInitials placeTypographicQuotes placeArrows placeShapes".split(" ").map((k) => [k, k !== "placeArithmeticalSymbols"]));
const mathRules = { placeArithmeticalSymbols: true, placeEmdash: false, placeNumericRange: false, placeHyphen: false, placeNbsp: false };

const temperatureUnit = /^o[CF](?=$|[\p{scx=Han}\p{scx=Hiragana}\p{scx=Katakana}\p{scx=Hangul}])/u;
const shortWords = {
  en: new Set("a an at by for in of on or the to and but nor yet so as if".split(" ")),
  ru: new Set("а в во и к не на о об от по с со у из за до для или но то ни ко".split(" ")),
};
const supportedLangs = new Set(["en", "ru"]);
const rangeLangs = new Set(["en", "ru"]);
const emdashLangs = new Set(["en", "ru"]);
const blockTags = new Set("address article aside audio body button canvas caption center col colgroup dd details dialog dir div dl dt fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hgroup hr iframe legend li main math menu nav noscript object ol optgroup option p pre search section select summary svg table tbody td template textarea tfoot th thead tr ul video".split(" "));
const normalizeLang = (lang) => {
  const code = typeof lang === "string" ? lang.split("-", 1)[0].toLowerCase() : "";
  return supportedLangs.has(code) ? code : undefined;
};
const quoteGlyphs = {
  single: ["\u2018", "\u2019", "\u201C", "\u201D"],
  double: ["\u201C", "\u201D", "\u2018", "\u2019"],
  ru: ["\u00AB", "\u00BB", "\u201E", "\u201C"],
};
const doubleQuoteRegions = new Set(["us", "ca"]);
const quoteStyle = (lang) => {
  if (typeof lang !== "string") return undefined;
  const [primary, ...subtags] = lang.toLowerCase().split("-");
  if (primary === "ru") return "ru";
  if (primary === "ko") return "double";
  if (primary !== "en") return undefined;
  for (const tag of subtags) {
    if (tag.length === 1) break;
    if (/^[a-z]{2}$/.test(tag)) return doubleQuoteRegions.has(tag) ? "double" : "single";
  }
  return "single";
};
const latinOrCyrillicEnd = /[\p{Script=Latin}\p{Script=Cyrillic}]$/u;
const latinOrCyrillicStart = /^[\p{Script=Latin}\p{Script=Cyrillic}]/u;
const elisionWords = new Set("em til tis twas cause bout round".split(" "));
const hyphenGlueMax = 3;
const identifierShape = /[/@_]|\.[\p{L}\p{N}]/u;
const dashes = new Set(["--", "\u2014", "\u2013"]);
const sentencePunct = new Set([",", ".", ";", ":", "!", "?", "...", "\u2026"]);
const leadPunct = new Set([",", "!", "?"]);
const minusOpeners = new Set(['"', "'", "\u2018", "\u201C", "\u00AB", "\u201E"]);
const minusZoneOps = new Set(["=", "+", "*", "/"]);
const arithmeticOps = { "-": "\u2212", "*": "\u22C5", "/": "\u2215" };
const mathShortcodes = { "\\pm": "\u00B1", "\\prime": "\u2032", "\\dprime": "\u2033", "\\infty": "\u221E", "\\leq": "\u2A7D", "\\geq": "\u2A7E", "\\neq": "\u2260", "\\approx": "\u2248", "\\sqrt": "\u221A", "\\prod": "\u220F", "\\sum": "\u2211", "\\int": "\u222B", "\\partial": "\u2202", "\\therefore": "\u2234", "\\because": "\u2235", "\\forall": "\u2200", "\\exists": "\u2203", "\\in": "\u2208", "\\notin": "\u2209", "\\emptyset": "\u2205", "\\cup": "\u222A", "\\cap": "\u2229", "\\angle": "\u2220", "\\perp": "\u22A5", "\\parallel": "\u2225", "\\degree": "\u00B0", "\\times": "\u00D7" };
const greekShortcodes = { "\\alpha": "\u03B1", "\\beta": "\u03B2", "\\gamma": "\u03B3", "\\delta": "\u03B4", "\\epsilon": "\u03F5", "\\varepsilon": "\u03B5", "\\zeta": "\u03B6", "\\eta": "\u03B7", "\\theta": "\u03B8", "\\vartheta": "\u03D1", "\\iota": "\u03B9", "\\kappa": "\u03BA", "\\varkappa": "\u03F0", "\\lambda": "\u03BB", "\\mu": "\u03BC", "\\nu": "\u03BD", "\\xi": "\u03BE", "\\pi": "\u03C0", "\\varpi": "\u03D6", "\\rho": "\u03C1", "\\varrho": "\u03F1", "\\sigma": "\u03C3", "\\varsigma": "\u03C2", "\\tau": "\u03C4", "\\upsilon": "\u03C5", "\\phi": "\u03D5", "\\varphi": "\u03C6", "\\chi": "\u03C7", "\\psi": "\u03C8", "\\omega": "\u03C9", "\\digamma": "\u03DD", "\\Gamma": "\u0393", "\\Delta": "\u0394", "\\Theta": "\u0398", "\\Lambda": "\u039B", "\\Xi": "\u039E", "\\Pi": "\u03A0", "\\Sigma": "\u03A3", "\\Upsilon": "\u03A5", "\\Phi": "\u03A6", "\\Psi": "\u03A8", "\\Omega": "\u03A9" };
const ornamentShortcodes = { "\\dinkus": "\u2217\u2060\u2217\u2060\u2217", "\\asterism": "\u2042", "\\dag": "\u2020", "\\ddag": "\u2021", "\\bullet": "\u2022", "\\S": "\u00A7", "\\P": "\u00B6", "\\copyright": "\u00A9", "\\registered": "\u00AE", "\\trademark": "\u2122", "\\phonogram": "\u2117" };
const emoticonShortcodes = { "\\shrug": "\u00AF\u2060\\\u2060_\u2060(\u2060\u30C4\u2060)\u2060_\u2060/\u2060\u00AF", "\\crying": "(\u2060\u22A4\u2060_\u2060\u22A4\u2060)", "\\dying": "(\u2060\u00D7\u2060_\u2060\u00D7\u2060)", "\\nervous": "(\u2060-\u2060_\u2060-\u2060;\u2060)", "\\cute": "(\u2060^\u2060.\u2060^\u2060)", "\\happy": "(\u2060^\u2060_\u2060_\u2060_\u2060_\u2060_\u2060_\u2060_\u2060_\u2060_\u2060^\u2060)", "\\surprised": "(\u2060\u00A0\u2060\u2D54\u2060.\u2060\u2D54\u2060\u00A0\u2060)", "\\angry": "(\u2060>\u2060_\u2060<\u2060)" };
const arrowShortcodes = { "\\arrn": "\u2191", "\\arrs": "\u2193", "\\arrne": "\u2197", "\\arrse": "\u2198", "\\arrsw": "\u2199", "\\arrnw": "\u2196", "\\arre": "\u2192", "\\arrw": "\u2190", "\\arrwe": "\u2194", "\\arrns": "\u2195" };
const shapeShortcodes = { "\\square": "\u25A1", "\\blacksquare": "\u25A0", "\\circle": "\u25CB", "\\blackcircle": "\u25CF", "\\doublecircle": "\u25CE", "\\fisheye": "\u25C9", "\\triangle": "\u25B3", "\\blacktriangle": "\u25B2", "\\triangledown": "\u25BD", "\\blacktriangledown": "\u25BC", "\\triangleleft": "\u25C1", "\\blacktriangleleft": "\u25C0\uFE0E", "\\triangleright": "\u25B7", "\\blacktriangleright": "\u25B6\uFE0E", "\\diamond": "\u25C7", "\\blackdiamond": "\u25C6", "\\lozenge": "\u25CA", "\\blacklozenge": "\u29EB", "\\star": "\u2606", "\\blackstar": "\u2605", "\\hexagon": "\u2B21", "\\blackhexagon": "\u2B22", "\\pentagon": "\u2B20", "\\blackpentagon": "\u2B1F", "\\heartsuit": "\u2661", "\\blackheartsuit": "\u2665\uFE0E", "\\spadesuit": "\u2664", "\\blackspadesuit": "\u2660\uFE0E", "\\clubsuit": "\u2667", "\\blackclubsuit": "\u2663\uFE0E", "\\diamondsuit": "\u2662", "\\blackdiamondsuit": "\u2666\uFE0E" };
const currencyShortcodes = { "\\pounds": "\u00A3", "\\yen": "\u00A5", "\\euro": "\u20AC", "\\ruble": "\u20BD", "\\tenge": "\u20B8" };
const shapeMathShortcodes = { "\\star": "\u22C6", "\\diamond": "\u22C4" };

const isWhitespace = (char) => /[\s\u00A0\t]/.test(char);
const isInitial = (word, dot) => word?.type === "word" && word.value.length === 1 && /\p{Lu}/u.test(word.value) && dot?.type === "punct" && dot.value === ".";

function resetCarry(carry) {
  carry.stack = undefined;
  carry.prev = undefined;
}

function nextOf(tokens, i) {
  for (let j = i + 1; j < tokens.length; j++) {
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

function numberAhead(tokens, i) {
  for (let j = i + 1; j < tokens.length; j++) {
    const t = tokens[j];
    if (t.type === "num") return true;
    if (t.type !== "curr" && t.type !== "ws" && !(t.type === "sym" && t.value === "%")) return false;
  }
  return false;
}

function isUnitSign(tokens, i) {
  const after = tokens[i + 1];
  return !after || after.type === "punct" || (after.type === "ws" && !numberAhead(tokens, i + 1));
}

function minusOperand(next, next2, zone) {
  return next?.type === "num" || (next?.type === "curr" && next2?.type === "num") || (zone && (next?.type === "word" || next?.value === "("));
}

function minusStart(tokens, i, carried, zone) {
  let j = i - 1;
  while (j >= 0 && minusOpeners.has(tokens[j].value)) j--;
  const lead = j >= 0 ? tokens[j] : carried;
  return !lead || lead.type === "ws" || lead.value === "(" || lead.value === "[" || (zone && minusZoneOps.has(lead.value));
}

function isRangeHyphen(tokens, i, carried) {
  const left = tokens[i - 1];
  const right = tokens[i + 1];
  if (left?.type !== "num" || right?.type !== "num" || !/\d$/.test(left.value)) return false;
  const before = tokens[i - 2] ?? carried;
  if (before?.type === "word" || (before?.type === "punct" && before.value === "-")) return false;
  const after = tokens[i + 2];
  return !(after?.type === "punct" && after.value === "-" && tokens[i + 3]?.type === "num");
}

const hasBreak = (t) => /[\r\n]/.test(t.value);
const dashLeft = (t) => t?.type === "word" || t?.type === "num" || (t?.type === "punct" && (sentencePunct.has(t.value) || t.value === ")" || (t.quoteInfo !== undefined && !t.quoteInfo.isOpening)));
const dashRight = (t) => t?.type === "word" || t?.type === "num" || t?.type === "curr" || (t?.type === "punct" && (t.value === "(" || t.value === ")" || (t.quoteInfo !== undefined && !t.quoteInfo.isApostrophe)));

function placeDash(tokens, i, before) {
  const t = tokens[i];
  const prev = tokens[i - 1];
  const next = tokens[i + 1];
  const left = tokens[i - 2];
  const right = tokens[i + 2];
  if (t.value === "\u2014") {
    if (prev?.type !== "ws" || prev.value !== "\u0020" || next?.type !== "ws" || !dashLeft(left)) return false;
    prev.value = "\u00A0";
    return true;
  }
  if ((!before || (before.type === "ws" && hasBreak(before))) && next?.type === "ws" && !hasBreak(next) && right?.type === "word") {
    t.value = "\u2014";
    return true;
  }
  if (prev?.type === "ws" && next?.type === "ws") {
    if (hasBreak(prev)) return false;
    if (t.value === "--") {
      if (!dashLeft(left) || !right || (right.type === "punct" && sentencePunct.has(right.value)) || (left.type === "num" && right.type === "num")) return false;
    } else if (!((left?.type === "word" && (right?.type === "word" || right?.type === "num" || right?.type === "curr")) || (left?.type === "punct" && leadPunct.has(left.value) && right?.type === "word"))) return false;
    if (prev.value === "\u0020") prev.value = "\u00A0";
    t.value = "\u2014";
    return true;
  }
  if (t.value !== "--" || !dashLeft(prev) || !dashRight(next) || (prev.type === "num" && next.type === "num")) return false;
  t.value = "\u2014";
  return true;
}

function isGluedHyphen(tokens, i) {
  const prev = tokens[i - 1];
  const next = tokens[i + 1];
  return prev?.type === "word" && next?.type === "word" && (prev.value.length <= hyphenGlueMax || next.value.length <= hyphenGlueMax) && latinOrCyrillicEnd.test(prev.value) && latinOrCyrillicStart.test(next.value);
}

function glueHyphens(tokens) {
  const found = [];
  let from = 0;
  for (let i = 0; i <= tokens.length; i++) {
    const t = tokens[i];
    if (t && t.type !== "ws") {
      if (t.type === "punct" && t.value === "-" && isGluedHyphen(tokens, i)) found.push(t);
      continue;
    }
    if (found.length) {
      let run = "";
      for (let j = from; j < i; j++) run += tokens[j].value;
      if (!identifierShape.test(run)) { for (const h of found) h.value = "-\u2060"; }
      found.length = 0;
    }
    from = i + 1;
  }
}

function applyArithmeticOp(tokens, before, opMap) {
  const ws1 = tokens[before + 1];
  const op = tokens[before + 2];
  const ws2 = tokens[before + 3];
  const rhs = tokens[before + 4];
  if (ws1?.type !== "ws" || (op?.type !== "punct" && op?.type !== "sym") || ws2?.type !== "ws" || !(rhs?.type === "num" || rhs?.type === "word" || rhs?.value === "(")) return;
  const replacement = opMap[op.value];
  if (!replacement) return;
  op.type = "other";
  op.value = replacement;
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
    } else if (char === "\\" && /[a-zA-Z]/.test(text[pos + 1])) {
      let value = "\\";
      pos++;
      while (pos < text.length && /[a-zA-Z]/.test(text[pos])) {
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
    } else if (/[%#@&*+=<>~]/.test(char)) {
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

function formatString(text, rules, lang, carry) {
  if (text.length > MAX_INPUT_LENGTH) {
    if (carry) resetCarry(carry);
    return text;
  }

  const style = quoteStyle(lang);
  lang = normalizeLang(lang);
  const quotes = rules.placeTypographicQuotes && style !== undefined;
  const ranges = rules.placeNumericRange && rangeLangs.has(lang);
  const emdash = rules.placeEmdash && emdashLangs.has(lang);
  const tokens = tokenize(text);
  const carried = carry?.prev;
  const stack = carry ? (carry.stack ??= []) : [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== "short") continue;
    const key = tokens[i].value;
    const replacement = (rules.placeMathematicalSymbols && mathShortcodes[key]) || (rules.placeGreekSymbols && greekShortcodes[key]) || (rules.placeTypographyOrnamentation && ornamentShortcodes[key]) || (rules.placeEmoticons && emoticonShortcodes[key]) || (rules.placeArrows && arrowShortcodes[key]) || (rules.placeCurrencySymbols && currencyShortcodes[key]) || (rules.placeShapes && ((rules.placeArithmeticalSymbols && shapeMathShortcodes[key]) || shapeShortcodes[key]));
    if (!replacement) continue;
    const expanded = tokenize(replacement);
    const from = i;
    tokens.splice(i, 1, ...expanded);
    i += expanded.length - 1;
    if (tokens[i].type === "word" && tokens[i + 1]?.type === "word") {
      tokens[i].value += tokens[i + 1].value;
      tokens.splice(i + 1, 1);
    }
    if (tokens[from].type === "word" && tokens[from - 1]?.type === "word") {
      tokens[from - 1].value += tokens[from].value;
      tokens.splice(from, 1);
      i--;
    }
  }
  for (let i = 0; quotes && i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type !== "punct" || (t.value !== '"' && t.value !== "'")) continue;
    const prev = i > 0 ? tokens[i - 1] : carried;
    const next = tokens[i + 1];
    const top = stack.length > 0 ? stack[stack.length - 1] : null;
    const afterWord = prev?.type === "word" && latinOrCyrillicEnd.test(prev.value);

    if (t.value === "'") {
      const next2 = tokens[i + 2];
      const apostrophe = (afterWord && next?.type === "word" && latinOrCyrillicStart.test(next.value)) ||
        (prev?.type !== "num" && next?.type === "num" && /^\d\d$/.test(next.value) && next2?.type === "word" && next2.value === "s") ||
        (prev?.type !== "word" && next?.type === "word" && elisionWords.has(next.value) && next2?.value !== "'" && next2?.value !== "\u2019") ||
        (afterWord && top?.char !== "'");
      if (apostrophe) {
        t.quoteInfo = { isApostrophe: true };
        continue;
      }
      if (prev?.type !== "word" && next?.type === "word" && /^[nN]$/.test(next.value) && tokens[i + 2]?.type === "punct" && tokens[i + 2].value === "'" && tokens[i + 3]?.type !== "word") {
        i += 2;
        continue;
      }
    }
    if (prev?.type === "num" && top?.char !== t.value) continue;
    if (prev?.type === "ws" && next?.type === "ws") continue;

    const afterDash = prev?.type === "punct" && dashes.has(prev.value);
    const openContext = !prev || prev.type === "ws" || prev.quoteInfo?.isOpening || (prev.type === "punct" && /[,;:(\[]/.test(prev.value));
    if (t.value === "'" && openContext && !prev?.quoteInfo?.isOpening && !afterDash && numberAhead(tokens, i)) {
      stack.push({ char: t.value, kept: true });
      continue;
    }
    const sameCharOnStack = top?.char === t.value;
    const isOpening = afterDash ? next?.type === "word" : openContext && (!sameCharOnStack || (prev?.type === "ws" && next?.type === "word"));

    if (isOpening) {
      let depth = 0;
      for (const entry of stack) if (!entry.kept) depth++;
      stack.push({ depth, char: t.value, style });
      t.quoteInfo = { isOpening: true, depth, style };
    } else {
      const opened = stack.pop();
      if (opened && !opened.kept) t.quoteInfo = { isOpening: false, depth: opened.depth, style: opened.style };
    }
  }

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const prev = tokens[i - 1];
    const next = tokens[i + 1];
    const next2 = tokens[i + 2];
    const before = prev ?? carried;

    if (t.type === "punct") {
      if (rules.placeArrows && t.value === "-" && next?.type === "sym" && next.value === ">" && !(next2?.type === "sym" && next2.value === ">")) {
        replaceRange(tokens, i, i + 1, "\u2192");
      } else if (ranges && t.value === "-" && isRangeHyphen(tokens, i, carried)) {
        t.value = "\u2060\u2013\u2060";
      } else if (rules.placeMinusSign && t.value === "-" && minusOperand(next, next2, rules.placeArithmeticalSymbols) && minusStart(tokens, i, carried, rules.placeArithmeticalSymbols)) {
        t.value = next.type === "curr" ? "\u2212\u2060" : "\u2212";
        t.type = "other";
      } else if (emdash && (t.value === "-" || t.value === "--" || t.value === "\u2014") && placeDash(tokens, i, before)) {
        continue;
      } else if (quotes && (t.value === '"' || t.value === "'")) {
        const info = t.quoteInfo;
        if (!info) continue;
        if (info.isApostrophe) {
          t.value = "\u2019";
        } else {
          const glyph = quoteGlyphs[info.style][(info.depth % 2) * 2 + (info.isOpening ? 0 : 1)];
          t.value = glyph;
        }
      } else if (t.value === ")" && rules.placeArithmeticalSymbols) {
        applyArithmeticOp(tokens, i, arithmeticOps);
      }
    } else if (t.type === "num") {
      let mul;
      if (rules.placeMultiplicationSign && /\d$/.test(t.value)) {
        const op = nextOf(tokens, i);
        const letter = op?.token.type === "word" && op.token.value.toLowerCase() === "x";
        const rhs = letter || (op?.token.type === "other" && op.token.value === "\u00D7") ? nextOf(tokens, op.index) : null;
        if (rhs?.token.type === "num" && !(letter && t.value === "0" && op.index === i + 1)) mul = { op, rhs };
      }

      if (rules.placeNumberNbspWord && next?.type === "ws" && next.value === "\u0020" && /\d$/.test(t.value)) {
        if (next2?.type === "word") {
          if (next2 !== mul?.op.token) next.value = "\u00A0";
        } else if ((next2?.type === "curr" || (next2?.type === "sym" && next2.value === "%")) && isUnitSign(tokens, i + 2)) next.value = "\u202F";
      }

      if (rules.placeArithmeticalSymbols) applyArithmeticOp(tokens, i, arithmeticOps);

      if (mul) {
        if (!rules.placeArithmeticalSymbols) {
          for (const [from, to] of [[i + 1, mul.op.index], [mul.op.index + 1, mul.rhs.index]]) {
            for (let j = from; j < to; j++) {
              if (tokens[j].value === "\u0020" || tokens[j].value === "\u00A0") tokens[j].value = "\u202F";
            }
          }
        }
        mul.op.token.value = "\u00D7";
        mul.op.token.type = "other";
      }
    } else if (t.type === "word") {
      if (rules.placeArithmeticalSymbols) applyArithmeticOp(tokens, i, arithmeticOps);

      if (rules.placeTemperatureSign && prev?.type === "num" && /\d$/.test(prev.value) && temperatureUnit.test(t.value)) {
        replaceTokens(tokens, i - 1, i, prev.value + "\u202F\u00B0" + t.value.slice(1));
        i++;
      } else if (rules.formatInitials && isInitial(t, next) && prev?.value !== "\u00B0") {
        const sp = tokens[i + 2];
        const after = tokens[i + 3];
        if (sp?.type === "ws" && after?.type === "word") {
          if (isInitial(after, tokens[i + 4])) sp.value = "\u202F";
          else if (/^\p{Lu}/u.test(after.value) && (t.value !== "I" || (tokens[i - 1]?.type === "ws" && isInitial(tokens[i - 3], tokens[i - 2])))) sp.value = "\u00A0";
        }
      } else if (rules.placeNbsp && shortWords[lang]?.has(t.value.toLowerCase())) {
        const gap = next?.type === "ws" ? next : next?.type === "punct" && next.value === "," && next2?.type === "ws" ? next2 : null;
        if (gap?.value === "\u0020") gap.value = "\u00A0";
      }
    } else if (t.type === "sym") {
      if (rules.placeArrows && t.value === "<" && next?.type === "punct" && next.value === "-" && next2?.type === "sym" && next2.value === ">") {
        replaceRange(tokens, i, i + 2, "\u2194");
      } else if (rules.placeArrows && t.value === "<" && next?.type === "punct" && next.value === "-" && !(prev?.type === "sym" && prev.value === "<") && !(next2?.type === "num" || next2?.type === "curr" || (next2?.type === "sym" && next2.value === "%"))) {
        replaceRange(tokens, i, i + 1, "\u2190");
      } else if (rules.placeNbsp && t.value === "&" && shortWords[lang] && prev?.type === "ws" && next?.type === "ws" && next.value === "\u0020") {
        next.value = "\u00A0";
      }
    }
  }

  if (rules.placeHyphen) glueHyphens(tokens);

  if (carry) {
    for (let j = tokens.length - 1; j >= 0; j--) {
      if (!tokens[j].value) continue;
      carry.prev = { type: tokens[j].type, value: tokens[j].value, quoteInfo: tokens[j].quoteInfo };
      break;
    }
  }

  return tokens.map((t) => t.value).join("");
}

export { blockTags, commonRules, formatString, mathRules, resetCarry };

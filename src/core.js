const MAX_INPUT_LENGTH = 2_000_000;

const commonRules = Object.fromEntries("placeNumberNbspWord placeThreeStops placeFractions placeArithmeticalSymbols placeMinusSign placeEmdash placeNumericRange placeCopyright placeNumeroSign placeMathematicalSymbols placeGreekSymbols placeTypographyOrnamentation placeEmoticons placeCurrencySign placePercentSign placeNbsp placeHyphen placeTemperatureSign placeOrdinals placeMultiplicationSign formatInitials placeTypographicQuotes placeArrows placeShapes".split(" ").map((k) => [k, k !== "placeArithmeticalSymbols"]));
const mathRules = { placeArithmeticalSymbols: true, placeEmdash: false, placeNumericRange: false, placeHyphen: false };

const ordinalMap = { st: "ˢᵗ", nd: "ⁿᵈ", rd: "ʳᵈ", th: "ᵗʰ" };
const temperatureUnit = /^o[CF](?=$|[\p{scx=Han}\p{scx=Hiragana}\p{scx=Katakana}\p{scx=Hangul}])/u;
const shortWords = {
  en: new Set("a an at by for in of on or the to and but nor yet so as if".split(" ")),
  ru: new Set("а в во и к не на о об от по с со у из за до для или но же то бы ли".split(" ")),
};
const supportedLangs = new Set(["en", "ru"]);
const blockTags = new Set("address article aside audio body button canvas caption center col colgroup dd details dialog dir div dl dt fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hgroup hr iframe legend li main math menu nav noscript object ol optgroup option p pre search section select summary svg table tbody td template textarea tfoot th thead tr ul video".split(" "));
const normalizeLang = (lang) => {
  const code = typeof lang === "string" ? lang.split("-", 1)[0].toLowerCase() : "";
  return supportedLangs.has(code) ? code : undefined;
};
const arithmeticOps = { "-": "−", "*": "⋅", "/": "∕", "+": "+", "=": "=" };
const currencyWordMap = { usd: "$", eur: "€", gbp: "£", jpy: "¥", cny: "CN¥", rub: "₽", kzt: "₸" };
const mathShortcodes = { "\\pm": "\u00B1", "\\prime": "\u2032", "\\dprime": "\u2033", "\\tprime": "\u2034", "\\qprime": "\u2057", "\\infty": "\u221E", "\\leq": "\u2A7D", "\\geq": "\u2A7E", "\\neq": "\u2260", "\\approx": "\u2248", "\\sqrt": "\u221A", "\\prod": "\u220F", "\\sum": "\u2211", "\\int": "\u222B", "\\partial": "\u2202", "\\therefore": "\u2234", "\\because": "\u2235", "\\forall": "\u2200", "\\exists": "\u2203", "\\in": "\u2208", "\\notin": "\u2209", "\\emptyset": "\u2205", "\\cup": "\u222A", "\\cap": "\u2229", "\\angle": "\u2220", "\\perp": "\u22A5", "\\parallel": "\u2225", "\\deg": "\u00B0", "\\dia": "\u2300" };
const greekShortcodes = { "\\alpha": "\u03B1", "\\beta": "\u03B2", "\\gamma": "\u03B3", "\\delta": "\u03B4", "\\epsilon": "\u03B5", "\\varepsilon": "\u03F5", "\\zeta": "\u03B6", "\\eta": "\u03B7", "\\theta": "\u03B8", "\\vartheta": "\u03D1", "\\iota": "\u03B9", "\\kappa": "\u03BA", "\\varkappa": "\u03F0", "\\lambda": "\u03BB", "\\mu": "\u03BC", "\\nu": "\u03BD", "\\xi": "\u03BE", "\\pi": "\u03C0", "\\varpi": "\u03D6", "\\rho": "\u03C1", "\\varrho": "\u03F1", "\\sigma": "\u03C3", "\\varsigma": "\u03C2", "\\tau": "\u03C4", "\\upsilon": "\u03C5", "\\phi": "\u03C6", "\\varphi": "\u03D5", "\\chi": "\u03C7", "\\psi": "\u03C8", "\\omega": "\u03C9", "\\digamma": "\u03DD", "\\Gamma": "\u0393", "\\Delta": "\u0394", "\\Theta": "\u0398", "\\Lambda": "\u039B", "\\Xi": "\u039E", "\\Pi": "\u03A0", "\\Sigma": "\u03A3", "\\Upsilon": "\u03A5", "\\Phi": "\u03A6", "\\Psi": "\u03A8", "\\Omega": "\u03A9" };
const ornamentShortcodes = { "\\dinkus": "\u2217\u2060\u2217\u2060\u2217", "\\asterism": "\u2042", "\\dag": "\u2020", "\\ddag": "\u2021", "\\section": "\u00A7", "\\bullet": "\u2022", "\\S": "\u00A7", "\\P": "\u00B6" };
const emoticonShortcodes = { "\\shrug": "¯\u2060\\\u2060\_\u2060(\u2060ツ\u2060)\u2060_\u2060/\u2060¯", "\\crying": "(\u2060⊤\u2060_\u2060⊤\u2060)", "\\dying": "(\u2060×\u2060_\u2060×\u2060)", "\\nervous": "(\u2060-\u2060_\u2060-\u2060;\u2060)", "\\cute": "(\u2060^\u2060.\u2060^\u2060)", "\\happy": "(\u2060^\u2060_\u2060_\u2060_\u2060_\u2060_\u2060_\u2060_\u2060_\u2060_\u2060^\u2060)", "\\surprised": "(\u2060\u00A0\u2060ⵔ\u2060.\u2060ⵔ\u2060\u00A0\u2060)", "\\angry": "(\u2060>\u2060_\u2060<\u2060)" };
const arrowShortcodes = { "\\arrn": "\u2191", "\\arrs": "\u2193", "\\arrne": "\u2197", "\\arrse": "\u2198", "\\arrsw": "\u2199", "\\arrnw": "\u2196", "\\arre": "\u2192", "\\arrw": "\u2190", "\\arrlr": "\u2194", "\\arrud": "\u2195" };
const shapeShortcodes = { "\\square": "\u25A1", "\\blacksquare": "\u25A0", "\\circle": "\u25CB", "\\blackcircle": "\u25CF", "\\doublecircle": "\u25CE", "\\tainome": "\u25C9", "\\triangle": "\u25B3", "\\blacktriangle": "\u25B2", "\\triangledown": "\u25BD", "\\blacktriangledown": "\u25BC", "\\triangleleft": "\u25C1", "\\blacktriangleleft": "\u25C0\uFE0E", "\\triangleright": "\u25B7", "\\blacktriangleright": "\u25B6\uFE0E", "\\diamond": "\u25C7", "\\blackdiamond": "\u25C6", "\\lozenge": "\u25CA", "\\blacklozenge": "\u29EB", "\\star": "\u2606", "\\blackstar": "\u2605", "\\heart": "\u2661", "\\blackheart": "\u2665\uFE0E", "\\hexagon": "\u2B21", "\\blackhexagon": "\u2B22", "\\pentagon": "\u2B20", "\\blackpentagon": "\u2B1F", "\\spade": "\u2664", "\\blackspade": "\u2660\uFE0E", "\\club": "\u2667", "\\blackclub": "\u2663\uFE0E" };

const isWhitespace = (char) => /[\s\u00A0\t]/.test(char);
const isDash = (tokens, i, rules) => tokens[i]?.type === "punct" && /^(-|--|\u2013|\u2014)$/.test(tokens[i].value) && !(rules.placeArrows && tokens[i].value === "-" && tokens[i + 1]?.type === "sym" && tokens[i + 1].value === ">");
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

function formatString(text, rules, lang, carry) {
  if (text.length > MAX_INPUT_LENGTH) {
    if (carry) resetCarry(carry);
    return text;
  }

  lang = normalizeLang(lang);
  const quotes = rules.placeTypographicQuotes && lang !== undefined;
  const tokens = tokenize(text);
  const carried = carry?.prev;
  const stack = carry ? (carry.stack ??= []) : [];
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
    const key = tokens[i].value;
    const replacement = (rules.placeMathematicalSymbols && mathShortcodes[key]) || (rules.placeGreekSymbols && greekShortcodes[key]) || (rules.placeTypographyOrnamentation && ornamentShortcodes[key]) || (rules.placeEmoticons && emoticonShortcodes[key]) || (rules.placeArrows && arrowShortcodes[key]) || (rules.placeShapes && shapeShortcodes[key]);
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
    const prev = i > 0 ? tokens[i - 1] : carried;
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
        stack.push({ depth, char: t.value, lang });
        t.quoteInfo = { isOpening: true, depth, lang };
      } else {
        const opened = stack.pop();
        const depth = opened ? opened.depth : 0;
        t.quoteInfo = { isOpening: false, depth, lang: opened ? opened.lang : lang };
      }
    }
  }

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const prev = tokens[i - 1];
    const next = tokens[i + 1];
    const next2 = tokens[i + 2];
    const next3 = tokens[i + 3];
    const before = prev ?? carried;

    if (t.type === "punct") {
      if (rules.placeArrows && t.value === "-" && next?.type === "sym" && next.value === ">") {
        replaceRange(tokens, i, i + 1, "\u2192");
      } else if (rules.placeNumericRange && t.value === "-" && prev?.type === "num" && (next?.type === "num" || !next || next.type === "ws")) {
        t.value = "\u2060\u2013\u2060";
      } else if (rules.placeMinusSign && t.value === "-" && (!before || before.type === "ws" || before.value === "(" || before.value === "[") && (next?.type === "num" || next?.type === "curr" || (rules.placeArithmeticalSymbols && next?.value === "("))) {
        t.value = "\u2212";
        t.type = "other";
      } else if (rules.placeThreeStops && (t.value === "..." || t.value === "…")) {
        t.value = "\u2060.\u2060.\u2060.\u2060";
      } else if (rules.placeEmdash && t.value === "--" && !isDash(tokens, i - 1, rules) && !isDash(tokens, i + 1, rules)) {
        const from = prev?.type === "ws" ? i - 1 : i;
        replaceTokens(tokens, from, next?.type === "ws" ? i + 1 : i, "\u00A0\u2014\u0020");
        i = from + 2;
      } else if (rules.placeEmdash && t.value === "-" && (!before || (before.type === "ws" && before.value.includes("\n"))) && next?.type === "ws") {
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
            if (depth % 2 === 0) t.value = info.lang === "en" ? "\u2018\u2060" : "\u00AB\u2060";
            else t.value = info.lang === "en" ? "\u201C\u2060" : "\u201E\u2060";
          } else {
            if (depth % 2 === 0) t.value = info.lang === "en" ? "\u2060\u2019" : "\u2060\u00BB";
            else t.value = info.lang === "en" ? "\u2060\u201D" : "\u2060\u201C";
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
      if (rules.placeNumberNbspWord && next?.type === "ws" && next.value === "\u0020" && next2?.type === "word" && /\d$/.test(t.value)) next.value = "\u00A0";

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

      if (rules.placeMultiplicationSign && /\d$/.test(t.value)) {
        const op = nextOf(tokens, i);
        const letter = op?.token.type === "word" && op.token.value.toLowerCase() === "x";
        const rhs = letter || (op?.token.type === "other" && op.token.value === "\u00D7") ? nextOf(tokens, op.index) : null;
        if (rhs?.token.type === "num" && !(letter && t.value === "0" && op.index === i + 1)) {
          const space = rules.placeArithmeticalSymbols ? "\u200A" : "\u202F";
          for (const [from, to] of [[i + 1, op.index], [op.index + 1, rhs.index]]) {
            for (let j = from; j < to; j++) {
              if (tokens[j].value === "\u0020" || tokens[j].value === "\u00A0") tokens[j].value = space;
            }
          }
          op.token.value = "\u00D7";
          op.token.type = "other";
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

      if (rules.placeTemperatureSign && prev?.type === "num" && /\d$/.test(prev.value) && temperatureUnit.test(t.value)) {
        replaceTokens(tokens, i - 1, i, prev.value + "\u202F\u00B0" + t.value.slice(1));
        i++;
      } else if (rules.placeNumeroSign && /^no$/i.test(t.value)) {
        if (next?.type === "punct" && next.value === ".") {
          if (next2?.type === "num") replaceRange(tokens, i, i + 1, "№\u202F\u2060");
          else if (next2?.type === "ws" && next3?.type === "num") replaceRange(tokens, i, i + 2, "№\u202F");
        }
      } else if (rules.formatInitials && isInitial(t, next) && prev?.value !== "\u00B0") {
        const sp = tokens[i + 2];
        const after = tokens[i + 3];
        if (sp?.type === "ws" && after?.type === "word") {
          if (isInitial(after, tokens[i + 4])) sp.value = "\u202F";
          else if (/^\p{Lu}/u.test(after.value) && (t.value !== "I" || (tokens[i - 1]?.type === "ws" && isInitial(tokens[i - 3], tokens[i - 2])))) sp.value = "\u00A0";
        }
      } else if (rules.placeNbsp && shortWords[lang]?.has(t.value.toLowerCase())) {
        if (next?.type === "ws") next.value = "\u00A0";
        else if (next?.type === "punct" && next.value === "," && next2?.type === "ws") next2.value = "\u00A0";
      }
    } else if (t.type === "sym") {
      if (rules.placeArrows && t.value === "<" && next?.type === "punct" && next.value === "-" && next2?.type === "sym" && next2.value === ">") {
        replaceRange(tokens, i, i + 2, "\u2194");
      } else if (rules.placeArrows && t.value === "<" && next?.type === "punct" && next.value === "-") {
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

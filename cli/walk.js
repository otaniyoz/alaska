import { commonRules, formatString } from "../src/core.js";

const VOID = new Set("area base br col embed hr img input link meta param source track wbr".split(" "));
const SKIP_TAGS = new Set("code pre samp kbd".split(" "));
const RAWTEXT = new Set(["script", "style"]);
const ENTITY_RE = /^&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);/;
const AUTO_CLOSE = {
  p: new Set("address article aside blockquote details div dl fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hr main menu nav ol p pre section table ul".split(" ")),
  li: new Set(["li"]),
  dt: new Set(["dt", "dd"]),
  dd: new Set(["dt", "dd"]),
  option: new Set(["option", "optgroup"]),
  optgroup: new Set(["optgroup"]),
};
const TABLE_DEPTH = { thead: 1, tbody: 1, tfoot: 1, tr: 2, td: 3, th: 3 };
const OPTIONAL_END = new Set([...Object.keys(AUTO_CLOSE), ...Object.keys(TABLE_DEPTH)]);

function closesForNewTag(topTag, newTag) {
  const d = TABLE_DEPTH[newTag];
  if (d === undefined) return AUTO_CLOSE[topTag]?.has(newTag) ?? false;
  const topDepth = TABLE_DEPTH[topTag];
  return topDepth !== undefined ? topDepth >= d : OPTIONAL_END.has(topTag);
}

function kebabToCamel(s) {
  const parts = s.split("-");
  return parts[0] + parts.slice(1).map((p) => p[0].toUpperCase() + p.slice(1)).join("");
}

function computeRules(attrs, inherited) {
  const data = {};
  for (const [name, val] of attrs) {
    if (!name.startsWith("data-")) continue;
    const key = kebabToCamel(name.slice(5));
    if (!(key in commonRules)) continue;
    data[key] = val === "true" ? true : val === "false" ? false : val;
  }
  return Object.keys(data).length ? { ...inherited, ...data } : inherited;
}

function computeFrame(parent, tag, attrs, foreign) {
  const classes = new Set();
  let lang = parent.lang;
  for (const [name, val] of attrs) {
    if (name === "class") {
      for (const c of val.split(/\s+/)) {
        if (c) classes.add(c);
      }
    } else if (name === "lang") {
      lang = val;
    }
  }
  return {
    tag,
    active: parent.active || classes.has("alaska"),
    skip: parent.skip || SKIP_TAGS.has(tag) || classes.has("alaska-skip"),
    lang,
    rules: computeRules(attrs, parent.rules),
    foreign,
  };
}

function findClose(src, from, closer) {
  const idx = src.indexOf(closer, from);
  return idx === -1 ? src.length : idx + closer.length;
}

function parseStartTag(src, pos) {
  const n = src.length;
  let i = pos + 1;
  const tagStart = i;
  while (i < n && /[a-zA-Z0-9:-]/.test(src[i])) i++;
  const tag = src.slice(tagStart, i).toLowerCase();
  const attrs = [];
  let selfClosing = false;
  while (i < n) {
    while (i < n && /\s/.test(src[i])) i++;
    if (src[i] === ">") {
      i++;
      break;
    }
    if (src[i] === "/" && src[i + 1] === ">") {
      selfClosing = true;
      i += 2;
      break;
    }
    if (i >= n) break;
    const nameStart = i;
    while (i < n && !/[\s=/>]/.test(src[i])) i++;
    const name = src.slice(nameStart, i);
    while (i < n && /\s/.test(src[i])) i++;
    let value = "";
    if (src[i] === "=") {
      i++;
      while (i < n && /\s/.test(src[i])) i++;
      if (src[i] === '"' || src[i] === "'") {
        const quote = src[i];
        i++;
        const valStart = i;
        while (i < n && src[i] !== quote) i++;
        value = src.slice(valStart, i);
        i++;
      } else {
        const valStart = i;
        while (i < n && !(src[i] === ">" || /\s/.test(src[i]) || (src[i] === "/" && src[i + 1] === ">"))) i++;
        value = src.slice(valStart, i);
      }
    }
    if (name) attrs.push([name, value]);
  }
  return { tag, attrs, end: i, selfClosing };
}

function emitText(src, pos, n, out, ctx) {
  const start = pos;
  while (pos < n && src[pos] !== "<" && !(src[pos] === "&" && ENTITY_RE.test(src.slice(pos)))) pos++;
  const text = src.slice(start, pos);
  if (text) out.push(ctx.active && !ctx.skip ? formatString(text, ctx.rules, ctx.lang) : text);
  if (pos < n && src[pos] === "&") {
    const m = ENTITY_RE.exec(src.slice(pos));
    out.push(m[0]);
    pos += m[0].length;
  }
  return pos;
}

function handleEndTag(src, pos, out, stack) {
  const end = findClose(src, pos, ">");
  const tag = src.slice(pos + 2, end - 1).trim().toLowerCase();
  out.push(src.slice(pos, end));
  if (VOID.has(tag)) return end;
  let i = stack.length - 1;
  while (i > 0 && stack[i].tag !== tag && OPTIONAL_END.has(stack[i].tag)) i--;
  if (i > 0 && stack[i].tag === tag) stack.length = i;
  return end;
}

function handleStartTag(src, pos, out, stack) {
  const { tag, attrs, end, selfClosing } = parseStartTag(src, pos);
  out.push(src.slice(pos, end));
  const foreign = stack[stack.length - 1].foreign || tag === "svg" || tag === "math";
  const selfClosed = selfClosing && foreign;
  if (RAWTEXT.has(tag) && !selfClosed) {
    const closeRe = new RegExp(`</${tag}\\s*>`, "i");
    const m = closeRe.exec(src.slice(end));
    const closeEnd = m ? end + m.index + m[0].length : src.length;
    out.push(src.slice(end, closeEnd));
    return closeEnd;
  }
  while (stack.length > 1 && closesForNewTag(stack[stack.length - 1].tag, tag)) stack.pop();
  const frame = computeFrame(stack[stack.length - 1], tag, attrs, foreign);
  if (!VOID.has(tag) && !selfClosed) stack.push(frame);
  return end;
}

function formatHtml(src) {
  const out = [];
  const stack = [{ tag: null, active: false, skip: false, lang: "", rules: commonRules, foreign: false }];
  const n = src.length;
  let pos = 0;

  while (pos < n) {
    if (src[pos] !== "<") {
      pos = emitText(src, pos, n, out, stack[stack.length - 1]);
      continue;
    }
    if (src.startsWith("<!--", pos)) {
      const end = findClose(src, pos + 4, "-->");
      out.push(src.slice(pos, end));
      pos = end;
      continue;
    }
    if (src.startsWith("<!", pos) || src.startsWith("<?", pos)) {
      const end = findClose(src, pos, ">");
      out.push(src.slice(pos, end));
      pos = end;
      continue;
    }
    if (src.startsWith("</", pos)) {
      pos = handleEndTag(src, pos, out, stack);
      continue;
    }
    if (/^[a-zA-Z]/.test(src[pos + 1] ?? "")) {
      pos = handleStartTag(src, pos, out, stack);
      continue;
    }
    out.push("<");
    pos++;
  }
  return out.join("");
}

export { formatHtml };

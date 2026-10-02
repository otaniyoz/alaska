import * as core from "../src/core.js";

const iterations = Number(Deno.args[0] ?? 5000);
const seed = Number(Deno.args[1] ?? 1);
const alphabet = ["a", "b", "it", "of", "1", "2", "20", "x", "-", "--", "----", "+", "=", "*", "/", "%", "$", "USD", "'", '"', ",", ".", "...", "(", ")", "c", "(c)", "No.", "oC", "st", "th", "%", "->", "<-", " ", "  ", "\n", "\n\n", "\\pm", "J", "K", "\u00A0", "\u202F", "\u200A", "\u2060", "\\pi", "\\crying", "\\shrug", "\\surprised", "\\nervous", "\\arrn", "[", "\u20AC", "\u00D7", ">", "<", "oF", "nd", ":", "\t", "rub", "&", "\u2014", "\u2013"];
const configs = [["prose", { ...core.commonRules }]];
if (core.mathRules) configs.push(["math", { ...core.commonRules, ...core.mathRules }]);
const langs = ["en", "ru", undefined];

function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const show = (s) => JSON.stringify(s).replace(/[^\x20-\x7E]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0"));
const fails = (parts, rules, lang) => {
  const once = core.formatString(parts.join(""), rules, lang);
  return core.formatString(once, rules, lang) !== once;
};

function shrink(parts, rules, lang) {
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < parts.length; i++) {
      const next = parts.slice(0, i).concat(parts.slice(i + 1));
      if (next.length && fails(next, rules, lang)) {
        parts = next;
        changed = true;
        break;
      }
    }
  }
  return parts;
}

const rand = mulberry32(seed);
const found = new Map();
let bad = 0;
for (let i = 0; i < iterations; i++) {
  const parts = Array.from({ length: 1 + Math.floor(rand() * 8) }, () => alphabet[Math.floor(rand() * alphabet.length)]);
  for (const [name, rules] of configs) {
    for (const lang of langs) {
      if (!fails(parts, rules, lang)) continue;
      bad++;
      const small = shrink(parts, rules, lang);
      const key = `${name} ${lang}: ${show(small.join(""))}`;
      if (!found.has(key)) {
        const once = core.formatString(small.join(""), rules, lang);
        found.set(key, `${key}\n  once  ${show(once)}\n  twice ${show(core.formatString(once, rules, lang))}`);
      }
    }
  }
}

if (bad > 0) {
  const lines = [...found.values()].sort((a, b) => a.length - b.length);
  console.log(`x ${bad} non-idempotent results, ${found.size} distinct shrunk inputs (seed ${seed}, ${iterations} iterations)`);
  for (const l of lines.slice(0, 40)) console.log(l);
  Deno.exit(1);
}

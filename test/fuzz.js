import * as core from "../src/core.js";

const iterations = Number(Deno.args[0] ?? 5000);
const seed = Number(Deno.args[1] ?? 1);
const SPLIT = "\uE000";
const alphabet = [SPLIT, SPLIT, SPLIT, SPLIT, SPLIT, "a", "b", "it", "of", "0", "1", "2", "20", "x", "X", "-", "--", "----", "+", "=", "*", "/", "%", "$", "USD", "'", '"', ",", ".", "...", "(", ")", "c", "(c)", "No.", "oC", "st", "th", "%", "->", "<-", " ", "  ", "\n", "\n\n", "\\pm", "J", "K", "\u00A0", "\u202F", "\u200A", "\u2060", "\\pi", "\\alpha", "\\Pi", "\\S", "\\dag", "\\dia", "\\arre", "\u00E9", "\\crying", "\\shrug", "\\surprised", "\\nervous", "\\arrn", "[", "\u20AC", "\u00D7", ">", "<", "oF", "nd", ":", "\t", "rub", "&", "\u2014", "\u2013", "<->", "\\arrlr", "\\arrud", "\\square", "\\blackheart", "\\tainome", "J. ", "I. ", "Smith", "I", "\u0410", "\u0401", "\u3067\u3059", "\uC785\uB2C8\uB2E4", "oCa", "20oC", "20oC. "];
const configs = [["prose", { ...core.commonRules }]];
if (core.mathRules) configs.push(["math", { ...core.commonRules, ...core.mathRules }]);
const focused = [SPLIT, SPLIT, SPLIT, " ", "\n", "a", "it", "x", "X", "0", "\u00D7", "5", "-", "--", "(", "[", ",", "'", '"', "->", "%", "\\alpha", "J", ".", "J.", "I.", "K.", "Smith", "I", "20oC", "20oC. ", "\u3067\u3059"];
const langs = ["en", "ru", "de", undefined];
const quoteRules = { placeTypographicQuotes: true };
const minusRules = { placeMinusSign: true };

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
const whole = (parts) => parts.join("").replaceAll(SPLIT, "");
const segmentsOf = (parts) => parts.join("").split(SPLIT);
const run = (segments, rules, seq) => {
  const carry = {};
  return segments.map((s, i) => core.formatString(s, rules, seq[i], carry));
};
const fails = (parts, rules, lang) => {
  const once = core.formatString(whole(parts), rules, lang);
  return core.formatString(once, rules, lang) !== once;
};
const failsSegmented = (parts, rules, seq) => {
  const once = run(segmentsOf(parts), rules, seq);
  const twice = run(once, rules, seq);
  return once.some((s, i) => s !== twice[i]);
};
const boundaries = (parts) => {
  const all = segmentsOf(parts);
  return all.slice(1).map((_, i) => [all.slice(0, i + 1).join(""), all.slice(i + 1).join("")]);
};
const quoteSafe = (parts) => boundaries(parts).every(([a, b]) => !a || !b || /\s$/.test(a) || /^[\s'"]/.test(b));
const minusSafe = (parts) => boundaries(parts).every(([a]) => !a.endsWith("-"));
const failsSplit = (parts, rules, lang, safe) => safe(parts) && run(segmentsOf(parts), rules, Array(9).fill(lang)).join("") !== core.formatString(whole(parts), rules, lang);

function shrink(parts, check) {
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < parts.length; i++) {
      const next = parts.slice(0, i).concat(parts.slice(i + 1));
      if (next.length && check(next)) {
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
  const source = rand() < 0.5 ? alphabet : focused;
  const parts = Array.from({ length: 1 + Math.floor(rand() * 8) }, () => source[Math.floor(rand() * source.length)]);
  const seq = Array.from({ length: 9 }, () => langs[Math.floor(rand() * langs.length)]);
  const report = (key, once, twice) => {
    bad++;
    if (!found.has(key)) found.set(key, `${key}\n  once  ${show(once)}\n  twice ${show(twice)}`);
  };
  for (const [name, rules] of configs) {
    for (const lang of langs) {
      if (!fails(parts, rules, lang)) continue;
      const small = shrink(parts, (p) => fails(p, rules, lang));
      const once = core.formatString(whole(small), rules, lang);
      report(`${name} ${lang}: ${show(whole(small))}`, once, core.formatString(once, rules, lang));
    }
    if (failsSegmented(parts, rules, seq)) {
      const small = shrink(parts, (p) => failsSegmented(p, rules, seq));
      const once = run(segmentsOf(small), rules, seq);
      report(`${name} segmented ${show(seq.slice(0, once.length))}: ${show(small.join(""))}`, once, run(once, rules, seq));
    }
  }
  for (const [name, rules, safe, lang] of [["quotes en", quoteRules, quoteSafe, "en"], ["quotes ru", quoteRules, quoteSafe, "ru"], ["minus", minusRules, minusSafe, undefined]]) {
    if (!failsSplit(parts, rules, lang, safe)) continue;
    const small = shrink(parts, (p) => failsSplit(p, rules, lang, safe));
    report(`split ${name}: ${show(small.join(""))}`, run(segmentsOf(small), rules, Array(9).fill(lang)).join(""), core.formatString(whole(small), rules, lang));
  }
}

if (bad > 0) {
  const lines = [...found.values()].sort((a, b) => a.length - b.length);
  console.log(`x ${bad} non-idempotent results, ${found.size} distinct shrunk inputs (seed ${seed}, ${iterations} iterations)`);
  for (const l of lines.slice(0, 40)) console.log(l);
  Deno.exit(1);
}

import { commonRules, formatString, mathRules, resetCarry } from "../src/core.js";
import testData from "./test.json" with { type: "json" };

let pass = 0;
let fail = 0;

const formatSegments = (segments, rules, lang, langs) => {
  const carry = {};
  return segments.map((s, i) => formatString(s, rules, langs?.[i] ?? lang, carry));
};

for (const group of testData.groups) {
  for (const { desc, input, segments, expected, lang, langs, rules: ruleConfig } of group.cases) {
    const { base = "all", ...overrides } = ruleConfig || {};
    const baseRules = base === "none" ? Object.fromEntries(Object.keys(commonRules).map((k) => [k, false])) : base === "math" ? { ...commonRules, ...mathRules } : { ...commonRules };
    const caseRules = { ...baseRules, ...overrides };
    const run = (x) => segments ? formatSegments(x, caseRules, lang, langs) : formatString(x, caseRules, lang);
    const output = run(segments ?? input);
    const again = run(output);
    const same = JSON.stringify(output) === JSON.stringify(expected);
    if (same && JSON.stringify(again) === JSON.stringify(output)) {
      pass++;
    } else {
      fail++;
      console.log(`x [${group.name}] ${desc}${same ? " (not idempotent)" : ""}`);
      console.log(`  input    ${JSON.stringify(segments ?? input)}`);
      console.log(`  expected ${JSON.stringify(expected)}`);
      console.log(`  actual   ${JSON.stringify(same ? again : output)}`);
    }
  }
}

const oversize = { stack: [{ depth: 0, char: '"', lang: "en" }], prev: { type: "word", value: "x" } };
formatString("a".repeat(2_000_001), commonRules, "en", oversize);
if (oversize.stack !== undefined || oversize.prev !== undefined) {
  fail++;
  console.log("x oversize input must reset the carry");
}
const blank = { stack: [], prev: { type: "word", value: "x" } };
formatString("", commonRules, "en", blank);
if (blank.prev?.value !== "x") {
  fail++;
  console.log("x empty text must leave the carry untouched");
}
resetCarry(blank);
if (blank.stack !== undefined || blank.prev !== undefined) {
  fail++;
  console.log("x resetCarry must clear the carry");
}

if (fail > 0) Deno.exit(1);

import { commonRules, formatString } from "../src/core.js";
import testData from "./test.json" with { type: "json" };

let pass = 0;
let fail = 0;

for (const group of testData.groups) {
  for (const { desc, input, expected, lang, rules: ruleConfig } of group.cases) {
    const { base = "all", ...overrides } = ruleConfig || {};
    const baseRules = base === "none" ? Object.fromEntries(Object.keys(commonRules).map((k) => [k, false])) : { ...commonRules };
    const caseRules = { ...baseRules, ...overrides };
    const output = formatString(input, caseRules, lang);
    if (output === expected) {
      pass++;
    } else {
      fail++;
      console.log(`x [${group.name}] ${desc}`);
      console.log(`  input    ${JSON.stringify(input)}`);
      console.log(`  expected ${JSON.stringify(expected)}`);
      console.log(`  actual   ${JSON.stringify(output)}`);
    }
  }
}

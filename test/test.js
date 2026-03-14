import { commonRules, formatString } from "../src/core.js";
import testData from "./test.json" with { type: "json" };

let pass = 0;
let fail = 0;

for (const group of testData.groups) {
  for (const { desc, input, expected, lang } of group.cases) {
    const output = formatString(input, commonRules, lang);
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

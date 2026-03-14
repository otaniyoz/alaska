import { commonRules, formatString } from "../src/core.js";

const path = Deno.args[0];
if (!path) {
  console.error("usage: deno run -R bench.js <file.txt>");
  Deno.exit(1);
}

const text = await Deno.readTextFile(path);
const RUNS = 1000;

const t0 = performance.now();
for (let i = 0; i < RUNS; i++) {
  formatString(text, commonRules, "en");
}
const elapsed = performance.now() - t0;

console.log(`${text.length} chars`);
console.log(`${(elapsed / RUNS).toFixed(2)}ms per run`);

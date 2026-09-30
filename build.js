const core = await Deno.readTextFile("./src/core.js");
const dom = await Deno.readTextFile("./src/dom.js");

const coreStripped = core.replace(/^export\s*\{[^}]*\};?\s*$/m, "").trimEnd();
const domStripped = dom.replace(/^import\s*\{[^}]*\}\s*from\s*['"][^'"]*['"];?\s*$/m, "").trimEnd();

await Deno.mkdir("./browser", { recursive: true });
await Deno.writeTextFile("./browser/alaska.js", `"use strict";\n\n{\n${coreStripped}\n\n${domStripped}\n}\n`);

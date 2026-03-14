const core = await Deno.readTextFile("./src/core.js");
const dom = await Deno.readTextFile("./src/dom.js");

const coreStripped = core.replace(/^export\s*\{[^}]*\};?\s*$/m, "").trimEnd();
const domStripped = dom.replace(/^import\s*\{[^}]*\}\s*from\s*['"][^'"]*['"];?\s*$/m, "").trimEnd();

await Deno.writeTextFile("./alaska.js", coreStripped + "\n\n" + domStripped + "\n");

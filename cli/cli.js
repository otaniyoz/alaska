import { formatHtml } from "./walk.js";

function globToRegex(pat) {
  let re = "";
  let i = 0;
  while (i < pat.length) {
    const c = pat[i++];
    if (c === "*") re += ".*";
    else if (c === "?") re += ".";
    else if (c === "[") {
      let j = i;
      if (pat[j] === "!") j++;
      if (pat[j] === "]") j++;
      while (j < pat.length && pat[j] !== "]") j++;
      if (j >= pat.length) {
        re += "\\[";
      } else {
        let cls = pat.slice(i, j);
        if (cls[0] === "!") cls = "^" + cls.slice(1);
        re += "[" + cls + "]";
        i = j + 1;
      }
    } else {
      re += c.replace(/[.+^${}()|\\]/g, "\\$&");
    }
  }
  return new RegExp("^" + re + "$");
}

function matchesExclude(path, patterns) {
  return patterns.some((pat) => globToRegex(pat).test(path));
}

async function processFile(path) {
  const src = await Deno.readTextFile(path);
  const out = formatHtml(src);
  if (out !== src) await Deno.writeTextFile(path, out);
}

async function main() {
  const files = [];
  const exclude = [];
  for (let i = 0; i < Deno.args.length; i++) {
    if (Deno.args[i] === "--exclude") {
      exclude.push(Deno.args[++i]);
      continue;
    }
    files.push(Deno.args[i]);
  }
  if (files.length === 0) {
    console.error("usage: cli.js file1.html [file2.html ...] [--exclude pattern]");
    Deno.exit(1);
  }
  let failed = false;
  for (const path of files) {
    if (matchesExclude(path, exclude)) continue;
    try {
      await processFile(path);
    } catch (e) {
      console.error(`error: ${path}: ${e.message}`);
      failed = true;
    }
  }
  if (failed) Deno.exit(1);
}

main();

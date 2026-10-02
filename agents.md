## Runtime

Deno. No dependencies. No network.

## Commands

Run everything from the repo root. All paths in tasks and scripts are relative to the working directory.

| Command                                                   | Does                                                                                                                                                                                    |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deno task build`                                         | `deno lint -q`, `deno fmt -q`, `test/test.js`, `test/walk.test.js`, `test/fuzz.js 3000 1`, then `build.js`. Stops at the first failure                                                  |
| `deno task fuzz [iterations] [seed]`                      | Seeded idempotence fuzz (default 5000 iterations, seed 1). Prints shrunk failing inputs and exits 1 on any. Run 100000+ iterations over several seeds after any change to `src/core.js` |
| `deno task bench`                                         | Runs `bench/bench.js` on `bench/bench.txt`: 1000 runs of `formatString` with `commonRules` and `en`. Appends `<ISO time> bench.js <ms>ms` to `bench/history` on every run               |
| `deno run -R test/test.js`                                | Core tests only. Every case is also run through a second pass and must be idempotent                                                                                                    |
| `deno run -R test/walk.test.js`                           | HTML rewriter tests only                                                                                                                                                                |
| `deno run -R -W cli/cli.js <files> [--exclude <pattern>]` | The CLI                                                                                                                                                                                 |

Test files print one `x ...` block per failure (input, expected, actual as JSON) and exit 1. Passing is silent.

`deno fmt` rewrites files in place and covers every file type Deno formats, which includes md and json, with `lineWidth` 1440. Check `git diff` after a build for unintended changes, especially to lines containing non-ASCII characters.

## Bench

Recent versions of Alaska have been clocking around 400ms on our bench; make sure it doesn't go up over %5 without good reason.

`bench.txt` is Gutenberg's plain-text version of Ulysses.

## Layout

```
src/core.js         tokenizer + rules; exports { commonRules, formatString }
src/dom.js          live DOM entry: init pass + MutationObserver
cli/walk.js         streaming HTML rewriter; exports { formatHtml }
cli/cli.js          file/glob CLI over formatHtml
build.js            bundles src/core.js + src/dom.js into browser/alaska.js
browser/alaska.js   generated build artifact. Never edit by hand; excluded from lint
test/test.js        runs test/test.json against formatString
test/test.json      core test cases
test/fuzz.js        seeded idempotence fuzz with shrinking (mulberry32); runs prose and math rules
test/walk.test.js   HTML rewriter cases
bench/bench.js      benchmark; bench/bench.txt input; bench/history appended output
deno.json           tasks, fmt and lint config
readme.md           user-facing docs (all usage modes and rules)
agents.md           this file
```

## Architecture

### `src/core.js`

`formatString(text, rules, lang)` runs three phases:

1. **Tokenize** (`tokenize(text)`) into `ws`, `num`, `curr`, `short` (backslash shortcode), `punct`, `sym`, `word`, `other`. Digits and `. ,` form one `num` token; `--` and `...` are single `punct` tokens; `word` is a run of `\p{L}`.
2. **Pre-pass**: currency words (`usd` etc.) are retyped to `curr`; backslash shortcodes are expanded and re-tokenized, so every later rule sees the final shape of the text; quotes are paired with a stack and annotated in `token.quoteInfo` (opening or closing, depth, apostrophe).
3. **Main pass**: one left-to-right loop that branches on token type and mutates tokens in place. The result is `tokens.map((t) => t.value).join("")`.

Rules:

- Within a token-type branch the `else if` chain order is rule precedence. Example: the arrow branch precedes numeric range, which is why `10->20` becomes an arrow.
- `next`, `next2`, `next3`, `prev` are captured at the top of each iteration. After `replaceRange` (a splice) they are stale; the code either `continue`s or adjusts `i`. Do the same in new code.
- Merged tokens must re-tokenize to what they are. Use `replaceTokens(tokens, from, to, value)`, which splices in `tokenize(value)`, whenever a rule emits text a later rule or the next pass could read as number, word or space (ordinals, temperature, percent, fractions, em dash). Resume the loop at the token that still needs its rules (percent and fractions resume at the number). `replaceRange`, one opaque `other` token, is only for output nothing reads: arrows, copyright, numero, currency. Currency re-merges identically on every pass, which is why it may stay opaque.
- A decision that reads a neighbor must read something no later rule changes. The failures found by the fuzz were all this: a guard looking at a `-` that later became an arrow or minus, a percent sign looking at a number that later merged with a currency, a number token absorbing a trailing `.` or `,` only after `%` moved. When a rule declines, make sure pass 2 would decline too.
- `commonRules` holds the prose defaults (every rule true except `placeArithmeticalSymbols`). `mathRules` is the math-zone overlay. `formatString` knows no zones: math behavior follows `rules.placeArithmeticalSymbols`.
- `token.start` and `token.end` are not maintained after mutation. Do not use them.
- Input over `MAX_INPUT_LENGTH` (2,000,000) is returned unchanged.
- `rules` is required and read by key. A missing key is off.
- `lang` is compared as an exact string in the quote branch and in `shortWords[lang]`.
- Formatting must be idempotent: `formatString(formatString(x))` equals `formatString(x)`. A change must not introduce inputs where it fails.

### `src/dom.js`

`init` runs once (immediately or on `DOMContentLoaded`): formats every `.alaska` element, then attaches a `MutationObserver` (`childList`, `subtree`) to every `.alaska-observe` element. `formatNode` walks a subtree with an explicit stack and calls `formatString` per leaf text node. `getRules` merges `commonRules`, inherited rules, the `data-math` overlay and `data-*` values whose key is in `commonRules`. The observer must resolve an added node's inherited `lang` and rules through `getInheritedContext`.

### `cli/walk.js`

`formatHtml(src)` is a single-pass HTML scanner with a frame stack (`tag`, `active`, `skip`, `lang`, `rules`, `foreign`). It handles comments, doctype, void elements, `script`/`style` rawtext, optional end tags (`AUTO_CLOSE`, `TABLE_DEPTH`, `OPTIONAL_END`), and self-closing slashes only in `svg`/`math`. Character references are emitted verbatim and end the current text run, so `formatString` is called per run.

### dom.js and walk.js parity

The same behavior is implemented twice: skip elements, `lang` inheritance, `data-*` rule parsing, `data-math` (`getRules` and `computeRules`; order: inherited, overlay, explicit `data-place-*`), `alaska` and `alaska-skip`. Any change to one must be made in the other. `alaska-observe` exists only in dom.js. Rule names are whitelisted from `commonRules` in both, so a new rule needs no change in either file.

### `build.js`

Reads `src/core.js` and `src/dom.js`, strips with regexes (the first `export {...};` in core.js and the first `import {...} from "...";` in dom.js), and writes `"use strict"` plus both files inside one `{ ... }` block to `browser/alaska.js`. Consequences:

- core.js must keep exactly one `export { ... };` statement (it exports `commonRules`, `formatString`, `mathRules`) and dom.js exactly one import statement from `./core.js`. Any other import or export is not stripped and breaks the bundle.
- Both files share one block scope. Duplicate top-level names between them are a SyntaxError in the bundle.
- dom.js may use core.js top-level names that are not exported, because they share scope in the bundle. Do not rely on it: dom.js must import what it uses.
- The output directory `browser/` is created by `build.js` if missing.

## Adding a rule

1. Add the name to the string list in `commonRules` in `src/core.js`. This makes it default-on (unless it is math-only, like `placeArithmeticalSymbols`) and whitelists its `data-*` attribute in dom.js and walk.js.
2. Implement it in the branch of the main pass that matches the token type it starts from. Mind precedence and stale `next` references.
3. Add three kinds of tests to `test/test.json`:
   - `rule-isolation`: the rule alone (`"rules": { "base": "none", "<rule>": true }`).
   - `rule-negation`: everything on except the rule (`"base": "all", "<rule>": false`), expecting unchanged output.
   - A behavior group with edge cases and interactions. Shortcode categories additionally need a `shortcode-isolation` case showing each category responds only to its own flag.
4. Add a row to the rules table in `readme.md` using codepoint notation.
5. Run `deno task build`, then `deno task fuzz 100000 <seed>` for several seeds. Add any shrunk failure it finds as a regular case in the `idempotence-regressions` group.

## Tests

`test/test.json` is `{ "groups": [{ "name", "description", "cases": [...] }] }`. A case is `{ "desc", "input", "expected", "lang", "rules" }`.

- `rules` is optional: `{ "base": "all" | "none" | "math", ...overrides }`. `base` defaults to `"all"` (`commonRules`, the prose defaults); `"none"` sets all rules false first; `"math"` is `commonRules` plus `mathRules`. Overrides are rule names mapped to booleans.
- `lang` is passed to `formatString` as-is.

`test/walk.test.js` holds an array of `{ desc, input, expected }` for `formatHtml` and always runs with default rules. Every case must also be idempotent: `formatHtml(formatHtml(x)) === formatHtml(x)`. Cover HTML structure changes (new end-tag handling, new skipped elements) and `data-math` there, not in test.json.

dom.js has no automated tests. Keep its behavior in step with walk.js by reading both.

## Unicode policy

Symbols, punctuation, spacing characters and glyphs are written as `\uXXXX` escapes (or `\u{XXXXX}` above U+FFFF) in source, tests and generated docs input. Docs prose uses `{U+XXXX}` notation. Natural-language word lists (`shortWords.ru`) and natural-language test text stay literal.

- Never write raw NBSP, narrow NBSP, hair space, word joiner, curly quotes, dashes or lookalike glyphs. Never let a formatter or editor normalize them.
- Before touching a line that contains such characters, print the exact codepoints (for example `grep -nP '[^\x00-\x7F]' <file>`) and verify the change.
- Lines you add or modify follow the policy. Do not rewrite unrelated lines to conform unless the task is that migration.

## Style

2-space indent, no hard wrap, no unnecessary comments. Match existing code.

## Docs upkeep

- `readme.md` rules table must list every key of `commonRules` and match actual output. Verify by running the input through `formatString` and printing codepoints.
- When behavior changes, update `readme.md` in the same change. When files move or tasks change, update the Layout and Commands sections here.

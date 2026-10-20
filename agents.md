## Runtime

Deno. No dependencies. No network.

## Principles

Alaska is not smart. It does not guess, repair or interpret text. It does a small set of simple things and does them well. When an input is ambiguous or an edge case has no clear answer, do less: leave the text as written. A missed edit is acceptable; a wrong edit is not. This applies to new rules, to tightening existing ones, and to language handling: an unsupported or missing `lang` means no language-dependent rule fires.

`en` and `ru` are supported, `ko` has typographic quotes only (no short-word list, no numeric range, no other language-dependent rule), and `ja` is planned (it stays unchanged for quotes until its convention, corner brackets, is decided). When planning or revising any behavior, think in terms of all four. Language-free rules (`placeNumberNbspWord`, `placeMinusSign` and the rest) currently apply to every language, `ja` and `ko` included, and `test/rule-table.json` pins that. `placeEmdash` is language-dependent (`en` and `ru`): `ja` and `ko` keep dashes as written until their conventions are decided. Before adding `ja` or `ko`, decide per language-free rule whether it stays on for them. Language-free rules must not insert spacing, because conventions differ (a temperature takes no space in `ja` and `ko`), which is why `placeTemperatureSign` inserts none. `placeHyphen` is language-free but script-gated (Latin or Cyrillic on both sides), so it already leaves `ja` and `ko` compounds alone.

`placeNbsp` has no `ja` or `ko` list by design: Japanese uses no word spaces and Korean attaches particles to the preceding word, and no short-word convention is known in either. Its `&` branch follows the same gate (`shortWords[lang]`), so `Tom & Jerry` is unchanged in `ja`, `ko` and no language. `ru` particles that follow a word (`бы`, `ли`, `же`) stay out of the list: they bind to the word before them, which is deferred as new behavior.

Alaska should be reasonably fast. Recent versions of Alaska have been clocking around 400ms on our bench; we want to make sure it doesn't go up over %5 without good reason. `bench.txt` is Gutenberg's plain-text version of Ulysses.

## Triage

Every finding ends up as exactly one of these, so no tracker file is needed:

1. **Fix**: a wrong edit on realistic prose, or an inconsistency between rules.
2. **Readme Scope line**: a missed or ambiguous edit that a reader would plausibly expect to be handled.
3. **Regression test only**: shapes the fuzz found that nobody would write.
4. **Nothing**: everything else.

## Spacing

Alaska never inserts whitespace into the author's text, and a rule converts only a single regular space (`placeNumberNbspWord`, `placeNbsp`, `formatInitials`, the dash rules). The one documented exception is `placeMultiplicationSign`, which also converts a single no-break space to `{U+202F}`. Newlines, repeated spaces, tabs and other space characters are left as written, so a hard-wrapped source keeps its line breaks. A word joiner (`{U+2060}`) is not whitespace.

## ja and ko checklist

Undecided items to settle before `ja` or `ko` support lands. Decide each per language, then pin the result in `languages.json`.

- [ ] **ko quotes**: `'좋아'` becomes `"좋아"` (double quotes), which changes the author's chosen quote type. Leaning towards mapping by character in `ko` rather than by depth (low confidence).
- [ ] **Line-start dash**: `- item` becomes `{U+2014} item` in `en`, which turns plain-text bullets into dashes; it is a dialogue convention in `ru`. Decide per language. When touching it, allow an indented dash at the start of a text (`- Hi`): `carry.prev` is undefined only at a true block start, so `carried === undefined` tells a true start from a piece start.
- [ ] **Currency tokens**: add `{U+20A9}` and `{U+FFE5}` to the `curr` tokens, and re-run the minus, em dash, quote and unit-glue fuzz with them in the alphabet.
- [ ] **Corner brackets**: `{U+300C}-5{U+300D}` is a `ja` quote and minus item; `ja` quotes are unchanged until it is decided.
- [x] **Temperature**: resolved, `placeTemperatureSign` inserts no space.

## Commands

Run everything from the repo root. All paths in tasks and scripts are relative to the working directory.

| Command                                                   | Does                                                                                                                                                                                                          |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deno task build`                                         | `deno lint -q`, `deno fmt -q`, `test/test.js`, `test/carry.api.test.js`, `test/walk.test.js`, `test/fuzz.js 3000 1`, then `build.js`. Stops at the first failure                                              |
| `deno task fuzz [iterations] [seed]`                      | Seeded idempotence fuzz (default 5000 iterations, seed 1). Prints shrunk failing inputs and exits 1 on any. Run 100000+ iterations over several seeds after any change to `src/core.js`                       |
| `deno task bench`                                         | Runs `bench/bench.js` on `bench/bench.txt`: 1000 runs of `formatString` with `commonRules` and `en`. Appends `<ISO time> bench.js <ms>ms` to `bench/history` on every run                                     |
| `deno run -R test/test.js`                                | Core tests: validates the fixtures, then runs `test/cases/*.json` and `test/rule-table.json` (isolation, negation, five-language matrix). Every case is also run through a second pass and must be idempotent |
| `deno run -R test/carry.api.test.js`                      | Carry API checks that are not string cases: oversize input, empty text, `resetCarry`                                                                                                                          |
| `deno run -R test/walk.test.js`                           | HTML rewriter tests only                                                                                                                                                                                      |
| `deno run -R -W cli/cli.js <files> [--exclude <pattern>]` | The CLI                                                                                                                                                                                                       |

Test files print one `x ...` block per failure (input, expected, actual as JSON) and exit 1. Passing is silent.

`deno fmt` rewrites files in place and covers every file type Deno formats, which includes md and json, with `lineWidth` 1440. Check `git diff` after a build for unintended changes, especially to lines containing non-ASCII characters.

## Layout

```
src/core.js         tokenizer + rules; exports { blockTags, commonRules, formatString, mathRules, resetCarry }
src/dom.js          live DOM entry: init pass + MutationObserver
cli/walk.js         streaming HTML rewriter; exports { formatHtml }
cli/cli.js          file/glob CLI over formatHtml
build.js            bundles src/core.js + src/dom.js into browser/alaska.js
browser/alaska.js   generated build artifact. Never edit by hand; excluded from lint
test/test.js        runner: loads, validates and runs the fixtures through harness.js
test/harness.js     fixture loading and validation, case and rule-table checks, failure output
test/cases/*.json   core test cases, one file per topic (dashes, numbers, math, quotes, spacing, shortcodes, languages, carry, guards, regressions, limitations)
test/rule-table.json  one row per rule: isolation, negation and language matrix
test/carry.api.test.js  carry API checks that are not string cases
test/fuzz.js        seeded idempotence fuzz with shrinking (mulberry32); runs prose and math rules, segmented runs with one carry, and split-equivalence checks for quotes (in `en`, `ru`, `en-US` and `ko`), the numeric range (in `en` and `ru`), the em dash with quotes on (in `en` and `ru`) and minus; `quoteSafe` skips a boundary after a quote followed only by word characters, whitespace, `%` or currency signs, because the pre-pass looks ahead across it; `rangeSafe` skips a boundary next to a `-` and a boundary inside a number (a digit, `.` or `,` on both sides), because the range check reads the next hyphen and the whole number; `dashSafe` adds to `quoteSafe` a skip of a boundary after a `-` or em dash (and any whitespace) or before one (after any whitespace), because the em dash decision reads two tokens to the left and the next non-space token to the right and the carry holds only one token; `minusSafe` skips a boundary after `-`, after a quote (the carry holds one token, so the run behind it is hidden) and after `-` plus a currency sign (a piece-final `-$` has no digit yet), and the zone run (`placeArithmeticalSymbols` on) also skips texts with a spaced `-`, `*` or `/` (`zoneSafe`), because `applyArithmeticOp` cannot see an operator across pieces
test/walk.test.js   HTML rewriter cases
bench/bench.js      benchmark; bench/bench.txt input; bench/history appended output
deno.json           tasks, fmt and lint config
readme.md           user-facing docs (all usage modes and rules)
agents.md           this file
```

## Architecture

### `src/core.js`

`formatString(text, rules, lang)` runs four phases:

1. **Tokenize** (`tokenize(text)`) into `ws`, `num`, `curr`, `short` (backslash and ASCII letters of either case), `punct`, `sym`, `word`, `other`. Digits and `. ,` form one `num` token; `--` and `...` are single `punct` tokens; `word` is a run of `\p{L}`.
2. **Pre-pass**: backslash shortcodes are expanded and re-tokenized, and a `word` produced by an expansion is merged with an adjacent `word`, as tokenizing the output would, so every later rule sees the final shape of the text; quotes are paired with a stack and annotated in `token.quoteInfo` (opening or closing, depth, apostrophe).
3. **Main pass**: one left-to-right loop that branches on token type and mutates tokens in place.
4. **Hyphen pass** (`glueHyphens`, only when `placeHyphen` is on): one scan over the final tokens, before the carry snapshot. It is a separate pass because its identifier guard reads the whole whitespace-delimited run, including tokens to the right that later rules rewrite; on final tokens the decision is the same on pass 2. It reads one run at a time and joins a string only for a run with a candidate, so it stays linear. It does not read the carry: a run split by an inline element is judged piece by piece (readme Scope). The result is `tokens.map((t) => t.value).join("")`.

Rules:

- Within a token-type branch the `else if` chain order is rule precedence. Example: the arrow branch precedes numeric range, which is why `10->20` becomes an arrow.
- `next`, `next2`, `prev` are captured at the top of each iteration. After `replaceRange` (a splice) they are stale; the code either `continue`s or adjusts `i`. Do the same in new code.
- Merged tokens must re-tokenize to what they are. Use `replaceTokens(tokens, from, to, value)`, which splices in `tokenize(value)`, whenever a rule emits text a later rule or the next pass could read as number, word or space (temperature, em dash). Resume the loop at the token that still needs its rules. `replaceRange`, one opaque `other` token, is only for output nothing reads: arrows.
- A decision that reads a neighbor must read something no later rule changes. The failures found by the fuzz were all this: a guard looking at a `-` that later became an arrow or minus. `isUnitSign` (the `%` and currency-sign glue in `placeNumberNbspWord`) is built around it: its number lookahead skips currency signs (shared with the quote marker's `numberAhead`), and it declines on any neighbor of the sign other than punctuation or a space. When a rule declines, make sure pass 2 would decline too. A glue that fires is safe on pass 2, because the space is no longer a regular space; a decline whose reason disappears is not.
- `commonRules` holds the prose defaults (every rule true except `placeArithmeticalSymbols`). `mathRules` is the math-zone overlay. A zone never rewrites whitespace around an operator: `applyArithmeticOp` and the multiplication rule change the glyph only, `placeNbsp` is off, and `placeNumberNbspWord` declines before an `x` that the multiplication rule turns into an operator, so the author's space survives. `placeNumberNbspWord` otherwise stays on in a zone (a unit is not an operator), so `x = 3 m` still converts its single regular space. `formatString` knows no zones: math behavior follows `rules.placeArithmeticalSymbols`.
- `token.start` and `token.end` are not maintained after mutation. Do not use them.
- Shortcode lookup is case-sensitive (`\Delta` is not `\delta`) and each key lives in exactly one of `mathShortcodes`, `greekShortcodes`, `ornamentShortcodes`, `emoticonShortcodes`, `arrowShortcodes`, `currencyShortcodes`, `shapeShortcodes`, each gated by its own rule. A key in two tables would make a category respond to another category's flag. Names follow LaTeX or unicode-math where one exists; a glyph or name deviation is documented in readme.md. The deliberate name deviations are `\ruble` and `\tenge` (no LaTeX name) and `\registered`, `\trademark` and `\phonogram` (LaTeX: `\textregistered`, `\texttrademark`, `\textcircledP`); `\copyright` is the LaTeX name. The one deliberate exception is `shapeMathShortcodes` (`\star`, `\diamond`): a fallback layer consulted first when `placeArithmeticalSymbols` is on and still gated by `placeShapes`. Its keys duplicate `shapeShortcodes`, so any key-uniqueness test must exempt it.
- `curr` tokens are `$`, `\u20AC`, `\u00A5`, `\u00A3`, `\u20BD`, `\u20B8`. No rule moves or retypes them; they matter to the minus, em dash, quote and unit-glue lookaheads. `\u20A9` and `\uFFE5` are not `curr` tokens: decide with ja/ko support, because adding one changes those lookaheads for that language.
- Input over `MAX_INPUT_LENGTH` (2,000,000) is returned unchanged.
- `rules` is required and read by key. A missing key is off.
- `lang` is read twice at the top of `formatString`. `quoteStyle(rawLang)` returns `"single"`, `"double"` or `"ru"` (or `undefined`): primary subtag `ru` is `"ru"`, `ko` is `"double"`, `en` is `"double"` when its region (the first two-letter alphabetic subtag after the primary one, stopping at a one-letter subtag) is in `doubleQuoteRegions` (`us`, `ca`) and `"single"` otherwise, everything else is `undefined`. `normalizeLang` then reduces `lang` to the primary subtag kept only if it is in `supportedLangs` (`en`, `ru`), otherwise `undefined`; only `shortWords` reads it, and it guards that lookup against `constructor` and `__proto__`. `ranges` (the numeric range rule on and `rangeLangs.has(lang)`) gates the range branch; `rangeLangs` is a separate set (`en`, `ru`), so adding a language to `supportedLangs` for short words does not switch ranges on, and it must stay a subset of `supportedLangs`, because `lang` is already normalized when it is read. Adding a range language means editing `rangeLangs`. `emdash` (the em dash rule on and `emdashLangs.has(lang)`) gates `placeDash`; `emdashLangs` (`en`, `ru`) is a third set under the same subset rule. `quotes` (the quote rule on and `style` defined) gates both the quote pairing pre-pass and the quote branch, so an unsupported language leaves quotes and apostrophes alone. `quoteGlyphs[style]` holds the four glyphs, indexed by depth parity and opening or closing. Adding a quote
  language means editing `quoteStyle` and, for a new style, `quoteGlyphs`; adding a short-word language means editing `supportedLangs` and `shortWords`.
- Quote classification happens in the pairing pre-pass, on the original tokens, so a quote that stays straight must stay straight on the second pass. A declined quote gets no `quoteInfo` and the main pass leaves it alone. Apostrophes (`quoteInfo.isApostrophe`) are decided first: `'` between Latin or Cyrillic letters, after a Latin or Cyrillic letter when the stack top is not `'`, before `\d\ds`, and before a lowercase word of `elisionWords` that is not followed by `'` or `\u2019`. Then `'n'` as a pair (the loop skips the second mark), then a quote after a number whose stack top is not the same character, then an isolated quote (whitespace on both sides), then the dash rule (`dashes`: `--`, em dash, en dash: opens when a word follows), then the declined-opener marker, then the usual opener or closer decision. A closer with nothing open is declined, also right after `--`. The marker is a stack entry `{char, kept: true}` pushed by a `'` that would open in whitespace, start or punctuation context (not after a pending opener, which is a glyph on the next pass) before a number, where "before a number" skips any run of currency signs, `%` and whitespace (`numberAhead`). The skip list covers currency signs and `%` because readme.md documents `'$5 is cheap,'` and `'%5 is cheap,'` as left alone; no rule rewrites them. The closer that pops a marker is declined too, so `'99 problems'` never converts half. Depth counts only
  entries that are not markers. Every lookahead here (`next`, `tokens[i + 2]`, `numberAhead`) must read something no later step changes: when you add one, run the fuzz with the new tokens in the alphabet.
- `isRangeHyphen` decides a numeric range from the tokens around the hyphen. Its lookahead (a `-` directly followed by a number) reads a hyphen that no rule changes, because a hyphen with a number on both sides stays `-` in every rule, so pass 2 decides the same way. Its lookbehind reads a token an earlier rule may already have rewritten, and pass 2 sees the same rewritten token. A number split by a piece boundary changes the result, and the fuzz skips it.
- `placeDash(tokens, i, before)` decides every em dash (`-`, `--` and a typed U+2014) behind the `emdash` gate and returns true when it edited. It changes glyphs only; the one whitespace edit is a regular space before the dash becoming U+00A0, so it never re-tokenizes. It reads only classified tokens (`dashLeft`, `dashRight`: word, number, currency sign, brackets, sentence punctuation, a quote with `quoteInfo`) and never an `other` token, with one exception: a typed `{U+00BB}` or `{U+201D}` counts as a closing left neighbor (`typedClosers`, and `dashCloser` for a spaced single hyphen, which also takes a classified closing quote). Pass 1 accepts a straight quote the pre-pass classified as a closer and pass 2 accepts the glyph it became only for these two, so a decline in pass 1 never turns into an accept in pass 2. Typed `{U+2019}` (also an apostrophe) and `{U+201C}` (an opener in `en`) stay out. Any other rule output (`{U+2192}`, `{U+2212}`, `{U+00D7}`) or typed glyph on a neighbor would make pass 2 decide differently from pass 1 (`a--->b` becomes `a--{U+2192}b` and must stay so). It reads `before` only for the line start and declines at a piece start. Missed edits at piece edges, for an indented dash at the start of a text and for typed `{U+2019}` and `{U+201C}` are pinned in the `em-dash-misses` group.
- Formatting must be idempotent: `formatString(formatString(x))` equals `formatString(x)`. A change must not introduce inputs where it fails.
- `carry` (4th argument, optional plain `{}`) lets a caller format the pieces of one block in order. Core stores `carry.stack` (the open-quote stack, entries `{depth, char, style}` or the marker `{char, kept: true}`) and `carry.prev` (`{type, value, quoteInfo}` of the last non-empty token, taken after the main pass, never before: a pre-pass snapshot is not idempotent; since the em dash stopped rewriting a trailing `--`, a random search over two-piece splits finds no input where the timing is visible, so keep it after the main pass anyway). Without `carry` nothing changes. `resetCarry(carry)` clears it in place; callers do it at every block boundary. Only four guards read across the boundary, all through `prev ?? carried`: the quote pairing pre-pass (every `prev` read), the `placeMinusSign` lead check (`minusStart` skips back over a run of opening quotes, compared by value so it works on straight and converted glyphs, and reads `carried` only when the run reaches the piece start, so a quote that ends the previous piece hides what precedes it), the `placeDash` line-start branch (`before`), and the `isRangeHyphen` lookbehind (`tokens[i - 2] ?? carried`, read only when the left number is the first token of the piece; it declines after a word or a `-`). Every other rule keeps `tokens[i - 1]` and declines at a piece start, which is why a new rule must not treat a missing `prev` as permission. A closing quote takes its
  glyphs from the opener's `style` (`quoteInfo.style`). Empty text leaves the carry untouched; oversize input resets it. `blockTags` is the one list of block-level tag names, shared by dom.js and walk.js.

### `src/dom.js`

`init` runs once (immediately or on `DOMContentLoaded`): formats every `.alaska` element, then attaches a `MutationObserver` (`childList`, `subtree`) to every `.alaska-observe` element. `formatNode` walks a subtree with an explicit stack and calls `formatString` per leaf text node. `getRules` merges `commonRules`, inherited rules, the `data-math` overlay and `data-*` values whose key is in `commonRules`. Only the outermost `.alaska` is a root: `init` skips any `.alaska` that has an `.alaska` ancestor (`formatNode` already applies each descendant's `lang` and `data-*`), and the observer resolves an added node's `lang` and rules through `outermostRoot` and `getContext`, which applies `getRules` from that root down to the node's element. `resolveLang` returns the `lang` of the nearest ancestor-or-self with a non-empty `lang` attribute. Read `lang` with `getAttribute("lang")`, not the `.lang` property, which exists only on HTMLElement.

### `cli/walk.js`

`formatHtml(src)` is a single-pass HTML scanner with a frame stack (`tag`, `active`, `skip`, `lang`, `rules`, `foreign`). It handles comments, doctype, void elements, `script`/`style` rawtext, optional end tags (`AUTO_CLOSE`, `TABLE_DEPTH`, `OPTIONAL_END`), and self-closing slashes only in `svg`/`math`. Character references are emitted verbatim and end the current text run, so `formatString` is called per run.

### dom.js and walk.js parity

The same behavior is implemented twice: skip elements, `lang` inheritance, `data-*` rule parsing, `data-math` (`getRules` and `computeRules`; order: inherited, overlay, explicit `data-place-*`), `alaska` and `alaska-skip`, nested `.alaska` (only the outermost is a root; walk.js gets this from the sticky `active` flag). the carry protocol (one carry per root; `resetCarry` at the start and end of every `blockTags` element, at a new root and at a block skip element; `formatString` fed and output discarded for `<br>` (`"\n"`), an inline skip element (`"x"`, once, only when its parent is active and not skipped) and, in walk.js, a character reference (its decoded character if whitespace, else `"x"`); `script`, `style`, comments and other void elements are transparent). Any change to one must be made in the other. `alaska-observe` exists only in dom.js, including the observer rule: a mutation record starts with a fresh carry; unless the target is a block and `previousSibling` is null, the carry is seeded with `"x"` and quotes are off for added nodes that are not blocks. Rule names are whitelisted from `commonRules` in both, so a new rule needs no change in either file.

Known divergence, documented in the readme Scope section and not to be unified: walk.js passes a character reference through and ends the text run at it, so the core sees `&amp;` as a word there and the decoded `&` in dom.js (`Tom &amp; Jerry`, `-&gt;`).

### `build.js`

Reads `src/core.js` and `src/dom.js`, strips with regexes (the first `export {...};` in core.js and the first `import {...} from "...";` in dom.js), and writes `"use strict"` plus both files inside one `{ ... }` block to `browser/alaska.js`. Consequences:

- core.js must keep exactly one `export { ... };` statement (it exports `blockTags`, `commonRules`, `formatString`, `mathRules`, `resetCarry`) and dom.js exactly one import statement from `./core.js`. Any other import or export is not stripped and breaks the bundle.
- Both files share one block scope. Duplicate top-level names between them are a SyntaxError in the bundle.
- dom.js may use core.js top-level names that are not exported, because they share scope in the bundle. Do not rely on it: dom.js must import what it uses.
- The output directory `browser/` is created by `build.js` if missing.

## Adding a rule

1. Add the name to the string list in `commonRules` in `src/core.js`. This makes it default-on (unless it is math-only, like `placeArithmeticalSymbols`) and whitelists its `data-*` attribute in dom.js and walk.js.
2. Implement it in the branch of the main pass that matches the token type it starts from. Mind precedence and stale `next` references.
3. Add tests:
   - A row in `test/rule-table.json`. The harness fails if a rule has no row. It runs the rule alone (`expected`), everything else on with the rule off (`off`, default the input; `off` must differ from `expected`), and, unless the row is `"langDependent": true`, the same isolation run for `en`, `ru`, `ja`, `ko` and no language, which must all agree. For a math-only rule set `"negationBase": "math"`.
   - A behavior group with edge cases and interactions in the matching `test/cases/*.json` file. Shortcode categories additionally need a `shortcode-isolation` case showing each category responds only to its own flag.
4. Add a row to the rules table in `readme.md` using codepoint notation.
5. Put the new rule's trigger shapes in the `alphabet` and `focused` arrays of `test/fuzz.js`: the fuzz cannot find a branch it cannot build. Break the new branch on purpose and confirm the fuzz fails (a mutant of the closing-quote dash survived until `-` was in the alphabet).
6. Run `deno task build`, then `deno task fuzz 100000 <seed>` for several seeds. Add any shrunk failure it finds as a regular case in the `idempotence-regressions` group.

## Tests

`test/cases/*.json` are `{ "groups": [{ "name", "description", "cases": [...] }] }`, one file per topic. A case is `{ "desc", "input", "expected", "lang", "rules" }`, or `{ "desc", "segments", "expected", "lang", "langs", "rules" }` where `segments` are formatted in order with one carry, `expected` is an array, and `langs` optionally overrides `lang` per segment. Every case is reformatted once more (segments with a fresh carry) and must not change.

- `rules` is optional: `{ "base": "all" | "none" | "math", ...overrides }`. `base` defaults to `"all"` (`commonRules`, the prose defaults); `"none"` sets all rules false first; `"math"` is `commonRules` plus `mathRules`. Overrides are rule names mapped to booleans.
- `lang` is passed to `formatString` as-is.
- `test/harness.js` fails the run, before running any case, on: an unknown rule name or case key, a missing `expected` or one of the wrong shape, a duplicate case (same input, segments, lang and rules), a duplicate `desc` in a group, a missing group description, and any raw non-ASCII character that is not a letter (write symbols and spacing as `\uXXXX`).
- A case is kept only if it pins a behavior documented in `readme.md`, a distinct branch, a fuzz regression, or a carry or walk contract. Do not restate a rule-table row or repeat an input across groups.
- Language-dependent behavior gets one group per language in `languages.json`. `de` and `ja` currently pin "unsupported, unchanged" and `ko` pins "quotes only"; those cases change on purpose when support lands. `english-regions` pins the region rule.
- The behavior listed in the readme Scope section is pinned by ordinary cases in the topical files (`numeric-range-shapes`, `quotes-ambiguities`, `em-dash-misses`, `shortcodes-in-prose`, `carry-boundaries` and a few cases inside other groups). Fixing one means changing its test on purpose.
- Coverage gate: with `test/test.js` and `test/carry.api.test.js`, only the `if (!tokens[j].value) continue;` guard in the carry snapshot of `src/core.js` (defensive, no input reaches it) may stay unreached; with `test/walk.test.js` alone nothing in `cli/walk.js` may. Merge per-process V8 coverage by source offset, not by line percentage. Do not delete the guard to raise a percentage: they make a bug skip an edit instead of throwing at render time.

`test/walk.test.js` holds an array of `{ desc, input, expected }` for `formatHtml` and always runs with default rules. Every case must also be idempotent: `formatHtml(formatHtml(x)) === formatHtml(x)`. Cover HTML structure changes (new end-tag handling, new skipped elements) and `data-math` there, not in `test/cases`.

dom.js has no automated tests. Keep its behavior in step with walk.js by reading both.

## Unicode policy

Symbols, punctuation, spacing characters and glyphs are written as `\uXXXX` escapes (or `\u{XXXXX}` above U+FFFF) in source, tests and generated docs input. Docs prose uses `{U+XXXX}` notation. Natural-language word lists (`shortWords.ru`) and natural-language test text stay literal.

- The test harness rejects raw non-letter, non-ASCII characters in fixtures.
- Never write raw NBSP, narrow NBSP, hair space, word joiner, curly quotes, dashes or lookalike glyphs. Never let a formatter or editor normalize them.
- Before touching a line that contains such characters, print the exact codepoints (for example `grep -nP '[^\x00-\x7F]' <file>`) and verify the change.
- Lines you add or modify follow the policy. Do not rewrite unrelated lines to conform unless the task is that migration.

## Style

2-space indent, no hard wrap, no unnecessary comments. Match existing code.

## Docs upkeep

- `readme.md` rules table must list every key of `commonRules` and match actual output. Verify by running the input through `formatString` and printing codepoints.
- When behavior changes, update `readme.md` in the same change. When files move or tasks change, update the Layout and Commands sections here.

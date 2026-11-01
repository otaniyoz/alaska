## Runtime

Deno. No dependencies. No network.

## Principles

Alaska is not smart. It does not guess, repair or interpret text. When an input is ambiguous or an edge case has no clear answer, do less: leave the text as written. A missed edit is acceptable; a wrong edit is not. This applies to new rules, to tightening existing ones, and to language handling: an unsupported or missing `lang` means no language-dependent rule fires.

`en` and `ru` are supported, `ko` has typographic quotes only, `ja` is planned. When planning or revising any behavior, think in terms of all four.

- Language-free rules (`placeNumberNbspWord`, `placeMinusSign` and the rest) currently apply to `ja` and `ko` too; `test/rule-table.json` pins that. Before adding either language, decide per language-free rule whether it stays on.
- Language-free rules must not insert spacing, because conventions differ (a temperature takes no space in `ja` and `ko`).
- `placeEmdash` and `placeNumericRange` are `en`/`ru` only until the `ja`/`ko` conventions are decided. `placeHyphen` is script-gated (Latin or Cyrillic both sides), so it already leaves `ja`/`ko` compounds alone.
- `placeNbsp` has no `ja`/`ko` list by design: Japanese uses no word spaces, Korean attaches particles to the preceding word. Its `&` branch follows the same gate (`shortWords[lang]`). `ru` particles that follow a word (`бы`, `ли`, `же`) stay out of the list; binding them to the previous word is deferred.
- User docs treat `ja` and `ko` as unsupported and do not document live `ko` quotes. The exact current behavior is pinned in `languages.json`.

Performance: bench is about 300ms; do not let it rise over 5% without good reason. `bench/bench.txt` is Gutenberg's plain text of Ulysses.

## Triage

Every finding is exactly one of:

1. **Fix**: a wrong edit on realistic prose, or an inconsistency between rules.
2. **Readme "does not do" line**: a missed or ambiguous edit a reader would plausibly expect handled.
3. **Regression test only**: shapes the fuzz found that nobody would write.
4. **Nothing.**

## Spacing

Alaska never inserts whitespace into the author's text. A rule converts only a single regular space (`placeNumberNbspWord`, `placeNbsp`, `formatInitials`, the dash rules). The one exception is `placeMultiplicationSign`, which also converts a single no-break space to `{U+202F}`. Newlines, repeated spaces, tabs and other space characters are left as written, so hard-wrapped source keeps its line breaks. A word joiner (`{U+2060}`) is not whitespace.

## ja and ko checklist

Undecided. Settle each per language, then pin the result in `languages.json`.

- [ ] **ko quotes**: `'좋아'` becomes `"좋아"`, changing the author's quote type. Leaning towards mapping by character rather than depth (low confidence).
- [ ] **Line-start dash**: `- item` becomes `{U+2014} item` in `en`, turning plain-text bullets into dashes; in `ru` it is a dialogue convention. Decide per language. When touching it, allow an indented dash at the start of a text: `carry.prev` is undefined only at a true block start.
- [ ] **Currency tokens**: add `{U+20A9}` and `{U+FFE5}` to `curr`, then re-run the minus, em dash, quote and unit-glue fuzz with them in the alphabet.
- [ ] **Corner brackets**: `{U+300C}-5{U+300D}` is a `ja` quote and minus item; `ja` quotes stay unchanged until decided.
- [ ] **Numeric range**: `ja`/`ko` write ranges with `{U+301C}` or `~`, so `rangeLangs` stays `en`, `ru`.
- [ ] **Em dash**: Japanese commonly uses a doubled horizontal bar `{U+2015}{U+2015}`, which `placeEmdash` does not apply, so `emdashLangs` stays `en`, `ru`.
- [ ] **User docs**: when support lands, update the readme Language section and table.

## Commands

Run from the repo root.

- `deno task build`: lint, fmt, `test/test.js`, `test/carry.api.test.js`, `test/rules.api.test.js`, `test/walk.test.js`, `test/fuzz.js 3000 1`, then `build.js`. Stops at the first failure.
- `deno task fuzz [iterations] [seed]`: seeded idempotence fuzz (defaults 5000, 1). After any change to `src/core.js`, run 100000+ iterations over several seeds.
- `deno task bench`: 1000 runs of `formatString` (`commonRules`, `en`) on `bench/bench.txt`; appends `<ISO time> bench.js <ms>ms` to `bench/history` on every run.
- Single tests: `deno run -R test/test.js`, `test/carry.api.test.js`, `test/rules.api.test.js`, `test/walk.test.js`.

Failures print one `x ...` block each (input, expected, actual) and exit 1; passing is silent. `deno fmt` also rewrites md and json at `lineWidth` 1440: check `git diff` after a build, especially lines with non-ASCII characters.

## Layout

```
src/core.js           tokenizer + rules; exports { blockTags, commonRules, formatString, mathRules, resetCarry, resolveRules }
src/dom.js            live DOM entry: init pass + MutationObserver
cli/walk.js           streaming HTML rewriter; exports { formatHtml }
cli/cli.js            file/glob CLI over formatHtml
build.js              bundles core.js + dom.js into browser/alaska.js (generated, never edit, excluded from lint)
test/test.js          runner for the fixtures, via harness.js
test/harness.js       fixture loading, validation, case and rule-table checks
test/cases/*.json     core cases, one file per topic
test/rule-table.json  one row per rule: isolation, negation, language matrix
test/carry.api.test.js, test/rules.api.test.js, test/walk.test.js
test/fuzz.js          seeded idempotence fuzz with shrinking; split runs skip boundaries the one-token carry cannot see (quoteSafe, rangeSafe, dashSafe, minusSafe, zoneSafe)
bench/                bench.js, bench.txt, history
```

## core.js

`formatString` runs four phases: tokenize; pre-pass (shortcode expansion, quote pairing); main pass (one left-to-right loop that branches on token type and mutates tokens in place); hyphen pass (`glueHyphens`, separate because its identifier guard reads the whole whitespace-delimited run, including tokens to the right that later rules rewrite).

Invariants:

- **Idempotence.** `formatString(formatString(x))` must equal `formatString(x)`. This is what the fuzz checks and what most bugs break.
- **Stable neighbors.** A decision that reads a neighbor must read something no later rule changes. When a rule declines, pass 2 must decline too; a rule that fires is safe, because its output no longer matches. Every fuzz failure so far was a guard reading a token that later became an arrow, minus or other rule output. `numberAhead` serves both the quote marker and `isUnitSign`: change one, re-check the other.
- **Precedence** is the `else if` order within a token-type branch (the arrow branch precedes numeric range, so `10->20` is an arrow).
- **Stale references.** `next`, `next2` and `prev` are captured at the top of each iteration and are stale after a splice: `continue` or adjust `i`.
- **Re-tokenizing.** Use `replaceTokens` (splices `tokenize(value)`) when a rule emits text a later rule or pass could read as number, word or space (temperature, shortcode output). Use `replaceRange` (one opaque `other` token) only for output nothing reads (arrows). `token.start` and `token.end` are not maintained after mutation.
- **Quotes** are classified in the pre-pass on the original tokens. A quote left straight must stay straight on pass 2; a declined quote gets no `quoteInfo`. The kept marker (`{char, kept: true}`) declines both a `'` that would open before a number and its closer, so a pair never converts half; it is not counted in depth. Any new lookahead here needs the new tokens in the fuzz alphabet.
- **Dashes.** `placeDash` changes glyphs only; its one whitespace edit is a regular space before the dash becoming U+00A0. It reads only classified tokens (never rule output such as `{U+2192}` or `{U+2212}`, or `a--->b` would decide differently on pass 2), with one exception: typed `{U+00BB}` and `{U+201D}` count as closing left neighbors (`typedClosers`, `dashCloser`). `{U+2019}` (also an apostrophe) and `{U+201C}` (an opener in `en`) stay out.
- **Numeric range.** `isRangeHyphen` lookahead (a hyphen directly followed by a number) reads a hyphen no rule changes. The lookbehind reads an already-rewritten token, which pass 2 sees identically. A number split across pieces changes the result; the fuzz skips it.
- **Math zone.** `formatString` knows no zones: behavior follows `rules.placeArithmeticalSymbols`. A zone never rewrites whitespace around an operator; `placeNumberNbspWord` declines before an `x` that becomes a multiplication operator, so the author's space survives.
- **Shortcode tables.** Lookup is case-sensitive. Each key lives in exactly one table, each gated by its own rule, or a category would respond to another's flag. The one exception is `shapeMathShortcodes` (`\star`, `\diamond`), a fallback layer consulted first when `placeArithmeticalSymbols` is on and still gated by `placeShapes`; key-uniqueness tests must exempt it. Names follow LaTeX or unicode-math where one exists; deliberate deviations are `\ruble`, `\tenge`, `\registered`, `\trademark`, `\phonogram`, and the outlined `\spadesuit`/`\clubsuit`.
- **`curr` tokens** are `$`, `{U+20AC}`, `{U+00A5}`, `{U+00A3}`, `{U+20BD}`, `{U+20B8}`. No rule moves or retypes them; they matter only to the minus, em dash, quote and unit-glue lookaheads.

Language gating:

- `quoteStyle(rawLang)` returns `"single"`, `"double"`, `"ru"` or `undefined`; `normalizeLang` then keeps the primary subtag only if it is in `supportedLangs`, and guards against `constructor` and `__proto__`.
- `rangeLangs` and `emdashLangs` are separate sets and must stay subsets of `supportedLangs`. Adding a short-word language edits `supportedLangs` and `shortWords`; a range or dash language edits its own set; a quote language edits `quoteStyle` and, for a new style, `quoteGlyphs`.

Carry (`carry.stack`, `carry.prev`):

- `carry.prev` is the last non-empty token, snapshotted after the main pass; a pre-pass snapshot is not idempotent.
- Only four guards read across a piece boundary, all via `prev ?? carried`: the quote pre-pass, the `placeMinusSign` lead check (`minusStart` skips back over opening quotes, so a quote ending the previous piece hides what precedes it), the `placeDash` line-start branch, and the `isRangeHyphen` lookbehind (`tokens[i - 2] ?? carried`).
- Every other rule keeps `tokens[i - 1]` and declines at a piece start. A new rule must not treat a missing `prev` as permission.
- A closing quote takes its glyphs from the opener's `style`. Empty text leaves the carry untouched; oversize input resets it. Lookahead rules decide within one piece; fixing inline-boundary misses needs an end-of-text flag in the API.

## dom.js, walk.js and build.js

Rule resolution is shared: both call `resolveRules(inherited, data)` from core.js (order: inherited, `data-math` overlay, explicit `data-place-*`; unknown or prototype names are ignored). dom.js passes `node.dataset`; walk.js builds the same camelCase object from the attributes, with names lowercased and the first duplicate winning, as in a browser. It returns `inherited` itself when nothing applies.

dom.js and walk.js implement the rest of the behavior twice, so any change to one must be made in the other: skip elements, `lang` inheritance, nested `.alaska` (walk.js gets this from the sticky `active` flag), and the carry protocol:

- one carry per root; `resetCarry` at the start and end of every `blockTags` element, at a new root and at a block skip element;
- `formatString` is fed and its output discarded for `<br>` (`"\n"`), an inline skip element (`"x"`, once, only when its parent is active and not skipped) and, in walk.js only, a character reference (its decoded character if whitespace, else `"x"`);
- `script`, `style`, comments and other void elements are transparent.

Rule names are whitelisted from `commonRules` in `resolveRules`, so a new rule needs no change in dom.js or walk.js. `alaska-observe` exists only in dom.js: each mutation record starts with a fresh carry; unless the target is a block and `previousSibling` is null, the carry is seeded with `"x"` and quotes are off for added non-block nodes. `init` skips an `.alaska` with an `.alaska` ancestor, and the observer resolves an added node's rules through `outermostRoot` and `getContext`. Read `lang` with `getAttribute("lang")`, not the `.lang` property. dom.js has no automated tests: keep it in step with walk.js by reading both.

Known divergences, not to be unified: walk.js ends the text run at a character reference, so the core sees `&amp;` as a word there and the decoded `&` in dom.js (decoding and re-encoding would rewrite the author's references); `lang=""` inherits in dom.js and resets in walk.js; walk.js matches `class` and `lang` case-sensitively and does not apply first-duplicate-wins to them (`data-*` follows the browser).

`build.js` strips the first `export {...};` of core.js and the first `import {...} from "...";` of dom.js by regex and wraps both in one block. So core.js keeps exactly one `export` statement, dom.js exactly one import (from `./core.js`), and top-level names must not collide between them. dom.js must import what it uses.

## Adding a rule

1. Add the name to the string list in `commonRules`. This makes it default-on (unless math-only) and whitelists its `data-*` attribute. Decide what it does for `en`, `ru`, `ja` and `ko`; if `ja`/`ko` behavior is not obvious, gate it by language and add a checklist item.
2. Implement it in the main-pass branch for the token type it starts from. Mind precedence and stale references.
3. Tests:
   - A row in `test/rule-table.json` (the harness fails if a rule has no row). It runs the rule alone, everything else on with the rule off (`off` must differ from `expected`), and, unless `langDependent`, the isolation run for `en`, `ru`, `ja`, `ko` and no language, which must agree. Math-only rules set `"negationBase": "math"`.
   - A group with edge cases and interactions in the matching `test/cases/*.json`. Shortcode categories also need a `shortcode-isolation` case.
4. Add a row to the readme rules table.
5. Add the trigger shapes to `alphabet` and `focused` in `test/fuzz.js`, then break the new branch on purpose and confirm the fuzz fails. The fuzz cannot find a branch it cannot build.
6. Run `deno task build`, then `deno task fuzz 100000 <seed>` for several seeds. Add any shrunk failure as a case in `idempotence-regressions`.

## Tests

- Case shapes are validated by `harness.js` (unknown keys, bad `rules`, duplicates, missing `expected` and so on); read it for the schema. Every case, and every `walk.test.js` case, is also run a second time and must be idempotent.
- Keep a case only if it pins behavior documented in the readme, a distinct branch, a fuzz regression, or a carry or walk contract. Do not restate a rule-table row or repeat an input across groups.
- Language-dependent behavior gets one group per language in `languages.json`. `de` and `ja` pin "unsupported, unchanged" and `ko` pins "quotes only"; those cases change on purpose when support lands.
- Behavior listed in the readme "does not do" section is pinned by ordinary cases. Fixing one means changing its test on purpose.
- Coverage gate: with `test/test.js`, `test/carry.api.test.js` and `test/rules.api.test.js`, only the `if (!tokens[j].value) continue;` guard in the carry snapshot may stay unreached; with `test/walk.test.js` alone nothing in `cli/walk.js` may. Merge per-process V8 coverage by source offset, not line percentage. Do not delete defensive guards to raise a percentage: they make a bug skip an edit instead of throwing at render time.
- HTML structure and `data-math` cases belong in `test/walk.test.js`, not `test/cases`.

## Unicode policy

Symbols, punctuation, spacing characters and glyphs are written as `\uXXXX` escapes (`\u{XXXXX}` above U+FFFF) in source and test fixtures, and as `{U+XXXX}` in docs. Natural-language text (`shortWords.ru`, test sentences) stays literal.

- The harness rejects raw non-letter, non-ASCII characters in fixtures.
- Never write raw NBSP, narrow NBSP, hair space, word joiner, curly quotes, dashes or lookalike glyphs, and never let a formatter or editor normalize them.
- Before touching a line containing such characters, print the codepoints (`grep -nP '[^\x00-\x7F]' <file>`) and verify the change. Lines you add or modify follow the policy; do not rewrite unrelated lines unless the task is that migration.

## Style

2-space indent, no hard wrap, no unnecessary comments. Match existing code.

## Docs

- `readme.md`: user quickstart. What Alaska is, setup, rules, and what it does not do. No internals.
- `agents.md`: this file. No restating of the readme.
- When behavior changes, update the readme in the same change. The rules table must list every key of `commonRules` and match actual output (verify by running the input through `formatString` and printing codepoints). When files move or tasks change, update Layout and Commands here.

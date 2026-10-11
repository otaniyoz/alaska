import process from "node:process";
import { formatHtml } from "../cli/walk.js";

const cases = [
  {
    desc: "only formats inside .alaska",
    input: `<div class="alaska">50%</div><span>60%</span>`,
    expected: `<div class="alaska">%\u202F50</div><span>60%</span>`,
  },
  {
    desc: "alaska-skip class excludes subtree",
    input: `<div class="alaska">50%<span class="alaska-skip">60%</span>70%</div>`,
    expected: `<div class="alaska">%\u202F50<span class="alaska-skip">60%</span>%\u202F70</div>`,
  },
  {
    desc: "code/pre/samp/kbd skipped inside alaska",
    input: `<div class="alaska">50%<code>60%</code>70%</div>`,
    expected: `<div class="alaska">%\u202F50<code>60%</code>%\u202F70</div>`,
  },
  {
    desc: "script and style left untouched regardless of active",
    input: `<div class="alaska"><script>50%</script><style>60%</style>70%</div>`,
    expected: `<div class="alaska"><script>50%</script><style>60%</style>%\u202F70</div>`,
  },
  {
    desc: "void element does not affect stack",
    input: `<div class="alaska">50%<img src="x">60%</div><span>70%</span>`,
    expected: `<div class="alaska">%\u202F50<img src="x">%\u202F60</div><span>70%</span>`,
  },
  {
    desc: "implied </p> before new <p> keeps stack sound",
    input: `<div class="alaska"><p>50%<p>60%</div><span>70%</span>`,
    expected: `<div class="alaska"><p>%\u202F50<p>%\u202F60</div><span>70%</span>`,
  },
  {
    desc: "implied </li> before new <li>",
    input: `<ul class="alaska"><li>50%<li>60%</ul><span>70%</span>`,
    expected: `<ul class="alaska"><li>%\u202F50<li>%\u202F60</ul><span>70%</span>`,
  },
  {
    desc: "implied </dt> and </dd> chain",
    input: `<dl class="alaska"><dt>50%<dd>60%<dt>70%</dl><span>80%</span>`,
    expected: `<dl class="alaska"><dt>%\u202F50<dd>%\u202F60<dt>%\u202F70</dl><span>80%</span>`,
  },
  {
    desc: "implied </option> before new <option>",
    input: `<select class="alaska"><option>50%<option>60%</select><span>70%</span>`,
    expected: `<select class="alaska"><option>%\u202F50<option>%\u202F60</select><span>70%</span>`,
  },
  {
    desc: "cascading close of </td> and </tr> on new <tr>",
    input: `<table class="alaska"><tbody><tr><td>50%<tr><td>60%</table><span>70%</span>`,
    expected: `<table class="alaska"><tbody><tr><td>%\u202F50<tr><td>%\u202F60</table><span>70%</span>`,
  },
  {
    desc: "new tbody closes open tr and td from previous section",
    input: `<table class="alaska"><thead><tr><th>50%<tbody><tr><td>60%</table><span>70%</span>`,
    expected: `<table class="alaska"><thead><tr><th>%\u202F50<tbody><tr><td>%\u202F60</table><span>70%</span>`,
  },
  {
    desc: "stray unmatched end tag does not pop active frame",
    input: `<div class="alaska">50%</span>60%</div><span>70%</span>`,
    expected: `<div class="alaska">%\u202F50</span>%\u202F60</div><span>70%</span>`,
  },
  {
    desc: "explicit end tag skips past open optional-end ancestors",
    input: `<div class="alaska"><ul><li>50%<li>60%</ul>70%</div><span>80%</span>`,
    expected: `<div class="alaska"><ul><li>%\u202F50<li>%\u202F60</ul>%\u202F70</div><span>80%</span>`,
  },
  {
    desc: "self-closing slash on non-void element is ignored (not truly self-closed)",
    input: `<div class="alaska"><span class="alaska-skip"/>50%</div>`,
    expected: `<div class="alaska"><span class="alaska-skip"/>50%</div>`,
  },
  {
    desc: "self-closing slash is honored inside svg (foreign content)",
    input: `<div class="alaska"><svg><path d="M0 0"/></svg>50%</div>`,
    expected: `<div class="alaska"><svg><path d="M0 0"/></svg>%\u202F50</div>`,
  },
  {
    desc: "lang attribute drives English quote style",
    input: `<div class="alaska" lang="en">"hi"</div>`,
    expected: `<div class="alaska" lang="en">\u2018\u2060hi\u2060\u2019</div>`,
  },
  {
    desc: "lang attribute drives Russian guillemet quote style",
    input: `<div class="alaska" lang="ru">"привет"</div>`,
    expected: `<div class="alaska" lang="ru">\u00AB\u2060привет\u2060\u00BB</div>`,
  },
  {
    desc: "lang attribute inherited by nested element without its own lang",
    input: `<div class="alaska" lang="en"><p>"hi"</p></div>`,
    expected: `<div class="alaska" lang="en"><p>\u2018\u2060hi\u2060\u2019</p></div>`,
  },
  {
    desc: "lang en-US is English for quotes",
    input: `<div class="alaska" lang="en-US">"hi"</div>`,
    expected: `<div class="alaska" lang="en-US">\u2018\u2060hi\u2060\u2019</div>`,
  },
  {
    desc: "unsupported lang leaves quotes untouched",
    input: `<div class="alaska" lang="de">"hi"</div>`,
    expected: `<div class="alaska" lang="de">"hi"</div>`,
  },
  {
    desc: "missing lang leaves quotes untouched",
    input: `<div class="alaska">"hi"</div>`,
    expected: `<div class="alaska">"hi"</div>`,
  },
  {
    desc: "prose default leaves binary operators alone",
    input: `<div class="alaska">3 + 4</div>`,
    expected: `<div class="alaska">3 + 4</div>`,
  },
  {
    desc: "data-math true applies the math overlay",
    input: `<div class="alaska" data-math="true">x - 5</div>`,
    expected: `<div class="alaska" data-math="true">x\u200A\u2212\u200A5</div>`,
  },
  {
    desc: "data-math inherits into descendants",
    input: `<div class="alaska" data-math="true"><p>x - 5</p></div>`,
    expected: `<div class="alaska" data-math="true"><p>x\u200A\u2212\u200A5</p></div>`,
  },
  {
    desc: "data-math false under a true ancestor restores prose",
    input: `<div class="alaska" data-math="true"><p data-math="false">x - 5</p></div>`,
    expected: `<div class="alaska" data-math="true"><p data-math="false">x\u00A0\u2014 5</p></div>`,
  },
  {
    desc: "explicit data-place attribute on the same element wins over the overlay",
    input: `<div class="alaska" data-math="true" data-place-arithmetical-symbols="false">x - 5</div>`,
    expected: `<div class="alaska" data-math="true" data-place-arithmetical-symbols="false">x - 5</div>`,
  },
  {
    desc: "data-math with any other value is ignored",
    input: `<div class="alaska" data-math="yes">x - 5</div>`,
    expected: `<div class="alaska" data-math="yes">x\u00A0\u2014 5</div>`,
  },
  {
    desc: "bare data-math is ignored",
    input: `<div class="alaska" data-math>x - 5</div>`,
    expected: `<div class="alaska" data-math>x\u00A0\u2014 5</div>`,
  },
  {
    desc: "greek shortcode is formatted by default",
    input: `<div class="alaska">\\alpha \\Omega</div>`,
    expected: `<div class="alaska">\u03B1 \u03A9</div>`,
  },
  {
    desc: "data-place-greek-symbols false leaves greek shortcodes",
    input: `<div class="alaska" data-place-greek-symbols="false">\\alpha \\S</div>`,
    expected: `<div class="alaska" data-place-greek-symbols="false">\\alpha \u00A7</div>`,
  },
  {
    desc: "alaska root inside pre is not formatted",
    input: `<pre><span class="alaska">50%</span></pre>`,
    expected: `<pre><span class="alaska">50%</span></pre>`,
  },
  {
    desc: "alaska root inside alaska-skip is not formatted",
    input: `<div class="alaska-skip"><span class="alaska">50%</span></div>`,
    expected: `<div class="alaska-skip"><span class="alaska">50%</span></div>`,
  },
  {
    desc: "data-* above the root is ignored",
    input: `<div data-place-percent-sign="false"><p class="alaska">50%</p></div>`,
    expected: `<div data-place-percent-sign="false"><p class="alaska">%\u202F50</p></div>`,
  },
  {
    desc: "data-math above the root is ignored",
    input: `<div data-math="true"><p class="alaska">x - 5</p></div>`,
    expected: `<div data-math="true"><p class="alaska">x\u00A0\u2014 5</p></div>`,
  },
  {
    desc: "closing quote after an inline element",
    input: `<div class="alaska" lang="en">"Hello <b>x</b>"</div>`,
    expected: `<div class="alaska" lang="en">\u2018\u2060Hello <b>x</b>\u2060\u2019</div>`,
  },
  {
    desc: "quote pairing restarts in each block",
    input: `<div class="alaska" lang="en"><p>"a</p><p>"b</p></div>`,
    expected: `<div class="alaska" lang="en"><p>\u2018\u2060a</p><p>\u2018\u2060b</p></div>`,
  },
  {
    desc: "separate inline pairs with a space between",
    input: `<div class="alaska" lang="en"><b>"a"</b> <i>"b"</i></div>`,
    expected: `<div class="alaska" lang="en"><b>\u2018\u2060a\u2060\u2019</b> <i>\u2018\u2060b\u2060\u2019</i></div>`,
  },
  {
    desc: "apostrophe after an inline skip element",
    input: `<div class="alaska" lang="en"><code>x</code>'s</div>`,
    expected: `<div class="alaska" lang="en"><code>x</code>\u2019s</div>`,
  },
  {
    desc: "br counts as a line break for quotes",
    input: `<div class="alaska" lang="en">a<br>"b"</div>`,
    expected: `<div class="alaska" lang="en">a<br>\u2018\u2060b\u2060\u2019</div>`,
  },
  {
    desc: "br counts as a line break for the line-start dash",
    input: `<div class="alaska">a<br>- x</div>`,
    expected: `<div class="alaska">a<br>\u2014 x</div>`,
  },
  {
    desc: "dash after text without a line break stays",
    input: `<div class="alaska">a<b>- x</b></div>`,
    expected: `<div class="alaska">a<b>- x</b></div>`,
  },
  {
    desc: "minus after whitespace in a previous text node",
    input: `<div class="alaska">x <b>-5</b></div>`,
    expected: `<div class="alaska">x <b>\u22125</b></div>`,
  },
  {
    desc: "minus after a word in a previous text node stays",
    input: `<div class="alaska">x<b>-5</b></div>`,
    expected: `<div class="alaska">x<b>-5</b></div>`,
  },
  {
    desc: "minus after an inline alaska-skip element stays",
    input: `<div class="alaska">a <span class="alaska-skip">x</span>-5</div>`,
    expected: `<div class="alaska">a <span class="alaska-skip">x</span>-5</div>`,
  },
  {
    desc: "block alaska-skip element resets the carry",
    input: `<div class="alaska" lang="en">"a<div class="alaska-skip">x</div>"b</div>`,
    expected: `<div class="alaska" lang="en">\u2018\u2060a<div class="alaska-skip">x</div>\u2018\u2060b</div>`,
  },
  {
    desc: "nbsp reference counts as whitespace",
    input: `<div class="alaska" lang="en">said&nbsp;"hi"</div>`,
    expected: `<div class="alaska" lang="en">said&nbsp;\u2018\u2060hi\u2060\u2019</div>`,
  },
  {
    desc: "other character reference counts as a word",
    input: `<div class="alaska">x&amp;-5</div>`,
    expected: `<div class="alaska">x&amp;-5</div>`,
  },
  {
    desc: "oversized numeric reference does not throw",
    input: `<div class="alaska">a&#99999999;b</div>`,
    expected: `<div class="alaska">a&#99999999;b</div>`,
  },
  {
    desc: "closing quote uses the opener's lang",
    input: `<div class="alaska" lang="en"><span lang="ru">"мир</span> hello"</div>`,
    expected: `<div class="alaska" lang="en"><span lang="ru">\u00AB\u2060мир</span> hello\u2060\u00BB</div>`,
  },
  {
    desc: "carry does not leave an inactive root",
    input: `<p class="alaska" lang="en">"a</p><p class="alaska" lang="en">"b</p>`,
    expected: `<p class="alaska" lang="en">\u2018\u2060a</p><p class="alaska" lang="en">\u2018\u2060b</p>`,
  },
  {
    desc: "inline roots do not share a carry",
    input: `<span class="alaska" lang="en">"a</span> <span class="alaska" lang="en">"b</span>`,
    expected: `<span class="alaska" lang="en">\u2018\u2060a</span> <span class="alaska" lang="en">\u2018\u2060b</span>`,
  },
  {
    desc: "doctype is passed through",
    input: `<div class="alaska"><!DOCTYPE html>50%</div>`,
    expected: `<div class="alaska"><!DOCTYPE html>%\u202F50</div>`,
  },
  {
    desc: "comment contents are not formatted",
    input: `<div class="alaska"><!-- 50% -->50%</div>`,
    expected: `<div class="alaska"><!-- 50% -->%\u202F50</div>`,
  },
  {
    desc: "processing instruction is passed through",
    input: `<div class="alaska"><?xml?>50%</div>`,
    expected: `<div class="alaska"><?xml?>%\u202F50</div>`,
  },
  {
    desc: "lone < in text is kept",
    input: `<div class="alaska">a < b 50%</div>`,
    expected: `<div class="alaska">a < b %\u202F50</div>`,
  },
  {
    desc: "trailing < at end of input is kept",
    input: `<div class="alaska">50% <`,
    expected: `<div class="alaska">%\u202F50 <`,
  },
  {
    desc: "unterminated comment does not throw",
    input: `<div class="alaska"><!-- x`,
    expected: `<div class="alaska"><!-- x`,
  },
  {
    desc: "unterminated script does not throw",
    input: `<div class="alaska"><script>50%`,
    expected: `<div class="alaska"><script>50%`,
  },
  {
    desc: "unterminated start tag does not throw",
    input: `<div class="alaska"`,
    expected: `<div class="alaska"`,
  },
  {
    desc: "class attribute with spaces around =",
    input: `<div class = "alaska">50%</div>`,
    expected: `<div class = "alaska">%\u202F50</div>`,
  },
  {
    desc: "class attribute in single quotes",
    input: `<div class='alaska'>50%</div>`,
    expected: `<div class='alaska'>%\u202F50</div>`,
  },
  {
    desc: "unquoted class attribute",
    input: `<div class=alaska>50%</div>`,
    expected: `<div class=alaska>%\u202F50</div>`,
  },
  {
    desc: "data-* attribute that is not a rule name is ignored",
    input: `<div class="alaska" data-foo="x">50%</div>`,
    expected: `<div class="alaska" data-foo="x">%\u202F50</div>`,
  },
  {
    desc: "rule attribute with a non-empty non-boolean value turns the rule on",
    input: `<div class="alaska" data-place-percent-sign="0">50%</div>`,
    expected: `<div class="alaska" data-place-percent-sign="0">%\u202F50</div>`,
  },
  {
    desc: "bare rule attribute turns the rule off",
    input: `<div class="alaska" data-place-percent-sign>50%</div>`,
    expected: `<div class="alaska" data-place-percent-sign>50%</div>`,
  },
  {
    desc: "decimal reference to a space counts as whitespace",
    input: `<div class="alaska" lang="en">said&#32;"hi"</div>`,
    expected: `<div class="alaska" lang="en">said&#32;\u2018\u2060hi\u2060\u2019</div>`,
  },
  {
    desc: "hex reference to a space counts as whitespace",
    input: `<div class="alaska" lang="en">said&#x20;"hi"</div>`,
    expected: `<div class="alaska" lang="en">said&#x20;\u2018\u2060hi\u2060\u2019</div>`,
  },
  {
    desc: "stray </br> is kept and does not disturb the stack",
    input: `<div class="alaska">a</br>50%</div>`,
    expected: `<div class="alaska">a</br>%\u202F50</div>`,
  },
  {
    desc: "explicit empty lang resets to no language",
    input: `<div class="alaska" lang="en"><p lang="">"hi"</p></div>`,
    expected: `<div class="alaska" lang="en"><p lang="">"hi"</p></div>`,
  },
  {
    desc: "lang ru is inherited by nested elements",
    input: `<div class="alaska" lang="ru"><p>"привет"</p></div>`,
    expected: `<div class="alaska" lang="ru"><p>\u00AB\u2060привет\u2060\u00BB</p></div>`,
  },
  {
    desc: "nested .alaska applies its own lang and data-* to its subtree only",
    input: `<div class="alaska" lang="en"><p class="alaska" lang="ru" data-place-percent-sign="false">"мир" 50%</p> 50%</div>`,
    expected: `<div class="alaska" lang="en"><p class="alaska" lang="ru" data-place-percent-sign="false">\u00AB\u2060мир\u2060\u00BB 50%</p> %\u202F50</div>`,
  },
  {
    desc: "explicit true on a rule attribute turns the rule on",
    input: `<div class="alaska" data-place-arithmetical-symbols="true">3 + 4</div>`,
    expected: `<div class="alaska" data-place-arithmetical-symbols="true">3\u200A+\u200A4</div>`,
  },
  {
    desc: "unquoted attribute value stops before />",
    input: `<div class="alaska"><span class=alaska-skip/>50%</div>`,
    expected: `<div class="alaska"><span class=alaska-skip/>50%</div>`,
  },
  {
    desc: "start tag cut off after trailing whitespace does not throw",
    input: `<div class="alaska" `,
    expected: `<div class="alaska" `,
  },
];

let pass = 0;
let fail = 0;

for (const { desc, input, expected } of cases) {
  const output = formatHtml(input);
  const again = formatHtml(output);
  if (output === expected && again === output) {
    pass++;
  } else {
    fail++;
    console.log(`x ${desc}${output === expected ? " (not idempotent)" : ""}`);
    console.log(`  input    ${JSON.stringify(input)}`);
    console.log(`  expected ${JSON.stringify(expected)}`);
    console.log(`  actual   ${JSON.stringify(output === expected ? again : output)}`);
  }
}

if (fail > 0) process.exitCode = 1;

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

if (fail > 0) Deno.exit(1);

import process from "node:process";
import { formatHtml } from "../cli/walk.js";

const cases = [
  {
    desc: "only formats inside .alaska",
    input: `<div class="alaska">50 m</div><span>60 m</span>`,
    expected: `<div class="alaska">50\u00A0m</div><span>60 m</span>`,
  },
  {
    desc: "alaska-skip class excludes subtree",
    input: `<div class="alaska">50 m<span class="alaska-skip">60 m</span>70 m</div>`,
    expected: `<div class="alaska">50\u00A0m<span class="alaska-skip">60 m</span>70\u00A0m</div>`,
  },
  {
    desc: "code/pre/samp/kbd skipped inside alaska",
    input: `<div class="alaska">50 m<code>60 m</code>70 m</div>`,
    expected: `<div class="alaska">50\u00A0m<code>60 m</code>70\u00A0m</div>`,
  },
  {
    desc: "script and style left untouched regardless of active",
    input: `<div class="alaska"><script>50 m</script><style>60 m</style>70 m</div>`,
    expected: `<div class="alaska"><script>50 m</script><style>60 m</style>70\u00A0m</div>`,
  },
  {
    desc: "void element does not affect stack",
    input: `<div class="alaska">50 m<img src="x">60 m</div><span>70 m</span>`,
    expected: `<div class="alaska">50\u00A0m<img src="x">60\u00A0m</div><span>70 m</span>`,
  },
  {
    desc: "implied </p> before new <p> keeps stack sound",
    input: `<div class="alaska"><p>50 m<p>60 m</div><span>70 m</span>`,
    expected: `<div class="alaska"><p>50\u00A0m<p>60\u00A0m</div><span>70 m</span>`,
  },
  {
    desc: "implied </li> before new <li>",
    input: `<ul class="alaska"><li>50 m<li>60 m</ul><span>70 m</span>`,
    expected: `<ul class="alaska"><li>50\u00A0m<li>60\u00A0m</ul><span>70 m</span>`,
  },
  {
    desc: "implied </dt> and </dd> chain",
    input: `<dl class="alaska"><dt>50 m<dd>60 m<dt>70 m</dl><span>80 m</span>`,
    expected: `<dl class="alaska"><dt>50\u00A0m<dd>60\u00A0m<dt>70\u00A0m</dl><span>80 m</span>`,
  },
  {
    desc: "implied </option> before new <option>",
    input: `<select class="alaska"><option>50 m<option>60 m</select><span>70 m</span>`,
    expected: `<select class="alaska"><option>50\u00A0m<option>60\u00A0m</select><span>70 m</span>`,
  },
  {
    desc: "cascading close of </td> and </tr> on new <tr>",
    input: `<table class="alaska"><tbody><tr><td>50 m<tr><td>60 m</table><span>70 m</span>`,
    expected: `<table class="alaska"><tbody><tr><td>50\u00A0m<tr><td>60\u00A0m</table><span>70 m</span>`,
  },
  {
    desc: "new tbody closes open tr and td from previous section",
    input: `<table class="alaska"><thead><tr><th>50 m<tbody><tr><td>60 m</table><span>70 m</span>`,
    expected: `<table class="alaska"><thead><tr><th>50\u00A0m<tbody><tr><td>60\u00A0m</table><span>70 m</span>`,
  },
  {
    desc: "stray unmatched end tag does not pop active frame",
    input: `<div class="alaska">50 m</span>60 m</div><span>70 m</span>`,
    expected: `<div class="alaska">50\u00A0m</span>60\u00A0m</div><span>70 m</span>`,
  },
  {
    desc: "explicit end tag skips past open optional-end ancestors",
    input: `<div class="alaska"><ul><li>50 m<li>60 m</ul>70 m</div><span>80 m</span>`,
    expected: `<div class="alaska"><ul><li>50\u00A0m<li>60\u00A0m</ul>70\u00A0m</div><span>80 m</span>`,
  },
  {
    desc: "self-closing slash on non-void element is ignored (not truly self-closed)",
    input: `<div class="alaska"><span class="alaska-skip"/>50 m</div>`,
    expected: `<div class="alaska"><span class="alaska-skip"/>50 m</div>`,
  },
  {
    desc: "self-closing slash is honored inside svg (foreign content)",
    input: `<div class="alaska"><svg><path d="M0 0"/></svg>50 m</div>`,
    expected: `<div class="alaska"><svg><path d="M0 0"/></svg>50\u00A0m</div>`,
  },
  {
    desc: "lang attribute drives English quote style",
    input: `<div class="alaska" lang="en">"hi"</div>`,
    expected: `<div class="alaska" lang="en">\u2018hi\u2019</div>`,
  },
  {
    desc: "lang en gets a numeric range",
    input: `<div class="alaska" lang="en">10-20</div>`,
    expected: `<div class="alaska" lang="en">10\u2060\u2013\u206020</div>`,
  },
  {
    desc: "lang ja leaves a numeric range as written",
    input: `<div class="alaska" lang="ja">10-20</div>`,
    expected: `<div class="alaska" lang="ja">10-20</div>`,
  },
  {
    desc: "missing lang leaves a numeric range as written",
    input: `<div class="alaska">10-20</div>`,
    expected: `<div class="alaska">10-20</div>`,
  },
  {
    desc: "a hyphen at the end of a text run before an element is not a range",
    input: `<div class="alaska" lang="en">5-<b>star</b></div>`,
    expected: `<div class="alaska" lang="en">5-<b>star</b></div>`,
  },
  {
    desc: "lang attribute drives Russian guillemet quote style",
    input: `<div class="alaska" lang="ru">"привет"</div>`,
    expected: `<div class="alaska" lang="ru">\u00ABпривет\u00BB</div>`,
  },
  {
    desc: "lang attribute inherited by nested element without its own lang",
    input: `<div class="alaska" lang="en"><p>"hi"</p></div>`,
    expected: `<div class="alaska" lang="en"><p>\u2018hi\u2019</p></div>`,
  },
  {
    desc: "lang en-US gets American quote nesting",
    input: `<div class="alaska" lang="en-US">"hi"</div>`,
    expected: `<div class="alaska" lang="en-US">\u201Chi\u201D</div>`,
  },
  {
    desc: "lang ko gets double quotes",
    input: `<div class="alaska" lang="ko">"안녕"</div>`,
    expected: `<div class="alaska" lang="ko">\u201C안녕\u201D</div>`,
  },
  {
    desc: "lang ja leaves quotes untouched",
    input: `<div class="alaska" lang="ja">"こんにちは"</div>`,
    expected: `<div class="alaska" lang="ja">"こんにちは"</div>`,
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
    expected: `<div class="alaska" data-math="true">x \u2212 5</div>`,
  },
  {
    desc: "data-math inherits into descendants",
    input: `<div class="alaska" data-math="true"><p>x - 5</p></div>`,
    expected: `<div class="alaska" data-math="true"><p>x \u2212 5</p></div>`,
  },
  {
    desc: "data-math false under a true ancestor restores prose",
    input: `<div class="alaska" lang="en" data-math="true"><p data-math="false">x - 5</p></div>`,
    expected: `<div class="alaska" lang="en" data-math="true"><p data-math="false">x\u00A0\u2014 5</p></div>`,
  },
  {
    desc: "data-math true turns the short-word no-break space off and false restores it",
    input: `<div class="alaska" lang="en" data-math="true">a + b<p data-math="false">it is a test</p></div>`,
    expected: `<div class="alaska" lang="en" data-math="true">a + b<p data-math="false">it is a\u00A0test</p></div>`,
  },
  {
    desc: "data-math true turns the star and diamond shortcodes into operators",
    input: `<div class="alaska" data-math="true">\\star \\diamond</div>`,
    expected: `<div class="alaska" data-math="true">\u22C6 \u22C4</div>`,
  },
  {
    desc: "data-math false under a true ancestor restores the prose star",
    input: `<div class="alaska" data-math="true"><p data-math="false">\\star</p></div>`,
    expected: `<div class="alaska" data-math="true"><p data-math="false">\u2606</p></div>`,
  },
  {
    desc: "explicit data-place attribute on the same element wins over the overlay",
    input: `<div class="alaska" data-math="true" data-place-arithmetical-symbols="false">x - 5</div>`,
    expected: `<div class="alaska" data-math="true" data-place-arithmetical-symbols="false">x - 5</div>`,
  },
  {
    desc: "data-math with any other value is ignored",
    input: `<div class="alaska" lang="en" data-math="yes">x - 5</div>`,
    expected: `<div class="alaska" lang="en" data-math="yes">x\u00A0\u2014 5</div>`,
  },
  {
    desc: "bare data-math is ignored",
    input: `<div class="alaska" lang="en" data-math>x - 5</div>`,
    expected: `<div class="alaska" lang="en" data-math>x\u00A0\u2014 5</div>`,
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
    input: `<pre><span class="alaska">50 m</span></pre>`,
    expected: `<pre><span class="alaska">50 m</span></pre>`,
  },
  {
    desc: "alaska root inside alaska-skip is not formatted",
    input: `<div class="alaska-skip"><span class="alaska">50 m</span></div>`,
    expected: `<div class="alaska-skip"><span class="alaska">50 m</span></div>`,
  },
  {
    desc: "data-* above the root is ignored",
    input: `<div data-place-number-nbsp-word="false"><p class="alaska">50 m</p></div>`,
    expected: `<div data-place-number-nbsp-word="false"><p class="alaska">50\u00A0m</p></div>`,
  },
  {
    desc: "data-math above the root is ignored",
    input: `<div data-math="true"><p class="alaska" lang="en">x - 5</p></div>`,
    expected: `<div data-math="true"><p class="alaska" lang="en">x\u00A0\u2014 5</p></div>`,
  },
  {
    desc: "closing quote after an inline element",
    input: `<div class="alaska" lang="en">"Hello <b>x</b>"</div>`,
    expected: `<div class="alaska" lang="en">\u2018Hello <b>x</b>\u2019</div>`,
  },
  {
    desc: "quote pairing restarts in each block",
    input: `<div class="alaska" lang="en"><p>"a</p><p>"b</p></div>`,
    expected: `<div class="alaska" lang="en"><p>\u2018a</p><p>\u2018b</p></div>`,
  },
  {
    desc: "separate inline pairs with a space between",
    input: `<div class="alaska" lang="en"><b>"a"</b> <i>"b"</i></div>`,
    expected: `<div class="alaska" lang="en"><b>\u2018a\u2019</b> <i>\u2018b\u2019</i></div>`,
  },
  {
    desc: "apostrophe after an inline skip element",
    input: `<div class="alaska" lang="en"><code>x</code>'s</div>`,
    expected: `<div class="alaska" lang="en"><code>x</code>\u2019s</div>`,
  },
  {
    desc: "br counts as a line break for quotes",
    input: `<div class="alaska" lang="en">a<br>"b"</div>`,
    expected: `<div class="alaska" lang="en">a<br>\u2018b\u2019</div>`,
  },
  {
    desc: "br counts as a line break for the line-start dash",
    input: `<div class="alaska" lang="en">a<br>- x</div>`,
    expected: `<div class="alaska" lang="en">a<br>\u2014 x</div>`,
  },
  {
    desc: "dash after text without a line break stays",
    input: `<div class="alaska" lang="en">a<b>- x</b></div>`,
    expected: `<div class="alaska" lang="en">a<b>- x</b></div>`,
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
    desc: "quote run at the start of an inline element looks past it to the previous text",
    input: `<div class="alaska" lang="en">x <b>"-5"</b></div>`,
    expected: `<div class="alaska" lang="en">x <b>\u2018\u22125\u2019</b></div>`,
  },
  {
    desc: "a quote at the end of the previous text node hides what precedes it",
    input: `<div class="alaska" lang="en">"<b>-5</b>"</div>`,
    expected: `<div class="alaska" lang="en">\u2018<b>-5</b>\u2019</div>`,
  },
  {
    desc: "data-math true lets a minus follow an equals sign",
    input: `<div class="alaska" data-math="true">x=-5</div>`,
    expected: `<div class="alaska" data-math="true">x=\u22125</div>`,
  },
  {
    desc: "block alaska-skip element resets the carry",
    input: `<div class="alaska" lang="en">"a<div class="alaska-skip">x</div>"b</div>`,
    expected: `<div class="alaska" lang="en">\u2018a<div class="alaska-skip">x</div>\u2018b</div>`,
  },
  {
    desc: "nbsp reference counts as whitespace",
    input: `<div class="alaska" lang="en">said&nbsp;"hi"</div>`,
    expected: `<div class="alaska" lang="en">said&nbsp;\u2018hi\u2019</div>`,
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
    expected: `<div class="alaska" lang="en"><span lang="ru">\u00ABмир</span> hello\u00BB</div>`,
  },
  {
    desc: "carry does not leave an inactive root",
    input: `<p class="alaska" lang="en">"a</p><p class="alaska" lang="en">"b</p>`,
    expected: `<p class="alaska" lang="en">\u2018a</p><p class="alaska" lang="en">\u2018b</p>`,
  },
  {
    desc: "inline roots do not share a carry",
    input: `<span class="alaska" lang="en">"a</span> <span class="alaska" lang="en">"b</span>`,
    expected: `<span class="alaska" lang="en">\u2018a</span> <span class="alaska" lang="en">\u2018b</span>`,
  },
  {
    desc: "doctype is passed through",
    input: `<div class="alaska"><!DOCTYPE html>50 m</div>`,
    expected: `<div class="alaska"><!DOCTYPE html>50\u00A0m</div>`,
  },
  {
    desc: "comment contents are not formatted",
    input: `<div class="alaska"><!-- 50 m -->50 m</div>`,
    expected: `<div class="alaska"><!-- 50 m -->50\u00A0m</div>`,
  },
  {
    desc: "processing instruction is passed through",
    input: `<div class="alaska"><?xml?>50 m</div>`,
    expected: `<div class="alaska"><?xml?>50\u00A0m</div>`,
  },
  {
    desc: "lone < in text is kept",
    input: `<div class="alaska">a < b 50 m</div>`,
    expected: `<div class="alaska">a < b 50\u00A0m</div>`,
  },
  {
    desc: "trailing < at end of input is kept",
    input: `<div class="alaska">50 m <`,
    expected: `<div class="alaska">50\u00A0m <`,
  },
  {
    desc: "unterminated comment does not throw",
    input: `<div class="alaska"><!-- x`,
    expected: `<div class="alaska"><!-- x`,
  },
  {
    desc: "unterminated script does not throw",
    input: `<div class="alaska"><script>50 m`,
    expected: `<div class="alaska"><script>50 m`,
  },
  {
    desc: "unterminated start tag does not throw",
    input: `<div class="alaska"`,
    expected: `<div class="alaska"`,
  },
  {
    desc: "class attribute with spaces around =",
    input: `<div class = "alaska">50 m</div>`,
    expected: `<div class = "alaska">50\u00A0m</div>`,
  },
  {
    desc: "class attribute in single quotes",
    input: `<div class='alaska'>50 m</div>`,
    expected: `<div class='alaska'>50\u00A0m</div>`,
  },
  {
    desc: "unquoted class attribute",
    input: `<div class=alaska>50 m</div>`,
    expected: `<div class=alaska>50\u00A0m</div>`,
  },
  {
    desc: "data-* attribute that is not a rule name is ignored",
    input: `<div class="alaska" data-foo="x">50 m</div>`,
    expected: `<div class="alaska" data-foo="x">50\u00A0m</div>`,
  },
  {
    desc: "rule attribute with a non-empty non-boolean value turns the rule on",
    input: `<div class="alaska" data-place-number-nbsp-word="0">50 m</div>`,
    expected: `<div class="alaska" data-place-number-nbsp-word="0">50\u00A0m</div>`,
  },
  {
    desc: "bare rule attribute turns the rule off",
    input: `<div class="alaska" data-place-number-nbsp-word>50 m</div>`,
    expected: `<div class="alaska" data-place-number-nbsp-word>50 m</div>`,
  },
  {
    desc: "decimal reference to a space counts as whitespace",
    input: `<div class="alaska" lang="en">said&#32;"hi"</div>`,
    expected: `<div class="alaska" lang="en">said&#32;\u2018hi\u2019</div>`,
  },
  {
    desc: "hex reference to a space counts as whitespace",
    input: `<div class="alaska" lang="en">said&#x20;"hi"</div>`,
    expected: `<div class="alaska" lang="en">said&#x20;\u2018hi\u2019</div>`,
  },
  {
    desc: "stray </br> is kept and does not disturb the stack",
    input: `<div class="alaska">a</br>50 m</div>`,
    expected: `<div class="alaska">a</br>50\u00A0m</div>`,
  },
  {
    desc: "explicit empty lang resets to no language",
    input: `<div class="alaska" lang="en"><p lang="">"hi"</p></div>`,
    expected: `<div class="alaska" lang="en"><p lang="">"hi"</p></div>`,
  },
  {
    desc: "lang ru is inherited by nested elements",
    input: `<div class="alaska" lang="ru"><p>"привет"</p></div>`,
    expected: `<div class="alaska" lang="ru"><p>\u00ABпривет\u00BB</p></div>`,
  },
  {
    desc: "nested .alaska applies its own lang and data-* to its subtree only",
    input: `<div class="alaska" lang="en"><p class="alaska" lang="ru" data-place-number-nbsp-word="false">"мир" 50 m</p> 50 m</div>`,
    expected: `<div class="alaska" lang="en"><p class="alaska" lang="ru" data-place-number-nbsp-word="false">\u00ABмир\u00BB 50 m</p> 50\u00A0m</div>`,
  },
  {
    desc: "explicit true on a rule attribute turns the rule on",
    input: `<div class="alaska" data-place-arithmetical-symbols="true">3 - 4</div>`,
    expected: `<div class="alaska" data-place-arithmetical-symbols="true">3 \u2212 4</div>`,
  },
  {
    desc: "unquoted attribute value stops before />",
    input: `<div class="alaska"><span class=alaska-skip/>50 m</div>`,
    expected: `<div class="alaska"><span class=alaska-skip/>50 m</div>`,
  },
  {
    desc: "start tag cut off after trailing whitespace does not throw",
    input: `<div class="alaska" `,
    expected: `<div class="alaska" `,
  },
  {
    desc: "arrow in text",
    input: `<div class="alaska">a -> b</div>`,
    expected: `<div class="alaska">a \u2192 b</div>`,
  },
  {
    desc: "missing lang leaves dashes as written",
    input: `<div class="alaska">x - y</div>`,
    expected: `<div class="alaska">x - y</div>`,
  },
  {
    desc: "arrow written with a character reference is not formed",
    input: `<div class="alaska">a -&gt; b</div>`,
    expected: `<div class="alaska">a -&gt; b</div>`,
  },
  {
    desc: "left arrow written with a character reference is not formed",
    input: `<div class="alaska">a &lt;- b</div>`,
    expected: `<div class="alaska">a &lt;- b</div>`,
  },
  {
    desc: "literal <- is not formed as an arrow",
    input: `<div class="alaska">a <- b</div>`,
    expected: `<div class="alaska">a <- b</div>`,
  },
  {
    desc: "double dash before a character reference for > is left as written",
    input: `<div class="alaska" lang="en">x --&gt; b</div>`,
    expected: `<div class="alaska" lang="en">x --&gt; b</div>`,
  },
  {
    desc: "double dash after a character reference for < is left as written",
    input: `<div class="alaska" lang="en">x &lt;-- b</div>`,
    expected: `<div class="alaska" lang="en">x &lt;-- b</div>`,
  },
  {
    desc: "literal <- at the start of a line gets the line-start dash",
    input: `<div class="alaska" lang="en">x\n<- b</div>`,
    expected: `<div class="alaska" lang="en">x\n<\u2014 b</div>`,
  },
  {
    desc: "ampersand between spaces binds the space after it",
    input: `<div class="alaska" lang="en">Tom & Jerry</div>`,
    expected: `<div class="alaska" lang="en">Tom &\u00A0Jerry</div>`,
  },
  {
    desc: "an ampersand written as a character reference is not bound",
    input: `<div class="alaska" lang="en">Tom &amp; Jerry</div>`,
    expected: `<div class="alaska" lang="en">Tom &amp; Jerry</div>`,
  },
  {
    desc: "data-* names with a trailing or doubled hyphen are ignored",
    input: `<div class="alaska" data-foo- data-a--b="x">50 m</div>`,
    expected: `<div class="alaska" data-foo- data-a--b="x">50\u00A0m</div>`,
  },
  {
    desc: "data-* names with a trailing or doubled hyphen outside .alaska do not throw",
    input: `<span data-foo-="x" data-a--b>60 m</span><div class="alaska">50 m</div>`,
    expected: `<span data-foo-="x" data-a--b>60 m</span><div class="alaska">50\u00A0m</div>`,
  },
  {
    desc: "data-* names that are object properties are not rules",
    input: `<div class="alaska" data-constructor="false" data-to-string="false">50 m</div>`,
    expected: `<div class="alaska" data-constructor="false" data-to-string="false">50\u00A0m</div>`,
  },
  {
    desc: "data-* names are case-insensitive, as in a browser",
    input: `<div class="alaska" lang="en" DATA-PLACE-EMDASH="false" data-place-Number-nbsp-word="false">x - y 50 m</div>`,
    expected: `<div class="alaska" lang="en" DATA-PLACE-EMDASH="false" data-place-Number-nbsp-word="false">x - y 50 m</div>`,
  },
  {
    desc: "data-math name is case-insensitive",
    input: `<div class="alaska" DATA-MATH="true">x - 5</div>`,
    expected: `<div class="alaska" DATA-MATH="true">x \u2212 5</div>`,
  },
  {
    desc: "a duplicated data-* attribute keeps the first value, as in a browser (false first)",
    input: `<div class="alaska" data-place-number-nbsp-word="false" data-place-number-nbsp-word="true">50 m</div>`,
    expected: `<div class="alaska" data-place-number-nbsp-word="false" data-place-number-nbsp-word="true">50 m</div>`,
  },
  {
    desc: "a duplicated data-* attribute keeps the first value, as in a browser (true first)",
    input: `<div class="alaska" data-place-number-nbsp-word="true" data-place-number-nbsp-word="false">50 m</div>`,
    expected: `<div class="alaska" data-place-number-nbsp-word="true" data-place-number-nbsp-word="false">50\u00A0m</div>`,
  },
  {
    desc: "a duplicated data-math keeps the first value even when a later one is invalid",
    input: `<div class="alaska" data-math="true" data-math="">x - 5</div>`,
    expected: `<div class="alaska" data-math="true" data-math="">x \u2212 5</div>`,
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

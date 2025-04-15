:::::::::: {.alaska role="main" remove-leading-spaces="false" remove-trailing-spaces="false"}
::::: section
# [Alaska](http://github.com/otaniyoz/alaska) is a simple text formatter for web.

It automatically formats the text content of a web page to have the
right quotes, no-break spaces, em-dashes, [and
more](#rules){.onpage-link}.

<div>

### Before

John\'s new book, \'The Adventure of the Invisible Hound\' - a thrilling
sequel to \'The Mystery of the Missing Diamond\'\--is a must-read for
all mystery enthusiasts. Currently ranked at no.1 on the bestseller
list, \'The Adventure of the Invisible Hound\' has seen a %25 increase
in sales since its release in june 2023. It\'s a must-read for all
mystery enthusiasts, especially those who appreciate intricate plotlines
and unexpected twists.

</div>

<div>

### After

John\'s new book, \'The Adventure of the Invisible Hound\' - a thrilling
sequel to \'The Mystery of the Missing Diamond\'\--is a must-read for
all mystery enthusiasts. Currently ranked at no.1 on the bestseller
list, \'The Adventure of the Invisible Hound\' has seen a 25% increase
in sales since its release in june 2023. It\'s a must-read for all
mystery enthusiasts, especially those who appreciate intricate plotlines
and unexpected twists.

</div>

:::::

::: section
# Setup and usage {#setup-and-usage .cols-3}

Include Alaska in the `<head>` of your page:

> `<head>  ...  <script `[`src="/path/to/alaska.js"`]{.after}`></script>  ...</head> `

Now all nodes with text content and `class="alaska"` will be formated,
including their child nodes:

> `<p `[`class="alaska"`]{.after}`>   This text will be formatted.   <span>This text will be formatted too.</span> </p>`

If you want to avoid formatting text in certain child nodes, they should
include `class="alaska-skip"`:

> `<p class="alaska">   This text will be formatted.   <span `[`class="alaska-skip"`]{.after}`>And this won't.</span> </p>`

If you plan on manipulating document and want added or modified elements
to be formatted, you should include `class="alaska-observe"`:

> `<div `[`class="alaska-observe"`]{.after}`>  ...  <!--Alaska will format added or modified nodes in here-->  ...</div>`

Alaska supports english and russian languages. [24]{#common-rules} rules
are applied to all text, regardless of the language. Quotation marks
depend on the language and apostrophe applies only to text in english.
By default, the lang attribute of the `<html>` element is the primary
language of the document:

> `<html `[`lang="en"`]{.after}`>   <p>‘Quotes’</p>   <p>‘Кавычки’</p> </html>`

If your document is a mix of english and russian and you want to have
correct formmating in both languages, specify the lang attribute where
needed:

> `<html lang="en">   <p>‘Quotes’</p>   <p `[`lang="ru"`]{.after}`>«Кавычки»</p> </html>`

By default, all rules are applied. It is also possible to apply only
specific rules to certain elements by specifying necessary attributes.
If you want to turn off or on a certain rule, you have to add the
corresponding attribute:

> `<p class="alaska">   All rules will be applied to this text   <span `[`data-place-emdash="false"`]{.after}`>All rules will be applied to this text, except one -- the em-dash rule.</span> </p>`
:::

:::: {#rules .section}
# Rules {.cols-3}

Below is the list of []{#rules-count} rules. Select necessary and
unnecessary rules \-- corresponding attributes will be generated
automatically:

> `all rules are applied`{#user-config}

::: {#rules-container .examples}
Place emdash

Replaces hyphen or two hyphens with the emdash padded with the no-break
space on the left and regular space on the right

<figure class="rules">
<div>
<h3 id="before-1">Before</h3>
<p>Knowledge - Unleashed! Knowledge--Unleashed! Knowledge --
Unleashed!</p>
</div>
<div>
<h3 id="after-1">After</h3>
<p>Knowledge - Unleashed! Knowledge--Unleashed! Knowledge --
Unleashed!</p>
</div>
</figure>

Place no-break hyphen

Pads hyphen with no-breaks on both sides

<figure class="rules">
<div>
<h3 id="before-2">Before</h3>
<p>She's so self-conscious</p>
</div>
<div>
<h3 id="after-2">After</h3>
<p>She's so self-conscious</p>
</div>
</figure>

Join short word with the following word

Word of three characters or less followed by another word is padded on
the right with a no-break space

<figure class="rules">
<div>
<h3 id="before-3">Before</h3>
<p>Short words have a tendency to hang at the edges</p>
</div>
<div>
<h3 id="after-3">After</h3>
<p>Short words have a tendency to hang at the edges</p>
</div>
</figure>

Place three full stops

Replaces ellipsis and three consequitive full-stops with three
full-stops padded with no-breaks

<figure class="rules">
<div>
<h3 id="before-4">Before</h3>
<p>She said…</p>
</div>
<div>
<h3 id="after-4">After</h3>
<p>She said…</p>
</div>
</figure>

Place numeric range

Replaces hyphen and minus in numeric range with two full-stops, and pads
each full-stop with no-breaks on both sides

<figure class="rules">
<div>
<h3 id="before-5">Before</h3>
<p>2010-2012, 2-3, zero to one, 1 to 3</p>
</div>
<div>
<h3 id="after-5">After</h3>
<p>2010-2012, 2-3, zero to one, 1 to 3</p>
</div>
</figure>

Place numero sign

Replaces No. and its variations with the numero sign padded on the right
with the hair-space and no-break

<figure class="rules">
<div>
<h3 id="before-6">Before</h3>
<p>No.1, no. 2, number 3</p>
</div>
<div>
<h3 id="after-6">After</h3>
<p>No.1, no. 2, number 3</p>
</div>
</figure>

Place minus sign

Replaces hyphen in basic equations and negative numbers with no-break
space padded minus and no-break padded minus, respectively

<figure class="rules">
<div>
<h3 id="before-7">Before</h3>
<p>1-2=-1</p>
</div>
<div>
<h3 id="after-7">After</h3>
<p>1-2=-1</p>
</div>
</figure>

Place plus sign

Replaces plus sign in basic equations and positive numbers with no-break
space padded plus and no-break padded plus, respectively

<figure class="rules">
<div>
<h3 id="before-8">Before</h3>
<p>1+2=3</p>
</div>
<div>
<h3 id="after-8">After</h3>
<p>1+2=3</p>
</div>
</figure>

Place currency sign

Replaces currency signs and three-letter currency codes with currency
signs that go after value and are padded on the left with no-break
hair-space

<figure class="rules">
<div>
<h3 id="before-9">Before</h3>
<p>$100, 9.99usd, 25gbp, 1eur, 2jpy, 4rub, 5kzt</p>
</div>
<div>
<h3 id="after-9">After</h3>
<p>$100, 9.99usd, 25gbp, 1eur, 2jpy, 4rub, 5kzt</p>
</div>
</figure>

Place percent sign

Replaces percent sign with percent sign that goes after value and is
padded on the left with no-break hair-space

<figure class="rules">
<div>
<h3 id="before-10">Before</h3>
<p>%100, 25%</p>
</div>
<div>
<h3 id="after-10">After</h3>
<p>%100, 25%</p>
</div>
</figure>

Place typographic apostrophe

Replaces the typewriter apostrophe within a contracted word and genitive
case with the typographic right single quotation mark. Applies only to
content in english

<figure class="rules">
<div>
<h3 id="before-11">Before</h3>
<p>Let's go to the Bernadettes' you're looking awfully hungry after
working t'barn</p>
</div>
<div>
<h3 id="after-11">After</h3>
<p>Let's go to the Bernadettes' you're looking awfully hungry after
working t'barn</p>
</div>
</figure>

Place typographic quotes

Replaces neutral quotes with standard ones. Supports only first- or
second-level nested quotes. Assumes that first-level quotes are always
single neutral quotes and the second-level quotes \-- double neutral.

<figure class="rules">
<div>
<h3 id="before-12">Before</h3>
<p>He said: 'Noticing "Do it swiftly" on a wall, I heard, "Mind this,
lad."'</p>
</div>
<div>
<h3 id="after-12">After</h3>
<p>He said: 'Noticing "Do it swiftly" on a wall, I heard, "Mind this,
lad."'</p>
</div>
</figure>

Place no-break space between a number and a word

<figure class="rules">
<div>
<h3 id="before-13">Before</h3>
<p>100apples, 1.5 persons</p>
</div>
<div>
<h3 id="after-13">After</h3>
<p>100 apples, 1.5 persons</p>
</div>
</figure>

Place fractions

<figure class="rules">
<div>
<h3 id="before-14">Before</h3>
<p>1/2 cup of flour, 3/4 of the way around the circle, 1/16 of an
apple</p>
</div>
<div>
<h3 id="after-14">After</h3>
<p>1/2 cup of flour, 3/4 of the way around the circle, 1/16 of an
apple</p>
</div>
</figure>

Place copyright symbols

<figure class="rules">
<div>
<h3 id="before-15">Before</h3>
<p>(c), (C), (tm), (TM), (r), (R), (p), (P)</p>
</div>
<div>
<h3 id="after-15">After</h3>
<p>(c), (C), (tm), (TM), (r), (R), (p), (P)</p>
</div>
</figure>

Place mathematical symbols

<figure class="rules">
<div>
<h3 id="before-16">Before</h3>
<p>/dia, /deg, /pm, /mp, /loz, /prime, /dprime, /tprime, /qprime, /dot,
/times, !=, /lq, /gq, ~=</p>
</div>
<div>
<h3 id="after-16">After</h3>
<p>/dia, /deg, /pm, /mp, /loz, /prime, /dprime, /tprime, /qprime, /dot,
/times, !=, /lq, /gq, ~=</p>
</div>
</figure>

Place emoticons

<figure class="rules">
<div>
<h3 id="before-17">Before</h3>
<p>/shrug, /crying, /happy, /dying, /angry, /surprised</p>
</div>
<div>
<h3 id="after-17">After</h3>
<p>/shrug, /crying, /happy, /dying, /angry, /surprised</p>
</div>
</figure>

Place typographic ornamentation

<figure class="rules">
<div>
<h3 id="before-18">Before</h3>
<p>/dinkus, /asterism, /fleuron, /dingbat, /dagger, /section, /bullet,
/tainome</p>
</div>
<div>
<h3 id="after-18">After</h3>
<p>/dinkus, /asterism, /fleuron, /dingbat, /dagger, /section, /bullet,
/tainome</p>
</div>
</figure>

Remove leading spaces

Removes spaces at the start of a sentence

Remove trailing spaces

Removes spaces at the end of a sentence

Remove multiple consequitive spaces

Removes mutliple consequitive spaces

Remove no-break spaces

Removes no-break spaces before other rules are applied

Remove no-breaks

Removes no-breaks before other rules are applied

Remove spaces before punctuation

Skip blockquotes

Skips content in blockquote tags and their children

Skip code

Skips content inside code tags and their children
:::
::::

::: {.section .footer}
### Created by Otaniyoz in 2024 {#created-by-otaniyoz-in-2024 .cols-3}
:::
::::::::::

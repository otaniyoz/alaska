![Alaska](logo.webp)

Alaska is a simple text formatter for web. It automatically formats the text content of a web page to have the right quotes, no-break spaces, em-dashes, and more.

## Usage

You can start using Alaska by adding it to a page:

```html
<html lang="en">
  <head>
    ...
    <script src="alaska.js"></script>
    ...
  </head>
  <body class="alaska">
    <p lang="ru">
      Alaska will apply russian language typographic conventions to this element.
    </p>
    <p class="alaska-skip">Alaska will not format this element.</p>
    <div class="alaska-observe">
      Alaska will format all dynamically added or modified text in this element.
    </div>
  </body>
</html>
```

## Rules

All rules are enabled by default:

| Rule                           | Raw             | Formatted                                         |
| ------------------------------ | --------------- | ------------------------------------------------- |
| `removePunctuationSpaces`      | `hello , world` | `hello, world`                                    |
| `removeMultipleSpaces`         | `hello  world`  | `hello world`                                     |
| `placeNumberNbspWord`          | `5 meters`      | `5 meters` (nbsp between number and word)         |
| `placeThreeStops`              | `wait...`       | `wait⁠.⁠.⁠.⁠` (word joiners between dots)             |
| `placeFractions`               | `3/4`           | `3⁄4`                                             |
| `placeArithmeticalSymbols`     | `3 - 4`         | `3 − 4` (thin spaces, proper minus sign)          |
| `placeEmdash`                  | `a -- b`        | `a — b` (also fires on `a - b`; nbsp before dash) |
| `placeNumericRange`            | `10-20`         | `10⁠–⁠20` (en-dash, word joiners)                   |
| `placeCopyright`               | `(c)`           | `©`                                               |
| `placeNumeroSign`              | `No. 4`         | `№ 4`                                             |
| `placeMathematicalSymbols`     | `\pm`           | `±`                                               |
| `placeTypographyOrnamentation` | `\dinkus`       | `∗⁠∗⁠∗`                                             |
| `placeEmoticons`               | `\shrug`        | `¯⁠\⁠_⁠(⁠ツ⁠)⁠_⁠/⁠¯`                                      |
| `placeCurrencySign`            | `USD 100`       | `$ 100` (ISO code replaced; narrow nbsp)          |
| `placePercentSign`             | `50%`           | `% 50` (sign moves before number; narrow nbsp)    |
| `placeNbsp`                    | `it is a test`  | `it is a test` (nbsp after short word)            |
| `placeHyphen`                  | `well-known`    | `well⁠-⁠known` (word joiners prevent line break)    |
| `placeTemperatureSign`         | `100oC`         | `100 °C` (thin nbsp)                              |
| `placeOrdinals`                | `1st`           | `1ˢᵗ`                                             |
| `placeMultiplicationSign`      | `3 x 4`         | `3 × 4` (thin spaces)                             |
| `placeTypographicQuotes`       | `"hello"`       | `‘⁠hello⁠’` (curly quotes; English outer = singles) |
| `formatInitials`               | `J. Smith`      | `J. Smith` (nbsp after dot)                       |

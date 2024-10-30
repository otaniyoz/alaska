(function () {
  'use strict';
  const commonRules = {
    // SPACES
    'removeLeadingSpaces': [['^[ \u00A0\t]+', '']], // remove leading spaces
    'removeTrailingSpaces': [['[ \u00A0\t]+$', '']], // remove trailing spaces
    'removeMultipleSpaces': [[' {2,}', ' ']], // replace multiple consequitive spaces with a single space
    'removeNobreaks': [['\u2060{1,}', '']], // remove no-breaks
    'removeNobreakSpaces': [['\u00A0{1,}', '']], // remove no-break spaces
    'removePunctuationSpaces': [['[ ]+([.,!?:;])', '$1']], // remove spaces before selected punctuation marks
    'placeNumberNbspWord': [['([0-9]{1,})([ ]+)([a-z\u0430-\u044f]+)', '$1\u00A0$3']], // put no-break space between a word preceeded by a number
    // ELLIPSIS
    'placeThreeStops': [['[.]{3}', '\u2060.\u2060.\u2060.\u2060'], ['\u2026', '\u2060.\u2060.\u2060.\u2060']], // replace three dots with three dots padded with no-breaks, replace ellipsis with three dots padded with no-breaks
    'placeNumeroSign': [['(No.|no.|Number|number)([ ]?)([0-9]+)', '№\u200A\u2060$3']],
    // FRACTIONS
    'placeFractions': [['(([0-9]+)\/([0-9]+))([ \u00A0]+)', '$2\u2044$3\u00A0']],
    // MINUS (EQUATIONS AND NEGATIVE NUMBERS): replace a hyphen inside an equation with a unicode minus, remove whitespace between parts of the equation, and link everything with no-break space and no-breaks.
    'placeMinus': [['([0-9]+)([ ]?[-][ ]?)([0-9]+)([ ]?[=]+[ ]?)([-]?[0-9]+)', '$1\u00A0\u2212\u00A0$3\u00A0=\u00A0$5'], ['(?![0-9]+[ ]?)([-][ ]?)(?=[0-9]+[ ]?)(?!=)', '\u2212\u2060']],
    'placePlus': [['([0-9]+)([ ]?[+][ ]?)([0-9]+)([ ]?[=]+[ ]?)([-]?[0-9]+)', '$1\u00A0\u002B\u00A0$3\u00A0=\u00A0$5'], ['(?![0-9]+[ ]?)([+][ ]?)(?=[0-9]+[ ]?)(?!=)', '\u002B\u2060']],
    // EM-DASH
    "placeEmdash": [['[ ]?[-]{2}[ ]?', '\u00A0—\u0020'], ['[ ]+[-]{1}[ ]+', '\u00A0—\u0020']], // replace two consequetive hyphens with an em-dash linked to the preceeding word by a non-breaking space and followed a regular space
    // EN-DASH (NUMERICAL RANGE)
    // TODO: unicode groups do not work for some reason.
    "placeNumericRange": [['([0-9]+)([-\u2212][\u2060]?)([0-9]+[ ]?)', '$1\u2060.\u2060.\u2060$3']], // replace a single hyphen between two numbers not followed by an equality sign with an two full-stops enclosed in no-breaks without spaces
    // COPYRIGHT SYMBOLS
    'placeCopyright': [['\\(c\\)', '©'], ['\\(p\\)', '℗'], ['\\(tm\\)', '™'], ['\\(r\\)', '®']],
    // MATHEMATICAL SYMBOLS
    'placeMathematicalSymbols': [['/dia', '⌀'], ['/deg', '°'], ['/pm', '±'], ['/mp', '∓'], ['/loz', '◊'], ['/prime', '′'], ['/dprime', '″'], ['/tprime', '‴'], ['/qprime', '⁗'], ['/dot', '·'], ['/times', '×'], ['!=', '≠'], ['/lq', '⩽'], ['/gq', '⩾'], ['~=', '≅']],
    // TYPOGRAPHY ORNAMENTATION
    'placeTypographyOrnamentation': [['/dinkus', '∗\u2060∗\u2060∗'], ['/asterism', '⁂'], ['/fleuron', '🙘'], ['/dingbat', '➿'], ['/dagger', '†'], ['/section', '§'], ['/bullet', '•'], ['/tainome', '◉']],
    // EMOTICONS
    'placeEmoticons': [['/shrug', '¯\u2060\\\u2060\_\u2060(\u2060ツ\u2060)\u2060_\u2060/\u2060¯'], ['/crying', '(\u2060⊤\u2060_\u2060⊤\u2060)'], ['/dying', '(\u2060×\u2060_\u2060×\u2060)'], ['/nervous', '(\u2060-\u2060_\u2060-\u2060;\u2060)'], ['/cute', '(\u2060^\u2060.\u2060^\u2060)'], ['/happy', '(\u2060^\u2060_\u2060_\u2060_\u2060_\u2060_\u2060_\u2060_\u2060_\u2060_\u2060^\u2060)'], ['/surprised', '(\u2060\u00A0\u2060ⵔ\u2060.\u2060ⵔ\u2060\u00A0\u2060)'], ['/angry', '(\u2060>\u2060_\u2060<\u2060)']],
    // CURRENCY SIGN
    'placeCurrencySign': [
      ['([0-9]+(\.[0-9]+)?)(usd)', '$1\u200A\u2060\$'], // 100usd -> 100$
      ['([0-9]+(\.[0-9]+)?)(eur)', '$1\u200A\u2060€'],
      ['([0-9]+(\.[0-9]+)?)(jpy)', '$1\u200A\u2060¥'],
      ['([0-9]+(\.[0-9]+)?)(gbp)', '$1\u200A\u2060£'],
      ['([0-9]+(\.[0-9]+)?)(rub)', '$1\u200A\u2060₽'],
      ['([0-9]+(\.[0-9]+)?)(kzt)', '$1\u200A\u2060₸'],
      ['[\$]{1}([0-9]+(\.[0-9]+)?)', '$1\u200A\u2060\$'], ['([0-9]+(\.[0-9]+)?)[\$]{1}', '$1\u200A\u2060\$'], // $100 -> 100$, 100$ -> 100$
      ['[€]{1}([0-9]+(\.[0-9]+)?)', '$1\u200A\u2060€'], ['([0-9]+(\.[0-9]+)?)[€]{1}', '$1\u200A\u2060€'],
      ['[¥]{1}([0-9]+(\.[0-9]+)?)', '$1\u200A\u2060¥'], ['([0-9]+(\.[0-9]+)?)[¥]{1}', '$1\u200A\u2060¥'],
      ['[£]{1}([0-9]+(\.[0-9]+)?)', '$1\u200A\u2060£'], ['([0-9]+(\.[0-9]+)?)[£]{1}', '$1\u200A\u2060£'],
      ['[₽]{1}([0-9]+(\.[0-9]+)?)', '$1\u200A\u2060₽'], ['([0-9]+(\.[0-9]+)?)[₽]{1}', '$1\u200A\u2060₽'],
      ['[₸]{1}([0-9]+(\.[0-9]+)?)', '$1\u200A\u2060₸'], ['([0-9]+(\.[0-9]+)?)[₸]{1}', '$1\u200A\u2060₸'],
    ],
    // PER CENT SIGN: // 100% -> 100\u200A\u2060%
    'placePercentSign': [['([0-9]+(\.[0-9]+)?)[%]{1}', '$1\u200A\u2060\%'], ['[%]{1}([0-9]+(\.[0-9]+)?)', '$1\u200A\u2060\%']],
    // CONJUCTIONS: add no-breaks after conjuctions of up to three letters in length; ideally, it should be checking against a list of conjuctions to avoid false positives, but not sure how to get one at the moment.
    // NOTE: to account for all the rules applied before, instead of simple white-space, regex template includes no-break space and a unicode space.
    'placeNbsp': [['([ \u0020\u00A0])([\u0430-\u044fa-z&]{1,3})(?=[ \u0020\u00A0]+)', '$1$2\u00A0'], ['[ \u0020]{2,}', '\u0020'], ['[ \u00A0]{2,}', '\u00A0']],
    // HYPHEN
    'placeHyphen': [['([0-9\u0430-\u044fa-z]+)(-)(?=[\u0430-\u044fa-z]+)', '$1\u2060\u2011\u2060']],
    // ARROWS
    // 'placeArrows': [['<->', '\u{1F858}'], ['<-', '\u{1F850}'], ['->', '\u{1F852}'], ['<=>', '\u21D4'], ['<=', '\u21D0'], ['=>', '\u21D2']],
  };
  const englishRules = {
    // APOSTROPHE: don’t, you’re, Jones’s, the Joneses’ house, t’barn, 
    'placeTypographicApostrophe': [["(?<=[a-z]+)'(?=[ a-z]*)", '\u2060’\u2060']],
    // QUOTES: replace dumb quotes i.e. '' and "" with smart quotes following uk conventions i.e. '' =>  ‘’ and "" => “” 
    'placeTypographicQuotes': [[/(?<=\s|^)'/, '‘\u2060'], [/(?<=['"‘“”!?.,]{1})'/, '\u2060’'], ['([ ]?|^)"([^"]+)"', '$1\u2060“\u2060$2\u2060”']],
  };
  const russianRules = {
    // QUOTES
    'placeTypographicQuotes': [['([ ]?|^)"([^"]+)"', '$1\u2060„\u2060$2\u2060“'], ["([ ]?|^)'([^']+)'", '$1\u2060«\u2060$2\u2060»']],
  };
  function init() {
    const nodes = document.getElementsByClassName('alaska');

    for (const node of nodes) {
      const lang = (node.lang !== '') ? node.lang : document.documentElement.getAttribute('lang');
      const rules = getRules(node, lang);
      if (skipNode(node, rules)) continue;
      formatNode(node, rules, lang);
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes && mutation.addedNodes.length) {
          const node = mutation.target;
          const lang = (node.lang !== '') ? node.lang : document.documentElement.getAttribute('lang');
          const rules = getRules(node, lang);
          formatNode(node, rules, lang);
        }
      });
    });
    const config = { subtree: true, childList: true, attributes: true, characterData: true };
    const observeTargets = document.getElementsByClassName('alaska-observe');
    for (let observeTarget of observeTargets) {
      observer.observe(observeTarget, config);
    }
  }
  function formatNode(node, inheritedRules, inheritedLang) {
    if (skipNode(node, inheritedRules)) return;

    const stack = [{ node, inheritedRules, inheritedLang }];
    while (stack.length > 0) {
      const { node, inheritedRules, inheritedLang } = stack.pop();
      if (node.hasChildNodes()) {
        Array.from(node.childNodes).reverse().forEach((childNode) => {
          const lang = (node.lang !== '') ? node.lang : inheritedLang;
          const ownRules = getRules(childNode, lang, inheritedRules);
          if (!skipNode(childNode, ownRules)) {
            stack.push({ node: childNode, inheritedRules: ownRules, inheritedLang: lang });
          }
        });
      }
      else {
        node.textContent = formatString(node.textContent, inheritedRules);
      }
    }
  }
  function formatString(string, rules) {
    rules = rules || {};
    for (const key in rules) {
      for (const regex of rules[key]) {
        const expression = new RegExp(regex[0], 'gi');
        string = string.replace(expression, regex[1]);
      }
    }
    return string;
  }
  function skipNode(node, rules) {
    rules = rules || {};
    const commentNodeOrWhitespace = node.nodeType === 8 || (node.nodeType === 3 && !/[^\t\n\r ]/.test(node.textContent));
    const alaskaSkip = (node.classList !== undefined && node.classList.contains('alaska-skip'));
    const blockquotesSkip = ((rules['skipBlockquote'] === undefined || rules['skipBlockquote'] === 'true') && (node.nodeName === 'BLOCKQUOTE'));
    const codeSkip = ((rules['skipCode'] === undefined || rules['skipCode'] === 'true') && (node.nodeName === 'CODE'));
    return (!node.textContent.length || commentNodeOrWhitespace || alaskaSkip || blockquotesSkip || codeSkip);
  }
  function getRules(node, lang, rules) {
    const langRules = (lang === 'en') ? englishRules : russianRules;
    const allRules = {...commonRules, ...langRules};
    const ownRules = (rules) ? { ...rules } : allRules;
    for (let rule in langRules) {
      ownRules[rule] = langRules[rule];
    }
    for (let rule in node.dataset) {
      if (node.dataset[rule] === 'false' && ownRules[rule]) {
        delete ownRules[rule];
      }
      else if (node.dataset[rule] === 'true') {
        ownRules[rule] = allRules[rule];
      }
      if (rule === 'skipBlockquote' || rule === 'skipCode') {
        ownRules[rule] = node.dataset[rule];
      }
    }
    return ownRules;
  }
  if (document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      init();
    });
  }
}());
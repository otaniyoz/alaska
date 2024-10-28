(function () {
  'use strict';
  const RULES = {
    // SPACES
    'removeLeadingSpaces': [['^[ \u00A0\t]+', '']], // remove leading spaces
    'removeTrailingSpaces': [['[ \u00A0\t]+$', '']], // remove trailing spaces
    'removeMultipleSpaces': [[' {2,}', ' ']], // replace multiple consequitive spaces with a single space
    'removeNobreaks': [['\u2060{1,}', '']], // remove no-breaks
    'removeNobreakSpaces': [['\u00A0{1,}', '']], // remove no-break spaces
    'removePunctuationSpaces': [['[ ]+([.,!?":;])', '$1']], // remove spaces before selected punctuation marks
    'placeNumberNbspWord': [['([0-9]{1,})([ ]+)([a-z]+)', '$1\u00A0$3']], // put no-break space between a word preceeded by a number
    // ELLIPSIS
    'placeThreeStops': [['[.]{3}', '\u2060.\u2060.\u2060.\u2060'], ['\u2026', '\u2060.\u2060.\u2060.\u2060']], // replace three dots with three dots padded with no-breaks, replace ellipsis with three dots padded with no-breaks
    'placeNumeroSign': [['(No.|no.|Number|number)([ ]?)([0-9]+)', '\u2116\u200A\u2060$3']],
    // FRACTIONS
    'placeFractions': [['(([0-9]+)\/([0-9]+))([ \u00A0]+)', '$2\u2044$3\u00A0']],
    // MINUS (EQUATIONS AND NEGATIVE NUMBERS): replace a hyphen inside an equation with a unicode minus, remove whitespace between parts of the equation, and link everything with no-break space and no-breaks.
    'placeMinus': [['([0-9]+)([ ]?[-][ ]?)([0-9]+)([ ]?[=]+[ ]?)([-]?[0-9]+)', '$1\u00A0\u2212\u00A0$3\u00A0=\u00A0$5'], ['(?![0-9]+[ ]?)([-][ ]?)(?=[0-9]+[ ]?)(?!=)', '\u2212\u2060']],
    'placePlus': [['([0-9]+)([ ]?[+][ ]?)([0-9]+)([ ]?[=]+[ ]?)([-]?[0-9]+)', '$1\u00A0\u002B\u00A0$3\u00A0=\u00A0$5'], ['(?![0-9]+[ ]?)([+][ ]?)(?=[0-9]+[ ]?)(?!=)', '\u002B\u2060']],
    // EM-DASH
    "placeEmdash": [['[ ]?[-]{2}[ ]?', '\u00A0\u2014\u0020'], ['[ ]+[-]{1}[ ]+', '\u00A0\u2014\u0020']], // replace two consequetive hyphens with an em-dash linked to the preceeding word by a non-breaking space and followed a regular space
    // EN-DASH (NUMERICAL RANGE)
    // TODO: unicode groups do not work for some reason.
    "placeNumericRange": [['([0-9]+)([-\u2212][\u2060]?)([0-9]+[ ]?)', '$1\u2060.\u2060.\u2060$3']], // replace a single hyphen between two numbers not followed by an equality sign with an two full-stops enclosed in no-breaks without spaces
    // COPYRIGHT SYMBOLS
    'placeCopyright': [['\\(c\\)', '\u00A9'], ['\\(p\\)', '\u2117'], ['\\(tm\\)', '\u2122'], ['\\(r\\)', '\u00AE']],
    // MATHEMATICAL SYMBOLS
    'placeMathematicalSymbols': [['/dia', '\u2300'], ['/deg', '\u00B0'], ['/pm', '\u00B1'], ['/mp', '\u2213'], ['/loz', '\u25CA'], ['/prime', '\u2032'], ['/dprime', '\u2033'], ['/tprime', '\u2034'], ['/qprime', '\u2057'], ['/dot', '\u00B7'], ['/times', '\u00D7'], ['!=', '\u2260'], ['/lq', '\u2A7D'], ['/gq', '\u2A7E'], ['~=', '\u2245']],
    // ARROWS
    // 'placeArrows': [['<->', '\u{1F858}'], ['<-', '\u{1F850}'], ['->', '\u{1F852}'], ['<=>', '\u21D4'], ['<=', '\u21D0'], ['=>', '\u21D2']],
    // TYPOGRAPHY ORNAMENTATION
    'placeTypographyOrnamentation': [['/dinkus', '\u2217\u2060\u2217\u2060\u2217'], ['/asterism', '\u2042'], ['/fleuron', '\u{1F658}'], ['/dingbat', '\u27BF'], ['/dagger', '\u2020'], ['/section', '\u00A7'], ['/bullet', '\u2022'], ['/tainome', '\u25C9']],
    // EMOTICONS
    'placeEmoticons': [['/shrug', '¯\u2060\\\u2060\_\u2060(\u2060\u30C4\u2060)\u2060_\u2060/\u2060¯'], ['/crying', '(\u2060\u22A4\u2060_\u2060\u22A4\u2060)'], ['/dying', '(\u2060\u00D7\u2060_\u2060\u00D7\u2060)'], ['/nervous', '(\u2060-\u2060_\u2060-\u2060;\u2060)'], ['/cute', '(\u2060^\u2060.\u2060^\u2060)'], ['/happy', '(\u2060^\u2060_\u2060_\u2060_\u2060_\u2060_\u2060_\u2060_\u2060_\u2060_\u2060^\u2060)'], ['/surprised', '(\u2060\u00A0\u2060\u2D54\u2060.\u2060\u2D54\u2060\u00A0\u2060)'], ['/angry', '(\u2060>\u2060_\u2060<\u2060)'], ['/curious', '(\u2060\u00A0\u2060\u2D54\u2060.\u2060\u2B55\u2060\u00A0\u2060)']],
    // CURRENCY SIGN
    'placeCurrencySign': [
      ['[\u0024]{1}([0-9]+(\.[0-9]+)?)', '$1\u200A\u2060\u0024'], ['([0-9]+(\.[0-9]+)?)[\u0024]{1}', '$1\u200A\u2060\u0024'], // $100 -> 100$, 100$ -> 100$
      ['[\u20A0]{1}([0-9]+(\.[0-9]+)?)', '$1\u200A\u2060\u20AC'], ['([0-9]+(\.[0-9]+)?)[\u20AC]{1}', '$1\u200A\u2060\u20AC'],
      ['[\u00A5]{1}([0-9]+(\.[0-9]+)?)', '$1\u200A\u2060\u00A5'], ['([0-9]+(\.[0-9]+)?)[\u00A5]{1}', '$1\u200A\u2060\u00A5'],
      ['[\u00A3]{1}([0-9]+(\.[0-9]+)?)', '$1\u200A\u2060\u00A3'], ['([0-9]+(\.[0-9]+)?)[\u00A3]{1}', '$1\u200A\u2060\u00A3'],
      ['[\u9FBD]{1}([0-9]+(\.[0-9]+)?)', '$1\u200A\u2060\u9FBD'], ['([0-9]+(\.[0-9]+)?)[\u9FBD]{1}', '$1\u200A\u2060\u9FBD'],
      ['[\u20BD]{1}([0-9]+(\.[0-9]+)?)', '$1\u200A\u2060\u20BD'], ['([0-9]+(\.[0-9]+)?)[\u20BD]{1}', '$1\u200A\u2060\u20BD'],
      ['[\u20B8]{1}([0-9]+(\.[0-9]+)?)', '$1\u200A\u2060\u20B8'], ['([0-9]+(\.[0-9]+)?)[\u20B8]{1}', '$1\u200A\u2060\u20B8'],
      ['([0-9]+(\.[0-9]+)?)(usd)', '$1\u200A\u2060\u0024'], // 100usd -> 100$
      ['([0-9]+(\.[0-9]+)?)(eur)', '$1\u200A\u2060\u20AC'],
      ['([0-9]+(\.[0-9]+)?)(jpy)', '$1\u200A\u2060\u00A5'],
      ['([0-9]+(\.[0-9]+)?)(gbp)', '$1\u200A\u2060\u00A3'],
      ['([0-9]+(\.[0-9]+)?)(cny)', '$1\u200A\u2060\u9FBD'],
      ['([0-9]+(\.[0-9]+)?)(rub)', '$1\u200A\u2060\u20BD'],
      ['([0-9]+(\.[0-9]+)?)(kzt)', '$1\u200A\u2060\u20B8'],
    ],
    // PER CENT SIGN: // 100% -> 100 ⁠%
    'placePercentSign': [['([0-9]+(\.[0-9]+)?)[%]{1}', '$1\u200A\u2060\%'], ['[%]{1}([0-9]+(\.[0-9]+)?)', '$1\u200A\u2060\%']],
    // CONJUCTIONS: add no-breaks after conjuctions of up to three letters in length; ideally, it should be checking against a list of conjuctions to avoid false positives, but not sure how to get one at the moment.
    // NOTE: to account for all the rules applied before, instead of simple white-space, regex template includes no-break space and a unicode space.
    'placeNbsp': [['([ \u0020\u00A0])([a-z&]{1,3})(?=[ \u0020\u00A0]+)', '$1$2\u00A0'], ['[ \u0020]{2,}', '\u0020'], ['[ \u00A0]{2,}', '\u00A0']],
    // HYPHEN
    'placeHyphen': [['([0-9a-z]+)(-)(?=[a-z]+)', '$1\u2060\u2011\u2060']],
    // APOSTROPHE
    'placeTypographicApostrophe': [["([a-z]+)'([a-z]+)", '$1\u2019$2']],
    // QUOTES: replace dumb quotes i.e. '' and "" with smart quotes following uk conventions i.e. '' =>  ‘’ and "" => “”
    'placeTypographicQuotes': [['([ ]?|^)"([^"]+)"', '$1\u2060\u201c\u2060$2\u2060\u201d'], ["([ ]?|^)'([^']+)'", '$1\u2060\u2018\u2060$2\u2060\u2019']],
  };

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
    const blockquotesSkip = ((rules['skipBlockquote'] === undefined || rules['skipBlockquote'] === 'true') && (node.nodeName === 'BLOCKQUOTE' || node.parentNode.nodeName === 'BLOCKQUOTE'));
    const codeSkip = ((rules['skipCode'] === undefined || rules['skipCode'] === 'true') && (node.nodeName === 'CODE' || node.parentNode.nodeName === 'CODE'));
    return (!node.textContent.length || commentNodeOrWhitespace || alaskaSkip || blockquotesSkip || codeSkip);
  }

  function formatNode(node, inheritedRules, lang) {
    if (skipNode(node, inheritedRules)) return;
    lang = lang || node.dataset.lang || document.documentElement.getAttribute('lang');

    if (node.hasChildNodes()) {
      for (let childNode of node.childNodes) {
        const ownRules = getRules(childNode, lang, inheritedRules);
        if (skipNode(childNode, ownRules)) continue;
        formatNode(childNode, ownRules, lang);
        if (!childNode.childNodes.length) {
          childNode.textContent = formatString(childNode.textContent, ownRules);
        }
      }
    }
  }

  function getRules(node, lang, rules) {
    const allRules = RULES;
    const ownRules = (rules) ? { ...rules } : allRules;
    for (let rule in node.dataset) {
      if (node.dataset[rule] === 'false' && ownRules[rule]) {
        delete ownRules[rule];
      }
      else if (node.dataset[rule] === 'true') {
        ownRules[rule] = allRules[rule];
      }
    }
    return ownRules;
  }

  function init() {
    const nodes = document.getElementsByClassName('alaska');
    const lang = document.documentElement.getAttribute('lang');
    for (const node of nodes) {
      const rules = getRules(node, lang);
      if (skipNode(node, rules)) continue;
      formatNode(node, rules, lang);
    }
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes && mutation.addedNodes.length) {
          const node = mutation.target;
          const rules = getRules(node, lang);
          formatNode(node, rules);
        }
      });
    });
    const config = { subtree: true, childList: true, attributes: true, characterData: true };
    const observeTargets = document.getElementsByClassName('alaska-observe');
    for (let observeTarget of observeTargets) {
      observer.observe(observeTarget, config);
    }
  }
  
  if (document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      init();
    });
  }
}());
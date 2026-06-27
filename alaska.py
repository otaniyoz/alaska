#!/usr/bin/env python3
"""Alaska — server-side typographic formatter for HTML.
Applies typographic rules to .alaska elements in-place.
Usage: alaska.py file1.html [file2.html ...]"""

import re
import sys
import unicodedata
import html as _html
from html.parser import HTMLParser


MAX_INPUT_LENGTH = 2_000_000

COMMON_RULES = {k: True for k in {"removePunctuationSpaces", "removeMultipleSpaces", "placeNumberNbspWord", "placeThreeStops", "placeFractions", "placeArithmeticalSymbols", "placeEmdash", "placeNumericRange", "placeCopyright", "placeNumeroSign", "placeMathematicalSymbols", "placeTypographyOrnamentation", "placeEmoticons", "placeCurrencySign", "placePercentSign", "placeNbsp", "placeHyphen", "placeTemperatureSign", "placeOrdinals", "placeMultiplicationSign", "formatInitials", "placeTypographicQuotes"}}

ORDINAL_MAP = {"st": "ˢᵗ", "nd": "ⁿᵈ", "rd": "ʳᵈ", "th": "ᵗʰ"}
SHORT_WORDS = {"en": {"a", "an", "at", "by", "for", "in", "of", "on", "or", "the", "to", "and", "but", "nor", "yet", "so", "as", "if"}, "ru": {"а", "в", "во", "и", "к", "не", "на", "о", "об", "от", "по", "с", "со", "у", "из", "за", "до", "для", "или", "но", "же", "то", "бы", "ли"}}
ARITHMETIC_OPS = {"-": "−", "*": "⋅", "/": "∕", "+": "+", "=": "="}
CURRENCY_WORD_MAP = {"usd": "$", "eur": "€", "gbp": "£", "jpy": "¥", "cny": "CN¥", "rub": "₽", "kzt": "₸"}
SHORTCODE_MAP = {"\\dia": "⌀", "\\deg": "°", "\\pm": "±", "\\prime": "′", "\\dprime": "″", "\\tprime": "‴", "\\qprime": "⁗", "\\infty": "∞", "\\leq": "⩽", "\\geq": "⩾", "\\neq": "≠", "\\approx": "≈", "\\sqrt": "√", "\\prod": "∏", "\\sum": "∑", "\\int": "∫", "\\partial": "∂", "\\therefore": "∴", "\\because": "∵", "\\forall": "∀", "\\exists": "∃", "\\in": "∈", "\\notin": "∉", "\\emptyset": "∅", "\\cup": "∪", "\\cap": "∩", "\\angle": "∠", "\\perp": "⊥", "\\parallel": "∥", "\\pi": "π", "\\epsilon": "ε", "\\alpha": "α", "\\beta": "β", "\\gamma": "γ", "\\delta": "δ", "\\theta": "θ", "\\lambda": "λ", "\\mu": "μ", "\\sigma": "σ", "\\phi": "φ", "\\omega": "ω", "\\dinkus": "∗\u2060∗\u2060∗", "\\asterism": "⁂", "\\dagger": "†", "\\ddagger": "‡", "\\section": "§", "\\bullet": "•", "\\tainome": "◉", "\\shrug": "¯\u2060\\\u2060_\u2060(\u2060ツ\u2060)\u2060_\u2060/\u2060¯", "\\crying": "(\u2060⊤\u2060_\u2060⊤\u2060)", "\\dying": "(\u2060×\u2060_\u2060×\u2060)", "\\nervous": "(\u2060-\u2060_\u2060-\u2060;\u2060)", "\\cute": "(\u2060^\u2060.\u2060^\u2060)", "\\happy": "(\u2060^\u2060_\u2060_\u2060_\u2060_\u2060_\u2060_\u2060_\u2060_\u2060_\u2060^\u2060)", "\\surprised": "(\u2060\u00A0\u2060ⵔ\u2060.\u2060ⵔ\u2060\u00A0\u2060)", "\\angry": "(\u2060>\u2060_\u2060<\u2060)"}

_VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
_SKIP_TAGS = {"code", "pre", "samp", "kbd"}
_PUNCT = {'.', ',', '!', '?', ':', ';', "'", '"', '-', '–', '—', '(', ')', '…', '/'}
_SYM = '%#@&*+=<>~№©℗™®'
_CURR = '$€¥£₽₸'
_ORDINAL_RE = re.compile(r"^(st|nd|rd|th)$", re.I)
_PUNCT_NBSP = ".,!?:;"
_INITIALS_RE = re.compile(r"^[A-ZА-Я]")


class _Tok:
  __slots__ = ("tp", "v", "qi")
  def __init__(self, tp, v):
    self.tp = tp
    self.v = v
    self.qi = None


def _tokenize(text):
  tokens = []
  pos = 0
  n = len(text)
  T = _Tok
  while pos < n:
    c = text[pos]
    if c.isspace():
      start = pos
      while pos < n and text[pos].isspace():
        pos += 1
      tokens.append(T("ws", text[start:pos]))
    elif "0" <= c <= "9":
      start = pos
      while pos < n and ("0" <= text[pos] <= "9" or text[pos] in ".,"):
        pos += 1
      tokens.append(T("num", text[start:pos]))
    elif c in _CURR:
      tokens.append(T("curr", c))
      pos += 1
    elif c == "\\" and pos + 1 < n and "a" <= text[pos + 1] <= "z":
      start = pos
      pos += 1
      while pos < n and "a" <= text[pos] <= "z":
        pos += 1
      tokens.append(T("short", text[start:pos]))
    elif c in _PUNCT:
      if c == "-" and pos + 1 < n and text[pos + 1] == "-":
        val = "--"
        pos += 2
      elif c == "." and pos + 2 < n and text[pos + 1] == "." and text[pos + 2] == ".":
        val = "..."
        pos += 3
      else:
        val = c
        pos += 1
      tokens.append(T("punct", val))
    elif c in _SYM:
      tokens.append(T("sym", c))
      pos += 1
    elif c.isalpha():
      start = pos
      while pos < n and text[pos].isalpha():
        pos += 1
      tokens.append(T("word", text[start:pos]))
    else:
      tokens.append(T("other", c))
      pos += 1
  return tokens


def _next_of(tokens, i):
  for j in range(i + 1, len(tokens)):
    if tokens[j].tp != "ws": return tokens[j], j
  return None, -1


def _prev_of(tokens, i):
  for j in range(i - 1, -1, -1):
    if tokens[j].tp != "ws": return tokens[j], j
  return None, -1


def _replace(tokens, a, b, val):
  tokens[a].tp = "other"
  tokens[a].v = val
  for j in range(a + 1, b + 1):
    tokens[j].tp = "other"
    tokens[j].v = ""
    
  
def _arith_op(tokens, before, op_map):
  if before + 4 >= len(tokens): return False
  ws1, op, ws2, rhs = tokens[before+1], tokens[before+2], tokens[before+3], tokens[before+4]
  if not (ws1.tp == "ws" and op.tp in ("punct", "sym") and ws2.tp == "ws" and rhs.tp == "num"): return False
  rep = op_map.get(op.v)
  if not rep: return False
  ws1.v = "\u200A"
  op.v = rep
  ws2.v = "\u200A"
  return True


def format_string(text, rules, lang):
  if len(text) > MAX_INPUT_LENGTH: return text

  tokens = _tokenize(text)
  
  r_curr = rules.get("placeCurrencySign")
  r_mspace = rules.get("removeMultipleSpaces")
  r_pspace = rules.get("removePunctuationSpaces")
  r_nrange = rules.get("placeNumericRange")
  r_arith = rules.get("placeArithmeticalSymbols")
  r_stops = rules.get("placeThreeStops")
  r_emdash = rules.get("placeEmdash")
  r_hyphen = rules.get("placeHyphen")
  r_quotes = rules.get("placeTypographicQuotes")
  r_copy = rules.get("placeCopyright")
  r_nnbsp = rules.get("placeNumberNbspWord")
  r_ord = rules.get("placeOrdinals")
  r_frac = rules.get("placeFractions")
  r_mult = rules.get("placeMultiplicationSign")
  r_temp = rules.get("placeTemperatureSign")
  r_numero = rules.get("placeNumeroSign")
  r_nbsp = rules.get("placeNbsp")
  r_initials = rules.get("formatInitials")
  r_pct = rules.get("placePercentSign")
  r_emote = rules.get("placeEmoticons")
  r_math = rules.get("placeMathematicalSymbols")
  r_ornament = rules.get("placeTypographyOrnamentation")
  sw = SHORT_WORDS.get(lang, frozenset())

  if r_curr:
    for idx, t in enumerate(tokens):
      if t.tp == "word":
        sym = CURRENCY_WORD_MAP.get(t.v.lower())
        if sym: tokens[idx] = _Tok("curr", sym)

  stack = []
  for idx in range(len(tokens)):
    t = tokens[idx]
    prev = tokens[idx - 1] if idx > 0 else None
    nxt  = tokens[idx + 1] if idx + 1 < len(tokens) else None

    if t.tp == "punct" and t.v == "'":
      if prev and prev.tp == "word" and nxt and nxt.tp == "word":
        t.qi = {"isApostrophe": True}
        continue

    if t.tp == "punct" and t.v in ('"', "'"):
      prev_open = prev and prev.qi and prev.qi.get("isOpening")
      top = stack[-1] if stack else None
      same_char = top is not None and top["char"] == t.v
      is_open = not same_char and (not prev or prev.tp == "ws" or prev_open or (prev.tp == "punct" and prev.v in ",;:(["))
      if is_open:
        d = len(stack)
        stack.append({"depth": d, "char": t.v})
        t.qi = {"isOpening": True, "depth": d}
      else:
        d = stack.pop()["depth"] if stack else 0
        t.qi = {"isOpening": False, "depth": d}
    
  i = 0
  while i < len(tokens):
    t = tokens[i]
    prev = tokens[i - 1] if i > 0 else None
    nxt = tokens[i + 1] if i + 1 < len(tokens) else None
    nxt2 = tokens[i + 2] if i + 2 < len(tokens) else None
    nxt3 = tokens[i + 3] if i + 3 < len(tokens) else None

    if t.tp == "ws":
      if r_mspace and len(t.v) > 1: t.v = " "
      if r_pspace and nxt and nxt.tp == "punct" and nxt.v in _PUNCT_NBSP: t.v = ""

    elif t.tp == "punct":
      v = t.v
      if r_nrange and v == "-" and prev and prev.tp == "num" and (not nxt or nxt.tp in ("num", "ws")):
        t.v = "\u2060\u2013\u2060"
      elif v == "-" and nxt and (nxt.tp == "num" or (nxt.tp == "punct" and nxt.v == "(")):
        p, _ = _prev_of(tokens, i)
        if (not p or (p.tp != "num" and p.v != ")")) and r_arith: t.v = "−"
      elif r_stops and v in ("...", "…"):
        t.v = "\u2060.\u2060.\u2060.\u2060"
      elif r_emdash and v == "--":
        t.v = "\u00A0\u2014 "
        if prev and prev.tp == "ws": prev.v = ""
        if nxt  and nxt.tp  == "ws": nxt.v  = ""
      elif r_emdash and v == "-" and (not prev or (prev.tp == "ws" and "\n" in prev.v)) and nxt and nxt.tp == "ws" and (not nxt2 or nxt2.tp != "num"):
        if prev and prev.tp == "ws": prev.v = prev.v[:prev.v.rfind("\n") + 1]
        _replace(tokens, i, i + 1, "\u2014 ")
      elif r_emdash and v == "-" and prev and prev.tp == "ws" and nxt and nxt.tp == "ws" and (not nxt2 or nxt2.tp != "num"):
        _replace(tokens, i - 1, i + 1, "\u00A0\u2014 ")
        i -= 1
      elif r_hyphen and v == "-" and prev and prev.tp == "word" and nxt and nxt.tp == "word":
        t.v = "\u2060-\u2060"
      elif r_quotes and v in ('"', "'"):
        info = t.qi
        if info:
          if info.get("isApostrophe"):
            t.v = "\u2019"
          else:
            d = info["depth"]
            if info["isOpening"]: t.v = ("\u2018\u2060" if lang == "en" else "\u00AB\u2060") if d % 2 == 0 else ("\u201C\u2060" if lang == "en" else "\u201E\u2060")
            else: t.v = ("\u2060\u2019" if lang == "en" else "\u2060\u00BB") if d % 2 == 0 else ("\u2060\u201D" if lang == "en" else "\u2060\u201C")
      elif v == ")" and r_arith:
        _arith_op(tokens, i, ARITHMETIC_OPS)
      elif r_copy and v == "(":
        if nxt and nxt.tp == "word" and nxt2 and nxt2.tp == "punct" and nxt2.v == ")":
          rep = {"(c)": "©", "(p)": "℗", "(tm)": "™", "(r)": "®"}.get("(" + nxt.v.lower() + ")")
          if rep: _replace(tokens, i, i + 2, rep)

    elif t.tp == "num":
      if r_nnbsp and nxt and nxt.tp == "ws" and nxt2 and nxt2.tp == "word": nxt.v = "\u00A0"
      if  r_ord and nxt and nxt.tp == "word" and _ORDINAL_RE.match(nxt.v):
        _replace(tokens, i, i + 1, t.v + ORDINAL_MAP[nxt.v.lower()])
        i += 1
        continue
      if r_frac and nxt and nxt.tp == "punct" and nxt.v == "/" and nxt2 and nxt2.tp == "num":
        if nxt3 and nxt3.tp == "ws": nxt3.v = "\u00A0"
        _replace(tokens, i, i + 2, t.v + "\u2044" + nxt2.v)
        i += 1
        continue
      if r_arith: _arith_op(tokens, i, ARITHMETIC_OPS)
      if r_mult:
        x, xi = _next_of(tokens, i)
        if x and x.tp == "word" and x.v.lower() == "x":
          n2, n2i = _next_of(tokens, xi)
          if n2 and n2.tp == "num":
            for j in range(i + 1, xi):
              tokens[j].v = "\u200A"
            x.v = "×"
            for j in range(xi + 1, n2i):
              tokens[j].v = "\u200A"
      if r_arith:
        bop, bi = _next_of(tokens, i)
        if bop:
          us, ui = _next_of(tokens, bi)
          if us:
            un, _ = _next_of(tokens, ui)
            if un and bop.tp in ("punct", "sym") and re.search(r"[+\-*/×÷=]", bop.v) and us.v == "-" and un.tp == "num": us.v = "\u2212"

    elif t.tp == "curr" and r_curr:
      n, ni = _next_of(tokens, i)
      p, pi = _prev_of(tokens, i)
      if n and n.tp == "num":
        _replace(tokens, i, ni, t.v + "\u202F" + n.v)
      elif p and p.tp == "num":
        _replace(tokens, pi, i, t.v + "\u202F" + p.v)
        i = pi

    elif t.tp == "word":
      if r_temp and t.v in ("oC", "oF") and prev and prev.tp == "num":
        _replace(tokens, i - 1, i, prev.v + "\u202F°" + t.v[1])
        i -= 1
      elif r_numero and t.v.lower() == "no":
        if nxt and nxt.tp == "punct" and nxt.v == ".":
          if nxt2 and nxt2.tp == "num": _replace(tokens, i, i + 1, "№\u202F\u2060")
          elif nxt2 and nxt2.tp == "ws" and nxt3 and nxt3.tp == "num": _replace(tokens, i, i + 2, "№\u202F")
      elif r_nbsp and nxt and nxt.tp == "ws" and t.v.lower() in sw:
        nxt.v = "\u00A0"
      elif r_initials and len(t.v) <= 3 and _INITIALS_RE.match(t.v) and nxt and nxt.tp == "punct" and nxt.v == ".":
        ad, adi = _next_of(tokens, i + 1)
        next_is_init = (ad and ad.tp == "word" and len(ad.v) == 1 and _INITIALS_RE.match(ad.v) and adi + 1 < len(tokens) and tokens[adi + 1].tp == "punct" and tokens[adi + 1].v == ".")
        if next_is_init:
          nxt.v = ".\u202F"
          for j in range(i + 2, adi):
            tokens[j].v = ""
        elif i + 2 < len(tokens) and tokens[i + 2].tp == "ws" and ad and ad.tp == "word":
          nxt.v = "."
          for j in range(i + 2, adi):
            tokens[j].v = "\u00A0"
      
    elif t.tp == "sym":
      if r_pct and t.v == "%":
        if prev and prev.tp == "num":
          _replace(tokens, i - 1, i, "%\u202F" + prev.v)
          i -= 1
        elif nxt and nxt.tp == "num":
          t.v = "%\u202F"

    elif t.tp == "short":
      if r_emote or r_math or r_ornament:
        rep = SHORTCODE_MAP.get(t.v.lower())
        if rep: t.v = rep

    i += 1

  return "".join(t.v for t in tokens)


def _kebab_to_camel(s):
  parts = s.split("-")
  return parts[0] + "".join(p.capitalize() for p in parts[1:])


def _compute_rules(attrs, inherited):
  data = {}
  for name, val in attrs:
    if not name.startswith("data-"): continue
    key = _kebab_to_camel(name[5:])
    if key not in COMMON_RULES: continue
    data[key] = True if val == "true" else (False if val == "false" else val)
  return {**inherited, **data} if data else dict(inherited)


class _Processor(HTMLParser):
  def __init__(self):
    super().__init__(convert_charrefs=False)
    self._out = []
    self._stack = [{"active": False, "skip": False, "lang": "", "rules": COMMON_RULES}]

  def _ctx(self): return self._stack[-1]

  def handle_starttag(self, tag, attrs):
    ctx = self._ctx()
    classes = set()
    lang_val = ctx["lang"]
    for name, val in attrs:
      if name == "class": classes.update(val.split())
      elif name == "lang": lang_val = val
    frame = {
      "active": ctx["active"] or "alaska" in classes,
      "skip":   ctx["skip"]   or tag in _SKIP_TAGS or "alaska-skip" in classes,
      "lang":   lang_val,
      "rules":  _compute_rules(attrs, ctx["rules"]),
    }
    if tag not in _VOID: self._stack.append(frame)
    self._out.append(self._HTMLParser__starttag_text)

  def handle_endtag(self, tag):
    if tag not in _VOID and len(self._stack) > 1: self._stack.pop()
    self._out.append(f"</{tag}>")

  def handle_startendtag(self, tag, attrs):
    self._out.append(self._HTMLParser__starttag_text)

  def handle_data(self, data):
    ctx = self._ctx()
    if ctx["active"] and not ctx["skip"]: data = format_string(data, ctx["rules"], ctx["lang"])
    self._out.append(data)

  def handle_comment(self, data):
    self._out.append(f"<!--{data}-->")

  def handle_decl(self, decl):
    self._out.append(f"<!{decl}>")
    
  def handle_pi(self, data):
    self._out.append(f"<?{data}>")

  def unknown_decl(self, data):
    self._out.append(f"<![{data}]>")

  def handle_entityref(self, name):
    self._out.append(f"&{name};")

  def handle_charref(self, name):
    self._out.append(f"&#{name};")

  def result(self):
    return "".join(self._out)

  
def process_file(path):
  with open(path, encoding="utf-8") as f:
    src = f.read()
  p = _Processor()
  p.feed(src)
  out = p.result()
  if out != src:
    with open(path, "w", encoding="utf-8") as f:
      f.write(out)

      
def main():
  import argparse, fnmatch
  ap = argparse.ArgumentParser(description=__doc__)
  ap.add_argument("files", nargs="+", metavar="file")
  ap.add_argument("--exclude", action="append", default=[], metavar="pattern", help="glob pattern of files to skip (repeatable)")
  args = ap.parse_args()
  for path in args.files:
    if any(fnmatch.fnmatch(path, pat) for pat in args.exclude): continue
    try:
      process_file(path)
    except Exception as e:
      print(f"error: {path}: {e}", file=sys.stderr)
      sys.exit(1)

      
if __name__ == "__main__":
  main()

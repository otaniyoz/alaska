#!/usr/bin/env python3
import sys
import json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from alaska import format_string, COMMON_RULES

passed = 0
failed = 0
data = json.loads((Path(__file__).parent / "test.json").read_text(encoding="utf-8"))

  
for group in data["groups"]:
  for case in group["cases"]:
    rule_config = case.get("rules", {})
    base = rule_config.get("base", "all")
    overrides = {k: v for k, v in rule_config.items() if k != "base"}
    test_rules = {**({k: False for k in COMMON_RULES} if base == "none" else COMMON_RULES), **overrides}
    out = format_string(case["input"], test_rules, case.get("lang", "en"))
    if out == case["expected"]:
      passed += 1
    else:
      failed += 1
      print(f'x [{group["name"]}] {case["desc"]}')
      print(f'  input    {json.dumps(case["input"])}')
      print(f'  expected {json.dumps(case["expected"])}')
      print(f'  actual   {json.dumps(out)}')

print(f"{passed} passed, {failed} failed")
if failed: sys.exit(1)

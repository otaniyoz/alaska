#!/usr/bin/env python3
import sys
import time
from pathlib import Path
from datetime import datetime, timezone
sys.path.insert(0, str(Path(__file__).parent.parent))

from alaska import format_string, COMMON_RULES

if len(sys.argv) < 2:
  print("usage: bench.py <file.txt>", file=sys.stderr)
  sys.exit(1)

text = Path(sys.argv[1]).read_bytes().decode("utf-8")
RUNS = 1000

t0 = time.perf_counter()
for _ in range(RUNS):
  format_string(text, COMMON_RULES, "en")
elapsed = time.perf_counter() - t0

print(f"{len(text)} chars")
print(f"{elapsed / RUNS * 1000:.2f}ms per run")

entry = f"{datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')} {Path(__file__).name} {elapsed / RUNS * 1000:.2f}ms\n"
history = Path(__file__).parent / "history"
with open(history, "a", encoding="utf-8") as f:
  f.write(entry)

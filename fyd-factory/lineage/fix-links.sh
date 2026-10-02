#!/bin/bash
cd /home/nolan/projects/ping || exit 1
python3 - <<'PYEOF'
import re
p = "src/fyd/lineage/tracer.ts"
s = open(p).read()
old = """    tracedAt: new Date().toISOString(),
    complete: links.every((l) => l.status === "resolved"),
  };
}"""
new = """    tracedAt: new Date().toISOString(),
    complete: links.every((l) => l.status === "resolved"),
    links,
  };
}"""
assert old in s, "pattern not found"
s = s.replace(old, new)
open(p, "w").write(s)
print("patched: links included in traceClaim return")
PYEOF

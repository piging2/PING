#!/bin/bash
set -u
python3 - <<'PYEOF'
import io
p = "/home/nolan/projects/ping/src/fyd/lineage/tracer.ts"
s = io.open(p, encoding="utf-8").read()
old = "(inside the FydObjectCard description read through resolveBoundField,\n *   the binding verifier)."
new = "(inside the FydObjectCard description read through resolveBoundFieldVerified,\n *   the strong binding verifier)."
assert old in s, "anchor missing"
io.open(p, "w", encoding="utf-8").write(s.replace(old, new))
print("tracer module doc fixed")
PYEOF

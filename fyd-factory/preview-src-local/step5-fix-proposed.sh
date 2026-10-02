#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
F="$WT/src/fyd/customize/owner-proposal.ts"

cp "$F" "$F.orig2"

python3 << 'PYEOF'
path = "/home/nolan/fyd-preview-wt/src/fyd/customize/owner-proposal.ts"
with open(path) as f:
    src = f.read()

# The ProposeOutcome type guarantees proposal is defined when ok:true.
# The "!proposed.proposal" disjunct is redundant and breaks TypeScript
# narrowing (proposed.error doesn't exist on the ok:true variant).
# MAIN-REPO FINDING: the newer lane code has this redundant check; the
# type already guarantees proposal when ok:true.
old = "if (!proposed.ok || !proposed.proposal) {"
new = "if (!proposed.ok) {"

count = src.count(old)
assert count == 2, f"expected 2 occurrences, found {count}"
src = src.replace(old, new)

with open(path, "w") as f:
    f.write(src)

print(f"Fixed {count} redundant proposal checks")
PYEOF

echo "=== diff ==="
diff "$F.orig2" "$F"

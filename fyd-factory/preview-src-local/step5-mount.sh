#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
S=/home/nolan/fyd-preview-staging
mkdir -p "$WT/src/app/preview/ask" "$WT/src/app/preview/owner-console"
cp "$S/ask/page.tsx" "$WT/src/app/preview/ask/page.tsx"
cp "$S/owner-console/page.tsx" "$WT/src/app/preview/owner-console/page.tsx"
echo "=== verify copies ==="
sha256sum "$WT/src/app/preview/ask/page.tsx" "$WT/src/app/preview/owner-console/page.tsx"
echo "=== expected ==="
sha256sum "$S/ask/page.tsx" "$S/owner-console/page.tsx"
echo "=== hub link update ==="
python3 - "$WT" <<'PYEOF'
import sys
wt = sys.argv[1]
p = wt + "/src/app/fyd-night/page.tsx"
s = open(p).read()
assert 'href: "/fyd-night/ask"' in s
assert 'href: "/fyd-night/owner"' in s
s = s.replace('href: "/fyd-night/ask"', 'href: "/preview/ask"')
s = s.replace('href: "/fyd-night/owner"', 'href: "/preview/owner-console"')
open(p, "w").write(s)
print("hub links updated")
PYEOF
grep -n 'href: "/preview' "$WT/src/app/fyd-night/page.tsx"
echo "=== WT STATUS ==="
cd "$WT" && git status --porcelain

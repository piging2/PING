#!/bin/bash
# QA-A11Y probe 4: page structure (demo chrome vs site), reduced-motion source, html lang/title
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== html lang/title (copper) ==="
grep -o '<html[^>]*>' /tmp/qa-a11y/copper.html | head -2
grep -o '<title>[^<]*</title>' /tmp/qa-a11y/copper.html | head -2
echo "=== skip link? ==="
grep -oi 'skip[^<"]\{0,30\}' /tmp/qa-a11y/copper.html | head -5
echo "=== main landmarks context ==="
python3 - <<'EOF'
import re
h=open('/tmp/qa-a11y/copper.html').read()
for m in re.finditer(r'<main[^>]*>', h):
    print(repr(h[max(0,m.start()-300):m.start()][-300:]))
    print('---MAIN TAG:', m.group(0)[:120])
EOF
echo "=== reduced-motion in source ==="
grep -rn "prefers-reduced-motion\|useReducedMotion\|reducedMotion" src/fyd/ --include="*.tsx" --include="*.ts" | head -20
echo "=== motion fallback component (recently modified) ==="
wc -l src/fyd/components/fyd-motion-fallback.tsx
head -80 src/fyd/components/fyd-motion-fallback.tsx

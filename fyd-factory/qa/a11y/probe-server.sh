#!/bin/bash
# QA-A11Y probe 2: what matched in key files + dev server health
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== match context in fyd files ==="
grep -rniE "axe|a11y|accessibility" --include="*.ts" --include="*.tsx" src/fyd/components/renderer.tsx src/fyd/object/node.tsx src/fyd/components/ask-fyd-widget.tsx src/fyd/ui/identity-object.tsx 2>/dev/null | head -30
echo "=== dev server ==="
curl -s -o /dev/null -w "code=%{http_code} time=%{time_total}s\n" --max-time 20 http://localhost:3100/sites/coppersmith-plumbing
curl -s -o /dev/null -w "code=%{http_code} time=%{time_total}s\n" --max-time 20 http://localhost:3100/sites/happy-place

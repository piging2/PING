#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== all emitters of kind:\"all\" queries ==="
grep -rn 'kind: "all"' src --include="*.ts" --include="*.tsx" | grep -v __tests__ | head -20
echo "=== all ObjectFeed references (non-test) ==="
grep -rln "ObjectFeed" src --include="*.ts" --include="*.tsx" | grep -v __tests__ | head -20
echo "=== /build/[siteId] route exists? ==="
ls src/app/build 2>/dev/null || echo "no src/app/build dir"
echo "=== site page routes under src/app/sites ==="
ls src/app/sites/

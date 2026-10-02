#!/bin/bash
set -uo pipefail
cd /home/nolan/fyd-preview-wt
echo "=== owner-store readOverrides ==="
grep -n "readOverrides\|FYD_OWNER_DIR\|readdir\|readFile" src/fyd/object/owner-store.ts | head -20
echo "=== owner-events.ts:370 context ==="
sed -n '360,385p' src/fyd/object/owner-events.ts
echo "=== AskObjectPanel imports (what does ask need?) ==="
head -40 src/fyd/ui/ask-object-panel.tsx
echo "=== test suites ==="
ls src/fyd/__tests__/ 2>/dev/null | head; find src -path "*__tests__*" -name "*.test.ts*" | grep -iE "ask|sitespec|owner-mode|customize" | head -20

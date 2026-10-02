#!/bin/bash
# AGENT-17 probe 13: view.ts caps, ask callers, SEC-FIX-SPEC, QA docs (READ-ONLY)
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== view.ts 190-240 (capability href build) ==="
sed -n '190,240p' src/fyd/object/view.ts
echo ""
echo "=== /api/ping/ask caller ==="
grep -rn 'api/ping/ask' src --include='*.ts' --include='*.tsx' | grep -v 'src/app/api/ping/ask' | head
echo "=== claims API callers (pages/components) ==="
grep -rln 'api/fyd/claims' src --include='*.ts' --include='*.tsx' | grep -v 'src/app/api/fyd/claims' | head
echo "=== SEC-FIX-SPEC file ==="
grep -rln 'SEC-FIX-SPEC' . --include='*.md' 2>/dev/null | grep -v node_modules | head
echo "=== QA-TRUTH / LANE-CLAIM docs ==="
find . -iname '*QA-TRUTH*' -not -path '*/node_modules/*' 2>/dev/null | head
find ~/workspace -iname '*SEC-FIX-SPEC*' 2>/dev/null | head

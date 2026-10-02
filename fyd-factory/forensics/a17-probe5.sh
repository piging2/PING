#!/bin/bash
# AGENT-17 probe 5: renderer seam + /o href + explore query (READ-ONLY)
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== who calls verifyPresentationBinding / resolveBoundField / verifyBinding (non-test) ==="
grep -rn 'verifyPresentationBinding\|resolveBoundField\|verifySpecBindings\|assertSpecBindingsVerified\|buildVerifiedRenderModel' src --include='*.ts' --include='*.tsx' | grep -v __tests__ | grep -v 'sitespec/graph.ts' | grep -v 'sitespec/binding-verifier.ts'
echo ""
echo "=== /o/[objectId]/page.tsx href interpolation ==="
grep -n 'href' src/app/o/\[objectId\]/page.tsx | head -30
echo ""
echo "=== explore references in api routes ==="
grep -rln 'explore' src/app/api --include='route.ts' | sort
grep -rn 'explore' src/app/api/fyd/projection/route.ts 2>/dev/null | head -20
echo ""
echo "=== customize/server.ts (generateSiteSpec caller) ==="
head -60 src/fyd/customize/server.ts
echo ""
echo "=== /api/fyd/customize/route.ts ==="
cat src/app/api/fyd/customize/route.ts | head -60

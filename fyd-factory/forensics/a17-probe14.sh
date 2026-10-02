#!/bin/bash
# AGENT-17 probe 14: ask siteId callers, page wiring, stores (READ-ONLY)
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== callers of /api/fyd/ask/<site> ==="
grep -rn 'api/fyd/ask/' src --include='*.ts' --include='*.tsx' | grep -v 'src/app/api/fyd/ask' | head
echo "=== follow/like route imports (storage) ==="
head -20 src/app/api/fyd/follow/route.ts
echo "=== social/actions persistence ==="
grep -n 'KV_REST_API\|FYD_SOCIAL\|writeFile\|readFile\|fetch(' src/fyd/social/actions.ts | head -12
echo "=== claims backing ==="
grep -n 'import\|KV_REST_API\|FYD_CLAIM_DIR' 'src/app/api/fyd/claims/[resourceId]/claim/route.ts' | head -12
echo "=== auth session backing ==="
grep -n 'import' src/app/api/fyd/auth/session/route.ts | head; grep -rn 'KV_REST_API\|cookies' src/fyd/identity/provider.ts | head -6
echo "=== ping-object-reader backing ==="
grep -n 'PING_GATEWAY_BASE_URL\|FYD_PING_GATEWAY_BASE_URL\|fetch(' src/lib/ping/ping-object-reader.ts | head -8
echo "=== SEC-FIX-SPEC in workspace ==="
find ~/workspace -iname '*sec-fix*' 2>/dev/null | head; ls ~/workspace/fyd-factory/security/ 2>/dev/null | head -20

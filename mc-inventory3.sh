#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== gateway :18199 full routes (lines 100-145 of server.mjs) ==="
sed -n '100,145p' tools/fyd-journal-gateway/server.mjs
echo "=== fixture object counts ==="
grep -c 'id:' src/fyd/proceduralize/__fixtures__/happy-place-graph.ts 2>/dev/null || ls src/fyd/proceduralize/__fixtures__/ | head -20
wc -l src/fyd/proceduralize/__fixtures__/happy-place-graph.ts src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts 2>/dev/null
echo "=== sitespec persistence ==="
grep -rn -e 'registerSiteSpecProvider' src --include='*.ts' | grep -v site-spec.ts | head -5
find . -path ./node_modules -prune -o -type f -name '*sitespec*' -print 2>/dev/null | grep -v '.git/' | grep -v __tests__ | head -10
echo "=== ping ask route body ==="
sed -n '1,60p' src/app/api/ping/ask/route.ts
echo "=== wave2 worktree ==="
ls .git/worktrees/fyd-wave2-clean/ 2>/dev/null
echo "=== FYD gateway env ==="
grep -n -e 'FYD_GATEWAY\|fydGateway\|18199\|fyd_journal' src/lib/ping/ping-object-reader.ts | head -10
echo "=== running gateway on 18199 ==="
ss -tlnp 2>/dev/null | grep -e '18199' | head -5

#!/bin/bash
# AGENT-17 probe 12: webhook, feed/fyd/practice pages, ask routes (READ-ONLY)
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== kit webhook route full ==="
cat src/app/api/kit/webhook/route.ts
echo ""
echo "=== /api/fyd/ask/route.ts vs [siteId]/route.ts (heads) ==="
head -60 src/app/api/fyd/ask/route.ts
echo "----- [siteId] -----"
head -70 'src/app/api/fyd/ask/[siteId]/route.ts'

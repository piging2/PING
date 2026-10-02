#!/bin/bash
# AGENT-17 probe 11: dead refs, social/auth/download callers, webhook secret (READ-ONLY)
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== /api/estimate and /api/drive references: which files ==="
grep -rn '/api/estimate\|/api/drive/' src --include='*.ts' --include='*.tsx' | grep -v 'src/app/api' | head
echo "=== does an estimate or drive route exist anywhere ==="
find src/app -path '*estimate*' -o -path '*drive*' | head
echo "=== /api/fyd/social callers ==="
grep -rn 'api/fyd/social' src --include='*.ts' --include='*.tsx' | grep -v 'src/app/api/fyd/social' | head
echo "=== /api/fyd/auth callers ==="
grep -rln 'api/fyd/auth' src --include='*.ts' --include='*.tsx' | grep -v 'src/app/api/fyd/auth' | head
echo "=== /api/resources/download callers ==="
grep -rn 'api/resources/download' src --include='*.ts' --include='*.tsx' | grep -v 'src/app/api/resources' | head
echo "=== /api/fyd/projection + /api/fyd/media + /api/fyd/circle callers ==="
grep -rn 'api/fyd/projection\|api/fyd/media\|api/fyd/circle' src --include='*.ts' --include='*.tsx' | grep -v 'src/app/api/fyd/\(projection\|media\|circle\)' | head
echo "=== kit webhook secret check ==="
grep -n 'KIT_WEBHOOK_SECRET\|verify\|signature' src/app/api/kit/webhook/route.ts | head
echo "=== /api/ping/feed + /api/ping/actions + /api/ping/object callers ==="
grep -rn 'api/ping/feed\|api/ping/actions\|api/ping/object' src --include='*.ts' --include='*.tsx' | grep -v 'src/app/api/ping' | head

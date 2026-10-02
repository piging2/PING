#!/bin/bash
# W4 Audit A - recon15: node_modules for test run + fyd ask route + served PING site
set -u
WT=/tmp/w4-audit-ping
echo "=== A. node_modules in main checkout? ==="
ls -d /home/nolan/projects/ping/node_modules 2>/dev/null && echo HAVE_NM || echo NO_NM
node --version 2>/dev/null; npm --version 2>/dev/null
echo "=== B. fyd ask [siteId] route ==="
sed -n '1,60p' "$WT/src/app/api/fyd/ask/[siteId]/route.ts"
echo "=== C. ask-composer: corpus for ping-fyd answers ==="
grep -n "getPingObjectGraph\|projectionDir\|readFile\|owner-asserted\|overlay" "$WT/src/lib/ping/ask-composer.ts" | head -20

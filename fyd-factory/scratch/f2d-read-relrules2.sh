#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== product ====="
grep -n -A16 'id: "ping.social.product@1"' src/fyd/sitespec/schemas.ts | head -22
echo "===== article ====="
grep -n -B2 -A18 'id: "ping.social.article@1"' src/fyd/sitespec/schemas.ts | head -26
echo "===== location ====="
grep -n -B2 -A16 'id: "ping.social.location@1"' src/fyd/sitespec/schemas.ts | head -24
echo "===== person ====="
grep -n -B2 -A16 'id: "ping.social.person@1"' src/fyd/sitespec/schemas.ts | head -24

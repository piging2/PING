#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "########## schema defs with relationships ##########"
grep -n -B2 -A22 'id: "ping.social.business@1"' src/fyd/sitespec/schemas.ts | head -45
echo "===== post ====="
grep -n -A22 'id: "ping.social.post@1"' src/fyd/sitespec/schemas.ts | head -28
echo "===== article ====="
grep -n -A20 'id: "ping.social.article@1"' src/fyd/sitespec/schemas.ts | head -26
echo "===== person ====="
grep -n -A14 'id: "ping.social.person@1"' src/fyd/sitespec/schemas.ts | head -20
echo "===== service ====="
grep -n -A14 'id: "ping.social.service@1"' src/fyd/sitespec/schemas.ts | head -20

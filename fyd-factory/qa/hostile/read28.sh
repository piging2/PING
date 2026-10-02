#!/bin/bash
cd /home/nolan/projects/ping
grep -n "href" "src/app/build/[siteId]/build-client.tsx" | head -10
echo "@@@@@ ClaimEvidence shape @@@@@"
grep -n "interface ClaimEvidence" -A 12 src/fyd/object/object-projection.ts | head -16

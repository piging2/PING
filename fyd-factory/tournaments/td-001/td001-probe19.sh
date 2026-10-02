#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== tests referencing external_identity in specs/generator ====="
grep -rln "external_identity" src/fyd/proceduralize/__tests__ src/fyd/sitespec/__tests__ src/fyd/builder/__tests__ 2>/dev/null
echo
echo "===== happy-place page pipeline ====="
grep -n "generateSiteSpec\|validateSiteSpec\|getPingObjectGraph" src/app/sites/happy-place/page.tsx | head
echo
echo "===== build/[siteId] pipeline ====="
grep -n "generateSiteSpec\|validateSiteSpec" src/app/build/\[siteId\]/page.tsx | head

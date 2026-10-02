#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== featuredIds usage ==="
grep -rn "featuredIds" src/fyd/ --include="*.ts" | grep -v test | grep -v "types.ts" | head -8
echo ""
echo "=== structured data emit on site pages ==="
grep -rln "ld+json\|JsonLd\|jsonLd\|structuredData" src/app/sites/ src/fyd/sitespec/ 2>/dev/null | head -8
echo ""
echo "=== validateSiteSpec signature ==="
grep -n "export function validateSiteSpec\|export function isRenderable" -A 8 src/fyd/sitespec/validator.ts | head -25

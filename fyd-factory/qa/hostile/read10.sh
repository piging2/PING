#!/bin/bash
cd /home/nolan/projects/ping
echo "@@@@@ json-ld refs @@@@@"
grep -rn "ld+json\|jsonld\|JSON-LD\|jsonLd\|structuredData\|schema.org" src/fyd/ --include="*.tsx" --include="*.ts" | grep -v __tests__ | head -20
echo "@@@@@ title/meta @@@@@"
grep -n "<title\|<meta\|export.*[Gg]enerate[Mm]etadata\|<head" src/app/o/\[objectId\]/page.tsx src/app/build/\[siteId\]/page.tsx src/app/page.tsx 2>/dev/null | head -20
echo "@@@@@ 1000-1030 @@@@@"
sed -n '1000,1030p' src/fyd/components/renderer.tsx

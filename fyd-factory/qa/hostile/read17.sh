#!/bin/bash
cd /home/nolan/projects/ping
sed -n '1795,1802p' src/fyd/components/renderer.tsx
echo "@@@@@ SitePageView theme source @@@@@"
grep -n "theme" src/fyd/components/renderer.tsx | sed -n '1,25p'
echo "@@@@@ object view capabilities href @@@@@"
grep -rn "href" src/fyd/object/object-projection.ts | head -10
grep -rn "capabilitiesForObject\|ObjectCapability" src/fyd/object/*.ts src/fyd/components/object-rail.tsx 2>/dev/null | head -10
echo "@@@@@ ask widget siteId @@@@@"
grep -n "siteId\|data-" src/fyd/components/ask-fyd-widget.tsx | head -10

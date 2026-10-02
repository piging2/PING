#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "##### site-client tail #####"
sed -n '80,200p' src/app/sites/_shared/site-client.tsx
echo "##### object-overlay exists #####"
ls src/fyd/components/object-overlay.tsx
echo "##### who renders sections with wrapper: renderer SitePageView (60) #####"
grep -n "SitePageView\|export function\|export const" src/fyd/components/renderer.tsx | head -20

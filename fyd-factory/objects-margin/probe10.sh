#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "##### renderSection (1738-1795) #####"
sed -n '1738,1795p' src/fyd/components/renderer.tsx
echo "##### SitePageView (1795-1860) #####"
sed -n '1795,1860p' src/fyd/components/renderer.tsx

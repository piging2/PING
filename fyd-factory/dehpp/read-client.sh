#!/bin/bash
cd /home/nolan/projects/ping
echo "##### shared dir"
ls src/app/sites/_shared/ 2>/dev/null
echo "##### SitePageView location"
grep -rln "SitePageView" src --include='*.tsx' | grep -v __tests__ | head -10
echo "##### site-client"
cat src/app/sites/_shared/site-client.tsx 2>/dev/null | head -150

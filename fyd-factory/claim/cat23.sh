#!/bin/bash
cd /home/nolan/projects/ping
grep -n "generateSiteSpec\|planSite\|SitePageView\|renderToStatic" src/fyd/preview/pipeline.ts | head -15
echo "--- which path serves the demo sites? ---"
grep -rn "generateSiteSpec\|planSite" src/app --include="*.tsx" --include="*.ts" -l 2>/dev/null | head -10

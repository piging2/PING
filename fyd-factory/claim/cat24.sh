#!/bin/bash
cd /home/nolan/projects/ping
grep -n "generateSiteSpec\|planSite\|SitePageView\|getFydTenantGraph" src/app/sites/happy-place/page.tsx src/app/sites/coppersmith-plumbing/page.tsx src/app/build/\[siteId\]/page.tsx 2>/dev/null | head -20

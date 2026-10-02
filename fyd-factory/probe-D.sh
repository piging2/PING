#!/bin/bash
# LANE-ARCH probe D: render path for /sites/coppersmith-plumbing (read-only)
set -u
REPO=/home/nolan/projects/ping
cd "$REPO"
echo "=== ROUTE src/app/sites/coppersmith-plumbing/page.tsx ==="
cat src/app/sites/coppersmith-plumbing/page.tsx
echo; echo "=== ROUTE src/app/sites/happy-place/page.tsx ==="
cat src/app/sites/happy-place/page.tsx
echo; echo "=== _shared/site-client.tsx (first 120 lines) ==="
head -120 src/app/sites/_shared/site-client.tsx
echo "=== imports of strategies in routes ==="
grep -rn "strategy-for-site\|infer-strategy\|strategies" src/app --include='*.tsx' --include='*.ts' | head -20
echo "=== where is planSite/buildSemanticRenderModel called from app ==="
grep -rn "planSite\|buildSemanticRenderModel\|buildVerifiedRenderModel\|SitePageView\|buildRenderContext" src/app src/components --include='*.tsx' --include='*.ts' | grep -v __tests__ | head -30
echo "=== route dir listing ==="
ls -R src/app/sites | head -40
echo "=== build route ==="
head -60 src/app/build/\[siteId\]/page.tsx

#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== site-client.tsx ==="
grep -n "const VIEWER" src/app/sites/_shared/site-client.tsx
grep -n "export function SiteClient" src/app/sites/_shared/site-client.tsx
echo "=== happy-place page.tsx ==="
grep -n "heroMediaFor\|isRenderable, validateSiteSpec\|const renderable" src/app/sites/happy-place/page.tsx
echo "=== coppersmith page.tsx ==="
grep -n "heroMediaFor\|isRenderable, validateSiteSpec\|const renderable" src/app/sites/coppersmith-plumbing/page.tsx
echo "=== renderer rights lines ==="
grep -n 'state: "observed"' src/fyd/components/renderer.tsx | sed -n '1,40p' | grep -n "91[0-4]\|167[0-3]" 
awk 'NR>=900 && NR<=916 {printf "%d: %s\n", NR, $0}' src/fyd/components/renderer.tsx
echo "=== git status of target files (must be clean-ish) ==="
git status --porcelain -- src/app/sites/_shared/site-client.tsx src/fyd/components/renderer.tsx src/app/sites/happy-place/page.tsx src/app/sites/coppersmith-plumbing/page.tsx src/fyd/sitespec/

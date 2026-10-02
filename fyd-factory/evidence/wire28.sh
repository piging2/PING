#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== happy-place imports ==="
grep -n "^import" src/app/sites/happy-place/page.tsx
echo "=== happy-place hook ==="
grep -n "validateSiteSpec\|isRenderable\|return (" src/app/sites/happy-place/page.tsx | head -8
echo "=== coppersmith imports ==="
grep -n "^import" src/app/sites/coppersmith-plumbing/page.tsx
echo "=== coppersmith hook ==="
grep -n "validateSiteSpec\|isRenderable\|return (" src/app/sites/coppersmith-plumbing/page.tsx | head -8
echo "=== binding-verifier 185-195 ==="
sed -n '185,195p' src/fyd/sitespec/binding-verifier.ts
echo "=== renderer imports 18-26 ==="
sed -n '18,26p' src/fyd/components/renderer.tsx
echo "=== renderer boundField ==="
grep -n "function boundField" src/fyd/components/renderer.tsx
echo "=== graph.ts docblock ==="
sed -n '148,156p' src/fyd/sitespec/graph.ts

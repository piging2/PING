#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== eligibleComponents (schemas.ts:271-300) ==="
sed -n '271,300p' src/fyd/sitespec/schemas.ts
echo "=== coppersmith page route ==="
cat src/app/sites/coppersmith-plumbing/page.tsx

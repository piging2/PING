#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== site-client.tsx: dirty diff stat ==="
git diff --stat src/app/sites/_shared/site-client.tsx
echo "=== site-client.tsx footer area (grep) ==="
grep -n "acceptance sequences\|Provenance footer\|provenanceSentence" src/app/sites/_shared/site-client.tsx
echo "=== site-client.tsx lines 28-34 ==="
sed -n '28,34p' src/app/sites/_shared/site-client.tsx
echo "=== site-client.tsx lines 160-175 ==="
sed -n '160,175p' src/app/sites/_shared/site-client.tsx
echo "=== renderer.tsx rights basis areas (grep) ==="
grep -n "Rights basis" src/fyd/components/renderer.tsx

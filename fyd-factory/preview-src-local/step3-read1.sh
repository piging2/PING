#!/bin/bash
set -uo pipefail
cd /home/nolan/fyd-preview-wt
echo "=== sites/happy-place/page.tsx ==="
cat src/app/sites/happy-place/page.tsx
echo "=== sites/coppersmith-plumbing/page.tsx (head 60) ==="
head -60 src/app/sites/coppersmith-plumbing/page.tsx
echo "=== _shared/site-client.tsx (head 100) ==="
head -100 src/app/sites/_shared/site-client.tsx
echo "=== _shared/site-client.tsx line count ==="
wc -l src/app/sites/_shared/site-client.tsx

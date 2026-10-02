#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== footer line numbers ==="
grep -n "Provenance footer" src/app/sites/_shared/site-client.tsx
echo "=== total lines ==="
wc -l src/app/sites/_shared/site-client.tsx
echo "=== lines 200-208 ==="
sed -n '200,208p' src/app/sites/_shared/site-client.tsx

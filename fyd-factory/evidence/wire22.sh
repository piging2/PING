#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== exact bytes lines 164-171 ==="
sed -n '164,171p' src/app/sites/_shared/site-client.tsx | od -c | head -20
echo "=== git diff for site-client (first 60 lines) ==="
git diff src/app/sites/_shared/site-client.tsx | head -60

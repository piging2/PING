#!/bin/bash
B=/home/nolan/projects/ping-constitutional
echo "### reader gateway URL default (ping-object-reader.ts ~240-280)"
sed -n '240,285p' "$B/src/lib/ping/ping-object-reader.ts"
echo "### social config gateway URL"
grep -n "GATEWAY\|gateway\|8080\|18099" "$B/src/fyd/social/config.ts" | head -15
echo "### any .env for served site? (names only)"
ls -la /home/nolan/projects/ping/.env* 2>/dev/null || echo "no .env files in served checkout"

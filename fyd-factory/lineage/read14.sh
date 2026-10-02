#!/bin/bash
cd /home/nolan/projects/ping || exit 1
sed -n 180,245p src/lib/ping/ask-composer.ts
echo "===== provenanceSourceUrls ====="
grep -n "provenanceSourceUrls" -A 25 src/lib/ping/ask-composer.ts | head -40

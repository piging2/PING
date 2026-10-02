#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
echo "=== canonicalize implementation (ask-composer lines 50-75) ==="
sed -n '50,75p' "$WT/src/lib/ping/ask-composer.ts"
echo "=== proposeFromSiteIntent body (lines 85-140) ==="
sed -n '85,140p' "$WT/src/fyd/customize/propose.ts"
echo "=== does proposeFromSiteIntent use canonicalize/createHash/fs? ==="
awk 'NR>=85 && NR<=200' "$WT/src/fyd/customize/propose.ts" | grep -n "canonicalize\|createHash\|fs\.\|readFile" | head -10
echo "=== total lines in propose.ts ==="
wc -l "$WT/src/fyd/customize/propose.ts"

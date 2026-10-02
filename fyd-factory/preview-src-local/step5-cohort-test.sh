#!/bin/bash
set -uo pipefail
PORT=$(cat /tmp/fyd-preview-port.txt)
echo "=== Testing all 7 cohort routes ==="
for site in bemis-electric claire-codling dalby-cpa gear-junction hand-law suehiro white-star; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/fyd-night/cohort/$site")
  title=$(curl -s "http://localhost:$PORT/fyd-night/cohort/$site" | grep -o "<title>[^<]*</title>" | head -1)
  echo "$site -> $code $title"
done
echo ""
echo "=== Excluded sites (should 404) ==="
for site in klik-boutique pantuso pride-plumbing; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/fyd-night/cohort/$site")
  echo "$site -> $code (expected 404)"
done

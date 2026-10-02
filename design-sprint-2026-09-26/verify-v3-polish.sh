#!/bin/bash
# verify-v3-polish.sh — check the v3-polish screenshot set once it lands locally.
# Usage: verify-v3-polish.sh <shots-dir>
# Exit 0 = all checks pass; exit 1 = report what is missing/broken.
set -u

DIR="${1:-}"
[ -z "$DIR" ] && { echo "usage: verify-v3-polish.sh <shots-dir>"; exit 1; }
[ -d "$DIR" ] || { echo "FAIL: not a directory: $DIR"; exit 1; }

fail=0
count=$(find "$DIR" -maxdepth 1 -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' \) | wc -l)
echo "frames found: $count (expected 18)"
[ "$count" -ge 18 ] || { echo "FAIL: fewer than 18 frames"; fail=1; }

empty=$(find "$DIR" -maxdepth 1 -type f \( -iname '*.png' -o -iname '*.jpg' \) -size 0 | wc -l)
echo "empty files: $empty"
[ "$empty" -eq 0 ] || { echo "FAIL: $empty empty frame(s)"; fail=1; }

manifest=$(find "$DIR" -maxdepth 1 -iname '*manifest*' -o -iname '*summary*.json' | head -1)
if [ -n "$manifest" ]; then
  if grep -q '"pageerrors":\[\]' "$manifest" 2>/dev/null; then
    echo "page errors: none"
  else
    echo "WARN: manifest $manifest does not confirm pageerrors:[] — inspect manually"; fail=1
  fi
else
  echo "WARN: no shot manifest found; page-error check cannot run — inspect run-shots tail output"
fi

[ "$fail" -eq 0 ] && echo "VERIFY OK" || echo "VERIFY FAILED"
exit "$fail"

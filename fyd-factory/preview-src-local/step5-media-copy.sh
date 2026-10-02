#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
SRC=~/workspace/fyd-factory/media/derivatives
DST="$WT/public/fyd-media"

echo "=== copying 11 new derivative directories ==="
copied=0
for d in "$SRC"/*/; do
  dirname=$(basename "$d")
  if [ "$dirname" = "manifest.json" ]; then continue; fi
  if [ -d "$DST/$dirname" ]; then
    echo "SKIP (exists): $dirname"
  else
    cp -r "$d" "$DST/$dirname"
    echo "COPIED: $dirname ($(ls "$d" | wc -l) files)"
    copied=$((copied+1))
  fi
done
echo "=== total new directories copied: $copied ==="
echo "=== total directories in public/fyd-media now ==="
ls "$DST" | wc -l
echo "=== do any routes reference the NEW digests? ==="
for digest in $(ls "$SRC" | grep -v manifest); do
  hits=$(grep -rl "$digest" "$WT/src/" 2>/dev/null | wc -l)
  if [ "$hits" != "0" ]; then
    echo "REFERENCED: $digest ($hits files)"
  fi
done
echo "Reference check complete"
echo "=== does fyd-night page reference /fyd-media/? ==="
grep -c "fyd-media" "$WT/src/app/fyd-night/page.tsx" 2>/dev/null || echo "0"

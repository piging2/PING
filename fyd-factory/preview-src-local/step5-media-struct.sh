#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
echo "=== public/fyd-media structure ==="
find "$WT/public/fyd-media/" -type f | head -20
echo "=== file types ==="
file "$WT/public/fyd-media/"* 2>/dev/null | head -5
echo "=== derivatives structure ==="
find ~/workspace/fyd-factory/media/derivatives/ -type f | head -20
echo "=== do any routes reference /fyd-media/? ==="
grep -rl "fyd-media" "$WT/src/" | head -10

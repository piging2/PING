#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
echo "=== media derivatives manifest ==="
ls ~/workspace/fyd-factory/media/derivatives/ | head -20
echo "=== manifest file ==="
find ~/workspace/fyd-factory/media -name "*.json" | head -5
echo "=== public/fyd-media current state ==="
ls "$WT/public/fyd-media/" 2>/dev/null || echo "DIRECTORY DOES NOT EXIST"

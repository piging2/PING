#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
echo "=== derivatives manifest ==="
cat ~/workspace/fyd-factory/media/derivatives/manifest.json | head -50
echo ""
echo "=== count files ==="
echo "derivatives: $(ls ~/workspace/fyd-factory/media/derivatives/ | grep -v manifest | wc -l)"
echo "public/fyd-media: $(ls "$WT/public/fyd-media/" | wc -l)"
echo "=== do the hashes match? ==="
echo "derivatives hashes:"
ls ~/workspace/fyd-factory/media/derivatives/ | grep -v manifest | sort > /tmp/deriv.txt
ls "$WT/public/fyd-media/" | sort > /tmp/pub.txt
diff /tmp/deriv.txt /tmp/pub.txt && echo "IDENTICAL" || echo "DIFFERENT"

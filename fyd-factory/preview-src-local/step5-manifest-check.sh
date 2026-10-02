#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
echo "=== happy-place media manifest ==="
cat "$WT/src/fyd/media/manifests/happy-place.json" | head -40
echo ""
echo "=== coppersmith media manifest ==="
cat "$WT/src/fyd/media/manifests/coppersmith-plumbing.json" | head -40
echo ""
echo "=== new derivatives digests ==="
ls ~/workspace/fyd-factory/media/derivatives/ | grep -v manifest | sort
echo ""
echo "=== do manifests reference new or old digests? ==="
echo "happy-place manifest digests:"
grep -o '"digest": "[a-f0-9]*"' "$WT/src/fyd/media/manifests/happy-place.json" | head -5

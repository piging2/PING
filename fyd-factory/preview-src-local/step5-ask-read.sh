#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
echo "=== staged ask page (first 60 lines) ==="
head -60 "$WT/src/app/preview/ask/page.tsx"
echo ""
echo "=== SHA256 of staged file (should match staging) ==="
sha256sum "$WT/src/app/preview/ask/page.tsx"

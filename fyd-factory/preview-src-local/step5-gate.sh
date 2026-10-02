#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
echo "=== owner-mode/gate.ts ==="
cat "$WT/src/fyd/owner-mode/gate.ts" 2>/dev/null || echo "NOT FOUND"
ls "$WT/src/fyd/owner-mode/" | head -20

#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
echo "=== components/renderer file ==="
ls "$WT/src/fyd/components/" | head -20
echo "=== renderer imports ==="
RFILE=$(ls "$WT/src/fyd/components/renderer"* 2>/dev/null | head -1)
echo "file: $RFILE"
grep -n "^import\|from \"" "$RFILE" | head -20
echo "=== does renderer import node: or fs? ==="
grep -n "node:\|from \"fs\"\|from 'fs'" "$RFILE" | head -5
echo "=== how is resolveQuery used in intent.ts? ==="
grep -n "resolveQuery" "$WT/src/fyd/customize/intent.ts" | head -5
echo "=== how is resolveQuery used in owner-command-compiler.ts? ==="
grep -n "resolveQuery" "$WT/src/fyd/customize/owner-command-compiler.ts" | head -5

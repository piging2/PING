#!/bin/bash
set -uo pipefail
LOG=/home/nolan/fyd-preview-wt/next-build-v2.log
echo "=== build outcome ==="
grep -cE "Failed to compile|Type error|Error:" "$LOG" || echo "no compile errors"
grep -E "preview/ask|preview/owner|fyd-night" "$LOG" | head -10
echo "=== tail ==="
tail -12 "$LOG"

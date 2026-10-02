#!/bin/bash
set -uo pipefail
if pgrep -f "next build" >/dev/null; then echo "BUILD_RUNNING"; else echo "BUILD_DONE"; fi
echo "=== log tail ==="
tail -30 /home/nolan/fyd-preview-wt/next-build-early.log 2>/dev/null
echo "=== errors so far ==="
grep -iE "error|failed" /home/nolan/fyd-preview-wt/next-build-early.log 2>/dev/null | head -10

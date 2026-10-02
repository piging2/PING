#!/bin/bash
set -uo pipefail
LOG=/home/nolan/fyd-preview-wt/next-build-early.log
echo "=== fyd-night routes in build ==="
grep -E "fyd-night|/o/" "$LOG" | head -20
echo "=== warnings/errors ==="
grep -iE "warn|error" "$LOG" | grep -v "Invalid next.config" | head -20
echo "=== build exit line ==="
grep -E "Compiled|Generating|Finalizing|Export|Done|Failed" "$LOG" | head -20
echo "=== log size ==="
wc -l "$LOG"

#!/bin/bash
set -uo pipefail
ls -la /home/nolan/fyd-preview-wt/*.log
echo "=== next processes ==="
pgrep -af "next" | head -5 || echo "no next processes"
echo "=== .next ==="
ls /home/nolan/fyd-preview-wt/.next 2>/dev/null | head -3 || echo "no .next"
echo "=== early log mtime ==="
stat -c "%y" /home/nolan/fyd-preview-wt/next-build-early.log
date

#!/bin/bash
set -uo pipefail
ls -la /home/nolan/fyd-preview-wt/next-build-early.log
echo "=== .next dir? ==="
ls /home/nolan/fyd-preview-wt/.next 2>/dev/null | head -5 || echo "no .next"
echo "=== try next build directly, capture ==="
cd /home/nolan/fyd-preview-wt
export FYD_PROJECTION_DIR=/home/nolan/fyd-preview-wt/fyd-night-projections
export DEV_MODE_SKIP_KV=true
export NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1
export SHARP_IGNORE_GLOBAL_LIBVIPS=1
export NEXT_TELEMETRY_DISABLED=1
timeout 20 npx next --version 2>&1 | head -3
echo "=== disk space ==="
df -h /home/nolan | tail -1

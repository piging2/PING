#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
cd "$WT"
export NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1
export DEV_MODE_SKIP_KV=true
export FYD_PROJECTION_DIR=/home/nolan/fyd-preview-wt/fyd-night-projections
export SHARP_IGNORE_GLOBAL_LIBVIPS=1
export NEXT_TELEMETRY_DISABLED=1
export PATH=/home/nolan/.nvm/versions/node/v22.23.2/bin:$PATH
echo "=== Starting Next.js build ==="
npx next build 2>&1 | tail -80

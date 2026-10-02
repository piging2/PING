#!/bin/bash
set -uo pipefail
cd /home/nolan/fyd-preview-wt
export FYD_PROJECTION_DIR=/home/nolan/fyd-preview-wt/fyd-night-projections
export DEV_MODE_SKIP_KV=true
export NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1
export SHARP_IGNORE_GLOBAL_LIBVIPS=1
export NEXT_TELEMETRY_DISABLED=1
npx next build 2>&1 | tail -60
echo "BUILD_EXIT=$?"

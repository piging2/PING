#!/bin/bash
set -uo pipefail
cd /home/nolan/fyd-preview-wt
export FYD_PROJECTION_DIR=/home/nolan/fyd-preview-wt/fyd-night-projections
export DEV_MODE_SKIP_KV=true
export NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1
export SHARP_IGNORE_GLOBAL_LIBVIPS=1
export NEXT_TELEMETRY_DISABLED=1
rm -f /home/nolan/fyd-preview-wt/next-build-v2.log
setsid nohup npx next build > /home/nolan/fyd-preview-wt/next-build-v2.log 2>&1 < /dev/null &
echo "BUILD_V2_STARTED pid $!"

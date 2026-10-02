#!/bin/bash
set -uo pipefail
cd /home/nolan/fyd-preview-wt
export FYD_PROJECTION_DIR=/home/nolan/fyd-preview-wt/fyd-night-projections
export DEV_MODE_SKIP_KV=true
export NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1
export SHARP_IGNORE_GLOBAL_LIBVIPS=1
export NEXT_TELEMETRY_DISABLED=1
rm -f /home/nolan/fyd-preview-wt/next-build-early.log
setsid nohup npx next build > /home/nolan/fyd-preview-wt/next-build-early.log 2>&1 < /dev/null &
echo "BUILD_STARTED pid $!"
sleep 25
if pgrep -f "next build" >/dev/null; then echo "BUILD_ALIVE"; else echo "BUILD_DEAD"; fi
head -20 /home/nolan/fyd-preview-wt/next-build-early.log

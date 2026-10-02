#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
cd "$WT"
export PATH=/home/nolan/.nvm/versions/node/v22.23.2/bin:$PATH
export NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1
export DEV_MODE_SKIP_KV=true
export FYD_PROJECTION_DIR=/home/nolan/fyd-preview-wt/fyd-night-projections
export SHARP_IGNORE_GLOBAL_LIBVIPS=1
export NEXT_TELEMETRY_DISABLED=1

# Find unused port
PORT=3101
while ss -tln 2>/dev/null | grep -q ":$PORT "; do
  PORT=$((PORT+1))
done
echo "Starting next start on port $PORT"
echo "$PORT" > /tmp/fyd-preview-port.txt
npx next start -p $PORT 2>&1

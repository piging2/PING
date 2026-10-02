#!/bin/bash
# STEP 7: remove .orig backups from worktree, verify git status of worktree, rebuild.
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
cd "$WT"
export PATH=/home/nolan/.nvm/versions/node/v22.23.2/bin:$PATH
export NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1
export DEV_MODE_SKIP_KV=true
export FYD_PROJECTION_DIR=/home/nolan/fyd-preview-wt/fyd-night-projections
export SHARP_IGNORE_GLOBAL_LIBVIPS=1
export NEXT_TELEMETRY_DISABLED=1

echo "--- .orig files before cleanup ---"
find "$WT" -name "*.orig" -not -path "*/node_modules/*" -not -path "*/.git/*" | head -30
COUNT=$(find "$WT" -name "*.orig" -not -path "*/node_modules/*" -not -path "*/.git/*" | wc -l)
echo "orig count: $COUNT"
find "$WT" -name "*.orig" -not -path "*/node_modules/*" -not -path "*/.git/*" -delete
echo "after: $(find "$WT" -name "*.orig" -not -path "*/node_modules/*" -not -path "*/.git/*" | wc -l)"

echo "--- stray backup patterns ---"
find "$WT" \( -name "*.bak" -o -name "*~" -o -name "*.rej" \) -not -path "*/node_modules/*" -not -path "*/.git/*" | head -10

echo "--- worktree status (top-level) ---"
git -C "$WT" status --porcelain | head -40
echo "--- rebuild ---"
npx next build 2>&1 | tail -25
echo "BUILD EXIT: $?"

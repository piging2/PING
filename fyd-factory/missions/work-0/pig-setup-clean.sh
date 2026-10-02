#!/bin/bash
set -e
# Clean worktree at frozen SHA for OBJECT wave-2 baseline.
if [ ! -d /home/nolan/fyd-wave2-clean ]; then
  git -C /home/nolan/projects/ping worktree add --detach /home/nolan/fyd-wave2-clean e48ef710
fi
if [ ! -L /home/nolan/fyd-wave2-clean/node_modules ]; then
  ln -s /home/nolan/projects/ping/node_modules /home/nolan/fyd-wave2-clean/node_modules
fi
echo "--- worktree head ---"
git -C /home/nolan/fyd-wave2-clean rev-parse --short HEAD
echo "--- worktree dirty count (expect 0) ---"
git -C /home/nolan/fyd-wave2-clean status --porcelain | wc -l
echo "--- main tree diffstat for the two SEC-FIX surfaces ---"
git -C /home/nolan/projects/ping diff --stat -- src/fyd/object/view.ts src/fyd/components/renderer.tsx
echo "--- check resolveSafeLink usage in view.ts (main tree) ---"
grep -c 'resolveSafeLink' /home/nolan/projects/ping/src/fyd/object/view.ts || true
echo "--- check resolveSafeLink usage in view.ts (clean tree) ---"
grep -c 'resolveSafeLink' /home/nolan/fyd-wave2-clean/src/fyd/object/view.ts || true

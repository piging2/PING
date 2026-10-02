#!/bin/bash
# LANE BCQ: integrate kit into isolated worktree as UNCOMMITTED diff.
# Read-only w.r.t. the main checkout; writes only inside the BCQ worktree.
set -u
WT=/home/nolan/projects/ping-bcq-substrate
DEST="$WT/src/fyd/connectors/kit"
mkdir -p "$DEST"
cp /mnt/c/Users/nolan/transfer/kit/types.ts "$DEST/"
cp /mnt/c/Users/nolan/transfer/kit/adapter.ts "$DEST/"
cp /mnt/c/Users/nolan/transfer/kit/harness.ts "$DEST/"
cp /mnt/c/Users/nolan/transfer/kit/sanitize.ts "$DEST/"
cp /mnt/c/Users/nolan/transfer/kit/reference-adapter.ts "$DEST/"
cp /mnt/c/Users/nolan/transfer/kit/contract-kit.ts "$DEST/"
cp /mnt/c/Users/nolan/transfer/kit/run.ts "$DEST/"
cp /mnt/c/Users/nolan/transfer/kit/README.md "$DEST/"
ls "$DEST"
echo "=== diff stat ==="
git -C "$WT" status --short | head -15
echo "=== module/moduleResolution ==="
grep -n '"module"\|"moduleResolution"' "$WT/tsconfig.json" | head -4
echo "=== node_modules present? ==="
ls -d "$WT/node_modules" 2>/dev/null || echo "NO_NODE_MODULES_IN_WORKTREE"
ls -d /home/nolan/projects/ping/node_modules 2>/dev/null || echo "NO_NODE_MODULES_IN_MAIN"

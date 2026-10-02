#!/bin/bash
# LANE BCQ: fix transfer layout, refresh kit, run jest scoped suite.
set -u
WT=/home/nolan/projects/ping-bcq-substrate
SRC=/mnt/c/Users/nolan/transfer/kit/kit
DEST="$WT/src/fyd/connectors/kit"
rm -rf "$DEST"
mkdir -p "$DEST/__tests__"
cp "$SRC/types.ts" "$SRC/adapter.ts" "$SRC/harness.ts" "$SRC/sanitize.ts" \
   "$SRC/reference-adapter.ts" "$SRC/contract-kit.ts" "$SRC/run.ts" \
   "$SRC/README.md" "$SRC/jest.config.cjs" "$DEST/"
cp "$SRC/__tests__/contract-kit.test.ts" "$DEST/__tests__/"
echo "=== files ==="
find "$DEST" -type f | sort
echo "=== diff stat ==="
git -C "$WT" status --short | head
echo "=== jest scoped ==="
cd /home/nolan/projects/ping-bcq-substrate && /home/nolan/projects/ping/node_modules/.bin/jest --config "$DEST/jest.config.cjs" 2>&1 | tail -12

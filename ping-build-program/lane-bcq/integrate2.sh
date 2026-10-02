#!/bin/bash
# LANE BCQ: refresh kit in the isolated worktree + run jest scoped suite.
set -u
WT=/home/nolan/projects/ping-bcq-substrate
DEST="$WT/src/fyd/connectors/kit"
rm -rf "$DEST"
mkdir -p "$DEST/__tests__"
cp /mnt/c/Users/nolan/transfer/kit/types.ts "$DEST/"
cp /mnt/c/Users/nolan/transfer/kit/adapter.ts "$DEST/"
cp /mnt/c/Users/nolan/transfer/kit/harness.ts "$DEST/"
cp /mnt/c/Users/nolan/transfer/kit/sanitize.ts "$DEST/"
cp /mnt/c/Users/nolan/transfer/kit/reference-adapter.ts "$DEST/"
cp /mnt/c/Users/nolan/transfer/kit/contract-kit.ts "$DEST/"
cp /mnt/c/Users/nolan/transfer/kit/run.ts "$DEST/"
cp /mnt/c/Users/nolan/transfer/kit/README.md "$DEST/"
cp /mnt/c/Users/nolan/transfer/kit/jest.config.cjs "$DEST/"
cp /mnt/c/Users/nolan/transfer/kit/__tests__/contract-kit.test.ts "$DEST/__tests__/"
echo "=== files ==="
find "$DEST" -type f | sort
echo "=== diff stat ==="
git -C "$WT" status --short | head
echo "=== jest (scoped, from repo root with main node_modules) ==="
cd /home/nolan/projects/ping && ./node_modules/.bin/jest --config "$DEST/jest.config.cjs" 2>&1 | tail -12

#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== branch ==="
git branch --show-current
echo "=== status (short) ==="
git status --short | head -40
echo "=== src/fyd/media listing ==="
ls -la src/fyd/media/ 2>&1
echo "=== src/fyd/media/__tests__ listing ==="
ls -la src/fyd/media/__tests__/ 2>&1
echo "=== PING media authorities exist? ==="
ls -la src/lib/media.ts src/lib/media-kv-store.ts src/lib/blob-storage.ts src/lib/media-constants.ts 2>&1
echo "=== jest config ==="
ls -la src/fyd/media/jest.config.cjs 2>&1

#!/bin/bash
set -u
WT=/home/nolan/projects/ping-bcq-substrate
echo "=== activitypub import style ==="
grep -h "^import\|from '" "$WT/src/fyd/adapters/activitypub/endpoints.ts" | head -8
echo "=== fyd net import style ==="
grep -h "^import" "$WT/src/fyd/net/safe-fetch.ts" | head -8
echo "=== ts-jest present? ==="
ls -d /home/nolan/projects/ping/node_modules/ts-jest 2>/dev/null || echo NO_TS_JEST

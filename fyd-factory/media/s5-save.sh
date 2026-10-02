#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== saveMedia (601-700) ====="
sed -n '601,700p' src/lib/media-kv-store.ts
echo "===== getMedia (390-451) ====="
sed -n '390,451p' src/lib/media-kv-store.ts

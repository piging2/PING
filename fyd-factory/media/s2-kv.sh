#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== src/lib/media-kv-store.ts (head 200) ====="
sed -n '1,200p' src/lib/media-kv-store.ts
echo
echo "===== exported functions ====="
grep -n "^export" src/lib/media-kv-store.ts

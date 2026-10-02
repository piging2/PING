#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== jest.config.cjs ====="
cat src/fyd/media/jest.config.cjs
echo "===== safe-fetch.ts ====="
cat src/fyd/media/safe-fetch.ts
echo "===== run-ingest.ts ====="
cat src/fyd/media/run-ingest.ts
echo "===== attach.ts (head 60) ====="
sed -n '1,60p' src/fyd/media/attach.ts
echo "===== bundle-media.ts (head 80) ====="
sed -n '1,80p' src/fyd/media/bundle-media.ts

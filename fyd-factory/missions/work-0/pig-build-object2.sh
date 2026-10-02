#!/bin/bash
set -e
if [ ! -L /home/nolan/fyd-wave2/node_modules ]; then
  ln -s /home/nolan/projects/ping/node_modules /home/nolan/fyd-wave2/node_modules
fi
cd /home/nolan/fyd-wave2
echo "--- build ---"
node build-object.mjs harness-object.tsx bundle-object.cjs
ls -la bundle-object.cjs
echo "--- smoke test: 2 missions ---"
FYD_OUT=/home/nolan/fyd-wave2/smoke node bundle-object.cjs 2500 2502
wc -l /home/nolan/fyd-wave2/smoke/results.jsonl
head -c 600 /home/nolan/fyd-wave2/smoke/results.jsonl; echo

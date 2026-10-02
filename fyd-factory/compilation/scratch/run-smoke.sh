#!/bin/bash
cd /home/nolan/projects/ping
node_modules/.bin/tsx /home/nolan/../nolan/workspace/fyd-factory/compilation/scratch/smoke.ts /home/nolan/../nolan/workspace/fyd-factory/corpus/fixtures/batch-b/f2b-copper-kettle-cafe.json 2>&1 | tail -8 || true
# fallback: path via WSL home
node_modules/.bin/tsx ~/workspace/fyd-factory/compilation/scratch/smoke.ts 2>&1 | head -3 || true

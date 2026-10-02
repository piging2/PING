#!/bin/bash
H=/home/nolan/fyd-compile-harness
cd /home/nolan/projects/ping
node_modules/.bin/tsx --tsconfig=/home/nolan/projects/ping/tsconfig.json "$H/runner/chain-proof.ts" \
  --fixture "$H/fixtures/batch-a/batch-a-plumber.json"

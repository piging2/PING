#!/bin/bash
set -e
H=/home/nolan/fyd-compile-harness
cd "$H"
mkdir -p fixtures
tar xzf fixtures.tgz
mv batch-a batch-b clearwater-plumbing-demo.json professional fixtures/
rm -f fixtures.tgz fixtures/batch-b/gen_batch_b_nontrade.py
find fixtures -name '*.json' | sort
cd /home/nolan/projects/ping
node_modules/.bin/tsx "$H/smoke.ts" "$H/fixtures/batch-b/f2b-copper-kettle-cafe.json"

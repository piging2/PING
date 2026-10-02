#!/bin/bash
H=/home/nolan/fyd-compile-harness
cd /home/nolan/projects/ping
node_modules/.bin/tsx "$H/smoke.ts" "$H/fixtures/batch-b/f2b-copper-kettle-cafe.json"

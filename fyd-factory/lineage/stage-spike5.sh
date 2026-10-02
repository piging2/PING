#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "--- env var TSX_TSCONFIG_PATH ---"
TSX_TSCONFIG_PATH=/home/nolan/projects/ping/src/fyd/lineage/tsconfig.tracer.json npx tsx --import ./src/fyd/lineage/register-css.mjs src/fyd/lineage/spike-trace.ts 2>&1 | head -40

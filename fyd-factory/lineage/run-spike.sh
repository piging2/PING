#!/bin/bash
cd /home/nolan/projects/ping || exit 1
npx tsx /home/hatch/workspace/fyd-factory/lineage/spike-trace.ts 2>&1 | head -80

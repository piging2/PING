#!/bin/bash
set -e
cd /home/nolan/fyd-projection-harness
git add harness.ts
git -c user.email=factory@local -c user.name=factory commit -qm "harness v2: verifier calibration (stale-source text-only, MISLABEL)"
git log --oneline | head -3
cd /home/nolan/projects/ping
./node_modules/.bin/tsx /home/nolan/fyd-projection-harness/harness.ts --start=0 --end=500 --fixture-dir=/home/nolan/fyd-fixtures-p0 --out=/home/nolan/fyd-projection-out/shard-0 2>&1 | tail -30

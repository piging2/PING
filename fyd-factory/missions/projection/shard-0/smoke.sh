#!/bin/bash
cd /home/nolan/projects/ping
./node_modules/.bin/tsx /home/nolan/fyd-projection-harness/harness.ts --start=0 --end=3 --fixture-dir=/home/nolan/fyd-fixtures-p0 --out=/home/nolan/fyd-projection-out/shard-0 2>&1 | tail -15

#!/bin/bash
# F5-CEILING: stage + run experiment 2 on the Pig, JSON to stdout.
set -e
cd /home/nolan/projects/ping
cp /mnt/c/Users/nolan/transfer/f5/experiment2.ts /home/nolan/f5-ceiling/experiment2.ts
./node_modules/.bin/tsx --tsconfig /home/nolan/projects/ping/tsconfig.json /home/nolan/f5-ceiling/experiment2.ts

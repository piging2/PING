#!/bin/bash
# F5-CEILING: stage fingerprint.ts on the Pig, run via tsx, JSON to stdout.
set -e
cd /home/nolan/projects/ping
mkdir -p /home/nolan/f5-ceiling
cp /mnt/c/Users/nolan/transfer/f5/fingerprint.ts /home/nolan/f5-ceiling/fingerprint.ts
./node_modules/.bin/tsx --tsconfig /home/nolan/projects/ping/tsconfig.json /home/nolan/f5-ceiling/fingerprint.ts

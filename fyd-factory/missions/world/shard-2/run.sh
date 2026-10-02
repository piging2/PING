#!/bin/sh
cd /home/nolan/projects/ping
exec ./node_modules/.bin/tsx --tsconfig /home/nolan/projects/ping/tsconfig.json /home/hatch/workspace/fyd-factory/missions/world/shard-2/harness.tsx "$@"

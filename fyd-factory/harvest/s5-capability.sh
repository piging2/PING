#!/bin/bash
# s5: read capability + proposal-adjacent PING libs (read-only)
cd /home/nolan/projects/ping || exit 1
echo "########## src/lib/ping/types.ts ##########"; cat src/lib/ping/types.ts | head -120
echo; echo "########## src/lib/ping/grants.ts ##########"; cat src/lib/ping/grants.ts
echo; echo "########## src/lib/ping/action-planner.ts ##########"; head -60 src/lib/ping/action-planner.ts

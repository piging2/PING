#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
export FYD_PROJECTION_DIR=/home/nolan/ping/var/fyd-projections
export FYD_OWNER_DIR=/home/nolan/projects/ping/data/fyd-owner
export FYD_CHROME_MODE=customer
node_modules/.bin/tsx --tsconfig tsconfig.json /tmp/dehpp/replay-dehpp.ts > /tmp/dehpp/dehpp-spec-final.json 2>/tmp/dehpp/replay-final.err
echo "exit=$?"
wc -c /tmp/dehpp/dehpp-spec-final.json
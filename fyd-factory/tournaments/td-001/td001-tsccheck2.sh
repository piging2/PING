#!/bin/bash
cd /home/nolan/projects/ping
npx tsc -p /home/nolan/td001-check/tsconfig.json 2>&1 | head -20
echo "tsc exit: $?"

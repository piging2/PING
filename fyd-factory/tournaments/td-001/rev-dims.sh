#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== dimensions.ts ObjectFeed query ==="
grep -n -B3 -A12 "ObjectFeed" src/fyd/builder/dimensions.ts | head -60

#!/bin/bash
cd /home/nolan/projects/ping
echo "##### strategies.ts (TECHNOLOGY strategy)"
grep -n -B3 -A 40 "TECHNOLOGY" src/fyd/builder/strategies.ts | head -100
echo "##### strategy-for-site.ts"
cat src/fyd/builder/strategy-for-site.ts | head -80

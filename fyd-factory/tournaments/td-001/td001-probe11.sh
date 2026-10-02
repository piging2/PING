#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== strategies.ts lines 60-180 ====="
sed -n '60,180p' src/fyd/builder/strategies.ts

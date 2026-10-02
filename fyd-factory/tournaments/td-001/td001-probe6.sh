#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== proceduralizer.ts around line 870 ====="
sed -n '800,940p' src/fyd/proceduralize/proceduralizer.ts

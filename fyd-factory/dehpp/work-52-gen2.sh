#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
sed -n '40,110p' src/fyd/proceduralize/generator.ts
echo "===== 289-360 ====="
sed -n '289,360p' src/fyd/proceduralize/generator.ts

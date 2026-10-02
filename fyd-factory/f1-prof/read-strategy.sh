#!/bin/bash
cd /home/nolan/projects/ping
echo "##### strategy-for-site.ts"
cat src/fyd/builder/strategy-for-site.ts
echo "##### infer-strategy.ts (head)"
sed -n '1,120p' src/fyd/builder/infer-strategy.ts

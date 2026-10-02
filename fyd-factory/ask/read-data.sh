#!/bin/bash
cd /home/nolan/projects/ping
echo "########## fyd-tenant-graph head ##########"
sed -n 1,120p src/fyd/data/fyd-tenant-graph.ts
echo
echo "########## fixture base location ##########"
grep -rn "fixtures\|fixture" src/fyd/data/fyd-tenant-graph.ts | head -10
ls src/fyd/data/ 2>/dev/null

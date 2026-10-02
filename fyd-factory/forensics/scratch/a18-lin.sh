#!/bin/bash
cd /home/nolan/projects/ping
echo "===== BYPASS fixes in tree? ====="; grep -n "resolveSafeLink\|javascript" src/fyd/object/view.ts | head -10
echo; echo "===== view.ts caps lines ====="; sed -n '185,200p' src/fyd/object/view.ts
echo; echo "===== lineage dir ====="; ls src/fyd/lineage/; head -40 src/fyd/lineage/tracer.ts 2>/dev/null

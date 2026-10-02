#!/bin/bash
cd /home/nolan/projects/ping
echo "===== schemas used across fixtures ====="
grep -oh '"schema": "[^"]*"' src/fyd/proceduralize/__fixtures__/*.ts | sort | uniq -c
echo ""
echo "===== relationships? ====="
grep -l '"relationships"' src/fyd/proceduralize/__fixtures__/*.ts
echo ""
echo "===== sitespec types ====="
ls src/fyd/sitespec/
echo ""
echo "===== coppersmith total objects ====="
grep -c '"id":' src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts
echo "===== fixtures-structured.ts head ====="
head -100 src/fyd/proceduralize/__fixtures__/fixtures-structured.ts

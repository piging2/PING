#!/bin/bash
cd /home/nolan/projects/ping
echo "===== all ping.social schemas in repo ====="
grep -rhoE '"schema": "ping\.social\.[a-z_]+@[0-9]+"' src --include='*.ts' --include='*.json' 2>/dev/null | sort | uniq -c | sort -rn | head -40
echo ""
echo "===== evidence mentions in types ====="
grep -rn "evidence" src/lib/ping/types.ts | head -20
echo ""
echo "===== regression corpus test expects? ====="
head -60 src/fyd/proceduralize/__tests__/regression-corpus.test.ts

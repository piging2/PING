#!/bin/bash
cd /home/nolan/projects/ping
echo "===== health/authority ====="; head -60 src/app/api/health/authority/route.ts
echo; echo "===== claimClassFor + first-ref behavior in ask-pipeline ====="; grep -n "function claimClassFor" -A 12 src/app/api/fyd/ask/ask-pipeline.ts; grep -n "first\|Map()\|seen" src/app/api/fyd/ask/ask-pipeline.ts | head -15

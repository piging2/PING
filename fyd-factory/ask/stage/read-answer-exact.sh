#!/bin/bash
cd /home/nolan/projects/ping
echo "########## answer.ts head ##########"
head -20 src/fyd/ask/answer.ts | cat -A | head -20
echo "########## composeAskFyd tail ##########"
grep -n "const base = composeAnswer" -B 16 src/fyd/ask/answer.ts

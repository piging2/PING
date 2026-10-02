#!/bin/bash
cd /home/nolan/projects/ping
echo "===== visitor-answer claimClassFor ====="; grep -n "claimClassFor\|function claimClass" -A 14 src/fyd/ask/visitor-answer.ts | head -60
echo; echo "===== first-ref collapse behavior ====="; grep -n "find(\|findIndex\|\[0\]" src/fyd/ask/visitor-answer.ts | head -10

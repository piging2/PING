#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
npx jest src/fyd/copy 2>&1 | grep -B2 -A8 "SyntaxError\|error TS" | head -30
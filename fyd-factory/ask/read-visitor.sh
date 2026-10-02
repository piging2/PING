#!/bin/bash
cd /home/nolan/projects/ping
echo "########## visitor-answer.ts ##########"
cat src/fyd/ask/visitor-answer.ts
echo
echo "########## tests dir ##########"
ls -la src/fyd/ask/__tests__/ src/app/api/fyd/ask/ 2>/dev/null

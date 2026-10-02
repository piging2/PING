#!/bin/bash
cd /home/nolan/projects/ping
echo "===== find td-002 ====="; find . -name "*td-002*" -not -path "*/node_modules/*" 2>/dev/null | head
echo; echo "===== ask __tests__ ====="; ls src/fyd/ask/__tests__/
echo; echo "===== vercel.json ====="; cat vercel.json
echo; echo "===== .github ====="; find .github -type f 2>/dev/null | head

#!/bin/bash
cd /home/nolan/projects/ping
grep -n "objects\b" src/fyd/ask/concierge.ts | grep -v "^\s*\*" | head -30
echo "=== 690-710 ==="
sed -n '690,710p' src/fyd/ask/concierge.ts
echo "=== answerConciergeQuestion entry ==="
sed -n '843,865p' src/fyd/ask/concierge.ts

#!/bin/bash
cd /home/nolan/projects/ping
ls src/fyd/ask/__tests__/
grep -n "answerConciergeQuestion\|visibility" src/fyd/ask/__tests__/concierge.test.ts | head -20
echo "=== run the concierge tests ==="
npx jest --config src/fyd/ask/jest.config.cjs src/fyd/ask/__tests__/concierge.test.ts 2>&1 | tail -12

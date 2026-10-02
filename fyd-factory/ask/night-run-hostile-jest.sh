#!/bin/bash
set -e
cp /mnt/c/Users/nolan/transfer/night-hostile-eval.test.ts /home/nolan/projects/ping/src/fyd/ask/__tests__/night-hostile-eval.test.ts
rm -f /mnt/c/Users/nolan/transfer/night-hostile-eval.test.ts
cd /home/nolan/projects/ping
npx jest --config src/fyd/ask/jest.config.cjs night-hostile-eval 2>&1 | tail -30
echo "--- cleanup ---"
rm -f /home/nolan/projects/ping/src/fyd/ask/__tests__/night-hostile-eval.test.ts
git status --porcelain | head -5
echo "--- dirty count ---"
git status --porcelain | wc -l

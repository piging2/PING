#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== src/fyd/net/safe-fetch.ts ====="
cat src/fyd/net/safe-fetch.ts
echo
echo "===== net tests list ====="
ls -la src/fyd/net/__tests__/
echo "===== media __tests__ head: pipeline-invariants ====="
head -60 src/fyd/media/__tests__/pipeline-invariants.test.ts

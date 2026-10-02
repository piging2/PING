#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== generated treatment search ====="
grep -rln "generated-treatment\|generatedTreatment\|GeneratedTreatment" src/fyd 2>/dev/null | head
echo "===== ingest.ts exports ====="
grep -n "^export" src/fyd/media/ingest.ts
echo "===== existing test imports (what they pin) ====="
grep -h "^import" src/fyd/media/__tests__/*.test.ts | sort -u
echo "===== pipeline-invariants head ====="
sed -n '1,50p' src/fyd/media/__tests__/pipeline-invariants.test.ts

#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== regression-corpus.test.ts external_identity usage ====="
grep -n -B3 -A25 "external_identity" src/fyd/proceduralize/__tests__/regression-corpus.test.ts | head -80

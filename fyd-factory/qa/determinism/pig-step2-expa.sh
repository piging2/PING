#!/bin/bash
# QA-DET experiment (a): two fresh processes, identical input bytes.
set -e
cd /home/nolan/projects/ping || exit 1
CSS=./src/fyd/sitespec/__tests__/css-register.cjs
PROBE=src/fyd/sitespec/__tests__/determinism-probe.ts
./node_modules/.bin/tsx --import "$CSS" "$PROBE" /tmp/qa-det/input-a.json /tmp/qa-det/out-a1.txt
./node_modules/.bin/tsx --import "$CSS" "$PROBE" /tmp/qa-det/input-a.json /tmp/qa-det/out-a2.txt
echo "sha256:"
sha256sum /tmp/qa-det/out-a1.txt /tmp/qa-det/out-a2.txt
echo "bytes:"
wc -c /tmp/qa-det/out-a1.txt /tmp/qa-det/out-a2.txt
if cmp -s /tmp/qa-det/out-a1.txt /tmp/qa-det/out-a2.txt; then echo "EXP-A: IDENTICAL"; else echo "EXP-A: DIFFER"; fi

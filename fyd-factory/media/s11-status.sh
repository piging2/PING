#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== git status filtered to src/fyd/media ==="
git status --short -- src/fyd/media/
echo "=== any modifications (M) by this lane outside src/fyd/media? ==="
git status --short | grep -v "^ M src/fyd/media" | grep -v "^?? src/fyd/media" | grep "^ M" | head -40
echo "(above: pre-existing modifications by other lanes; this lane made none)"
echo "=== new lane files present ==="
ls -la src/fyd/media/*.ts src/fyd/media/__tests__/*.test.ts | grep -E "media-tokens|generated-treatment|authority"

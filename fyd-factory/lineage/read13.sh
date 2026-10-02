#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== ask/context-builder.ts ====="
cat src/fyd/ask/context-builder.ts
echo "===== ask-composer composeAnswer (signature + evidence handling) ====="
grep -n "export function composeAnswer\|evidenceRefs\|sourceUrls\|claimClassifications" src/lib/ping/ask-composer.ts | head -30

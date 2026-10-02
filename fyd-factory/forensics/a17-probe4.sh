#!/bin/bash
# AGENT-17 probe 4: binding-verifier + /o page + explore query (READ-ONLY)
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== binding-verifier.ts ==="
cat src/fyd/sitespec/binding-verifier.ts
echo ""
echo "=== verifyPresentationBinding in graph.ts ==="
grep -n 'verifyPresentationBinding' -A 40 src/fyd/sitespec/graph.ts | head -80

#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== determinism-probe.ts ==="
cat src/fyd/sitespec/__tests__/determinism-probe.ts
echo ""
echo "=== render-model.test.ts ==="
cat src/fyd/sitespec/__tests__/render-model.test.ts

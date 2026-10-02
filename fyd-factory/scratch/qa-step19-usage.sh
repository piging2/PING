#!/bin/bash
cd /home/nolan/projects/ping
echo "=== usages of verifyPresentationBinding / PresentationBinding ==="
grep -rn "verifyPresentationBinding\|verifySpecBindings\|buildVerifiedRenderModel" src/ --include="*.ts" --include="*.tsx" | grep -v __tests__ | grep -v "sitespec/graph.ts\|sitespec/binding-verifier.ts" | head -20
echo ""
echo "=== how renderer gets values from spec+graph ==="
grep -n "import\|from" src/fyd/components/renderer.tsx | head -40

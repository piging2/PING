#!/bin/bash
cd /home/nolan/projects/ping
echo "=== generator sections ==="
grep -n "component:" src/fyd/proceduralize/generator.ts | head -30
echo ""
echo "=== tsx availability ==="
ls node_modules/.bin/tsx 2>&1; node --version
echo ""
echo "=== renderSection component field reads (Services/Contact) ==="
awk '/^function renderServices|^function renderContact|^function renderHero/,0' src/fyd/components/renderer.tsx 2>/dev/null | head -5
grep -n "function renderServices\|function renderContact\|function renderHero\|function renderBusinessSummary" src/fyd/components/renderer.tsx

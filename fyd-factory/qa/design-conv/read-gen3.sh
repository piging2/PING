#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== generator 300-340 ==="; sed -n '300,340p' src/fyd/proceduralize/generator.ts
echo; echo "=== renderer 1095-1110 (Where we work) ==="; sed -n '1095,1110p' src/fyd/components/renderer.tsx
echo; echo "=== which component at 1104 ==="; awk 'NR>=1000 && NR<=1110 && /function|const .* = \(|case |SectionShell|=>/' src/fyd/components/renderer.tsx | head; grep -n "^function\|^export function\|^const [A-Z]" src/fyd/components/renderer.tsx | awk -F: '$1 < 1110' | tail -5

#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== site-client.tsx footer with line numbers ====="
grep -n "Provenance footer" src/app/sites/_shared/site-client.tsx
sed -n '160,185p' src/app/sites/_shared/site-client.tsx | cat -n | awk '{printf "%d\t%s\n", $1+159, substr($0, index($0,$2))}' 2>/dev/null || true
echo "--- raw ---"
awk 'NR>=160 && NR<=182 {printf "%d: %s\n", NR, $0}' src/app/sites/_shared/site-client.tsx
echo "===== renderer.tsx hero rights (905-920) ====="
awk 'NR>=905 && NR<=920 {printf "%d: %s\n", NR, $0}' src/fyd/components/renderer.tsx
echo "===== renderer.tsx gallery rights (1667-1680) ====="
awk 'NR>=1667 && NR<=1680 {printf "%d: %s\n", NR, $0}' src/fyd/components/renderer.tsx
echo "===== generated classification requirements in graph.ts ====="
grep -n '"generated"' src/fyd/sitespec/graph.ts | head
sed -n '104,175p' src/fyd/sitespec/graph.ts

#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== verifyBinding signature (140-175) ====="
sed -n '140,175p' src/fyd/sitespec/binding-verifier.ts
echo "===== PresentationBinding type in graph.ts ====="
grep -n "interface PresentationBinding" -A 40 src/fyd/sitespec/graph.ts | head -60
echo "===== EvidenceStep states ====="
grep -rn "EvidenceStep\b" src/fyd/ui/why-this.tsx | head -5
grep -n "state" src/fyd/ui/why-this.tsx | head -20
grep -rn "type EvidenceState" src/fyd/ | head -5
echo "===== tests pinning 'authorized' sentence ====="
grep -rln "authorized for acquisition" src/fyd/media/__tests__/ src/fyd/media/ 2>/dev/null | head
echo "===== FYD-DECISIONS location ====="
find . -maxdepth 3 -iname "*decision*" -not -path "./node_modules/*" 2>/dev/null | head
echo "===== spec.provenance type ====="
grep -n "provenance" src/fyd/sitespec/types.ts | head -10

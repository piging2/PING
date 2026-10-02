#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== Rights basis occurrences in renderer.tsx ====="
grep -n "Rights basis\|rightsBasis" src/fyd/components/renderer.tsx | head -30
echo "===== hero WhyThis ====="
grep -n "HeroMediaWhyThis\|heroWhyThis\|WhyThis" src/fyd/components/renderer.tsx | head -40
echo "===== planner.ts verifyBinding call sites ====="
grep -n "verifyBinding\|buildVerifiedRenderModel\|assertSpecBindingsVerified\|VerifiedRenderModel" src/fyd/builder/planner.ts | head -30
echo "===== binding-verifier.ts vocabulary ====="
sed -n '1,120p' src/fyd/sitespec/binding-verifier.ts

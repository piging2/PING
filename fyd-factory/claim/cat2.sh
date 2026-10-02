#!/bin/bash
cd /home/nolan/projects/ping
echo "########## src/fyd/sitespec/types.ts ##########"
cat src/fyd/sitespec/types.ts
echo
echo "########## BindingVerifier usage in builder/planner.ts ##########"
grep -n "BindingVerifier\|assertSpecBindingsVerified\|buildVerifiedRenderModel\|verifySpecBindings\|dropUnboundBindings" src/fyd/builder/planner.ts
echo
echo "########## BindingVerifier usage in components/renderer.tsx ##########"
grep -n "BindingVerifier\|assertSpecBindingsVerified\|buildVerifiedRenderModel\|verifySpecBindings\|dropUnboundBindings\|resolveBoundField" src/fyd/components/renderer.tsx | head -30

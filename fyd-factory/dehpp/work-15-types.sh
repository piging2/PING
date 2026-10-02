#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== generator.test.ts: profile usage ==="
grep -n "profile" src/fyd/proceduralize/__tests__/generator.test.ts | head -20
echo ""
echo "=== sitespec types: FYDSiteSpec fields ==="
grep -n "archetype\|status\|revision\|objectPresence\|heroMedia\|warnings" src/fyd/sitespec/types.ts | head -30
echo ""
echo "=== FYDThemeTokens: layoutCharacter ==="
grep -n "layoutCharacter\|interface FYDThemeTokens" -A 30 src/fyd/sitespec/types.ts | sed -n '1,60p'

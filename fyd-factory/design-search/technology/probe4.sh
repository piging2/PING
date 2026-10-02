#!/bin/bash
# F3-DESIGN-C probe4: Gallery + ObjectRail registry defs, FYDSpecProvenance
cd /home/nolan/projects/ping || exit 1
echo "=== Gallery + ObjectRail registry entries ==="
sed -n '88,118p' src/fyd/components/registry.ts
echo "=== FYDSpecProvenance ==="
grep -n "interface FYDSpecProvenance" -A 15 src/fyd/sitespec/types.ts | head -20
echo "=== FYDSiteArchetype ==="
grep -n "FYDSiteArchetype" src/fyd/sitespec/types.ts | head -5
grep -n "TECHNOLOGY" src/fyd/sitespec/types.ts | head -5
echo "=== resolveQuery owner/related semantics (planner) ==="
grep -rn "TECHNOLOGY" src/fyd/builder/planner.ts 2>/dev/null | head -10
ls src/fyd/builder/

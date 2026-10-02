#!/bin/bash
# explore signatures for the WORLD harness
cd /home/nolan/projects/ping
echo "=== renderer.tsx 150-260 ==="; sed -n '150,260p' src/fyd/components/renderer.tsx
echo "=== generator.ts exports ==="; grep -n "export" src/fyd/proceduralize/generator.ts | head -20
echo "=== validator.ts exports ==="; grep -n "export" src/fyd/sitespec/validator.ts | head -20

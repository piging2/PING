#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== generator.ts head ==="
sed -n '1,120p' src/fyd/proceduralize/generator.ts
echo ""
echo "=== grep: dimension-vector / urgency / order ==="
grep -n "dimension-vector\|urgency\|SECTION_ORDER\|homeOrder\|sectionOrder" src/fyd/proceduralize/generator.ts | head -30

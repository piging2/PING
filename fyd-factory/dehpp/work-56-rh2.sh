#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== SectionProps ==="
grep -n "interface SectionProps" -A 12 src/fyd/components/renderer.tsx | head -14
echo ""
echo "=== 1098-1105 ==="
sed -n '1098,1105p' src/fyd/components/renderer.tsx
echo ""
echo "=== 1628-1636 ==="
sed -n '1628,1636p' src/fyd/components/renderer.tsx
echo ""
echo "=== CTASection 1505-1535 ==="
sed -n '1505,1535p' src/fyd/components/renderer.tsx

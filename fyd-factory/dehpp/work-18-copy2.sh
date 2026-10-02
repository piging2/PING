#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== generator section() fn ==="
sed -n '118,150p' src/fyd/proceduralize/generator.ts
echo ""
echo "=== renderer copy strings ==="
grep -n "Where we work\|The people\|Latest\|Start the conversation\|Find us" src/fyd/components/renderer.tsx | head
echo ""
echo "=== claim labels ==="
grep -n "Website statement\|Site record\|Demo addition\|Feed item\|Mixed sources" src/fyd/components/renderer.tsx | head

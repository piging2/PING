#!/bin/bash
cd /home/nolan/projects/ping
awk '/^function SectionShell/,/^}/' src/fyd/components/renderer.tsx | head -50
echo "=== viewport provider attributes ==="
grep -n "data-viewport\|data-pointer" src/fyd/components/viewport.tsx | head -8

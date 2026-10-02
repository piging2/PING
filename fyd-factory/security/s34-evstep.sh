#!/bin/bash
set -u
cd /home/nolan/projects/ping
sed -n '895,915p' src/fyd/components/renderer.tsx
echo "=== WhyThis EvidenceStep rendering ==="
grep -n -B2 -A12 'detail' src/fyd/ui/why-this.tsx | head -40

#!/bin/bash
cd /home/nolan/projects/ping
echo "===== hero CTA block (1000-1040) ====="
sed -n '1000,1040p' src/fyd/components/renderer.tsx
echo "===== hero section tag ====="
grep -n "data-motion=\"hero-settle\"" src/fyd/components/renderer.tsx
sed -n '985,1000p' src/fyd/components/renderer.tsx

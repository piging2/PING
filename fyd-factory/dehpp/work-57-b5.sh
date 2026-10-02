#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
sed -n '505,515p' src/fyd/components/renderer.tsx
echo "====="
sed -n '1700,1715p' src/fyd/components/renderer.tsx

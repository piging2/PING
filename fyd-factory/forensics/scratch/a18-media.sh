#!/bin/bash
cd /home/nolan/projects/ping
sed -n '1388,1420p' src/fyd/components/renderer.tsx
echo "===== heroMediaFor ====="; grep -n "export function heroMediaFor" -A 40 src/fyd/media/select.ts | head -60

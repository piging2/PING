#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "##### portal-host.tsx (120) #####"
sed -n '1,120p' src/fyd/ui/portal-host.tsx
echo "##### MarginObjectLayer.tsx (160) #####"
sed -n '1,160p' src/fyd/ui/object-layer/MarginObjectLayer.tsx

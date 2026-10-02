#!/bin/bash
cd /home/nolan/projects/ping || exit 1
grep -n "export function MarginObjectLayer" -A 15 src/fyd/ui/object-layer/MarginObjectLayer.tsx
grep -n "interface MarginObjectLayerProps" -A 25 src/fyd/ui/object-layer/MarginObjectLayer.tsx | head -35

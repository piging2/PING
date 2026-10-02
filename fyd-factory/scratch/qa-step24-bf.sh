#!/bin/bash
cd /home/nolan/projects/ping
echo "=== boundField/boundTitle/boundDescription call sites with field args ==="
grep -n "boundField(ctx\|boundTitle(ctx\|boundDescription(ctx" src/fyd/components/renderer.tsx | head -60

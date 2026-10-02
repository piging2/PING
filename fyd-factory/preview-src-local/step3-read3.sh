#!/bin/bash
set -uo pipefail
cd /home/nolan/fyd-preview-wt
echo "=== rest of ping-object-source (lines 250-320) ==="
sed -n '250,320p' src/fyd/data/ping-object-source.ts
echo "=== projection dir on Pig ==="
ls -la /home/nolan/ping/var/fyd-projections/ 2>/dev/null | head -20
echo "=== next.config? ==="
ls next.config.* 2>/dev/null
echo "=== demo-owner-mode head ==="
head -60 src/fyd/owner-mode/demo-owner-mode.tsx

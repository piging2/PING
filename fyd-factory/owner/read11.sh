#!/bin/bash
set -e
cd /home/nolan/projects/ping
echo "===== resolveQuery ====="
grep -n "export function resolveQuery" -A 45 src/fyd/components/renderer.tsx 2>/dev/null || grep -rn "export function resolveQuery" -A 45 src/fyd/components/ | head -60

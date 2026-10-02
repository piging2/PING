#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== component at 1459 ==="; grep -n "^function\|^export function" src/fyd/components/renderer.tsx | awk -F: '$1 < 1459' | tail -3
echo; echo "=== component at 1520 ==="; grep -n "^function\|^export function" src/fyd/components/renderer.tsx | awk -F: '$1 < 1520' | tail -3
echo; echo "=== component at 1552 ==="; grep -n "^function\|^export function" src/fyd/components/renderer.tsx | awk -F: '$1 < 1552' | tail -3
echo; echo "=== hero block 960-1036 ==="; sed -n '960,1036p' src/fyd/components/renderer.tsx

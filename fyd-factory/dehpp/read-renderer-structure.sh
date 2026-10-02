#!/bin/bash
cd /home/nolan/projects/ping
echo "##### function/class/const structure of renderer.tsx"
grep -n "^function \|^const \|^export function\|^export const\|case \"" src/fyd/components/renderer.tsx | head -100

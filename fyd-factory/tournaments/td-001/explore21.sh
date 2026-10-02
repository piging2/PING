#!/bin/bash
set -u
cd /home/nolan/projects/ping
grep -n "export function\|export const" src/fyd/builder/visibility.ts | head
echo "===== renderer all-case mirror ====="
sed -n '105,125p' src/fyd/components/renderer.tsx

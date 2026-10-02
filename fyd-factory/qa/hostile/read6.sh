#!/bin/bash
cd /home/nolan/projects/ping
echo "======== contactMethodFor ========"
grep -rn "contactMethodFor" src/fyd/object/object-projection.ts | head -5
grep -rln "export function contactMethodFor\|export const contactMethodFor" src/fyd/ | head
echo "======== renderer head 1-120 ========"
sed -n '1,120p' src/fyd/components/renderer.tsx

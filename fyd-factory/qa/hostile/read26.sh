#!/bin/bash
cd /home/nolan/projects/ping
sed -n '30,58p' src/fyd/object/types.ts
echo "@@@@@ field helper in view.ts @@@@@"
grep -n "const field" -A 8 src/fyd/object/view.ts | head -14
echo "@@@@@ readOverrides @@@@@"
grep -n "export function readOverrides" -A 15 src/fyd/object/owner-store.ts | head -20

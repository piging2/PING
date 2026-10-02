#!/bin/bash
sed -n '320,470p' /home/nolan/projects/ping/src/fyd/object/view.ts
echo "=== readOverrides ==="
grep -n -B2 -A 25 'function readOverrides' /home/nolan/projects/ping/src/fyd/object/owner-store.ts | head -50

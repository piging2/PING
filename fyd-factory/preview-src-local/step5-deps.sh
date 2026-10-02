#!/bin/bash
set -uo pipefail
echo "=== concierge.ts imports ==="
grep -E "^import|^} from|from \"" /home/nolan/projects/ping/src/fyd/ask/concierge.ts | head -20
echo "=== concierge.ts size ==="
wc -l /home/nolan/projects/ping/src/fyd/ask/concierge.ts
echo "=== demo-owner-console.tsx imports ==="
grep -E "^import|from \"" /home/nolan/projects/ping/src/fyd/owner-mode/demo-owner-console.tsx | head -25
echo "=== demo-owner-console.tsx size ==="
wc -l /home/nolan/projects/ping/src/fyd/owner-mode/demo-owner-console.tsx
echo "=== git status of these files in main repo ==="
cd /home/nolan/projects/ping && git status --porcelain src/fyd/ask/concierge.ts src/fyd/owner-mode/demo-owner-console.tsx
